from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import SessionRecord
from app.schemas import ScriptHealth, SessionCreate, SessionRead
from app.services import build_health

settings = get_settings()

app = FastAPI(title="Script Status API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/sessions", response_model=SessionRead, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)) -> SessionRead:
    record = SessionRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return SessionRead.from_record(record)


@app.get("/api/sessions", response_model=list[SessionRead])
def list_sessions(
    script_name: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[SessionRead]:
    stmt = (
        select(SessionRecord)
        .order_by(SessionRecord.stopped_at.desc(), SessionRecord.id.desc())
        .limit(limit)
    )
    if script_name is not None:
        stmt = stmt.where(SessionRecord.script_name == script_name)
    records = db.scalars(stmt).all()
    return [SessionRead.from_record(record) for record in records]


@app.get("/api/scripts", response_model=list[ScriptHealth])
def list_scripts(db: Session = Depends(get_db)) -> list[ScriptHealth]:
    return build_health(db)


@app.get("/api/scripts/{script_name}/health", response_model=ScriptHealth)
def script_health(script_name: str, db: Session = Depends(get_db)) -> ScriptHealth:
    summaries = build_health(db, script_name=script_name)
    if not summaries:
        raise HTTPException(status_code=404, detail="Script not found")
    return summaries[0]
