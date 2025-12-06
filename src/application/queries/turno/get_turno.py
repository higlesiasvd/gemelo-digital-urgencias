"""
Query: Obtener Turno
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class GetTurnoQuery:
    """Query para obtener un turno por ID"""
    turno_id: UUID
