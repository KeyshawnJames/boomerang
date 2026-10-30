import uuid
from datetime import datetime
from typing import Literal

from pydantic import EmailStr
from sqlmodel import Field, SQLModel

from app.models import Locale, UserRole


class RegisterRequest(SQLModel):
    # Admins are created by hand, never through sign-up.
    role: Literal[UserRole.client, UserRole.driver]
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    # The upper bound keeps one request from making the server hash megabytes.
    password: str = Field(min_length=8, max_length=128)
    locale: Locale = Locale.fr


class LoginRequest(SQLModel):
    email: EmailStr
    password: str = Field(max_length=128)


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class UpdateMeRequest(SQLModel):
    phone: str = Field(max_length=30)


class UserRead(SQLModel):
    id: uuid.UUID
    role: UserRole
    name: str
    email: str
    phone: str | None
    locale: Locale
    created_at: datetime
