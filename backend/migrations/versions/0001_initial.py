"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-23 11:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

user_role_enum = sa.Enum("admin", "creator", "respondent", name="userrole")
access_mode_enum = sa.Enum("public", "unlisted", "authenticated", name="accessmode")
question_type_enum = sa.Enum("text", "single_choice", "multiple_choice", "scale", "date", name="questiontype")


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    access_mode_enum.create(bind, checkfirst=True)
    question_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("role", user_role_enum, nullable=False, server_default="respondent"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "forms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("access_mode", access_mode_enum, nullable=False, server_default="unlisted"),
        sa.Column("limit_one_per_user", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("public_slug", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_forms_created_by", "forms", ["created_by"], unique=False)
    op.create_index("ix_forms_public_slug", "forms", ["public_slug"], unique=True)

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("form_id", sa.Integer(), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", question_type_enum, nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("config", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.create_index("ix_questions_form_id", "questions", ["form_id"], unique=False)

    op.create_table(
        "options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
    )
    op.create_index("ix_options_question_id", "options", ["question_id"], unique=False)

    op.create_table(
        "responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("form_id", sa.Integer(), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("respondent_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_responses_form_id", "responses", ["form_id"], unique=False)
    op.create_index("ix_responses_respondent_id", "responses", ["respondent_id"], unique=False)

    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("response_id", sa.Integer(), sa.ForeignKey("responses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("file_url", sa.Text(), nullable=True),
    )
    op.create_index("ix_answers_response_id", "answers", ["response_id"], unique=False)
    op.create_index("ix_answers_question_id", "answers", ["question_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_answers_question_id", table_name="answers")
    op.drop_index("ix_answers_response_id", table_name="answers")
    op.drop_table("answers")

    op.drop_index("ix_responses_respondent_id", table_name="responses")
    op.drop_index("ix_responses_form_id", table_name="responses")
    op.drop_table("responses")

    op.drop_index("ix_options_question_id", table_name="options")
    op.drop_table("options")

    op.drop_index("ix_questions_form_id", table_name="questions")
    op.drop_table("questions")

    op.drop_index("ix_forms_public_slug", table_name="forms")
    op.drop_index("ix_forms_created_by", table_name="forms")
    op.drop_table("forms")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    question_type_enum.drop(bind, checkfirst=True)
    access_mode_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
