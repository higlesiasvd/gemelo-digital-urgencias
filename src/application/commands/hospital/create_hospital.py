"""
Command: Crear Hospital
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class CreateHospitalCommand:
    """Comando para crear un nuevo hospital"""
    codigo: str
    nombre: str
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    num_ventanillas_recepcion: int = 0
    aforo_sala_espera: int = 0
    numero_boxes_triaje: int = 0
    numero_consultas: int = 0
    num_camillas_observacion: int = 0
