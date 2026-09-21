from __future__ import annotations

from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    username: str
    expires_at: str


class MeOut(BaseModel):
    username: str
