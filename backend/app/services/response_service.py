import csv
from datetime import date, datetime
import io
import json
import statistics
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import AccessMode, QuestionType
from app.models.form import Form
from app.models.question import Question
from app.models.user import User
from app.repositories.form_repository import FormRepository
from app.repositories.response_repository import ResponseRepository
from app.schemas.response import FormAnalytics, ResponseListRow, SubmitResponseRequest


class ResponseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.forms = FormRepository(db)
        self.responses = ResponseRepository(db)

    def submit_response(
        self,
        *,
        form_id: int,
        payload: SubmitResponseRequest,
        current_user: User | None,
    ) -> int:
        form = self.forms.get_by_id_with_questions(form_id)
        if not form or not form.is_published:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

        if form.access_mode == AccessMode.authenticated and not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

        if form.limit_one_per_user and current_user:
            if self.responses.has_user_response(form_id=form.id, respondent_id=current_user.id):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only one response allowed")

        answer_map = self._build_answer_map(payload)
        question_map = {question.id: question for question in form.questions}

        for question in form.questions:
            if question.is_required and question.id not in answer_map:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Missing required answer for question {question.id}",
                )

        response = self.responses.create_response(
            form_id=form.id,
            respondent_id=current_user.id if current_user else None,
        )

        for question_id, value in answer_map.items():
            question = question_map.get(question_id)
            if not question:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unknown question {question_id}",
                )
            serialized = self._validate_and_serialize_answer(question, value)
            self.responses.add_answer(response_id=response.id, question_id=question.id, value=serialized)

        return response.id

    def list_responses(self, *, form_id: int, owner_id: int) -> list[ResponseListRow]:
        form = self._get_owned_form(form_id, owner_id)
        items = self.responses.list_by_form(form.id)

        rows: list[ResponseListRow] = []
        for item in items:
            answers: dict[str, Any] = {}
            for answer in item.answers:
                question_text = answer.question.text if answer.question else str(answer.question_id)
                answers[question_text] = self._deserialize_answer(answer.value)
            rows.append(
                ResponseListRow(
                    response_id=item.id,
                    respondent_id=item.respondent_id,
                    submitted_at=item.submitted_at,
                    answers=answers,
                )
            )
        return rows

    def build_csv(self, *, form_id: int, owner_id: int) -> str:
        form = self._get_owned_form(form_id, owner_id)
        responses = self.responses.list_by_form(form.id)

        columns = [question.text for question in form.questions]
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["response_id", "respondent_id", "submitted_at", *columns])

        question_lookup = {question.id: question.text for question in form.questions}
        for response in responses:
            row_values: dict[str, str] = {question_text: "" for question_text in columns}
            for answer in response.answers:
                key = question_lookup.get(answer.question_id)
                if not key:
                    continue
                deserialized = self._deserialize_answer(answer.value)
                if isinstance(deserialized, list):
                    row_values[key] = "; ".join(str(item) for item in deserialized)
                elif isinstance(deserialized, dict):
                    row_values[key] = json.dumps(deserialized, ensure_ascii=False)
                else:
                    row_values[key] = "" if deserialized is None else str(deserialized)

            writer.writerow(
                [
                    response.id,
                    response.respondent_id,
                    response.submitted_at.isoformat(),
                    *[row_values[column] for column in columns],
                ]
            )

        return "\ufeff" + buffer.getvalue()

    def analytics(self, *, form_id: int, owner_id: int) -> FormAnalytics:
        form = self._get_owned_form(form_id, owner_id)
        responses = self.responses.list_by_form(form.id)

        question_map = {question.id: question for question in form.questions}

        text_data: dict[int, list[str]] = {}
        choice_data: dict[int, dict[str, int]] = {}
        scale_data: dict[int, list[float]] = {}

        option_text_map: dict[int, dict[int, str]] = {
            question.id: {option.id: option.text for option in question.options}
            for question in form.questions
        }

        for response in responses:
            for answer in response.answers:
                question = question_map.get(answer.question_id)
                if not question:
                    continue
                parsed = self._deserialize_answer(answer.value)

                if question.type == QuestionType.text and isinstance(parsed, str):
                    text_data.setdefault(question.id, []).append(parsed)

                if question.type == QuestionType.single_choice:
                    choice_data.setdefault(question.id, {})
                    normalized = self._normalize_choice_value(parsed, option_text_map.get(question.id, {}))
                    choice_data[question.id][normalized] = choice_data[question.id].get(normalized, 0) + 1

                if question.type == QuestionType.multiple_choice and isinstance(parsed, list):
                    choice_data.setdefault(question.id, {})
                    for item in parsed:
                        normalized = self._normalize_choice_value(item, option_text_map.get(question.id, {}))
                        choice_data[question.id][normalized] = choice_data[question.id].get(normalized, 0) + 1

                if question.type == QuestionType.scale and isinstance(parsed, (int, float)):
                    scale_data.setdefault(question.id, []).append(float(parsed))

        text_questions = [
            {
                "question_id": question.id,
                "question_text": question.text,
                "responses": text_data.get(question.id, []),
            }
            for question in form.questions
            if question.type == QuestionType.text
        ]

        choice_questions = [
            {
                "question_id": question.id,
                "question_text": question.text,
                "counts": choice_data.get(question.id, {}),
            }
            for question in form.questions
            if question.type in {QuestionType.single_choice, QuestionType.multiple_choice}
        ]

        scale_questions = []
        for question in form.questions:
            if question.type != QuestionType.scale:
                continue
            values = scale_data.get(question.id, [])
            distribution: dict[str, int] = {}
            for item in values:
                key = str(item)
                distribution[key] = distribution.get(key, 0) + 1
            scale_questions.append(
                {
                    "question_id": question.id,
                    "question_text": question.text,
                    "average": round(statistics.mean(values), 2) if values else None,
                    "median": round(statistics.median(values), 2) if values else None,
                    "distribution": distribution,
                }
            )

        return FormAnalytics(
            total_responses=len(responses),
            text_questions=text_questions,
            choice_questions=choice_questions,
            scale_questions=scale_questions,
        )

    def _get_owned_form(self, form_id: int, owner_id: int) -> Form:
        form = self.forms.get_owned_form(form_id, owner_id)
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
        return form

    @staticmethod
    def _build_answer_map(payload: SubmitResponseRequest) -> dict[int, Any]:
        answer_map: dict[int, Any] = {}
        for answer in payload.answers:
            if answer.question_id in answer_map:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Duplicate question answer")
            answer_map[answer.question_id] = answer.value
        return answer_map

    def _validate_and_serialize_answer(self, question: Question, value: Any) -> str:
        config = question.config or {}
        option_ids = {option.id for option in question.options}

        if value is None:
            return "null"

        if question.type == QuestionType.text:
            if not isinstance(value, str):
                raise HTTPException(status_code=422, detail=f"Question {question.id} expects string")
            min_length = int(config.get("min_length", 0))
            max_length = int(config.get("max_length", 10000))
            if not (min_length <= len(value) <= max_length):
                raise HTTPException(status_code=422, detail=f"Question {question.id} text length invalid")
            return value

        if question.type == QuestionType.single_choice:
            if isinstance(value, int):
                if value not in option_ids:
                    raise HTTPException(status_code=422, detail=f"Question {question.id} invalid option")
                return json.dumps(value)
            if isinstance(value, str) and config.get("allow_other"):
                return value
            raise HTTPException(status_code=422, detail=f"Question {question.id} invalid choice answer")

        if question.type == QuestionType.multiple_choice:
            if not isinstance(value, list):
                raise HTTPException(status_code=422, detail=f"Question {question.id} expects list")
            if not all(isinstance(item, int) and item in option_ids for item in value):
                raise HTTPException(status_code=422, detail=f"Question {question.id} invalid multiple choice option")
            min_selected = int(config.get("min_selected", 0))
            max_selected = int(config.get("max_selected", max(len(option_ids), 1)))
            if not (min_selected <= len(value) <= max_selected):
                raise HTTPException(status_code=422, detail=f"Question {question.id} selected count invalid")
            return json.dumps(value)

        if question.type == QuestionType.scale:
            if not isinstance(value, (int, float)):
                raise HTTPException(status_code=422, detail=f"Question {question.id} expects number")
            min_value = float(config.get("min_value", 1))
            max_value = float(config.get("max_value", 10))
            step = float(config.get("step", 1))
            numeric_value = float(value)
            if numeric_value < min_value or numeric_value > max_value:
                raise HTTPException(status_code=422, detail=f"Question {question.id} out of range")
            remainder = (numeric_value - min_value) / step
            if abs(remainder - round(remainder)) > 1e-6:
                raise HTTPException(status_code=422, detail=f"Question {question.id} step mismatch")
            return json.dumps(numeric_value)

        if question.type == QuestionType.date:
            if not isinstance(value, str):
                raise HTTPException(status_code=422, detail=f"Question {question.id} expects date string")
            with_time = bool(config.get("with_time", False))
            try:
                if with_time:
                    datetime.fromisoformat(value.replace("Z", "+00:00"))
                else:
                    date.fromisoformat(value)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=f"Question {question.id} invalid date") from exc
            return value

        raise HTTPException(status_code=422, detail=f"Question {question.id} unsupported type")

    @staticmethod
    def _deserialize_answer(value: str | None) -> Any:
        if value is None:
            return None
        if value == "null":
            return None
        try:
            return json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return value

    @staticmethod
    def _normalize_choice_value(value: Any, option_text_by_id: dict[int, str]) -> str:
        if isinstance(value, int):
            return option_text_by_id.get(value, str(value))
        return str(value)
