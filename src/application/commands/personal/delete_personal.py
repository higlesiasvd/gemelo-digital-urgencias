"""
Command: Eliminar Personal
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class DeletePersonalCommand:
    """Comando para eliminar un miembro del personal"""
    personal_id: UUID
