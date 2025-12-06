"""
Query: Listar Solicitudes de Refuerzo
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class ListSolicitudesQuery:
    """Query para listar solicitudes de refuerzo con filtros"""
    hospital_id: Optional[UUID] = None
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    generado_automaticamente: Optional[bool] = None
