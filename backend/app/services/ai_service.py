import json
import logging
from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.core.config import get_settings
from app.models.enums import QuestionType
from app.schemas.form import (
    AIGeneratedForm,
    AIGeneratedFormDraft,
    OptionCreate,
    QuestionCreate,
)

logger = logging.getLogger(__name__)
settings = get_settings()

FORM_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": ["text", "single_choice", "multiple_choice", "scale", "date"],
                    },
                    "required": {"type": "boolean"},
                    "options": {"type": "array", "items": {"type": "string"}},
                    "min_value": {"type": "number"},
                    "max_value": {"type": "number"},
                    "step": {"type": "number"},
                },
                "required": ["text", "type"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "questions"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = (
    "You are a form-building assistant. Convert user description to JSON that strictly matches the schema. "
    "All questions must be in Russian language."
)


class AIService:
    def __init__(self) -> None:
        self.api_key = settings.cerebras_api_key
        self.model = settings.cerebras_model

    def generate_form_draft(self, prompt: str) -> AIGeneratedFormDraft:
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cerebras API key is not configured",
            )

        payload = self._call_cerebras(prompt)
        try:
            generated = AIGeneratedForm.model_validate(payload)
        except ValidationError as exc:
            logger.warning("Invalid AI schema output: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI returned invalid schema output",
            ) from exc

        questions: list[QuestionCreate] = []
        for index, question in enumerate(generated.questions):
            config: dict[str, Any] = {}
            options: list[OptionCreate] = []

            if question.type in {QuestionType.single_choice, QuestionType.multiple_choice}:
                options = [
                    OptionCreate(text=option_text, order_index=option_index)
                    for option_index, option_text in enumerate(question.options)
                ]

            if question.type == QuestionType.scale:
                config = {
                    "min_value": question.min_value if question.min_value is not None else 1,
                    "max_value": question.max_value if question.max_value is not None else 10,
                    "step": question.step if question.step is not None else 1,
                }

            questions.append(
                QuestionCreate(
                    type=question.type,
                    text=question.text,
                    order_index=index,
                    is_required=question.required,
                    config=config,
                    options=options,
                )
            )

        return AIGeneratedFormDraft(
            title=generated.title,
            description=generated.description,
            questions=questions,
        )

    def _call_cerebras(self, prompt: str) -> dict[str, Any]:
        try:
            from cerebras.cloud.sdk import Cerebras
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="cerebras_cloud_sdk is not installed",
            ) from exc

        try:
            client = Cerebras(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "generated_form",
                        "strict": True,
                        "schema": FORM_JSON_SCHEMA,
                    },
                },
                temperature=0.2,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Cerebras request failed", exc_info=exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Cerebras API request failed",
            ) from exc

        content = response.choices[0].message.content
        if isinstance(content, dict):
            return content
        if isinstance(content, str):
            try:
                return json.loads(content)
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="AI response is not valid JSON",
                ) from exc

        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unexpected AI response format")
