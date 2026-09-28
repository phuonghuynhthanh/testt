import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func

from apps.accounts.models import PlatformUser
from apps.courses.models import CourseClass, CourseClassStudent
from apps.courses.schemas import (
    AddCourseClassStudentsResponse,
    ClassStatus,
    CourseClassDetailSchema,
    CourseClassSchema,
    CourseClassStudentSchema,
    CreateCourseClassData,
    CreateCourseClassResponse,
    MessageResponse,
    UpdateCourseClassData,
)
from config.database import DatabaseManager


class CourseClassService:
    """CRUD for course classes and their student memberships."""

    # ------------------------------------------------------------------
    # Student profile helpers (users.user_profile is a free-form JSONB)
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_name(user: PlatformUser) -> str:
        profile = user.user_profile if isinstance(user.user_profile, dict) else {}
        for key in ("full_name", "fullname", "name", "display_name", "hoTen"):
            value = profile.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        email = user.email
        if isinstance(email, str) and email:
            return email.split("@")[0]
        return str(user.user_id)

    @staticmethod
    def _extract_phone(user: PlatformUser) -> Optional[str]:
        profile = user.user_profile if isinstance(user.user_profile, dict) else {}
        value = profile.get("phone")
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None

    # ------------------------------------------------------------------
    # Shared query helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_class_or_404(session, class_id: str) -> CourseClass:
        course_class = session.get(CourseClass, class_id)
        if not course_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
            )
        return course_class

    @staticmethod
    def get_course_id(class_id: str) -> Optional[str]:
        """Resolve class → course_id for permission checks. None when missing."""
        if not class_id:
            return None
        with DatabaseManager.session as session:
            course_class = session.get(CourseClass, class_id)
            return str(course_class.course_id) if course_class else None

    @staticmethod
    def _student_counts(session, class_ids: List[str]) -> Dict[str, int]:
        if not class_ids:
            return {}
        rows = (
            session.query(CourseClassStudent.class_id, func.count(CourseClassStudent.id))
            .filter(CourseClassStudent.class_id.in_(class_ids))
            .group_by(CourseClassStudent.class_id)
            .all()
        )
        return {str(class_id): int(count) for class_id, count in rows}

    @staticmethod
    def _student_ids_in_class(session, class_id: str) -> List[str]:
        rows = (
            session.query(CourseClassStudent.student_id)
            .filter(CourseClassStudent.class_id == str(class_id))
            .all()
        )
        return [str(row[0]) for row in rows]

    @classmethod
    def classes_of_students(
        cls, course_id: str, student_ids: List[str]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Map student_id → classes within one course. For student listings."""
        if not student_ids:
            return {}
        with DatabaseManager.session as session:
            rows = (
                session.query(
                    CourseClassStudent.student_id,
                    CourseClass.id,
                    CourseClass.name,
                    CourseClass.status,
                )
                .join(CourseClass, CourseClass.id == CourseClassStudent.class_id)
                .filter(
                    CourseClass.course_id == str(course_id),
                    CourseClassStudent.student_id.in_(student_ids),
                )
                .all()
            )
        out: Dict[str, List[Dict[str, Any]]] = {}
        for student_id, class_id, name, class_status in rows:
            out.setdefault(str(student_id), []).append(
                {
                    "id": str(class_id),
                    "name": str(name or ""),
                    "status": str(class_status or "PROGRESS").upper(),
                }
            )
        return out

    # ------------------------------------------------------------------
    # GET /course/classes?course_id={course_id}
    # ------------------------------------------------------------------

    @classmethod
    def list_classes(cls, course_id: str) -> List[CourseClassSchema]:
        with DatabaseManager.session as session:
            classes = (
                session.query(CourseClass)
                .filter(CourseClass.course_id == course_id)
                .order_by(CourseClass.created_at.asc())
                .all()
            )
            counts = cls._student_counts(session, [str(item.id) for item in classes])
            return [
                CourseClassSchema(
                    id=str(item.id),
                    course_id=str(item.course_id),
                    name=str(item.name or ""),
                    status=str(item.status or "PROGRESS").upper(),
                    student_count=counts.get(str(item.id), 0),
                )
                for item in classes
            ]

    # ------------------------------------------------------------------
    # GET /course/class?id={class_id}
    # ------------------------------------------------------------------

    @classmethod
    def get_class(cls, class_id: str) -> CourseClassDetailSchema:
        with DatabaseManager.session as session:
            course_class = cls._get_class_or_404(session, class_id)
            student_ids = cls._student_ids_in_class(session, class_id)
            users = (
                session.query(PlatformUser)
                .filter(PlatformUser.user_id.in_(student_ids))
                .all()
                if student_ids
                else []
            )
            students = [
                CourseClassStudentSchema(
                    id=str(user.user_id),
                    full_name=cls._extract_name(user),
                    email=str(user.email or ""),
                    phone=cls._extract_phone(user),
                )
                for user in users
            ]
            students.sort(key=lambda item: item.full_name.lower())

            return CourseClassDetailSchema(
                id=str(course_class.id),
                course_id=str(course_class.course_id),
                name=str(course_class.name or ""),
                status=str(course_class.status or "PROGRESS").upper(),
                students=students,
            )

    # ------------------------------------------------------------------
    # POST /course/class
    # ------------------------------------------------------------------

    @classmethod
    def create_class(cls, data: CreateCourseClassData) -> CreateCourseClassResponse:
        name = data.name.strip()
        course_id = data.course_id.strip()
        if not course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="course_id is required"
            )
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="name is required"
            )

        class_id = f"class-{uuid.uuid4()}"
        with DatabaseManager.session as session:
            session.add(
                CourseClass(
                    id=class_id,
                    course_id=course_id,
                    name=name,
                    status=ClassStatus(data.status).value,
                )
            )
            session.commit()

        return CreateCourseClassResponse(id=class_id, message="Class created")

    # ------------------------------------------------------------------
    # POST /course/class?id={class_id}
    # ------------------------------------------------------------------

    @classmethod
    def add_students(
        cls, class_id: str, student_ids: List[str]
    ) -> AddCourseClassStudentsResponse:
        normalized: List[str] = []
        for value in student_ids:
            student_id = str(value or "").strip()
            if student_id and student_id not in normalized:
                normalized.append(student_id)
        if not normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="student_ids must not be empty",
            )

        with DatabaseManager.session as session:
            cls._get_class_or_404(session, class_id)

            existing_users = {
                str(row[0])
                for row in session.query(PlatformUser.user_id)
                .filter(PlatformUser.user_id.in_(normalized))
                .all()
            }
            missing = [sid for sid in normalized if sid not in existing_users]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Student not found: {', '.join(missing)}",
                )

            already_in_class = set(cls._student_ids_in_class(session, class_id))
            to_add = [sid for sid in normalized if sid not in already_in_class]
            for student_id in to_add:
                session.add(
                    CourseClassStudent(class_id=class_id, student_id=student_id)
                )
            session.commit()

        return AddCourseClassStudentsResponse(message="Students added", added=len(to_add))

    # ------------------------------------------------------------------
    # PUT /course/class?id={class_id}
    # ------------------------------------------------------------------

    @classmethod
    def update_class(cls, class_id: str, data: UpdateCourseClassData) -> MessageResponse:
        if data.name is None and data.status is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="name or status is required",
            )

        name = data.name.strip() if data.name is not None else None
        if name is not None and not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="name must not be empty",
            )

        with DatabaseManager.session as session:
            course_class = cls._get_class_or_404(session, class_id)
            if name is not None:
                course_class.name = name
            if data.status is not None:
                course_class.status = ClassStatus(data.status).value
            session.commit()

        return MessageResponse(message="Class updated")

    # ------------------------------------------------------------------
    # DELETE /course/class?id={class_id}[&student_id={student_id}]
    # ------------------------------------------------------------------

    @classmethod
    def delete_class(cls, class_id: str) -> MessageResponse:
        with DatabaseManager.session as session:
            course_class = cls._get_class_or_404(session, class_id)
            # Drop memberships explicitly so the delete also works on databases
            # where the FK was created without ON DELETE CASCADE.
            session.query(CourseClassStudent).filter(
                CourseClassStudent.class_id == class_id
            ).delete(synchronize_session=False)
            session.delete(course_class)
            session.commit()

        return MessageResponse(message="Class deleted")

    @classmethod
    def remove_student(cls, class_id: str, student_id: str) -> MessageResponse:
        with DatabaseManager.session as session:
            cls._get_class_or_404(session, class_id)
            membership = (
                session.query(CourseClassStudent)
                .filter(
                    CourseClassStudent.class_id == class_id,
                    CourseClassStudent.student_id == student_id,
                )
                .first()
            )
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found in class",
                )
            session.delete(membership)
            session.commit()

        return MessageResponse(message="Student removed from class")
