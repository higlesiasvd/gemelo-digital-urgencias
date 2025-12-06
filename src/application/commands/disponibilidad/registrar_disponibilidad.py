"""
Command: Registrar Disponibilidad
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class RegistrarDisponibilidadCommand:
    """Comando para registrar una disponibilidad/indisponibilidad"""
    personal_id: UUID
    estado: str  # disponible, baja_medica, vacaciones, etc.
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = None
    documento_justificante: Optional[str] = None
    aprobado_por: Optional[str] = None
