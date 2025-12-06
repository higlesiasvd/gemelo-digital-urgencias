"""
DTOs para Lista SERGAS
"""

from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class AgregarPersonalListaRequest(BaseModel):
    personal_id: str
    motivo_entrada: str = Field(
        default="voluntario",
        pattern="^(baja_hospital|fin_contrato|voluntario|reduccion_plantilla|nuevo_ingreso)$"
    )
    disponible_turno_manana: bool = True
    disponible_turno_tarde: bool = True
    disponible_turno_noche: bool = True
    hospitales_preferidos: List[str] = Field(default_factory=list)
    distancia_maxima_km: Optional[int] = Field(None, ge=0)


class AsignarPersonalHospitalRequest(BaseModel):
    personal_id: str
    hospital_id: str
    turno: str = Field(..., pattern="^(manana|tarde|noche)$")
    fecha_inicio: date
    fecha_fin_prevista: Optional[date] = None
    motivo: Optional[str] = None


class DevolverPersonalListaRequest(BaseModel):
    personal_id: str
    motivo: str = Field(
        ...,
        pattern="^(fin_refuerzo|baja_hospital|voluntario)$"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalListaSergasResponse(BaseModel):
    id: str
    personal_id: str
    nombre_completo: str
    rol: str
    especialidad: Optional[str]
    telefono: Optional[str]
    disponibilidad: dict
    hospitales_preferidos: List[str]
    distancia_maxima_km: Optional[int]
    activo: bool
    dias_en_lista: int
    fecha_entrada: str
    motivo_entrada: Optional[str]
    ultima_asignacion: dict

    class Config:
        from_attributes = True


class ListaSergasListResponse(BaseModel):
    personal: List[PersonalListaSergasResponse]
    total: int


class EstadisticasListaSergasResponse(BaseModel):
    total_activos: int
    por_rol: dict
