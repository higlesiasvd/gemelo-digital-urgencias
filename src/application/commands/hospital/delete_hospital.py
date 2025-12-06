"""
Command: Eliminar Hospital
"""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class DeleteHospitalCommand:
    """Comando para eliminar un hospital"""
    hospital_id: UUID
