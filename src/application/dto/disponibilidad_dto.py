"""
DTOs para Disponibilidad
"""

from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class RegistrarDisponibilidadRequest(BaseModel):
    personal_id: str
    estado: str = Field(
        ...,
        pattern="^(disponible|en_descanso|baja_medica|baja_maternal|vacaciones|permiso|formacion|guardia_localizada|refuerzo_disponible|no_disponible)$"
    )
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = None
    documento_justificante: Optional[str] = None
    aprobado_por: Optional[str] = None


class ActualizarDisponibilidadRequest(BaseModel):
    estado: Optional[str] = Field(
        None,
        pattern="^(disponible|en_descanso|baja_medica|baja_maternal|vacaciones|permiso|formacion|guardia_localizada|refuerzo_disponible|no_disponible)$"
    )
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = None
    documento_justificante: Optional[str] = None
    aprobado_por: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class DisponibilidadResponse(BaseModel):
    id: str
    personal_id: str
    estado: str
    fecha_inicio: str
    fecha_fin: Optional[str]
    motivo: Optional[str]
    esta_vigente: bool
    dias_duracion: Optional[int]
    es_baja: bool
    es_ausencia_programada: bool

    class Config:
        from_attributes = True


class DisponibilidadListResponse(BaseModel):
    disponibilidades: List[DisponibilidadResponse]
    total: int
