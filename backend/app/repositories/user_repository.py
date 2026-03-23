from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return self.db.scalar(stmt)

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def create(self, *, email: str, password_hash: str, name: str | None, role: str) -> User:
        user = User(email=email, password_hash=password_hash, name=name, role=role)
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user
