import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

# Seed minimum env vars required by config.settings at import time.
os.environ.setdefault("DATABASE_DRIVER", "postgresql")
os.environ.setdefault("DATABASE_USERNAME", "postgres")
os.environ.setdefault("DATABASE_PASSWORD", "postgres")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_NAME", "quantvn")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost")
sys.path.append(str(Path(__file__).resolve().parents[1]))

from apps.accounts import schemas as account_schemas
from apps.accounts.services.authenticate import AccountService
from apps.courses import schemas
from apps.courses.routers import router
from apps.courses.services.course_class import CourseClassService
from apps.courses.services.enrollment import CourseEnrollmentService
from apps.courses.services.student_admin import StudentAdminService


# Build a lightweight app so tests stay isolated from global startup side effects.
# Class endpoints require the per-course `class` flag; grant it for each course id.
def _client(
    role: str,
    course_ids: list[str] | None = None,
    scopes: dict | None = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    if scopes is None:
        scopes = {
            "certificate": {
                "enabled": True,
                "courses": {
                    cid: {"content": False, "class": True}
                    for cid in (course_ids or [])
                },
            }
        }

    async def _override_current_user() -> account_schemas.UserSchema:
        return account_schemas.UserSchema(
            user_id=f"{role}_uid",
            email=f"{role}@test.com",
            role=role,
            scopes=scopes,
        )

    app.dependency_overrides[AccountService.current_user] = _override_current_user
    return TestClient(app)


# Staff scoped to the class's course can read it.
def test_get_class_allows_scoped_staff(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_1")
    monkeypatch.setattr(
        CourseClassService,
        "get_class",
        classmethod(
            lambda cls, class_id: schemas.CourseClassDetailSchema(
                id=class_id,
                course_id="course_1",
                name="Lớp tháng 6",
                status=schemas.ClassStatus.PROGRESS,
                students=[],
            )
        ),
    )
    resp = _client("staff", ["course_1"]).get("/course/class", params={"id": "class-1"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Lớp tháng 6"


# Staff without scope on the class's course is rejected before the service runs.
def test_get_class_denies_unscoped_staff(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_x")
    called = {"value": False}

    def _should_not_run(cls, class_id):
        called["value"] = True

    monkeypatch.setattr(CourseClassService, "get_class", classmethod(_should_not_run))
    resp = _client("staff", ["course_1"]).get("/course/class", params={"id": "class-1"})
    assert resp.status_code == 403
    assert called["value"] is False


# Unknown class id returns 404 rather than leaking a scope decision.
def test_unknown_class_returns_404(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: None)
    resp = _client("admin").get("/course/class", params={"id": "class-missing"})
    assert resp.status_code == 404


# Listing classes is scoped by the course_id query param.
def test_list_classes_scope(monkeypatch):
    monkeypatch.setattr(
        CourseClassService, "list_classes", classmethod(lambda cls, course_id: [])
    )
    client = _client("staff", ["course_1"])
    assert client.get("/course/classes", params={"course_id": "course_1"}).status_code == 200
    assert client.get("/course/classes", params={"course_id": "course_x"}).status_code == 403


# POST without `id` creates a class and checks scope against the body course_id.
def test_post_without_id_creates_class(monkeypatch):
    captured = {}

    def _create(cls, data):
        captured["course_id"] = data.course_id
        return schemas.CreateCourseClassResponse(id="class-new", message="Class created")

    monkeypatch.setattr(CourseClassService, "create_class", classmethod(_create))
    resp = _client("staff", ["course_1"]).post(
        "/course/class",
        json={"data": {"course_id": "course_1", "name": "Lớp tháng 6"}},
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == "class-new"
    assert captured["course_id"] == "course_1"


# POST with `id` adds students and answers 200, not 201.
def test_post_with_id_adds_students(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_1")
    monkeypatch.setattr(
        CourseClassService,
        "add_students",
        classmethod(
            lambda cls, class_id, student_ids: schemas.AddCourseClassStudentsResponse(
                message="Students added", added=len(student_ids)
            )
        ),
    )
    resp = _client("staff", ["course_1"]).post(
        "/course/class",
        params={"id": "class-1"},
        json={"student_ids": ["user-1", "user-2"]},
    )
    assert resp.status_code == 200
    assert resp.json() == {"message": "Students added", "added": 2}


# Creating a class for a course outside the staff scope is rejected.
def test_post_create_denied_outside_scope(monkeypatch):
    called = {"value": False}

    def _should_not_run(cls, data):
        called["value"] = True

    monkeypatch.setattr(CourseClassService, "create_class", classmethod(_should_not_run))
    resp = _client("staff", ["course_1"]).post(
        "/course/class",
        json={"data": {"course_id": "course_x", "name": "Lớp tháng 6"}},
    )
    assert resp.status_code == 403
    assert called["value"] is False


# A malformed create body reports 400 rather than 422.
def test_post_invalid_body_returns_400():
    resp = _client("admin").post("/course/class", json={"data": {"name": "Lớp"}})
    assert resp.status_code == 400


# DELETE routes to class deletion or single-student removal by query param.
def test_delete_routes_by_student_id(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_1")
    calls = []
    monkeypatch.setattr(
        CourseClassService,
        "delete_class",
        classmethod(
            lambda cls, class_id: calls.append("class")
            or schemas.MessageResponse(message="Class deleted")
        ),
    )
    monkeypatch.setattr(
        CourseClassService,
        "remove_student",
        classmethod(
            lambda cls, class_id, student_id: calls.append("student")
            or schemas.MessageResponse(message="Student removed from class")
        ),
    )
    client = _client("admin")
    assert client.delete("/course/class", params={"id": "class-1"}).status_code == 200
    assert (
        client.delete(
            "/course/class", params={"id": "class-1", "student_id": "user-1"}
        ).status_code
        == 200
    )
    assert calls == ["class", "student"]


# PUT requires at least one field, enforced in the service layer.
def test_put_updates_class(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_1")
    monkeypatch.setattr(
        CourseClassService,
        "update_class",
        classmethod(
            lambda cls, class_id, data: schemas.MessageResponse(message="Class updated")
        ),
    )
    resp = _client("staff", ["course_1"]).put(
        "/course/class",
        params={"id": "class-1"},
        json={"data": {"status": "END"}},
    )
    assert resp.status_code == 200
    assert resp.json() == {"message": "Class updated"}


# A course granted only `content` does NOT satisfy class endpoints.
def test_content_only_scope_denies_class_endpoint(monkeypatch):
    monkeypatch.setattr(
        CourseClassService, "list_classes", classmethod(lambda cls, course_id: [])
    )
    scopes = {
        "certificate": {
            "enabled": True,
            "courses": {"course_1": {"content": True, "class": False}},
        }
    }
    client = _client("staff", scopes=scopes)
    resp = client.get("/course/classes", params={"course_id": "course_1"})
    assert resp.status_code == 403


# Legacy `course_ids` staff (pre-migration) still reach class endpoints.
def test_legacy_course_ids_still_grants_class_access(monkeypatch):
    monkeypatch.setattr(
        CourseClassService, "list_classes", classmethod(lambda cls, course_id: [])
    )
    scopes = {"certificate": {"enabled": True, "course_ids": ["course_1"]}}
    client = _client("staff", scopes=scopes)
    assert (
        client.get("/course/classes", params={"course_id": "course_1"}).status_code
        == 200
    )
    assert (
        client.get("/course/classes", params={"course_id": "course_x"}).status_code
        == 403
    )


# --- POST /course/admin/user (grant/revoke course access via a class) ---------


def _valid_grant_payload(**overrides) -> dict:
    payload = {
        "user_id": "student-1",
        "class_id": "class-1",
        "subscription_package": "GOLD",
        "registration_date": "2026-08-04 10:00:00",
    }
    payload.update(overrides)
    return payload


# Staff scoped to the class's course can grant access; args are forwarded.
def test_grant_access_allows_scoped_staff(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_1")
    captured = {}

    def _grant(cls, user_id, class_id, package, registration_date):
        captured.update(
            user_id=user_id,
            class_id=class_id,
            package=package,
            registration_date=registration_date,
        )
        return schemas.GrantCourseAccessResponse(
            message="Course access granted", course_id="course_1", added_to_class=True
        )

    monkeypatch.setattr(
        CourseEnrollmentService, "grant_course_access", classmethod(_grant)
    )
    resp = _client("staff", ["course_1"]).post(
        "/course/admin/user", json=_valid_grant_payload()
    )
    assert resp.status_code == 200
    assert resp.json()["added_to_class"] is True
    assert captured["class_id"] == "class-1"
    assert captured["package"] == schemas.SubscriptionPackage.GOLD


# Staff without scope on the class's course is rejected before the service runs.
def test_grant_access_denies_unscoped_staff(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_x")
    called = {"value": False}

    def _should_not_run(cls, **kwargs):
        called["value"] = True

    monkeypatch.setattr(
        CourseEnrollmentService, "grant_course_access", classmethod(_should_not_run)
    )
    resp = _client("staff", ["course_1"]).post(
        "/course/admin/user", json=_valid_grant_payload()
    )
    assert resp.status_code == 403
    assert called["value"] is False


# Unknown class id returns 404 (raised by the permission resolver).
def test_grant_access_unknown_class_returns_404(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: None)
    resp = _client("admin").post("/course/admin/user", json=_valid_grant_payload())
    assert resp.status_code == 404


# SILVER routes through the same guard and the package reaches the service.
def test_grant_access_silver_revokes(monkeypatch):
    monkeypatch.setattr(CourseClassService, "get_course_id", lambda class_id: "course_1")
    captured = {}

    def _grant(cls, user_id, class_id, package, registration_date):
        captured["package"] = package
        return schemas.GrantCourseAccessResponse(
            message="Course access revoked", course_id="course_1", added_to_class=False
        )

    monkeypatch.setattr(
        CourseEnrollmentService, "grant_course_access", classmethod(_grant)
    )
    resp = _client("admin").post(
        "/course/admin/user", json=_valid_grant_payload(subscription_package="SILVER")
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Course access revoked"
    assert captured["package"] == schemas.SubscriptionPackage.SILVER


# An invalid package value is rejected by request validation (422).
def test_grant_access_invalid_package_returns_422():
    resp = _client("admin").post(
        "/course/admin/user", json=_valid_grant_payload(subscription_package="BRONZE")
    )
    assert resp.status_code == 422


# --- GET /admin/user + GET /course/admin/users (migrated user-admin reads) -----


# Users list is available to any staff (role gate handled by current_user).
def test_get_users_allows_staff(monkeypatch):
    monkeypatch.setattr(
        StudentAdminService,
        "get_users",
        classmethod(lambda cls: [{"id": "u1", "package": "GOLD"}]),
    )
    resp = _client("staff", ["course_1"]).get("/course/admin/users")
    assert resp.status_code == 200
    assert resp.json() == [{"id": "u1", "package": "GOLD"}]


# User detail (with strategies) is admin-only.
def test_get_user_detail_allows_admin(monkeypatch):
    monkeypatch.setattr(
        StudentAdminService,
        "get_user_detail",
        classmethod(lambda cls, user_id: {"user_id": user_id, "strategies": []}),
    )
    resp = _client("admin").get("/admin/user", params={"user_id": "u1"})
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "u1"


# Staff cannot read user detail; the service must not run.
def test_get_user_detail_denies_staff(monkeypatch):
    called = {"value": False}

    def _should_not_run(cls, user_id):
        called["value"] = True

    monkeypatch.setattr(
        StudentAdminService, "get_user_detail", classmethod(_should_not_run)
    )
    resp = _client("staff", ["course_1"]).get("/admin/user", params={"user_id": "u1"})
    assert resp.status_code == 403
    assert called["value"] is False


# Master switch off blocks class endpoints even with populated courses.
def test_master_switch_off_denies(monkeypatch):
    monkeypatch.setattr(
        CourseClassService, "list_classes", classmethod(lambda cls, course_id: [])
    )
    scopes = {
        "certificate": {
            "enabled": False,
            "courses": {"course_1": {"content": True, "class": True}},
        }
    }
    resp = _client("staff", scopes=scopes).get(
        "/course/classes", params={"course_id": "course_1"}
    )
    assert resp.status_code == 403
