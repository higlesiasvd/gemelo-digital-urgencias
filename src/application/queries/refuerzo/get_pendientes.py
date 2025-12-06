"""
Query: Obtener Solicitudes Pendientes
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class GetPendientesQuery:
    """Query para obtener solicitudes pendientes"""
    hospital_id: Optional[UUID] = None
