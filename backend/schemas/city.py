from __future__ import annotations

from pydantic import BaseModel


class PublicCityOut(BaseModel):
    city: str
    display_name: str
