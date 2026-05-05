from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SessionRecord(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint("run_time_seconds >= 0", name="ck_sessions_run_time_seconds_nonnegative"),
        CheckConstraint("experience_gained >= 0", name="ck_sessions_experience_gained_nonnegative"),
        CheckConstraint("length(status) > 0", name="ck_sessions_status_nonempty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    script_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    stopped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    run_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    experience_gained: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="UNKNOWN")
    runtime_info: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
