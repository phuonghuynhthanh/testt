from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSONB

from config.database import FastModel


class PlatformUser(FastModel):
    """Lightweight mapping onto platform `users` for Blog auth reads."""

    __tablename__ = "users"

    user_id = Column(Text, primary_key=True)
    email = Column(Text)
    role = Column(Text)
    scopes = Column(JSONB)
