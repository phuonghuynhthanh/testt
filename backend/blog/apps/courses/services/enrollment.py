from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from apps.accounts.models import PlatformUser
from apps.courses.models import CourseClassStudent, CourseEnrollment
from apps.courses.schemas import (
    CourseAccessMode,
    CourseAccessPayload,
    CourseAccessResponse,
    CreateCourseAccessRequest,
    GrantCourseAccessResponse,
    SubscriptionPackage,
    UpdateCourseAccessRequest,
)
from apps.courses.services.course_class import CourseClassService
from apps.courses.services.course_catalog import PlatformCourseCatalogService
from apps.core.date_time import DateTime as CustomDateTime
from config.database import DatabaseManager

_REGISTRATION_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class CourseEnrollmentService:
    """Manage course access while preserving the legacy class-based workflow."""

    # Parse the legacy registration timestamp used by the class-based endpoint.
    @staticmethod
    def _parse_registration_date(raw: str) -> datetime:
        try:
            return datetime.strptime(str(raw).strip(), _REGISTRATION_DATE_FORMAT)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="registration_date must be in format YYYY-MM-DD HH:MM:SS",
            )

    # Reject writes for users that do not exist in the shared user table.
    @staticmethod
    def _require_user(session, user_id: str) -> None:
        if not session.get(PlatformUser, user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student not found: {user_id}",
            )

    # Preserve the existing class-based grant and revoke workflow.
    @classmethod
    def grant_course_access(
        cls,
        user_id: str,
        class_id: str,
        package: SubscriptionPackage,
        registration_date: str,
    ) -> GrantCourseAccessResponse:
        user_id = str(user_id or "").strip()
        class_id = str(class_id or "").strip()
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required"
            )

        # class_id → course_id (404 when the class does not exist).
        course_id = CourseClassService.get_course_id(class_id)
        if course_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
            )

        enrolled_at = cls._parse_registration_date(registration_date)

        if package == SubscriptionPackage.SILVER:
            return cls._revoke(user_id, class_id, course_id)
        return cls._grant(user_id, class_id, course_id, package.value, enrolled_at)

    # Grant paid access and keep the student's existing class membership behavior.
    @classmethod
    def _grant(
        cls,
        user_id: str,
        class_id: str,
        course_id: str,
        package: str,
        enrolled_at: datetime,
    ) -> GrantCourseAccessResponse:
        with DatabaseManager.session as session:
            cls._require_user(session, user_id)

            enrollment = (
                session.query(CourseEnrollment)
                .filter(
                    CourseEnrollment.course_id == course_id,
                    CourseEnrollment.user_id == user_id,
                )
                .first()
            )
            if enrollment is None:
                session.add(
                    CourseEnrollment(
                        course_id=course_id,
                        user_id=user_id,
                        package=package,
                        enrolled_at=enrolled_at,
                    )
                )
            else:
                enrollment.package = package
                # Legacy paid grants always use the existing weekly unlock mode.
                enrollment.access_mode = None
                enrollment.enrolled_at = enrolled_at
                enrollment.updated_at = CustomDateTime.now()

            already_member = (
                session.query(CourseClassStudent)
                .filter(
                    CourseClassStudent.class_id == class_id,
                    CourseClassStudent.student_id == user_id,
                )
                .first()
                is not None
            )
            if not already_member:
                session.add(
                    CourseClassStudent(class_id=class_id, student_id=user_id)
                )

            session.commit()

        return GrantCourseAccessResponse(
            message="Course access granted",
            course_id=course_id,
            added_to_class=not already_member,
        )

    # Revoke the legacy paid enrollment and its associated class membership.
    @classmethod
    def _revoke(
        cls, user_id: str, class_id: str, course_id: str
    ) -> GrantCourseAccessResponse:
        """SILVER = not a paying student: drop the enrollment and class membership."""
        with DatabaseManager.session as session:
            cls._require_user(session, user_id)
            session.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.user_id == user_id,
            ).delete(synchronize_session=False)
            session.query(CourseClassStudent).filter(
                CourseClassStudent.class_id == class_id,
                CourseClassStudent.student_id == user_id,
            ).delete(synchronize_session=False)
            session.commit()

        return GrantCourseAccessResponse(
            message="Course access revoked",
            course_id=course_id,
            added_to_class=False,
        )

    # Normalize and validate the composite enrollment identifier.
    @staticmethod
    def _normalize_access_key(user_id: str, course_id: str) -> tuple[str, str]:
        normalized_user_id = str(user_id or "").strip()
        normalized_course_id = str(course_id or "").strip()
        if not normalized_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required",
            )
        if not normalized_course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="course_id is required",
            )
        return normalized_user_id, normalized_course_id

    # Find one enrollment or return a consistent not-found response.
    @staticmethod
    def _require_enrollment(
        session, user_id: str, course_id: str
    ) -> CourseEnrollment:
        enrollment = (
            session.query(CourseEnrollment)
            .filter(
                CourseEnrollment.user_id == user_id,
                CourseEnrollment.course_id == course_id,
            )
            .first()
        )
        if enrollment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course access not found",
            )
        return enrollment

    # Convert the nullable legacy database mode into the explicit API mode.
    @staticmethod
    def _to_access_response(enrollment: CourseEnrollment) -> CourseAccessResponse:
        access_mode = (
            CourseAccessMode(enrollment.access_mode)
            if enrollment.access_mode
            else CourseAccessMode.FULL_SCHEDULED
        )
        return CourseAccessResponse(
            user_id=enrollment.user_id,
            course_id=enrollment.course_id,
            access_mode=access_mode,
            package=enrollment.package,
            enrolled_at=enrollment.enrolled_at,
            created_at=enrollment.created_at,
            updated_at=enrollment.updated_at,
        )

    # Apply validated API access fields to the database representation.
    @staticmethod
    def _apply_access_fields(
        enrollment: CourseEnrollment, payload: CourseAccessPayload
    ) -> None:
        enrollment.access_mode = (
            None
            if payload.access_mode == CourseAccessMode.FULL_SCHEDULED
            else payload.access_mode.value
        )
        enrollment.package = payload.package.value if payload.package else None
        enrollment.enrolled_at = payload.enrolled_at

    # Recognize a retry without changing the existing enrollment timestamp.
    @staticmethod
    def _matches_access_fields(
        enrollment: CourseEnrollment, payload: CourseAccessPayload
    ) -> bool:
        stored_mode = (
            CourseAccessMode(enrollment.access_mode)
            if enrollment.access_mode
            else CourseAccessMode.FULL_SCHEDULED
        )
        requested_package = payload.package.value if payload.package else None
        return (
            stored_mode == payload.access_mode
            and enrollment.package == requested_package
            and enrollment.enrolled_at == payload.enrolled_at
        )

    # Create one course-access record without changing class membership.
    @classmethod
    def create_course_access(
        cls, payload: CreateCourseAccessRequest
    ) -> CourseAccessResponse:
        user_id, requested_course_id = cls._normalize_access_key(
            payload.user_id, payload.course_id
        )
        course_id = PlatformCourseCatalogService.require_course(requested_course_id)

        with DatabaseManager.session as session:
            cls._require_user(session, user_id)
            existing = (
                session.query(CourseEnrollment)
                .filter(
                    CourseEnrollment.user_id == user_id,
                    CourseEnrollment.course_id == course_id,
                )
                .first()
            )
            if existing is not None:
                if cls._matches_access_fields(existing, payload):
                    return cls._to_access_response(existing)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Course access already exists",
                )

            enrollment = CourseEnrollment(user_id=user_id, course_id=course_id)
            cls._apply_access_fields(enrollment, payload)
            session.add(enrollment)
            try:
                session.commit()
                session.refresh(enrollment)
            except IntegrityError as error:
                session.rollback()
                concurrent = (
                    session.query(CourseEnrollment)
                    .filter(
                        CourseEnrollment.user_id == user_id,
                        CourseEnrollment.course_id == course_id,
                    )
                    .first()
                )
                if concurrent is not None and cls._matches_access_fields(
                    concurrent, payload
                ):
                    return cls._to_access_response(concurrent)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Course access already exists",
                ) from error
            return cls._to_access_response(enrollment)

    # Return one normalized course-access record.
    @classmethod
    def get_course_access(cls, user_id: str, course_id: str) -> CourseAccessResponse:
        user_id, course_id = cls._normalize_access_key(user_id, course_id)
        with DatabaseManager.session as session:
            enrollment = cls._require_enrollment(session, user_id, course_id)
            return cls._to_access_response(enrollment)

    # List access records with optional user and course filters.
    @classmethod
    def list_course_accesses(
        cls,
        user_id: Optional[str] = None,
        course_id: Optional[str] = None,
    ) -> List[CourseAccessResponse]:
        normalized_user_id = str(user_id or "").strip() or None
        normalized_course_id = str(course_id or "").strip() or None
        with DatabaseManager.session as session:
            query = session.query(CourseEnrollment)
            if normalized_user_id:
                query = query.filter(CourseEnrollment.user_id == normalized_user_id)
            if normalized_course_id:
                query = query.filter(
                    CourseEnrollment.course_id == normalized_course_id
                )
            enrollments = query.order_by(CourseEnrollment.created_at.desc()).all()
            return [cls._to_access_response(item) for item in enrollments]

    # Replace the access mode and package on an existing enrollment.
    @classmethod
    def update_course_access(
        cls,
        user_id: str,
        course_id: str,
        payload: UpdateCourseAccessRequest,
    ) -> CourseAccessResponse:
        user_id, requested_course_id = cls._normalize_access_key(user_id, course_id)
        course_id = PlatformCourseCatalogService.require_course(requested_course_id)
        with DatabaseManager.session as session:
            enrollment = cls._require_enrollment(session, user_id, course_id)
            cls._apply_access_fields(enrollment, payload)
            enrollment.updated_at = CustomDateTime.now()
            session.commit()
            session.refresh(enrollment)
            return cls._to_access_response(enrollment)

    # Delete one access record without changing class membership.
    @classmethod
    def delete_course_access(cls, user_id: str, course_id: str) -> None:
        user_id, course_id = cls._normalize_access_key(user_id, course_id)
        with DatabaseManager.session as session:
            enrollment = cls._require_enrollment(session, user_id, course_id)
            session.delete(enrollment)
            session.commit()
