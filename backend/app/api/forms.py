from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import (
    get_current_user,
    get_optional_user,
    require_creator_or_admin,
    validate_csrf,
)
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.form import (
    AIGeneratedFormDraft,
    FormCreate,
    FormListItem,
    FormRead,
    FormUpdate,
    GenerateAIRequest,
    PublicFormRead,
    PublishResponse,
)
from app.schemas.response import FormAnalytics, ResponseListRow, SubmitResponseRequest, SubmitResponseResult
from app.services.ai_service import AIService
from app.services.form_service import FormService
from app.services.response_service import ResponseService

settings = get_settings()
router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("", response_model=list[FormListItem])
def list_forms(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> list[FormListItem]:
    service = FormService(db)
    forms = service.list_user_forms(current_user.id)
    return [FormListItem.model_validate(item) for item in forms]


@router.post("", response_model=FormRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(validate_csrf)])
def create_form(
    payload: FormCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> FormRead:
    service = FormService(db)
    form = service.create_form(payload, current_user)
    db.commit()
    db.refresh(form)
    return FormRead.model_validate(form)


@router.post("/generate-ai", response_model=AIGeneratedFormDraft, dependencies=[Depends(validate_csrf)])
def generate_ai_form(
    payload: GenerateAIRequest,
    _: Annotated[User, Depends(require_creator_or_admin)],
) -> AIGeneratedFormDraft:
    ai_service = AIService()
    return ai_service.generate_form_draft(payload.prompt)


@router.get("/public/{slug}", response_model=PublicFormRead)
def get_public_form(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> PublicFormRead:
    service = FormService(db)
    form = service.get_public_form(slug, current_user)
    return PublicFormRead(
        id=form.id,
        title=form.title,
        description=form.description,
        access_mode=form.access_mode,
        limit_one_per_user=form.limit_one_per_user,
        questions=[
            {
                "id": question.id,
                "type": question.type,
                "text": question.text,
                "description": question.description,
                "order_index": question.order_index,
                "is_required": question.is_required,
                "config": question.config,
                "options": [
                    {"id": option.id, "text": option.text, "order_index": option.order_index}
                    for option in question.options
                ],
            }
            for question in form.questions
        ],
    )


@router.get("/{form_id}", response_model=FormRead)
def get_form(
    form_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> FormRead:
    service = FormService(db)
    form = service.get_owned_form(form_id, current_user.id)
    return FormRead.model_validate(form)


@router.put("/{form_id}", response_model=FormRead, dependencies=[Depends(validate_csrf)])
def update_form(
    form_id: int,
    payload: FormUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> FormRead:
    service = FormService(db)
    form = service.update_form(form_id, payload, current_user.id)
    db.commit()
    db.refresh(form)
    return FormRead.model_validate(form)


@router.delete("/{form_id}", response_model=MessageResponse, dependencies=[Depends(validate_csrf)])
def delete_form(
    form_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> MessageResponse:
    service = FormService(db)
    service.delete_form(form_id, current_user.id)
    db.commit()
    return MessageResponse(detail="Form deleted")


@router.post("/{form_id}/publish", response_model=PublishResponse, dependencies=[Depends(validate_csrf)])
def publish_form(
    form_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> PublishResponse:
    service = FormService(db)
    form = service.publish_form(form_id, current_user.id)
    db.commit()
    if not form.public_slug:
        raise HTTPException(status_code=500, detail="Failed to publish form")
    return PublishResponse(
        public_slug=form.public_slug,
        public_url=f"{settings.frontend_base_url}/f/{form.public_slug}",
    )


@router.post("/{form_id}/submit", response_model=SubmitResponseResult)
def submit_form(
    form_id: int,
    payload: SubmitResponseRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> SubmitResponseResult:
    service = ResponseService(db)
    response_id = service.submit_response(form_id=form_id, payload=payload, current_user=current_user)
    db.commit()
    return SubmitResponseResult(detail="Response submitted", response_id=response_id)


@router.get("/{form_id}/responses", response_model=list[ResponseListRow])
def form_responses(
    form_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> list[ResponseListRow]:
    service = ResponseService(db)
    return service.list_responses(form_id=form_id, owner_id=current_user.id)


@router.get("/{form_id}/responses/export")
def export_form_responses(
    form_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> Response:
    service = ResponseService(db)
    csv_content = service.build_csv(form_id=form_id, owner_id=current_user.id)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="form_{form_id}_responses.csv"'},
    )


@router.get("/{form_id}/analytics", response_model=FormAnalytics)
def form_analytics(
    form_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_creator_or_admin)],
) -> FormAnalytics:
    service = ResponseService(db)
    return service.analytics(form_id=form_id, owner_id=current_user.id)
