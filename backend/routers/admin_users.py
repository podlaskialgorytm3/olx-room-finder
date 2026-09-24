"""
Router panelu administratora - "Zarządzanie kontami". Chroniony logowaniem
(`require_admin`). Pełny CRUD na kontach użytkowników serwisu (najemcy i
wynajmujący), w tym zatwierdzanie/odrzucanie kont wynajmujących
(`status: pending -> approved/rejected`) oraz edycja/zmiana roli i danych
dowolnego użytkownika.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.dependencies import require_admin
from backend.schemas.users import (
    UserCreateIn,
    UserDeleteOut,
    UserListOut,
    UserOut,
    UserPagination,
    UserRole,
    UserStatus,
    UserUpdateIn,
)
from backend.services import user_service

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=UserListOut)
def list_users(
    role: UserRole | None = Query(None),
    status_: UserStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
) -> UserListOut:
    filters = user_service.UserFilters(role=role, status=status_, search=search)
    rows, total = user_service.list_users(filters, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total else 0
    return UserListOut(
        data=[UserOut(**row) for row in rows],
        pagination=UserPagination(page=page, limit=limit, total=total, total_pages=total_pages),
    )


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int) -> UserOut:
    user = user_service.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"Konto o id={user_id} nie zostało znalezione.")
    return UserOut(**user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateIn) -> UserOut:
    try:
        user = user_service.create_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            phone=payload.phone,
            role=payload.role,
            status=payload.status,
        )
    except user_service.EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return UserOut(**user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdateIn) -> UserOut:
    values = payload.model_dump(exclude_unset=True)
    try:
        user = user_service.update_user(user_id, **values)
    except user_service.EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if user is None:
        raise HTTPException(status_code=404, detail=f"Konto o id={user_id} nie zostało znalezione.")
    return UserOut(**user)


@router.delete("/{user_id}", response_model=UserDeleteOut)
def delete_user(user_id: int) -> UserDeleteOut:
    deleted = user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Konto o id={user_id} nie zostało znalezione.")
    return UserDeleteOut(status="deleted", id=user_id)
