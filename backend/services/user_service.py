"""
user_service.py
================

Usługa kont użytkowników serwisu (najemcy i wynajmujący). Rejestracja jest
publiczna (`POST /api/users/register`) - konta najemców są aktywne od razu
(status `approved`), a konta wynajmujących trafiają do kolejki (`pending`) i
wymagają zatwierdzenia przez administratora w panelu "Zarządzanie kontami"
(`/api/admin/users/*`, chronione przez `require_admin`).

Hasła są haszowane tak samo jak konta administratorów (PBKDF2-HMAC-SHA256 z
losową solą) - patrz `backend/services/auth_service.py`.
"""

from __future__ import annotations

import hashlib
import secrets
from contextlib import closing
from dataclasses import dataclass
from typing import Literal, Optional

from backend.services.sync_service import get_connection

PBKDF2_ITERATIONS = 200_000

UserRole = Literal["tenant", "landlord"]
UserStatus = Literal["pending", "approved", "rejected"]

USER_COLUMNS = (
    "id", "email", "full_name", "phone", "role", "status", "created_at", "updated_at",
)


class EmailAlreadyExistsError(Exception):
    """Podniesione, gdy adres e-mail jest już zajęty przez inne konto."""


@dataclass(frozen=True)
class UserFilters:
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    search: Optional[str] = None  # szuka w email/full_name


def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS).hex()


def _row_to_dict(row) -> dict:
    return dict(zip(USER_COLUMNS, row))


def _default_status_for_role(role: UserRole) -> UserStatus:
    return "approved" if role == "tenant" else "pending"


def register_user(email: str, password: str, full_name: str, phone: Optional[str], role: UserRole) -> dict:
    email = email.strip().lower()
    salt = secrets.token_bytes(16)
    password_hash = _hash_password(password, salt)
    status = _default_status_for_role(role)

    with closing(get_connection()) as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise EmailAlreadyExistsError(f"Konto z adresem e-mail {email} już istnieje.")

        cursor = conn.execute(
            """
            INSERT INTO users (email, full_name, phone, password_hash, salt, role, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (email, full_name.strip(), phone.strip() if phone else None, password_hash, salt.hex(), role, status),
        )
        conn.commit()
        user_id = cursor.lastrowid

    return get_user(user_id)  # type: ignore[return-value]


def list_users(filters: UserFilters, page: int = 1, limit: int = 20) -> tuple[list[dict], int]:
    conditions: list[str] = []
    params: list = []

    if filters.role:
        conditions.append("role = ?")
        params.append(filters.role)
    if filters.status:
        conditions.append("status = ?")
        params.append(filters.status)
    if filters.search:
        conditions.append("(email LIKE ? OR full_name LIKE ?)")
        like = f"%{filters.search.strip()}%"
        params.extend([like, like])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with closing(get_connection()) as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM users {where_clause}", params).fetchone()[0]
        offset = (page - 1) * limit
        rows = conn.execute(
            f"""
            SELECT {', '.join(USER_COLUMNS)} FROM users
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()

    return [_row_to_dict(row) for row in rows], total


def get_user(user_id: int) -> Optional[dict]:
    with closing(get_connection()) as conn:
        row = conn.execute(
            f"SELECT {', '.join(USER_COLUMNS)} FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def create_user(
    email: str,
    password: str,
    full_name: str,
    phone: Optional[str],
    role: UserRole,
    status: Optional[UserStatus] = None,
) -> dict:
    """Ręczne utworzenie konta przez administratora (pełny CRUD)."""
    email = email.strip().lower()
    salt = secrets.token_bytes(16)
    password_hash = _hash_password(password, salt)
    resolved_status = status or _default_status_for_role(role)

    with closing(get_connection()) as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise EmailAlreadyExistsError(f"Konto z adresem e-mail {email} już istnieje.")

        cursor = conn.execute(
            """
            INSERT INTO users (email, full_name, phone, password_hash, salt, role, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (email, full_name.strip(), phone.strip() if phone else None, password_hash, salt.hex(), role, resolved_status),
        )
        conn.commit()
        user_id = cursor.lastrowid

    return get_user(user_id)  # type: ignore[return-value]


def update_user(
    user_id: int,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    password: Optional[str] = None,
) -> Optional[dict]:
    if get_user(user_id) is None:
        return None

    updates: list[str] = []
    params: list = []

    if email is not None:
        email = email.strip().lower()
        with closing(get_connection()) as conn:
            clash = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email, user_id)).fetchone()
        if clash is not None:
            raise EmailAlreadyExistsError(f"Konto z adresem e-mail {email} już istnieje.")
        updates.append("email = ?")
        params.append(email)
    if full_name is not None:
        updates.append("full_name = ?")
        params.append(full_name.strip())
    if phone is not None:
        updates.append("phone = ?")
        params.append(phone.strip() or None)
    if role is not None:
        updates.append("role = ?")
        params.append(role)
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if password:
        salt = secrets.token_bytes(16)
        updates.append("password_hash = ?")
        params.append(_hash_password(password, salt))
        updates.append("salt = ?")
        params.append(salt.hex())

    if not updates:
        return get_user(user_id)

    updates.append("updated_at = datetime('now')")

    with closing(get_connection()) as conn:
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", (*params, user_id))
        conn.commit()

    return get_user(user_id)


def delete_user(user_id: int) -> bool:
    with closing(get_connection()) as conn:
        cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
