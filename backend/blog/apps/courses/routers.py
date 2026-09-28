from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from pydantic import ValidationError

from apps.accounts.schemas import UserSchema
from apps.accounts.services.authenticate import AccountService
from apps.courses import schemas
from apps.courses.services.course_class import CourseClassService
from apps.courses.services.enrollment import CourseEnrollmentService
from apps.courses.services.permission import CourseClassPermission
from apps.courses.services.student_admin import StudentAdminService

router = APIRouter(prefix="", tags=["Course Classes"])


# Convert pydantic validation errors on the overloaded POST body into 400s.
def _bad_request(error: ValidationError) -> HTTPException:
    first = error.errors()[0]
    field = ".".join(str(part) for part in first.get("loc", ()) if part != "body")
    detail = first.get("msg", "Invalid request body")
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"{field}: {detail}" if field else detail,
    )


@router.get(
    "/course/classes",
    summary="List classes of a course",
    description=(
        "Returns every class of one course with its student count. "
        "Admin sees all courses; staff needs certificate scope on the course."
    ),
    status_code=status.HTTP_200_OK,
    response_model=List[schemas.CourseClassSchema],
)
def get_course_classes(
    course_id: str = Query(..., description="Course ID"),
    current_user: UserSchema = Depends(AccountService.current_user),
) -> List[schemas.CourseClassSchema]:
    course_id = course_id.strip()
    if not course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="course_id is required"
        )
    CourseClassPermission.require_course_class(current_user, course_id)
    return CourseClassService.list_classes(course_id)


