from fastapi.testclient import TestClient


def _csrf_headers(client: TestClient) -> dict[str, str]:
    csrf = client.cookies.get("csrf_token")
    assert csrf
    return {"X-CSRF-Token": csrf}


def _register_creator(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "creator@example.com",
            "password": "password123",
            "name": "Creator",
            "role": "creator",
        },
    )
    assert response.status_code == 201


def test_auth_flow_with_cookies_and_csrf(client: TestClient) -> None:
    _register_creator(client)

    assert client.cookies.get("access_token")
    assert client.cookies.get("refresh_token")
    assert client.cookies.get("csrf_token")

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user"]["email"] == "creator@example.com"

    refresh_response = client.post("/api/v1/auth/refresh", headers=_csrf_headers(client))
    assert refresh_response.status_code == 200

    logout_response = client.post("/api/v1/auth/logout", headers=_csrf_headers(client))
    assert logout_response.status_code == 200

    me_after_logout = client.get("/api/v1/auth/me")
    assert me_after_logout.status_code == 401


def test_form_e2e_flow(client: TestClient) -> None:
    _register_creator(client)

    create_payload = {
        "title": "????? ?? ???????",
        "description": "??????? ???????????",
        "access_mode": "public",
        "limit_one_per_user": False,
        "questions": [
            {
                "type": "text",
                "text": "??? ????????????",
                "description": "",
                "order_index": 0,
                "is_required": True,
                "config": {},
                "options": [],
            },
            {
                "type": "scale",
                "text": "??????? ???????",
                "description": "",
                "order_index": 1,
                "is_required": True,
                "config": {"min_value": 1, "max_value": 5, "step": 1},
                "options": [],
            },
        ],
    }

    create_response = client.post("/api/v1/forms", json=create_payload, headers=_csrf_headers(client))
    assert create_response.status_code == 201
    created_form = create_response.json()
    form_id = created_form["id"]

    publish_response = client.post(f"/api/v1/forms/{form_id}/publish", headers=_csrf_headers(client))
    assert publish_response.status_code == 200
    slug = publish_response.json()["public_slug"]

    public_form_response = client.get(f"/api/v1/forms/public/{slug}")
    assert public_form_response.status_code == 200
    public_form = public_form_response.json()
    assert public_form["title"] == "????? ?? ???????"

    text_question_id = public_form["questions"][0]["id"]
    scale_question_id = public_form["questions"][1]["id"]

    submit_response = client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={
            "answers": [
                {"question_id": text_question_id, "value": "???????????"},
                {"question_id": scale_question_id, "value": 4},
            ]
        },
    )
    assert submit_response.status_code == 200

    responses_response = client.get(f"/api/v1/forms/{form_id}/responses")
    assert responses_response.status_code == 200
    assert len(responses_response.json()) == 1

    analytics_response = client.get(f"/api/v1/forms/{form_id}/analytics")
    assert analytics_response.status_code == 200
    assert analytics_response.json()["total_responses"] == 1

    export_response = client.get(f"/api/v1/forms/{form_id}/responses/export")
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("text/csv")
