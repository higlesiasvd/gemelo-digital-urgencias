"""
Query: Obtener Resumen de Turnos
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class GetResumenTurnosQuery:
    """Query para obtener resumen de turnos de un hospital"""
    hospital_id: UUID
    fecha: Optional[date] = None
