"""
Publiczny router rejestracji i logowania kont użytkowników serwisu (najemcy
i wynajmujący). Konta najemców są aktywne od razu; konta wynajmujących
wymagają zatwierdzenia przez administratora - patrz
`backend/routers/admin_users.py` i panel "Zarządzanie kontami". Logowanie
działa analogicznie do panelu admina (token sesyjny w tabeli
`user_sessions`), ale jest to niezależny system kont - patrz
`backend/services/user_service.py` i `backend/dependencies.py::require_user`.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from backend.dependencies import require_user
from backend.schemas.users import (
    UserLoginIn,
    UserLoginOut,
    UserOut,
    UserRegisterIn,
    UserRegisterOut,
)
from backend.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/register", response_model=UserRegisterOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterIn) -> UserRegisterOut:
    try:
        user = user_service.register_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            phone=payload.phone,
            role=payload.role,
        )
    except user_service.EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if payload.role == "landlord":
        message = "Konto zostało utworzone i oczekuje na zatwierdzenie przez administratora."
    else:
        message = "Konto zostało utworzone. Możesz teraz się zalogować."

    return UserRegisterOut(user=UserOut(**user), message=message)


@router.post("/login", response_model=UserLoginOut)
def login(payload: UserLoginIn) -> UserLoginOut:
    try:
        user = user_service.verify_credentials(payload.email, payload.password)
    except user_service.InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except user_service.AccountNotApprovedError as exc:
        if exc.status == "pending":
            detail = "Konto oczekuje na zatwierdzenie przez administratora."
        else:
            detail = "Konto zostało odrzucone przez administratora."
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail) from exc

    token, expires_at = user_service.create_session(user["id"])
    return UserLoginOut(token=token, expires_at=expires_at, user=UserOut(**user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: Optional[str] = Header(default=None)) -> None:
    if authorization and authorization.lower().startswith("bearer "):
        user_service.invalidate_token(authorization.split(" ", 1)[1].strip())


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(require_user)) -> UserOut:
    return UserOut(**user)
