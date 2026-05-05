from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import SessionRecord
from app.schemas import ScriptHealth, SessionRead


def _success_value(runtime_info: dict) -> bool | None:
    value = runtime_info.get("success")
    if isinstance(value, bool):
        return value

    status = runtime_info.get("status")
    if isinstance(status, str):
        normalized = status.strip().lower()
        if normalized in {"success", "succeeded", "complete", "completed", "ok", "passed"}:
            return True
        if normalized in {"failure", "failed", "error", "errored", "crashed"}:
            return False

    return None


def build_health(db: Session, script_name: str | None = None, limit: int = 25) -> list[ScriptHealth]:
    aggregate_stmt = (
        select(
            SessionRecord.script_name,
            func.count(SessionRecord.id).label("run_count"),
            func.avg(SessionRecord.run_time_seconds).label("average_runtime_seconds"),
            func.max(SessionRecord.stopped_at).label("latest_stopped_at"),
            func.coalesce(func.sum(SessionRecord.experience_gained), 0).label("total_experience_gained"),
        )
        .group_by(SessionRecord.script_name)
        .order_by(desc("latest_stopped_at"))
    )
    if script_name is not None:
        aggregate_stmt = aggregate_stmt.where(SessionRecord.script_name == script_name)

    rows = db.execute(aggregate_stmt).all()
    summaries: list[ScriptHealth] = []

    for row in rows:
        session_stmt = (
            select(SessionRecord)
            .where(SessionRecord.script_name == row.script_name)
            .order_by(SessionRecord.stopped_at.desc(), SessionRecord.id.desc())
            .limit(limit)
        )
        recent_records = db.scalars(session_stmt).all()
        recent_sessions = [SessionRead.from_record(record) for record in recent_records]

        success_count = 0
        failure_count = 0
        unknown_count = 0
        for record in recent_records:
            success = _success_value(record.runtime_info or {})
            if success is True:
                success_count += 1
            elif success is False:
                failure_count += 1
            else:
                unknown_count += 1

        summaries.append(
            ScriptHealth(
                script_name=row.script_name,
                run_count=row.run_count,
                average_runtime_seconds=float(row.average_runtime_seconds or 0),
                latest_stopped_at=row.latest_stopped_at,
                total_experience_gained=row.total_experience_gained,
                recent_success_count=success_count,
                recent_failure_count=failure_count,
                recent_unknown_count=unknown_count,
                recent_sessions=recent_sessions,
            )
        )

    return summaries
