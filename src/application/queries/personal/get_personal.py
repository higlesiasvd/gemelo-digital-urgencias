"""
Query: Obtener Personal
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class GetPersonalQuery:
    """Query para obtener un personal por ID o número de empleado"""
    personal_id: Optional[UUID] = None
    numero_empleado: Optional[str] = None
    dni: Optional[str] = None
