"""
Command: Actualizar Disponibilidad
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class ActualizarDisponibilidadCommand:
    """Comando para actualizar una disponibilidad existente"""
    disponibilidad_id: UUID
    estado: Optional[str] = None
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = None
    documento_justificante: Optional[str] = None
    aprobado_por: Optional[str] = None
