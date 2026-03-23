from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.deps import get_current_user, validate_csrf
from app.core.security import TokenError, clear_auth_cookies, decode_token, generate_csrf_token, set_auth_cookies
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, MessageResponse, RegisterRequest, UserPublic
from app.services.auth_service import AuthService

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    service = AuthService(db)
    user = service.register(payload)
    db.commit()

    access_token, refresh_token = service.issue_tokens(user)
    csrf_token = generate_csrf_token()
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    return AuthResponse(user=UserPublic.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    service = AuthService(db)
    user = service.authenticate(payload)

    access_token, refresh_token = service.issue_tokens(user)
    csrf_token = generate_csrf_token()
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    return AuthResponse(user=UserPublic.model_validate(user))


@router.post("/refresh", response_model=AuthResponse, dependencies=[Depends(validate_csrf)])
def refresh(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
) -> AuthResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except TokenError:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.get(User, int(payload["sub"]))
    if not user:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    access_token, new_refresh_token = AuthService.issue_tokens(user)
    csrf_token = generate_csrf_token()
    set_auth_cookies(response, access_token, new_refresh_token, csrf_token)

    return AuthResponse(user=UserPublic.model_validate(user))


@router.post("/logout", response_model=MessageResponse, dependencies=[Depends(validate_csrf)])
def logout(response: Response) -> MessageResponse:
    clear_auth_cookies(response)
    return MessageResponse(detail="Logged out")


@router.get("/me", response_model=AuthResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> AuthResponse:
    return AuthResponse(user=UserPublic.model_validate(current_user))
