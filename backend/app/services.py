from datetime import UTC, datetime, timedelta

from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from app.models import SessionRecord
from app.schemas import ScriptHealth, SessionRead


HEALTH_WINDOW_DAYS = 3
HEALTH_SESSION_LIMIT = 50
AVERAGE_EXCLUDED_STATUSES = {"MISSING_REQUIREMENTS"}
HEALTH_EXCLUDED_STATUSES = {"MISSING_REQUIREMENTS"}


def _session_health(record: SessionRecord) -> str | None:
    status = record.status.upper()
    if status in HEALTH_EXCLUDED_STATUSES:
        return None
    if status == "SUCCESS":
        return "success"
    if status == "UNKNOWN":
        return "unknown"
    return "failure"


def recent_sessions_cutoff(now: datetime | None = None) -> datetime:
    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)
    return current_time - timedelta(days=HEALTH_WINDOW_DAYS)


def build_health(
    db: Session,
    script_name: str | None = None,
    limit: int = HEALTH_SESSION_LIMIT,
) -> list[ScriptHealth]:
    cutoff = recent_sessions_cutoff()
    average_runtime_seconds = func.avg(
        case(
            (
                SessionRecord.status.not_in(AVERAGE_EXCLUDED_STATUSES),
                SessionRecord.run_time_seconds,
            ),
            else_=None,
        )
    )
    aggregate_stmt = (
        select(
            SessionRecord.script_name,
            func.count(SessionRecord.id).label("run_count"),
            average_runtime_seconds.label("average_runtime_seconds"),
            func.max(SessionRecord.stopped_at).label("latest_stopped_at"),
            func.coalesce(func.sum(SessionRecord.experience_gained), 0).label("total_experience_gained"),
        )
        .where(SessionRecord.stopped_at >= cutoff)
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
            .where(SessionRecord.stopped_at >= cutoff)
            .order_by(SessionRecord.stopped_at.desc(), SessionRecord.id.desc())
            .limit(limit)
        )
        recent_records = db.scalars(session_stmt).all()
        recent_sessions = [SessionRead.from_record(record) for record in recent_records]

        success_count = 0
        failure_count = 0
        unknown_count = 0
        for record in recent_records:
            health = _session_health(record)
            if health == "success":
                success_count += 1
            elif health == "failure":
                failure_count += 1
            elif health == "unknown":
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
