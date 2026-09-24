from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

UserRole = Literal["tenant", "landlord"]
UserStatus = Literal["pending", "approved", "rejected"]


class UserRegisterIn(BaseModel):
    """Publiczny formularz rejestracji. Rola decyduje o tym, czy konto
    wymaga zatwierdzenia przez administratora (wynajmujący -> `pending`)."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: UserRole

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
    email: EmailStr
    password: str = Field(min_length=1)


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

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: UserRole
    status: Optional[UserStatus] = None


class UserUpdateIn(BaseModel):
    """Pola edytowalne przez administratora. Wszystkie opcjonalne (PATCH z
    częściową aktualizacją) - pozwala to np. samo zatwierdzić konto
    (`status=approved`) bez przesyłania reszty danych."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class UserDeleteOut(BaseModel):
    status: str
    id: int


UserListOut.model_rebuild()
