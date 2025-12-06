"""
Command: Actualizar Estado de Refuerzo
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class ActualizarEstadoRefuerzoCommand:
    """Comando para actualizar el estado de una solicitud de refuerzo"""
    solicitud_id: UUID
    nuevo_estado: str  # pendiente, enviada, aceptada, rechazada, completada, etc.
    notas: Optional[str] = None
