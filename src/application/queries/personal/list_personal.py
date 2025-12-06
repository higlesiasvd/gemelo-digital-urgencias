"""
Query: Listar Personal
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class ListPersonalQuery:
    """Query para listar personal con filtros"""
    hospital_id: Optional[UUID] = None
    rol: Optional[str] = None
    solo_activos: bool = True
    acepta_refuerzos: Optional[bool] = None
    en_lista_sergas: Optional[bool] = None
