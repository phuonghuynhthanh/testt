from typing import Optional

from fastapi import HTTPException, status

from apps.accounts.schemas import UserSchema


# Resolve the certificate `courses` map, applying legacy `course_ids` fallback.
def resolve_certificate_courses(certificate: Optional[dict]) -> dict[str, dict]:
    """Return {course_id: {"content": bool, "class": bool}}.

    Reads the new `courses` map when present; otherwise falls back to the legacy
    `course_ids` list (which historically meant class access only). Entries with
    neither flag are pruned.
    """
    if not isinstance(certificate, dict):
        return {}

    result: dict[str, dict] = {}
    courses = certificate.get("courses")
    if isinstance(courses, dict):
        for raw_id, flags in courses.items():
            course_id = str(raw_id).strip()
            if not course_id or not isinstance(flags, dict):
                continue
            content = flags.get("content") is True
            klass = flags.get("class") is True
            if content or klass:
                result[course_id] = {"content": content, "class": klass}
        return result

    # Legacy fallback: course_ids == class access on each listed course.
    course_ids = certificate.get("course_ids")
    if isinstance(course_ids, list):
        for value in course_ids:
            course_id = str(value).strip()
            if course_id:
                result[course_id] = {"content": False, "class": True}
    return result


class CourseClassPermission:
    """Course-scoped gate: admin bypasses; staff needs the per-course flag."""

    @staticmethod
    def _courses_map(current_user: UserSchema) -> dict[str, dict]:
        scopes = current_user.scopes if isinstance(current_user.scopes, dict) else {}
        certificate = scopes.get("certificate")
        if not isinstance(certificate, dict) or certificate.get("enabled") is not True:
            return {}
        return resolve_certificate_courses(certificate)

    @classmethod
    def _has_flag(
        cls, current_user: UserSchema, course_id: Optional[str], flag: str
    ) -> bool:
        if current_user.role == "admin":
            return True
        if not course_id:
            return False
        entry = cls._courses_map(current_user).get(str(course_id).strip())
        return bool(entry and entry.get(flag))

    @classmethod
    def has_content_access(cls, current_user: UserSchema, course_id: Optional[str]) -> bool:
        return cls._has_flag(current_user, course_id, "content")

    @classmethod
    def has_class_access(cls, current_user: UserSchema, course_id: Optional[str]) -> bool:
        return cls._has_flag(current_user, course_id, "class")

    @classmethod
    def require_course_content(
        cls, current_user: UserSchema, course_id: Optional[str]
    ) -> None:
        if not cls.has_content_access(current_user, course_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: course content scope required",
            )

    @classmethod
    def require_course_class(
        cls, current_user: UserSchema, course_id: Optional[str]
    ) -> None:
        if not cls.has_class_access(current_user, course_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: course class scope required",
            )

    @classmethod
    def require_class_access(cls, current_user: UserSchema, class_id: str) -> str:
        """Resolve class → course_id, then check the class flag. Returns course_id."""
        # Local import keeps this module importable from the service layer.
        from apps.courses.services.course_class import CourseClassService

        course_id = CourseClassService.get_course_id(class_id)
        if course_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
            )
        cls.require_course_class(current_user, course_id)
        return course_id
