"""
Router uwierzytelniania panelu administratora. Loguje przez login/hasło
(domyślnie: admin/admin - patrz `backend/services/auth_service.py`) i zwraca
token sesyjny używany potem jako `Authorization: Bearer <token>` do
endpointów `/api/admin/*`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Header, status
from typing import Optional

from backend.dependencies import require_admin
from backend.schemas.auth import LoginIn, LoginOut, MeOut
from backend.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn) -> LoginOut:
    if not auth_service.verify_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowy login lub hasło.")

    token, expires_at = auth_service.create_session(payload.username)
    return LoginOut(token=token, username=payload.username, expires_at=expires_at)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: Optional[str] = Header(default=None)) -> None:
    if authorization and authorization.lower().startswith("bearer "):
        auth_service.invalidate_token(authorization.split(" ", 1)[1].strip())


@router.get("/me", response_model=MeOut)
def me(username: str = Depends(require_admin)) -> MeOut:
    return MeOut(username=username)
