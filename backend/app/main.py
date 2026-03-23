import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth_router, forms_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import PayloadLimitMiddleware, RequestLoggingMiddleware

settings = get_settings()


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(PayloadLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    @app.get("/health")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth_router, prefix=settings.api_prefix)
    app.include_router(forms_router, prefix=settings.api_prefix)

    return app


app = create_app()
