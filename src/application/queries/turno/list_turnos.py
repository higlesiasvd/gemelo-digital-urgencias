"""
Query: Listar Turnos
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class ListTurnosQuery:
    """Query para listar turnos con filtros"""
    hospital_id: Optional[UUID] = None
    personal_id: Optional[UUID] = None
    fecha: Optional[date] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    tipo_turno: Optional[str] = None
    es_refuerzo: Optional[bool] = None
