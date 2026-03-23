from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import AccessMode, QuestionType


class OptionBase(BaseModel):
    text: str = Field(min_length=1, max_length=255)
    order_index: int = Field(ge=0)


class OptionCreate(OptionBase):
    pass


class OptionRead(OptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class QuestionBase(BaseModel):
    type: QuestionType
    text: str = Field(min_length=1, max_length=2000)
    description: str | None = Field(default=None, max_length=2000)
    order_index: int = Field(ge=0)
    is_required: bool = False
    config: dict[str, Any] = Field(default_factory=dict)
    options: list[OptionCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_by_type(self) -> "QuestionBase":
        cfg = self.config

        if self.type in {QuestionType.single_choice, QuestionType.multiple_choice}:
            if len(self.options) == 0:
                raise ValueError("Choice questions require options")

        if self.type == QuestionType.scale:
            min_value = cfg.get("min_value")
            max_value = cfg.get("max_value")
            step = cfg.get("step", 1)
            if min_value is None or max_value is None:
                raise ValueError("Scale question requires min_value and max_value")
            if float(min_value) >= float(max_value):
                raise ValueError("Scale min_value must be less than max_value")
            if float(step) <= 0:
                raise ValueError("Scale step must be positive")

        if self.type == QuestionType.multiple_choice:
            min_selected = cfg.get("min_selected")
            max_selected = cfg.get("max_selected")
            if min_selected is not None and max_selected is not None and int(min_selected) > int(max_selected):
                raise ValueError("min_selected cannot exceed max_selected")

        if self.type == QuestionType.text:
            min_length = cfg.get("min_length")
            max_length = cfg.get("max_length")
            if min_length is not None and max_length is not None and int(min_length) > int(max_length):
                raise ValueError("min_length cannot exceed max_length")

        return self


class QuestionCreate(QuestionBase):
    pass


class QuestionRead(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    options: list[OptionRead] = Field(default_factory=list)


class FormBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    access_mode: AccessMode = AccessMode.unlisted
    limit_one_per_user: bool = False


class FormCreate(FormBase):
    questions: list[QuestionCreate] = Field(default_factory=list)


class FormUpdate(FormBase):
    questions: list[QuestionCreate] = Field(default_factory=list)


class FormRead(FormBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime | None
    is_published: bool
    public_slug: str | None
    questions: list[QuestionRead] = Field(default_factory=list)


class FormListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime | None
    is_published: bool
    access_mode: AccessMode


class PublishResponse(BaseModel):
    public_url: str
    public_slug: str


class PublicFormRead(BaseModel):
    id: int
    title: str
    description: str | None
    access_mode: AccessMode
    limit_one_per_user: bool
    questions: list[QuestionRead]


class GenerateAIRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)


class AIGeneratedQuestion(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    type: QuestionType
    required: bool = False
    options: list[str] = Field(default_factory=list)
    min_value: float | None = None
    max_value: float | None = None
    step: float | None = None


class AIGeneratedForm(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    questions: list[AIGeneratedQuestion] = Field(default_factory=list)


class AIGeneratedFormDraft(BaseModel):
    title: str
    description: str | None = None
    access_mode: AccessMode = AccessMode.unlisted
    limit_one_per_user: bool = False
    questions: list[QuestionCreate]
