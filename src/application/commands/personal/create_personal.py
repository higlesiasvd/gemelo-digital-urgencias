"""
Command: Crear Personal
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class CreatePersonalCommand:
    """Comando para crear un nuevo miembro del personal"""
    numero_empleado: str
    nombre: str
    apellidos: str
    dni: str
    email: str
    rol: str  # medico, enfermero, auxiliar, etc.
    hospital_id: Optional[UUID] = None
    telefono: Optional[str] = None
    especialidad: Optional[str] = None
    unidad: str = "urgencias"
    fecha_alta: Optional[date] = None
    acepta_refuerzos: bool = True
    horas_semanales_contrato: int = 40
    en_lista_sergas: bool = False
