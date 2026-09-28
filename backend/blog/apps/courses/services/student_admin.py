from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from apps.accounts.models import PlatformBot, PlatformUser
from apps.courses.constants import DEFAULT_COURSE_ID
from apps.courses.models import CourseEnrollment
from config.database import DatabaseManager

# Ported from platform PackageFeatureConfiguration._PLAN_FEATURES.
_PAPER_TRADING_BOT_LIMIT: Dict[str, Optional[int]] = {
    "LEARNER": 1,
    "PRACTITIONER": 5,
    "RESEARCHER": 20,
    "PROFESSIONAL": 50,
    "ENTERPRISE": None,
}

# Highest tier wins when a user is enrolled with different packages across courses.
_PACKAGE_RANK = {"SILVER": 0, "GOLD": 1, "PLATINUM": 2}


class StudentAdminService:
    """User-admin reads migrated from the platform backend (no S3, DB only)."""

    # ------------------------------------------------------------------
    # profile helpers (users.user_profile is a free-form JSONB)
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_name(user: PlatformUser) -> str:
        profile = user.user_profile if isinstance(user.user_profile, dict) else {}
        for key in ("full_name", "fullname", "name", "display_name"):
            value = profile.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        email = user.email
        if isinstance(email, str) and email:
            return email.split("@")[0]
        return str(user.user_id)

    @staticmethod
    def _extract_display_name(user: PlatformUser) -> str:
        profile = user.user_profile if isinstance(user.user_profile, dict) else {}
        for key in ("display_name", "full_name", "fullname", "name"):
            value = profile.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return StudentAdminService._extract_name(user)

    @staticmethod
    def _extract_creator_name(user: PlatformUser) -> str:
        profile = user.user_profile if isinstance(user.user_profile, dict) else {}
        for key in ("hoTen", "full_name", "fullname", "name", "display_name"):
            value = profile.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return StudentAdminService._extract_display_name(user)

    @staticmethod
    def _extract_phone(user: PlatformUser) -> Optional[str]:
        profile = user.user_profile if isinstance(user.user_profile, dict) else {}
        value = profile.get("phone") if isinstance(profile, dict) else None
        if isinstance(value, str) and value.strip():
            return value.strip()
        phone = user.ekyc_phone
        if isinstance(phone, str) and phone.strip():
            return phone.strip()
        return None

    @staticmethod
    def _parse_iso(value: Any) -> Optional[str]:
        return value.isoformat() if isinstance(value, datetime) else None

    # ------------------------------------------------------------------
    # enrollment / bot helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_enrollment_index(session) -> Dict[str, Dict[str, Any]]:
        """user_id -> {"courses_id": [...], "package": highest tier enrolled}."""
        index: Dict[str, Dict[str, Any]] = {}
        for enrollment in session.query(CourseEnrollment).all():
            entry = index.setdefault(
                enrollment.user_id, {"courses_id": [], "package": "SILVER"}
            )
            entry["courses_id"].append(enrollment.course_id)
            if _PACKAGE_RANK.get(enrollment.package, 0) > _PACKAGE_RANK.get(
                entry["package"], 0
            ):
                entry["package"] = enrollment.package
        return index

    @staticmethod
    def _get_package(session, user_id: str, course_id: str) -> str:
        enrollment = (
            session.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.user_id == user_id,
            )
            .first()
        )
        return enrollment.package if enrollment else "SILVER"

    @classmethod
    def _bot_summary_rows(
        cls, session, user_id: str, creator_name: str
    ) -> List[Dict[str, Any]]:
        bots = (
            session.query(PlatformBot)
            .filter(PlatformBot.user_id == user_id, PlatformBot.status != "DELETED")
            .order_by(PlatformBot.created_at.desc())
            .all()
        )
        rows: List[Dict[str, Any]] = []
        for bot in bots:
            created_at = bot.created_at
            rows.append(
                {
                    "bot_id": str(bot.bot_id),
                    "bot_name": str(bot.bot_name or ""),
                    "user_id": str(bot.user_id or user_id),
                    "creator_name": creator_name,
                    "asset": bot.asset,
                    "asset_type": bot.asset_type,
                    "market": str(bot.market or "VN_STOCK"),
                    "is_paper_trading": str(bot.paper_trading_run_first or "").upper()
                    != "PENDING",
                    "created_at": (
                        created_at.isoformat()
                        if isinstance(created_at, datetime)
                        else created_at
                    ),
                    "run_at": bot.run_at,
                    "paper_trading_run_at": bot.paper_trading_run_at,
                    "paper_trade_first_order": bot.paper_trade_first_order,
                }
            )
        return rows

    # ------------------------------------------------------------------
    # GET /course/admin/users
    # ------------------------------------------------------------------

    @classmethod
    def get_users(cls) -> List[Dict[str, Any]]:
        with DatabaseManager.session as session:
            users = session.query(PlatformUser).all()
            enrollment_index = cls._build_enrollment_index(session)
            return [
                {
                    "id": str(user.user_id),
                    "email": str(user.email or ""),
                    "full_name": cls._extract_name(user),
                    "display_name": cls._extract_display_name(user),
                    "phone": cls._extract_phone(user),
                    "package": enrollment_index.get(
                        str(user.user_id), {"package": "SILVER"}
                    )["package"],
                    "courses_id": enrollment_index.get(
                        str(user.user_id), {"courses_id": []}
                    )["courses_id"],
                    "created_at": cls._parse_iso(user.created_at),
                    "last_login": cls._parse_iso(user.last_login),
                }
                for user in users
            ]

    # ------------------------------------------------------------------
    # GET /admin/user
    # ------------------------------------------------------------------

    @classmethod
    def get_user_detail(cls, user_id: str) -> Dict[str, Any]:
        target_user_id = str(user_id or "").strip()
        if not target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required"
            )

        with DatabaseManager.session as session:
            user = session.get(PlatformUser, target_user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
                )

            subscription_plan = str(user.subscription_plan or "LEARNER").upper()
            registration_plan_date = user.registration_plan_date
            plan_expire_date = (
                registration_plan_date + timedelta(days=30)
                if registration_plan_date
                else None
            )
            creator_name = cls._extract_creator_name(user)

            return {
                "user_id": str(user.user_id),
                "name": cls._extract_name(user),
                "email": str(user.email or ""),
                "created_at": cls._parse_iso(user.created_at),
                "updated_at": None,
                "is_first_login": user.is_first_login,
                "subscription_package": cls._get_package(
                    session, str(user.user_id), DEFAULT_COURSE_ID
                ),
                "subscription_plan": subscription_plan,
                "registration_plan_date": (
                    registration_plan_date.isoformat()
                    if registration_plan_date
                    else None
                ),
                "plan_expire_date": (
                    plan_expire_date.isoformat() if plan_expire_date else None
                ),
                "paper_trading_bot_limit": _PAPER_TRADING_BOT_LIMIT.get(
                    subscription_plan, 1
                ),
                "strategies": cls._bot_summary_rows(
                    session, str(user.user_id), creator_name
                ),
            }
