"""
Query: Obtener Disponibilidad
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class GetDisponibilidadQuery:
    """Query para obtener una disponibilidad por ID"""
    disponibilidad_id: UUID
