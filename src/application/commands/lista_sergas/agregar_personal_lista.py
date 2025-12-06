"""
Command: Agregar Personal a Lista SERGAS
"""

from dataclasses import dataclass, field
from typing import Optional, List
from uuid import UUID


@dataclass(frozen=True)
class AgregarPersonalListaCommand:
    """Comando para agregar personal a la lista SERGAS"""
    personal_id: UUID
    motivo_entrada: str = "voluntario"  # baja_hospital, fin_contrato, voluntario, etc.
    disponible_turno_manana: bool = True
    disponible_turno_tarde: bool = True
    disponible_turno_noche: bool = True
    hospitales_preferidos: tuple = field(default_factory=tuple)  # Usar tuple para frozen
    distancia_maxima_km: Optional[int] = None
