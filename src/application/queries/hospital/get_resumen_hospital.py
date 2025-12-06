"""
Query: Obtener Resumen de Hospital
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class GetResumenHospitalQuery:
    """Query para obtener el resumen de un hospital"""
    hospital_id: UUID
    fecha: Optional[date] = None
    turno: Optional[str] = None
