"""
Command: Actualizar Turno
"""

from dataclasses import dataclass
from datetime import time
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class UpdateTurnoCommand:
    """Comando para actualizar un turno existente"""
    turno_id: UUID
    tipo_turno: Optional[str] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    es_refuerzo: Optional[bool] = None
    confirmado: Optional[bool] = None
    notas: Optional[str] = None
