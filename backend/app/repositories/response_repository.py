from collections.abc import Sequence

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.response import Answer, Response


class ResponseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_response(self, *, form_id: int, respondent_id: int | None) -> Response:
        response = Response(form_id=form_id, respondent_id=respondent_id)
        self.db.add(response)
        self.db.flush()
        self.db.refresh(response)
        return response

    def add_answer(self, *, response_id: int, question_id: int, value: str | None) -> Answer:
        answer = Answer(response_id=response_id, question_id=question_id, value=value)
        self.db.add(answer)
        self.db.flush()
        return answer

    def has_user_response(self, *, form_id: int, respondent_id: int) -> bool:
        stmt = select(func.count(Response.id)).where(
            and_(Response.form_id == form_id, Response.respondent_id == respondent_id)
        )
        count = self.db.scalar(stmt) or 0
        return count > 0

    def list_by_form(self, form_id: int) -> Sequence[Response]:
        stmt = (
            select(Response)
            .where(Response.form_id == form_id)
            .order_by(Response.submitted_at.desc())
            .options(selectinload(Response.answers).selectinload(Answer.question))
        )
        return self.db.scalars(stmt).all()

    def count_by_form(self, form_id: int) -> int:
        stmt = select(func.count(Response.id)).where(Response.form_id == form_id)
        return int(self.db.scalar(stmt) or 0)
