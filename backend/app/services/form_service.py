import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import AccessMode
from app.models.form import Form
from app.models.user import User
from app.repositories.form_repository import FormRepository
from app.schemas.form import FormCreate, FormUpdate

settings = get_settings()


class FormService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.forms = FormRepository(db)

    def list_user_forms(self, user_id: int) -> list[Form]:
        return list(self.forms.list_by_owner(user_id))

    def create_form(self, payload: FormCreate, owner: User) -> Form:
        self._validate_question_count(payload.questions)
        form = self.forms.create_form(payload, owner.id)
        return form

    def get_owned_form(self, form_id: int, owner_id: int) -> Form:
        form = self.forms.get_owned_form(form_id, owner_id)
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
        return form

    def update_form(self, form_id: int, payload: FormUpdate, owner_id: int) -> Form:
        self._validate_question_count(payload.questions)
        form = self.get_owned_form(form_id, owner_id)
        return self.forms.update_form(form, payload)

    def delete_form(self, form_id: int, owner_id: int) -> None:
        form = self.get_owned_form(form_id, owner_id)
        self.forms.delete_form(form)

    def publish_form(self, form_id: int, owner_id: int) -> Form:
        form = self.get_owned_form(form_id, owner_id)
        if not form.public_slug:
            form.public_slug = secrets.token_urlsafe(16)
        form.is_published = True
        return form

    def get_public_form(self, slug: str, current_user: User | None) -> Form:
        form = self.forms.get_public_by_slug(slug)
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

        if form.access_mode == AccessMode.authenticated and not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

        return form

    @staticmethod
    def _validate_question_count(questions: list) -> None:
        if len(questions) > settings.max_form_questions:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Maximum {settings.max_form_questions} questions allowed",
            )
