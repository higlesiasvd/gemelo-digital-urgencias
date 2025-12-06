"""
Command: Actualizar Hospital
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class UpdateHospitalCommand:
    """Comando para actualizar un hospital existente"""
    hospital_id: UUID
    nombre: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    direccion: Optional[str] = None
    num_ventanillas_recepcion: Optional[int] = None
    aforo_sala_espera: Optional[int] = None
    numero_boxes_triaje: Optional[int] = None
    numero_consultas: Optional[int] = None
    num_camillas_observacion: Optional[int] = None
    activo: Optional[bool] = None
