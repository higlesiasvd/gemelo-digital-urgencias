"""
Command: Actualizar Personal
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class UpdatePersonalCommand:
    """Comando para actualizar un miembro del personal"""
    personal_id: UUID
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None
    especialidad: Optional[str] = None
    hospital_id: Optional[UUID] = None
    unidad: Optional[str] = None
    activo: Optional[bool] = None
    acepta_refuerzos: Optional[bool] = None
    horas_semanales_contrato: Optional[int] = None
