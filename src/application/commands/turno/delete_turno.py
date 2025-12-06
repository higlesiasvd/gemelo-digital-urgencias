"""
Command: Eliminar Turno
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class DeleteTurnoCommand:
    """Comando para eliminar un turno"""
    turno_id: UUID