@router.get(
    "/course/class",
    summary="Get one class with its students",
    status_code=status.HTTP_200_OK,
    response_model=schemas.CourseClassDetailSchema,
)
def get_course_class(
    id: str = Query(..., description="Class ID"),
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.CourseClassDetailSchema:
    CourseClassPermission.require_class_access(current_user, id)
    return CourseClassService.get_class(id)


@router.post(
    "/course/class",
    summary="Create a class, or add students to an existing class",
    description=(
        "Overloaded by the presence of the `id` query param: without `id` the body "
        "is `{data: {course_id, name}}` and a new empty class is created (201); with "
        "`id` the body is `{student_ids: [...]}` and those students are added (200), "
        "skipping ids already in the class."
    ),
    status_code=status.HTTP_201_CREATED,
    response_model=Union[
        schemas.CreateCourseClassResponse, schemas.AddCourseClassStudentsResponse
    ],
)
def create_class_or_add_students(
    response: Response,
    id: Optional[str] = Query(None, description="Class ID — present means add-students"),
    payload: Dict[str, Any] = Body(...),
    current_user: UserSchema = Depends(AccountService.current_user),
):
    if id:
        CourseClassPermission.require_class_access(current_user, id)
        try:
            body = schemas.AddCourseClassStudentsRequest(**payload)
        except ValidationError as error:
            raise _bad_request(error)
        response.status_code = status.HTTP_200_OK
        return CourseClassService.add_students(id, body.student_ids)

    try:
        body = schemas.CreateCourseClassRequest(**payload)
    except ValidationError as error:
        raise _bad_request(error)
    CourseClassPermission.require_course_class(current_user, body.data.course_id)
    return CourseClassService.create_class(body.data)


@router.put(
    "/course/class",
    summary="Update class name and/or status",
    description="Both fields are optional, but at least one must be sent.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.MessageResponse,
)
def update_course_class(
    payload: schemas.UpdateCourseClassRequest,
    id: str = Query(..., description="Class ID"),
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.MessageResponse:
    CourseClassPermission.require_class_access(current_user, id)
    return CourseClassService.update_class(id, payload.data)


@router.delete(
    "/course/class",
    summary="Delete a class, or remove one student from a class",
    description=(
        "Without `student_id` the class and all its memberships are deleted. With "
        "`student_id` only that membership is removed. Neither variant touches the "
        "student's course enrollment."
    ),
    status_code=status.HTTP_200_OK,
    response_model=schemas.MessageResponse,
)
def delete_course_class(
    id: str = Query(..., description="Class ID"),
    student_id: Optional[str] = Query(None, description="Remove only this student"),
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.MessageResponse:
    CourseClassPermission.require_class_access(current_user, id)
    if student_id and student_id.strip():
        return CourseClassService.remove_student(id, student_id.strip())
    return CourseClassService.delete_class(id)


@router.post(
    "/course/admin/user",
    summary="Grant/revoke a student's course access via a class",
    description=(
        "Grants a student access to the course behind `class_id`: GOLD/PLATINUM "
        "upserts the course enrollment and adds the student to the class; SILVER "
        "revokes access by removing both the enrollment and the class membership. "
        "Admin bypasses; staff needs the `class` scope on the class's course."
    ),
    status_code=status.HTTP_200_OK,
    response_model=schemas.GrantCourseAccessResponse,
)
def grant_course_access(
    payload: schemas.GrantCourseAccessRequest,
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.GrantCourseAccessResponse:
    CourseClassPermission.require_class_access(current_user, payload.class_id)
    return CourseEnrollmentService.grant_course_access(
        user_id=payload.user_id,
        class_id=payload.class_id,
        package=payload.subscription_package,
        registration_date=payload.registration_date,
    )


# Create course access independently from class membership.
@router.post(
    "/course/accesses",
    summary="Create course access",
    description=(
        "Creates scheduled, immediate, or trial access for one user and course. "
        "Admin bypasses; staff needs the course `class` scope."
    ),
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.CourseAccessResponse,
)
def create_course_access(
    payload: schemas.CreateCourseAccessRequest,
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.CourseAccessResponse:
    CourseClassPermission.require_course_class(current_user, payload.course_id)
    return CourseEnrollmentService.create_course_access(payload)


# List access records while preventing staff from querying outside their course.
@router.get(
    "/course/accesses",
    summary="List course access records",
    description=(
        "Admin may query all records. Staff must provide `course_id` and needs "
        "the course `class` scope."
    ),
    status_code=status.HTTP_200_OK,
    response_model=List[schemas.CourseAccessResponse],
)
def list_course_accesses(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    course_id: Optional[str] = Query(None, description="Filter by course ID"),
    current_user: UserSchema = Depends(AccountService.current_user),
) -> List[schemas.CourseAccessResponse]:
    if current_user.role != "admin" and not str(course_id or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="course_id is required for staff",
        )
    if course_id:
        CourseClassPermission.require_course_class(current_user, course_id)
    return CourseEnrollmentService.list_course_accesses(
        user_id=user_id,
        course_id=course_id,
    )


# Return one access record after checking the caller's course scope.
@router.get(
    "/course/accesses/{course_id}/users/{user_id}",
    summary="Get course access",
    status_code=status.HTTP_200_OK,
    response_model=schemas.CourseAccessResponse,
)
def get_course_access(
    course_id: str,
    user_id: str,
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.CourseAccessResponse:
    CourseClassPermission.require_course_class(current_user, course_id)
    return CourseEnrollmentService.get_course_access(user_id, course_id)


# Replace the mode and package of one existing access record.
@router.put(
    "/course/accesses/{course_id}/users/{user_id}",
    summary="Update course access",
    description="Replaces the access mode, package, and enrollment timestamp.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.CourseAccessResponse,
)
def update_course_access(
    course_id: str,
    user_id: str,
    payload: schemas.UpdateCourseAccessRequest,
    current_user: UserSchema = Depends(AccountService.current_user),
) -> schemas.CourseAccessResponse:
    CourseClassPermission.require_course_class(current_user, course_id)
    return CourseEnrollmentService.update_course_access(
        user_id,
        course_id,
        payload,
    )


# Revoke one access record without removing any class membership.
@router.delete(
    "/course/accesses/{course_id}/users/{user_id}",
    summary="Delete course access",
    description="Deletes only the enrollment; class membership remains unchanged.",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_course_access(
    course_id: str,
    user_id: str,
    current_user: UserSchema = Depends(AccountService.current_user),
) -> Response:
    CourseClassPermission.require_course_class(current_user, course_id)
    CourseEnrollmentService.delete_course_access(user_id, course_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/admin/user",
    summary="Get user detail with strategies (admin only)",
    description=(
        "Full user tracking info: subscription plan/dates, paper-trading limit and "
        "all strategies (bots) owned by the target user. Admin role only."
    ),
    status_code=status.HTTP_200_OK,
)
def get_user_detail(
    user_id: str = Query(..., description="Target user ID"),
    current_user: UserSchema = Depends(AccountService.current_user),
) -> Dict[str, Any]:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: admin only"
        )
    return StudentAdminService.get_user_detail(user_id)


@router.get(
    "/course/admin/users",
    summary="Get users list (admin or staff)",
    description=(
        "Returns every user with their highest enrolled package and course ids, "
        "for admin/staff to pick students to enroll. Any staff or admin may call it."
    ),
    status_code=status.HTTP_200_OK,
)
def get_users(
    current_user: UserSchema = Depends(AccountService.current_user),
) -> List[Dict[str, Any]]:
    # AccountService.current_user already enforces the staff/admin role gate.
    return StudentAdminService.get_users()
