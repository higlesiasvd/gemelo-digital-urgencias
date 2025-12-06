"""
DTOs para Turno
"""

from datetime import date, time
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class CreateTurnoRequest(BaseModel):
    personal_id: str
    hospital_id: str
    fecha: date
    tipo_turno: str = Field(..., pattern="^(manana|tarde|noche|guardia_24h|refuerzo)$")
    hora_inicio: time
    hora_fin: time
    es_refuerzo: bool = False
    confirmado: bool = True
    notas: Optional[str] = None


class UpdateTurnoRequest(BaseModel):
    tipo_turno: Optional[str] = Field(None, pattern="^(manana|tarde|noche|guardia_24h|refuerzo)$")
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    es_refuerzo: Optional[bool] = None
    confirmado: Optional[bool] = None
    notas: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class TurnoResponse(BaseModel):
    id: str
    personal_id: str
    hospital_id: str
    fecha: str
    tipo_turno: str
    hora_inicio: str
    hora_fin: str
    duracion_horas: float
    es_refuerzo: bool
    confirmado: bool
    notas: Optional[str]

    class Config:
        from_attributes = True


class TurnoListResponse(BaseModel):
    turnos: List[TurnoResponse]
    total: int


class ResumenTurnosResponse(BaseModel):
    hospital_id: str
    fecha: str
    turnos: dict
