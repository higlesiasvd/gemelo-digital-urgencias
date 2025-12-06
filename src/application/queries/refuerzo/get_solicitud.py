"""
Query: Obtener Solicitud de Refuerzo
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class GetSolicitudQuery:
    """Query para obtener una solicitud de refuerzo por ID"""
    solicitud_id: UUID
