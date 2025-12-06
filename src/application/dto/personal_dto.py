"""
DTOs para Personal
"""

from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class CreatePersonalRequest(BaseModel):
    numero_empleado: str = Field(..., min_length=1, max_length=50)
    nombre: str = Field(..., min_length=1, max_length=100)
    apellidos: str = Field(..., min_length=1, max_length=150)
    dni: str = Field(..., min_length=1, max_length=20)
    email: EmailStr
    telefono: Optional[str] = Field(None, max_length=20)
    rol: str = Field(..., pattern="^(medico|enfermero|auxiliar|administrativo|celador|tecnico)$")
    especialidad: Optional[str] = Field(None, max_length=100)
    hospital_id: Optional[str] = None
    unidad: str = Field(default="urgencias", max_length=100)
    fecha_alta: Optional[date] = None
    acepta_refuerzos: bool = True
    horas_semanales_contrato: int = Field(default=40, ge=0, le=60)
    en_lista_sergas: bool = False


class UpdatePersonalRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=20)
    rol: Optional[str] = Field(None, pattern="^(medico|enfermero|auxiliar|administrativo|celador|tecnico)$")
    especialidad: Optional[str] = None
    hospital_id: Optional[str] = None
    unidad: Optional[str] = None
    activo: Optional[bool] = None
    acepta_refuerzos: Optional[bool] = None
    horas_semanales_contrato: Optional[int] = Field(None, ge=0, le=60)


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE DTOs
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalResponse(BaseModel):
    id: str
    numero_empleado: str
    nombre: str
    apellidos: str
    nombre_completo: str
    dni: str
    email: str
    telefono: Optional[str]
    rol: str
    especialidad: Optional[str]
    hospital_id: Optional[str]
    unidad: str
    fecha_alta: str
    activo: bool
    acepta_refuerzos: bool
    horas_semanales_contrato: int
    en_lista_sergas: bool
    esta_asignado_hospital: bool

    class Config:
        from_attributes = True


class PersonalListResponse(BaseModel):
    personal: List[PersonalResponse]
    total: int
