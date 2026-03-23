from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AnswerSubmit(BaseModel):
    question_id: int
    value: Any


class SubmitResponseRequest(BaseModel):
    answers: list[AnswerSubmit] = Field(default_factory=list)


class AnswerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    value: str | None = None


class ResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int
    respondent_id: int | None
    submitted_at: datetime
    answers: list[AnswerRead] = Field(default_factory=list)


class ResponseListRow(BaseModel):
    response_id: int
    respondent_id: int | None
    submitted_at: datetime
    answers: dict[str, Any]


class TextAnalytics(BaseModel):
    question_id: int
    question_text: str
    responses: list[str]


class ChoiceAnalytics(BaseModel):
    question_id: int
    question_text: str
    counts: dict[str, int]


class ScaleAnalytics(BaseModel):
    question_id: int
    question_text: str
    average: float | None
    median: float | None
    distribution: dict[str, int]


class FormAnalytics(BaseModel):
    total_responses: int
    text_questions: list[TextAnalytics]
    choice_questions: list[ChoiceAnalytics]
    scale_questions: list[ScaleAnalytics]


class SubmitResponseResult(BaseModel):
    detail: str
    response_id: int
