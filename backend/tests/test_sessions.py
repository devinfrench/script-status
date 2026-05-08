from datetime import UTC, datetime, timedelta, timezone


def test_session_ingestion_calculates_started_at_and_stores_json(client):
    response = client.post(
        "/api/sessions",
        json={
            "script_name": "Wintertodt",
            "stopped_at": "2026-05-04T12:00:00Z",
            "run_time_seconds": 3600,
            "experience_gained": 125000,
            "status": "SUCCESS",
            "runtime_info": {"success": True, "world": 307},
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["script_name"] == "Wintertodt"
    assert data["started_at"] == "2026-05-04T11:00:00Z"
    assert data["status"] == "SUCCESS"
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
    assert data["status"] == "UNKNOWN"


def test_session_status_is_flexible_and_normalized(client):
    response = client.post(
        "/api/sessions",
        json={
            "script_name": "Questing",
            "stopped_at": "2026-05-04T12:00:00Z",
            "run_time_seconds": 15,
            "experience_gained": 0,
            "status": " custom_status ",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "CUSTOM_STATUS"


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
    stopped_at = datetime.now(UTC).isoformat()
    for script_name in ["Miner", "Miner", "Crafter"]:
        client.post(
            "/api/sessions",
            json={
                "script_name": script_name,
                "stopped_at": stopped_at,
                "run_time_seconds": 10,
                "experience_gained": 1,
            },
        )
    client.post(
        "/api/sessions",
        json={
            "script_name": "Miner",
            "stopped_at": (datetime.now(UTC) - timedelta(days=31)).isoformat(),
            "run_time_seconds": 10,
            "experience_gained": 1,
        },
    )

    response = client.get("/api/sessions?script_name=Miner")

    assert response.status_code == 200
    assert [session["script_name"] for session in response.json()] == ["Miner", "Miner"]


def test_script_aggregation_and_health_counts(client):
    stopped_at = datetime.now(UTC).isoformat()
    payloads = [
        ("Agility", 100, 1000, "SUCCESS", {"success": False}),
        ("Agility", 1800, 0, "STUCK", {"status": "ok"}),
        ("Agility", 1799, 0, "UNKNOWN", {"status": "failed"}),
        ("Agility", 7200, 0, "MISSING_REQUIREMENTS", {"missing": "pickaxe"}),
        ("Fishing", 50, 750, "SUCCESS", {"status": "ok"}),
    ]
    for script_name, runtime, xp, status, runtime_info in payloads:
        client.post(
            "/api/sessions",
            json={
                "script_name": script_name,
                "stopped_at": stopped_at,
                "run_time_seconds": runtime,
                "experience_gained": xp,
                "status": status,
                "runtime_info": runtime_info,
            },
        )
    client.post(
        "/api/sessions",
        json={
            "script_name": "Agility",
            "stopped_at": (datetime.now(UTC) - timedelta(days=31)).isoformat(),
            "run_time_seconds": 9999,
            "experience_gained": 999999,
            "status": "SUCCESS",
            "runtime_info": {"status": "ok"},
        },
    )

    response = client.get("/api/scripts/Agility/health")

    assert response.status_code == 200
    data = response.json()
    assert data["script_name"] == "Agility"
    assert data["run_count"] == 4
    assert data["average_runtime_seconds"] == 1233
    assert data["total_experience_gained"] == 1000
    assert data["recent_success_count"] == 1
    assert data["recent_failure_count"] == 1
    assert data["recent_unknown_count"] == 1
