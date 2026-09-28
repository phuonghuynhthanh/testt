from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class ClassStatus(str, Enum):
    PROGRESS = "PROGRESS"
    END = "END"


class CourseClassSchema(BaseModel):
    """One class row in GET /course/classes."""

    id: str
    course_id: str
    name: str
    status: ClassStatus = ClassStatus.PROGRESS
    student_count: int = 0


class CourseClassStudentSchema(BaseModel):
    """One student inside GET /course/class."""

    id: str
    full_name: str
    email: str
    phone: Optional[str] = None


class CourseClassDetailSchema(BaseModel):
    """GET /course/class — class info plus its students."""

    id: str
    course_id: str
    name: str
    status: ClassStatus
    students: List[CourseClassStudentSchema] = Field(default_factory=list)


class CreateCourseClassData(BaseModel):
    course_id: str
    name: str
    status: ClassStatus = ClassStatus.PROGRESS


class CreateCourseClassRequest(BaseModel):
    """POST /course/class (no `id` query param)."""

    data: CreateCourseClassData


class CreateCourseClassResponse(BaseModel):
    id: str
    message: str = "Class created"


class AddCourseClassStudentsRequest(BaseModel):
    """POST /course/class?id={class_id}."""

    student_ids: List[str] = Field(default_factory=list)


class AddCourseClassStudentsResponse(BaseModel):
    message: str = "Students added"
    added: int = Field(0, description="Number of memberships actually created")


class UpdateCourseClassData(BaseModel):
    name: Optional[str] = None
    status: Optional[ClassStatus] = None


class UpdateCourseClassRequest(BaseModel):
    """PUT /course/class?id={class_id} — send only fields to change."""

    data: UpdateCourseClassData


class MessageResponse(BaseModel):
    message: str


class SubscriptionPackage(str, Enum):
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class CourseAccessMode(str, Enum):
    """Public API modes, including the normalized legacy weekly mode."""

    FULL_SCHEDULED = "FULL_SCHEDULED"
    FULL_IMMEDIATE = "FULL_IMMEDIATE"
    TRIAL = "TRIAL"


class PaidCoursePackage(str, Enum):
    """Paid packages accepted by the new course-access API."""

    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class GrantCourseAccessRequest(BaseModel):
    """POST /course/admin/user — grant/revoke a student's access to a class's course.

    `class_id` resolves to the course being granted; SILVER revokes access.
    """

    user_id: str
    class_id: str
    subscription_package: SubscriptionPackage
    registration_date: str = Field(
        ..., description="Enrollment timestamp, format YYYY-MM-DD HH:MM:SS"
    )


class GrantCourseAccessResponse(BaseModel):
    message: str
    course_id: str
    added_to_class: bool = False


class CourseAccessPayload(BaseModel):
    """Shared and validated access fields for create and update requests."""

    access_mode: CourseAccessMode
    package: Optional[PaidCoursePackage] = None
    enrolled_at: Optional[datetime] = None

    # Enforce the database invariants before the service writes an enrollment.
    @model_validator(mode="after")
    def validate_access_fields(self) -> "CourseAccessPayload":
        if self.access_mode == CourseAccessMode.TRIAL:
            if self.package is not None:
                raise ValueError("package must be null for TRIAL access")
            return self

        if self.package is None:
            raise ValueError("package is required for full course access")
        if (
            self.access_mode == CourseAccessMode.FULL_SCHEDULED
            and self.enrolled_at is None
        ):
            raise ValueError("enrolled_at is required for FULL_SCHEDULED access")
        return self


class CreateCourseAccessRequest(CourseAccessPayload):
    """POST /course/accesses — grant access independently from class membership."""

    user_id: str = Field(..., min_length=1)
    course_id: str = Field(..., min_length=1)


class UpdateCourseAccessRequest(CourseAccessPayload):
    """PUT /course/accesses/{course_id}/users/{user_id}."""


class CourseAccessResponse(BaseModel):
    """Normalized access record returned by Blog/Admin CRUD endpoints."""

    user_id: str
    course_id: str
    access_mode: CourseAccessMode
    package: Optional[PaidCoursePackage] = None
    enrolled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
