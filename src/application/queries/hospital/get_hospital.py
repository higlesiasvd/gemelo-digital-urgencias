"""
Query: Obtener Hospital
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class GetHospitalQuery:
    """Query para obtener un hospital por ID o código"""
    hospital_id: Optional[UUID] = None
    codigo: Optional[str] = None
