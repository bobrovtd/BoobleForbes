import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    creator = "creator"
    respondent = "respondent"


class AccessMode(str, enum.Enum):
    public = "public"
    unlisted = "unlisted"
    authenticated = "authenticated"


class QuestionType(str, enum.Enum):
    text = "text"
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    scale = "scale"
    date = "date"
