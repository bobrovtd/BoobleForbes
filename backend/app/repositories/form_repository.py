from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.question import Option, Question
from app.schemas.form import FormCreate, FormUpdate, QuestionCreate


class FormRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_owner(self, owner_id: int) -> Sequence[Form]:
        stmt = (
            select(Form)
            .where(Form.created_by == owner_id)
            .order_by(Form.created_at.desc())
        )
        return self.db.scalars(stmt).all()

    def get_owned_form(self, form_id: int, owner_id: int) -> Form | None:
        stmt = (
            select(Form)
            .where(Form.id == form_id, Form.created_by == owner_id)
            .options(selectinload(Form.questions).selectinload(Question.options))
        )
        return self.db.scalar(stmt)

    def get_by_id_with_questions(self, form_id: int) -> Form | None:
        stmt = (
            select(Form)
            .where(Form.id == form_id)
            .options(selectinload(Form.questions).selectinload(Question.options))
        )
        return self.db.scalar(stmt)

    def get_public_by_slug(self, slug: str) -> Form | None:
        stmt = (
            select(Form)
            .where(Form.public_slug == slug, Form.is_published.is_(True))
            .options(selectinload(Form.questions).selectinload(Question.options))
        )
        return self.db.scalar(stmt)

    def create_form(self, payload: FormCreate, owner_id: int) -> Form:
        form = Form(
            title=payload.title,
            description=payload.description,
            access_mode=payload.access_mode,
            limit_one_per_user=payload.limit_one_per_user,
            created_by=owner_id,
        )
        self.db.add(form)
        self.db.flush()
        self._create_questions(form.id, payload.questions)
        self.db.flush()
        self.db.refresh(form)
        return self.get_by_id_with_questions(form.id) or form

    def update_form(self, form: Form, payload: FormUpdate) -> Form:
        form.title = payload.title
        form.description = payload.description
        form.access_mode = payload.access_mode
        form.limit_one_per_user = payload.limit_one_per_user

        self.db.execute(delete(Question).where(Question.form_id == form.id))
        self.db.flush()
        self._create_questions(form.id, payload.questions)
        self.db.flush()
        self.db.refresh(form)
        return self.get_by_id_with_questions(form.id) or form

    def delete_form(self, form: Form) -> None:
        self.db.delete(form)

    def _create_questions(self, form_id: int, questions: list[QuestionCreate]) -> None:
        for question_payload in questions:
            question = Question(
                form_id=form_id,
                type=question_payload.type,
                text=question_payload.text,
                description=question_payload.description,
                order_index=question_payload.order_index,
                is_required=question_payload.is_required,
                config=question_payload.config,
            )
            self.db.add(question)
            self.db.flush()

            for option_payload in question_payload.options:
                option = Option(
                    question_id=question.id,
                    text=option_payload.text,
                    order_index=option_payload.order_index,
                )
                self.db.add(option)
