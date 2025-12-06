"""
Query: Listar Personal Disponible en Lista SERGAS
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ListPersonalDisponibleQuery:
    """Query para listar personal disponible en lista SERGAS"""
    rol: Optional[str] = None
    especialidad: Optional[str] = None
    solo_activos: bool = True
    disponible_turno: Optional[str] = None  # manana, tarde, noche
    hospital_preferido: Optional[str] = None
