"""
Query: Listar Disponibilidades
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class ListDisponibilidadesQuery:
    """Query para listar disponibilidades con filtros"""
    personal_id: Optional[UUID] = None
    estado: Optional[str] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    solo_vigentes: bool = False
