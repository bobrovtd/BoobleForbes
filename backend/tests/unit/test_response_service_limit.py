import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import AccessMode, QuestionType, UserRole
from app.models.form import Form
from app.models.question import Question
from app.models.user import User
from app.schemas.response import SubmitResponseRequest
from app.services.response_service import ResponseService


def test_limit_one_response_per_user(db_session: Session) -> None:
    user = User(email="creator@test.local", password_hash="hash", role=UserRole.creator)
    db_session.add(user)
    db_session.flush()

    form = Form(
        title="Feedback",
        description="",
        created_by=user.id,
        access_mode=AccessMode.authenticated,
        limit_one_per_user=True,
        is_published=True,
        public_slug="slug",
    )
    db_session.add(form)
    db_session.flush()

    question = Question(
        form_id=form.id,
        type=QuestionType.text,
        text="???????????",
        order_index=0,
        is_required=False,
        config={},
    )
    db_session.add(question)
    db_session.commit()

    service = ResponseService(db_session)
    payload = SubmitResponseRequest(answers=[])

    first_response_id = service.submit_response(form_id=form.id, payload=payload, current_user=user)
    db_session.commit()

    assert first_response_id > 0

    with pytest.raises(HTTPException) as exc:
        service.submit_response(form_id=form.id, payload=payload, current_user=user)

    assert exc.value.status_code == 409
