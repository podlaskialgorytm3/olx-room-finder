"""
Publiczny router rejestracji kont użytkowników serwisu (najemcy i
wynajmujący). Konta najemców są aktywne od razu; konta wynajmujących
wymagają zatwierdzenia przez administratora - patrz
`backend/routers/admin_users.py` i panel "Zarządzanie kontami".
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from backend.schemas.users import UserOut, UserRegisterIn, UserRegisterOut
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
