from sqlalchemy import Boolean, Column, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB

from config.database import FastModel


class PlatformUser(FastModel):
    """Lightweight mapping onto platform `users` for role and profile reads."""

    __tablename__ = "users"

    user_id = Column(Text, primary_key=True)
    email = Column(Text)
    role = Column(Text)
    user_profile = Column(JSONB)
    scopes = Column(JSONB)
    # Extra read-only columns needed by the student-admin endpoints.
    ekyc_phone = Column(Text)
    is_first_login = Column(Boolean)
    subscription_plan = Column(Text)
    registration_plan_date = Column(DateTime)
    created_at = Column(DateTime)
    last_login = Column(DateTime)


class PlatformBot(FastModel):
    """Read-only mapping onto platform `bots` for the user-detail strategies list."""

    __tablename__ = "bots"

    bot_id = Column(Text, primary_key=True)
    bot_name = Column(Text)
    user_id = Column(Text, index=True)
    asset = Column(Text)
    asset_type = Column(Text)
    market = Column(Text)
    status = Column(Text)
    run_at = Column(Text)
    paper_trading_run_at = Column(Text)
    paper_trading_run_first = Column(Text)
    paper_trade_first_order = Column(Text)
    created_at = Column(DateTime)
