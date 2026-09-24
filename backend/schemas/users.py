from __future__ import annotations

import re
from typing import Literal, Optional

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, Field, field_validator

UserRole = Literal["tenant", "landlord"]
UserStatus = Literal["pending", "approved", "rejected"]

# Login może być adresem e-mail albo zwykłą nazwą użytkownika (bez znaku "@") -
# patrz `_normalize_identifier` niżej. Wspólny wzorzec dla loginów.
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")


def _normalize_identifier(value: str) -> str:
    """Waliduje i normalizuje pole `email`, które w praktyce przyjmuje albo
    prawdziwy adres e-mail, albo zwykły login (np. `jan_kowalski`) - stąd
    zwykły `str`, a nie `EmailStr`. Jeśli wartość zawiera `@`, musi być
    poprawnym adresem e-mail; w przeciwnym razie musi pasować do wzorca
    loginu (litery/cyfry/`._-`, 3-32 znaki)."""
    value = value.strip()
    if not value:
        raise ValueError("Login/e-mail nie może być pusty.")

    if "@" in value:
        try:
            result = validate_email(value, check_deliverability=False)
        except EmailNotValidError as exc:
            raise ValueError(f"Nieprawidłowy adres e-mail: {exc}") from exc
        return result.normalized.lower()

    if not USERNAME_PATTERN.match(value):
        raise ValueError(
            "Login może zawierać litery, cyfry oraz znaki . _ - (3-32 znaki), "
            "albo musi być poprawnym adresem e-mail."
        )
    return value.lower()


class UserRegisterIn(BaseModel):
    """Publiczny formularz rejestracji. Rola decyduje o tym, czy konto
    wymaga zatwierdzenia przez administratora (wynajmujący -> `pending`)."""

    email: str = Field(description="Adres e-mail albo login.")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: UserRole

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return _normalize_identifier(value)

    @field_validator("full_name")
    @classmethod
    def _strip_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Imię i nazwisko nie mogą być puste.")
        return value


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    status: UserStatus
    created_at: str
    updated_at: str


class UserRegisterOut(BaseModel):
    user: UserOut
    message: str


class UserLoginIn(BaseModel):
    email: str = Field(description="Adres e-mail albo login.")
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return _normalize_identifier(value)


class UserLoginOut(BaseModel):
    token: str
    expires_at: str
    user: UserOut


class UserListOut(BaseModel):
    data: list[UserOut]
    pagination: "UserPagination"


class UserPagination(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class UserCreateIn(BaseModel):
    """Ręczne utworzenie konta przez administratora (pełny CRUD)."""

    email: str = Field(description="Adres e-mail albo login.")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: UserRole
    status: Optional[UserStatus] = None

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return _normalize_identifier(value)


class UserUpdateIn(BaseModel):
    """Pola edytowalne przez administratora. Wszystkie opcjonalne (PATCH z
    częściową aktualizacją) - pozwala to np. samo zatwierdzić konto
    (`status=approved`) bez przesyłania reszty danych."""

    email: Optional[str] = Field(default=None, description="Adres e-mail albo login.")
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_identifier(value) if value is not None else value


class UserDeleteOut(BaseModel):
    status: str
    id: int


UserListOut.model_rebuild()
