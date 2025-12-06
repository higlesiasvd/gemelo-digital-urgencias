"""
DTOs para Hospital
"""

from dataclasses import dataclass
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST DTOs (Pydantic para validación)
# ═══════════════════════════════════════════════════════════════════════════════

class CreateHospitalRequest(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nombre: str = Field(..., min_length=1, max_length=200)
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)
    direccion: Optional[str] = None
    num_ventanillas_recepcion: int = Field(default=0, ge=0)
    aforo_sala_espera: int = Field(default=0, ge=0)
    numero_boxes_triaje: int = Field(default=0, ge=0)
    numero_consultas: int = Field(default=0, ge=0)
    num_camillas_observacion: int = Field(default=0, ge=0)


class UpdateHospitalRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    latitud: Optional[float] = Field(None, ge=-90, le=90)
    longitud: Optional[float] = Field(None, ge=-180, le=180)
    direccion: Optional[str] = None
    num_ventanillas_recepcion: Optional[int] = Field(None, ge=0)
    aforo_sala_espera: Optional[int] = Field(None, ge=0)
    numero_boxes_triaje: Optional[int] = Field(None, ge=0)
    numero_consultas: Optional[int] = Field(None, ge=0)
    num_camillas_observacion: Optional[int] = Field(None, ge=0)
    activo: Optional[bool] = None


class ConfiguracionPersonalRequest(BaseModel):
    puesto: str = Field(..., min_length=1)
    rol: str = Field(..., min_length=1)
    turno_manana_min: int = Field(default=0, ge=0)
    turno_manana_max: int = Field(default=0, ge=0)
    turno_tarde_min: int = Field(default=0, ge=0)
    turno_tarde_max: int = Field(default=0, ge=0)
    turno_noche_min: int = Field(default=0, ge=0)
    turno_noche_max: int = Field(default=0, ge=0)


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class HospitalResponse(BaseModel):
    id: str
    codigo: str
    nombre: str
    latitud: float
    longitud: float
    direccion: Optional[str]
    num_ventanillas_recepcion: int
    aforo_sala_espera: int
    numero_boxes_triaje: int
    numero_consultas: int
    num_camillas_observacion: int
    capacidad_total: int
    activo: bool

    class Config:
        from_attributes = True


class ConfiguracionPersonalResponse(BaseModel):
    id: str
    hospital_id: str
    puesto: str
    rol: str
    turno_manana: dict
    turno_tarde: dict
    turno_noche: dict

    class Config:
        from_attributes = True


class HospitalResumenResponse(BaseModel):
    hospital: HospitalResponse
    personal: dict
    refuerzos_pendientes: int
    fecha: str


class HospitalListResponse(BaseModel):
    hospitales: List[HospitalResponse]
    total: int
