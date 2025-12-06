"""
Command: Crear Turno
"""

from dataclasses import dataclass
from datetime import date, time
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class CreateTurnoCommand:
    """Comando para crear un nuevo turno"""
    personal_id: UUID
    hospital_id: UUID
    fecha: date
    tipo_turno: str  # manana, tarde, noche, guardia_24h, refuerzo
    hora_inicio: time
    hora_fin: time
    es_refuerzo: bool = False
    confirmado: bool = True
    notas: Optional[str] = None
