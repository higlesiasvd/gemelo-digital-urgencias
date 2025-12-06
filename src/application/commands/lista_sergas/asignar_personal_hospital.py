"""
Command: Asignar Personal de Lista SERGAS a Hospital
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class AsignarPersonalHospitalCommand:
    """Comando para asignar personal de lista SERGAS a un hospital"""
    personal_id: UUID
    hospital_id: UUID
    turno: str  # manana, tarde, noche
    fecha_inicio: date
    fecha_fin_prevista: Optional[date] = None
    motivo: Optional[str] = None
    creado_por: Optional[str] = None
