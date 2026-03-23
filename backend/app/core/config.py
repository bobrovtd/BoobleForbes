from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Forms"
    api_prefix: str = "/api/v1"

    secret_key: str = "change_me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    csrf_cookie_name: str = "csrf_token"
    access_cookie_name: str = "access_token"
    refresh_cookie_name: str = "refresh_token"
    cookie_domain: str | None = None
    cookie_secure: bool = False

    frontend_base_url: str = "http://localhost:5173"
    backend_base_url: str = "http://localhost:8000"

    database_url: str = "postgresql+psycopg://ai_forms_user:ai_forms_password@postgres:5432/ai_forms"

    cerebras_api_key: str | None = None
    cerebras_model: str = "llama-4-scout-17b-16e-instruct"

    max_form_questions: int = 100
    max_prompt_length: int = 2000
    max_payload_bytes: int = 10 * 1024 * 1024

    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
