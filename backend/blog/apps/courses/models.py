from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
)

from config.database import FastModel
from apps.core.date_time import DateTime as CustomDateTime


class CourseClass(FastModel):
    """One class (đợt học) grouping students of a course."""

    __tablename__ = "course_classes"

    id = Column(Text, primary_key=True)
    course_id = Column(Text, nullable=False, index=True)
    name = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="PROGRESS")
    created_at = Column(DateTime, nullable=False, default=CustomDateTime.now)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=CustomDateTime.now,
        onupdate=CustomDateTime.now,
    )


class CourseClassStudent(FastModel):
    """Membership link between a class and a student (many-to-many)."""

    __tablename__ = "course_class_students"
    __table_args__ = (
        UniqueConstraint("class_id", "student_id", name="uq_course_class_students"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    class_id = Column(
        Text,
        ForeignKey("course_classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(Text, nullable=False, index=True)
    added_at = Column(DateTime, nullable=False, default=CustomDateTime.now)


class CourseEnrollment(FastModel):
    """A user's access to one course, including paid and trial enrollment.

    Maps onto the platform-owned `course_enrollments` table (same Postgres DB).
    Column layout must stay in sync with the platform model so `create_all`
    never tries to recreate or alter the existing table.
    """

    __tablename__ = "course_enrollments"
    __table_args__ = (UniqueConstraint("course_id", "user_id"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    course_id = Column(Text, nullable=False, index=True)
    user_id = Column(Text, nullable=False, index=True)
    package = Column(Text, nullable=True)  # GOLD | PLATINUM; NULL only for TRIAL
    access_mode = Column(
        Text,
        nullable=True,
        comment=(
            "NULL uses legacy weekly unlock; FULL_IMMEDIATE unlocks all; "
            "TRIAL unlocks the first chapter"
        ),
    )
    enrolled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=CustomDateTime.now)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=CustomDateTime.now,
        onupdate=CustomDateTime.now,
    )
