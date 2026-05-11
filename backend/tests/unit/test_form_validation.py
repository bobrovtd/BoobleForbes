import pytest
from pydantic import ValidationError

from app.schemas.form import QuestionCreate


def test_choice_question_requires_options() -> None:
    with pytest.raises(ValidationError):
        QuestionCreate(
            type="single_choice",
            text="Выберите вариант",
            order_index=0,
            is_required=True,
            options=[],
            config={},
        )


def test_scale_question_requires_min_max() -> None:
    with pytest.raises(ValidationError):
        QuestionCreate(
            type="scale",
            text="Оценка",
            order_index=0,
            is_required=True,
            options=[],
            config={"step": 1},
        )


def test_valid_scale_question() -> None:
    question = QuestionCreate(
        type="scale",
        text="Оценка",
        order_index=0,
        is_required=True,
        options=[],
        config={"min_value": 1, "max_value": 5, "step": 1},
    )

    assert question.type == "scale"
