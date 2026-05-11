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


def _form_payload(title: str = "Форма обратной связи") -> dict:
    return {
        "title": title,
        "description": "Короткое описание формы",
        "access_mode": "unlisted",
        "limit_one_per_user": False,
        "questions": [
            {
                "type": "text",
                "text": "Ваш комментарий",
                "description": "",
                "order_index": 0,
                "is_required": True,
                "config": {"min_length": 2, "max_length": 500},
                "options": [],
            },
            {
                "type": "single_choice",
                "text": "Выберите вариант",
                "description": "",
                "order_index": 1,
                "is_required": False,
                "config": {},
                "options": [
                    {"text": "Первый", "order_index": 0},
                    {"text": "Второй", "order_index": 1},
                ],
            },
        ],
    }


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


def test_form_create_list_and_get(client: TestClient) -> None:
    _register_creator(client)

    create_response = client.post("/api/v1/forms", json=_form_payload(), headers=_csrf_headers(client))
    assert create_response.status_code == 201
    created = create_response.json()

    assert created["title"] == "Форма обратной связи"
    assert created["description"] == "Короткое описание формы"
    assert created["is_published"] is False
    assert created["public_slug"] is None
    assert len(created["questions"]) == 2
    assert created["questions"][1]["options"][0]["text"] == "Первый"

    list_response = client.get("/api/v1/forms")
    assert list_response.status_code == 200
    forms = list_response.json()
    assert len(forms) == 1
    assert forms[0]["id"] == created["id"]
    assert forms[0]["title"] == "Форма обратной связи"

    get_response = client.get(f"/api/v1/forms/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["questions"][0]["text"] == "Ваш комментарий"


def test_form_update_replaces_main_fields_and_questions(client: TestClient) -> None:
    _register_creator(client)

    create_response = client.post("/api/v1/forms", json=_form_payload(), headers=_csrf_headers(client))
    form_id = create_response.json()["id"]

    update_payload = {
        "title": "Обновленная форма",
        "description": "Новое описание",
        "access_mode": "authenticated",
        "limit_one_per_user": True,
        "questions": [
            {
                "type": "scale",
                "text": "Оцените качество",
                "description": "",
                "order_index": 0,
                "is_required": True,
                "config": {"min_value": 1, "max_value": 5, "step": 1},
                "options": [],
            }
        ],
    }

    update_response = client.put(
        f"/api/v1/forms/{form_id}",
        json=update_payload,
        headers=_csrf_headers(client),
    )
    assert update_response.status_code == 200
    updated = update_response.json()

    assert updated["title"] == "Обновленная форма"
    assert updated["access_mode"] == "authenticated"
    assert updated["limit_one_per_user"] is True
    assert len(updated["questions"]) == 1
    assert updated["questions"][0]["type"] == "scale"
    assert updated["questions"][0]["config"]["max_value"] == 5


def test_form_delete_removes_form(client: TestClient) -> None:
    _register_creator(client)

    create_response = client.post("/api/v1/forms", json=_form_payload(), headers=_csrf_headers(client))
    form_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/forms/{form_id}", headers=_csrf_headers(client))
    assert delete_response.status_code == 200
    assert delete_response.json()["detail"] == "Form deleted"

    get_response = client.get(f"/api/v1/forms/{form_id}")
    assert get_response.status_code == 404

    list_response = client.get("/api/v1/forms")
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_form_mutations_require_csrf(client: TestClient) -> None:
    _register_creator(client)

    create_response = client.post("/api/v1/forms", json=_form_payload())
    assert create_response.status_code == 403


def test_creator_cannot_access_another_creators_form(client: TestClient) -> None:
    _register_creator(client)
    create_response = client.post("/api/v1/forms", json=_form_payload(), headers=_csrf_headers(client))
    form_id = create_response.json()["id"]

    client.post("/api/v1/auth/logout", headers=_csrf_headers(client))
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "other@example.com",
            "password": "password123",
            "name": "Other Creator",
            "role": "creator",
        },
    )
    assert register_response.status_code == 201

    get_response = client.get(f"/api/v1/forms/{form_id}")
    assert get_response.status_code == 404

    update_response = client.put(
        f"/api/v1/forms/{form_id}",
        json=_form_payload("Попытка обновления"),
        headers=_csrf_headers(client),
    )
    assert update_response.status_code == 404

    delete_response = client.delete(f"/api/v1/forms/{form_id}", headers=_csrf_headers(client))
    assert delete_response.status_code == 404


def test_form_e2e_flow(client: TestClient) -> None:
    _register_creator(client)

    create_payload = {
        "title": "Форма по событию",
        "description": "Короткая регистрация",
        "access_mode": "public",
        "limit_one_per_user": False,
        "questions": [
            {
                "type": "text",
                "text": "Имя участника",
                "description": "",
                "order_index": 0,
                "is_required": True,
                "config": {},
                "options": [],
            },
            {
                "type": "scale",
                "text": "Оцените событие",
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
    assert public_form["title"] == "Форма по событию"

    text_question_id = public_form["questions"][0]["id"]
    scale_question_id = public_form["questions"][1]["id"]

    submit_response = client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={
            "answers": [
                {"question_id": text_question_id, "value": "Александр"},
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
