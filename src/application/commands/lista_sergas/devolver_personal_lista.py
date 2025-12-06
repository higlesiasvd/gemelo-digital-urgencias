"""
Command: Devolver Personal a Lista SERGAS
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class DevolverPersonalListaCommand:
    """Comando para devolver personal de un hospital a la lista SERGAS"""
    personal_id: UUID
    motivo: str  # fin_refuerzo, baja_hospital, voluntario
    creado_por: Optional[str] = None
