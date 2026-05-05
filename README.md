# Script Status

Docker-first monorepo for recording completed RuneScape bot sessions and viewing script health.

## Stack

- FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL
- React, TypeScript, Vite, TanStack Query, Tailwind CSS
- Pytest and Vitest
- Docker Compose for local and small-VM production deployments

## Local Run

Start Docker Desktop first, then run this from the repository root:

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

The backend container runs `alembic upgrade head` before starting Uvicorn.

If startup fails with an error mentioning `dockerDesktopLinuxEngine`, Docker Desktop is not running or has not finished starting.

Stop the local stack:

```bash
docker compose down
```

Reset the local database and start from a clean PostgreSQL volume:

```bash
docker compose down -v
docker compose up --build
```

## API

Create a completed session:

```bash
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "script_name": "Agility",
    "stopped_at": "2026-05-04T12:00:00Z",
    "run_time_seconds": 5400,
    "experience_gained": 32000,
    "status": "SUCCESS",
    "runtime_info": {"success": true, "lap_count": 120}
  }'
```

Available endpoints:

- `POST /api/sessions`
- `GET /api/sessions?script_name=Agility`
- `GET /api/scripts`
- `GET /api/scripts/{script_name}/health`

`started_at` is calculated as `stopped_at - run_time_seconds`; it is not stored.

The dashboard and script health endpoints only use sessions from the past 30 days for visible sessions, run counts, average runtime, recent XP totals, and health counts.
Sessions with `MISSING_REQUIREMENTS` are shown and counted, but are excluded from average runtime calculations.

`status` is stored as a flexible string so new statuses can be added without changing the database type. If omitted, it defaults to `UNKNOWN`. Current sender statuses are:

- `SUCCESS`
- `STUCK`
- `MISSING_REQUIREMENTS`
- `ERROR`
- `UNKNOWN`

Health counts use the explicit status:

- Success: `SUCCESS`
- Unknown: `UNKNOWN`
- Failure: any other status

Fields such as `success` or `status` inside `runtime_info` are stored but are not used for health classification.
