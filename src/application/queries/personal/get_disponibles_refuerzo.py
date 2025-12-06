"""
Query: Obtener Personal Disponible para Refuerzo
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class GetDisponiblesRefuerzoQuery:
    """Query para obtener personal disponible para refuerzos"""
    rol: Optional[str] = None
    excluir_hospital_id: Optional[UUID] = None
