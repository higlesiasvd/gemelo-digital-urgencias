"""
DTOs para Solicitud de Refuerzo
"""

from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class CrearSolicitudRefuerzoRequest(BaseModel):
    hospital_id: str
    fecha_necesidad: date
    turno_necesario: str = Field(..., pattern="^(manana|tarde|noche)$")
    rol_requerido: str = Field(..., pattern="^(medico|enfermero|auxiliar|administrativo|celador|tecnico)$")
    cantidad_personal: int = Field(default=1, ge=1)
    prioridad: str = Field(default="media", pattern="^(baja|media|alta|critica)$")
    motivo: str = Field(
        default="alta_demanda_predicha",
        pattern="^(alta_demanda_predicha|emergencia_masiva|baja_inesperada|evento_especial|cobertura_vacaciones|saturacion_actual)$"
    )
    solicitado_por: Optional[str] = None
    notas: Optional[str] = None


class ActualizarEstadoRefuerzoRequest(BaseModel):
    nuevo_estado: str = Field(
        ...,
        pattern="^(pendiente|enviada|aceptada|rechazada|en_camino|completada|cancelada|expirada)$"
    )
    notas: Optional[str] = None


class EvaluarNecesidadRefuerzoRequest(BaseModel):
    hospital_id: str
    fecha: Optional[date] = None
    turno: Optional[str] = Field(None, pattern="^(manana|tarde|noche)$")


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class SolicitudRefuerzoResponse(BaseModel):
    id: str
    hospital_id: str
    fecha_necesidad: str
    turno_necesario: str
    rol_requerido: str
    cantidad_personal: int
    prioridad: str
    motivo: str
    estado: str
    demanda_predicha: Optional[float]
    saturacion_predicha: Optional[float]
    confianza_prediccion: Optional[float]
    personal_asignado_ids: List[str]
    generado_automaticamente: bool
    solicitado_por: Optional[str]
    notas: Optional[str]
    es_urgente: bool
    created_at: str

    class Config:
        from_attributes = True


class SolicitudRefuerzoListResponse(BaseModel):
    solicitudes: List[SolicitudRefuerzoResponse]
    total: int
