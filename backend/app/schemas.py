from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SessionCreate(BaseModel):
    script_name: str = Field(min_length=1, max_length=255)
    stopped_at: datetime
    run_time_seconds: int = Field(ge=0, le=2_147_483_647)
    experience_gained: int = Field(ge=0)
    runtime_info: dict[str, Any] = Field(default_factory=dict)


class SessionRead(BaseModel):
    id: int
    script_name: str
    stopped_at: datetime
    started_at: datetime
    run_time_seconds: int
    experience_gained: int
    runtime_info: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_record(cls, record: Any) -> "SessionRead":
        stopped_at = record.stopped_at
        if stopped_at.tzinfo is None:
            stopped_at = stopped_at.replace(tzinfo=UTC)
        return cls(
            id=record.id,
            script_name=record.script_name,
            stopped_at=stopped_at,
            started_at=stopped_at - timedelta(seconds=record.run_time_seconds),
            run_time_seconds=record.run_time_seconds,
            experience_gained=record.experience_gained,
            runtime_info=record.runtime_info or {},
        )


class ScriptHealth(BaseModel):
    script_name: str
    run_count: int
    average_runtime_seconds: float
    latest_stopped_at: datetime | None
    total_experience_gained: int
    recent_success_count: int
    recent_failure_count: int
    recent_unknown_count: int
    recent_sessions: list[SessionRead] = Field(default_factory=list)
