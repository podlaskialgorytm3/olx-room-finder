"""
auth_service.py
================

Prosta usługa uwierzytelniania panelu administratora. Zamiast JWT (i
dodatkowej zależności) używa tokenów sesyjnych przechowywanych w tabeli
`admin_sessions` w tej samej bazie SQLite co reszta danych - token to
losowy, nieodgadnialny ciąg znaków, a jego ważność sprawdzana jest przy
każdym żądaniu do endpointów chronionych `require_admin` (patrz
`backend/dependencies.py`).

Hasła są haszowane przez PBKDF2-HMAC-SHA256 z losową solą (moduł `hashlib`
z biblioteki standardowej - bez dodatkowych zależności).

Domyślne konto zakładane przy starcie backendu (patrz `ensure_default_admin`):
    login: admin
    hasło: admin
Zmiana hasła jest możliwa przez `change_password()` (na razie bez
dedykowanego endpointu - do wykorzystania w przyszłości).
"""

from __future__ import annotations

import hashlib
import secrets
from contextlib import closing
from datetime import datetime, timedelta
from typing import Optional

from backend.services.sync_service import get_connection

SESSION_TTL_HOURS = 12
PBKDF2_ITERATIONS = 200_000
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"


def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS).hex()


def ensure_default_admin() -> None:
    """Zakłada domyślne konto administratora (admin/admin), jeśli w bazie
    nie ma jeszcze żadnego konta. Bezpieczne do wywołania wielokrotnego."""
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT id FROM admin_users LIMIT 1").fetchone()
        if row is not None:
            return
        salt = secrets.token_bytes(16)
        password_hash = _hash_password(DEFAULT_ADMIN_PASSWORD, salt)
        conn.execute(
            "INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)",
            (DEFAULT_ADMIN_USERNAME, password_hash, salt.hex()),
        )
        conn.commit()


def verify_credentials(username: str, password: str) -> bool:
    with closing(get_connection()) as conn:
        row = conn.execute(
            "SELECT password_hash, salt FROM admin_users WHERE username = ?",
            (username,),
        ).fetchone()
    if row is None:
        return False
    password_hash, salt_hex = row
    candidate_hash = _hash_password(password, bytes.fromhex(salt_hex))
    return secrets.compare_digest(password_hash, candidate_hash)


def create_session(username: str) -> tuple[str, str]:
    """Tworzy nową sesję dla zalogowanego użytkownika. Zwraca (token, expires_at)."""
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS)).strftime(DATETIME_FORMAT)
    with closing(get_connection()) as conn:
        conn.execute(
            "INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, ?, ?)",
            (token, username, expires_at),
        )
        conn.commit()
    return token, expires_at


def validate_token(token: str) -> Optional[str]:
    """Zwraca nazwę użytkownika, jeśli token jest ważny, w przeciwnym razie None."""
    with closing(get_connection()) as conn:
        row = conn.execute(
            "SELECT username, expires_at FROM admin_sessions WHERE token = ?",
            (token,),
        ).fetchone()
        if row is None:
            return None
        username, expires_at = row
        if datetime.strptime(expires_at, DATETIME_FORMAT) < datetime.utcnow():
            conn.execute("DELETE FROM admin_sessions WHERE token = ?", (token,))
            conn.commit()
            return None
        return username


def invalidate_token(token: str) -> None:
    with closing(get_connection()) as conn:
        conn.execute("DELETE FROM admin_sessions WHERE token = ?", (token,))
        conn.commit()


def change_password(username: str, new_password: str) -> None:
    salt = secrets.token_bytes(16)
    password_hash = _hash_password(new_password, salt)
    with closing(get_connection()) as conn:
        conn.execute(
            "UPDATE admin_users SET password_hash = ?, salt = ? WHERE username = ?",
            (password_hash, salt.hex(), username),
        )
        conn.commit()
