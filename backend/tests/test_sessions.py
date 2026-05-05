from datetime import datetime, timezone


def test_session_ingestion_calculates_started_at_and_stores_json(client):
    response = client.post(
        "/api/sessions",
        json={
            "script_name": "Wintertodt",
            "stopped_at": "2026-05-04T12:00:00Z",
            "run_time_seconds": 3600,
            "experience_gained": 125000,
            "runtime_info": {"success": True, "world": 307},
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["script_name"] == "Wintertodt"
    assert data["started_at"] == "2026-05-04T11:00:00Z"
    assert data["runtime_info"] == {"success": True, "world": 307}


def test_zero_second_runtime(client):
    response = client.post(
        "/api/sessions",
        json={
            "script_name": "Banker",
            "stopped_at": "2026-05-04T12:00:00Z",
            "run_time_seconds": 0,
            "experience_gained": 0,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["started_at"] == data["stopped_at"]


def test_150_hour_runtime(client):
    response = client.post(
        "/api/sessions",
        json={
            "script_name": "Miner",
            "stopped_at": "2026-05-04T12:00:00Z",
            "run_time_seconds": 540000,
            "experience_gained": 999999,
            "runtime_info": {"status": "completed"},
        },
    )

    assert response.status_code == 201
    assert response.json()["started_at"] == "2026-04-28T06:00:00Z"


def test_sessions_can_filter_by_script(client):
    for script_name in ["Miner", "Miner", "Crafter"]:
        client.post(
            "/api/sessions",
            json={
                "script_name": script_name,
                "stopped_at": "2026-05-04T12:00:00Z",
                "run_time_seconds": 10,
                "experience_gained": 1,
            },
        )

    response = client.get("/api/sessions?script_name=Miner")

    assert response.status_code == 200
    assert [session["script_name"] for session in response.json()] == ["Miner", "Miner"]


def test_script_aggregation_and_health_counts(client):
    payloads = [
        ("Agility", 100, 1000, {"success": True}),
        ("Agility", 200, 2500, {"status": "failed"}),
        ("Agility", 300, 3000, {"lap_count": 42}),
        ("Fishing", 50, 750, {"status": "ok"}),
    ]
    for script_name, runtime, xp, runtime_info in payloads:
        client.post(
            "/api/sessions",
            json={
                "script_name": script_name,
                "stopped_at": datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc).isoformat(),
                "run_time_seconds": runtime,
                "experience_gained": xp,
                "runtime_info": runtime_info,
            },
        )

    response = client.get("/api/scripts/Agility/health")

    assert response.status_code == 200
    data = response.json()
    assert data["script_name"] == "Agility"
    assert data["run_count"] == 3
    assert data["average_runtime_seconds"] == 200
    assert data["total_experience_gained"] == 6500
    assert data["recent_success_count"] == 1
    assert data["recent_failure_count"] == 1
    assert data["recent_unknown_count"] == 1
