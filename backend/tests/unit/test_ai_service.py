import pytest
from fastapi import HTTPException

from app.services.ai_service import AIService


def test_ai_service_generates_draft(monkeypatch: pytest.MonkeyPatch) -> None:
    service = AIService()
    service.api_key = "test"

    def fake_call(_: str) -> dict:
        return {
            "title": "??????",
            "description": "????????",
            "questions": [
                {"text": "??? ???????", "type": "text", "required": True},
                {
                    "text": "??????",
                    "type": "scale",
                    "required": True,
                    "min_value": 1,
                    "max_value": 10,
                    "step": 1,
                },
            ],
        }

    monkeypatch.setattr(service, "_call_cerebras", fake_call)

    draft = service.generate_form_draft("?????? ?????")

    assert draft.title == "??????"
    assert len(draft.questions) == 2
    assert draft.questions[1].config["max_value"] == 10


def test_ai_service_invalid_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    service = AIService()
    service.api_key = "test"

    def fake_call(_: str) -> dict:
        return {"unexpected": "payload"}

    monkeypatch.setattr(service, "_call_cerebras", fake_call)

    with pytest.raises(HTTPException) as exc:
        service.generate_form_draft("bad")

    assert exc.value.status_code == 502
