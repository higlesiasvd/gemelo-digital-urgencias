"""
Command: Evaluar Necesidad de Refuerzo
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class EvaluarNecesidadRefuerzoCommand:
    """Comando para evaluar si un hospital necesita refuerzo"""
    hospital_id: UUID
    fecha: Optional[date] = None
    turno: Optional[str] = None  # Si no se especifica, evalúa el turno actual
