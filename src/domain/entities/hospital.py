"""
Entidad de Dominio: Hospital
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4

from src.domain.value_objects.coordenadas import Coordenadas
from src.domain.value_objects.configuracion_puesto import ConfiguracionPuesto


@dataclass
class Hospital:
    """
    Entidad que representa un hospital del sistema.
    Es un Agregado Root que contiene la configuración de personal.
    """
    id: UUID = field(default_factory=uuid4)
    codigo: str = ""
    nombre: str = ""

    # Ubicación
    latitud: float = 0.0
    longitud: float = 0.0
    direccion: Optional[str] = None

    # Infraestructura física
    num_ventanillas_recepcion: int = 0
    aforo_sala_espera: int = 0
    numero_boxes_triaje: int = 0
    numero_consultas: int = 0
    num_camillas_observacion: int = 0

    # Estado
    activo: bool = True

    # Metadatos
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    # Configuraciones de personal (cargadas desde BD)
    configuraciones_personal: List['ConfiguracionPersonalHospital'] = field(default_factory=list)

    @property
    def coordenadas(self) -> Coordenadas:
        """Retorna las coordenadas como Value Object"""
        return Coordenadas(latitud=self.latitud, longitud=self.longitud)

    @property
    def capacidad_total(self) -> int:
        """Calcula la capacidad total del hospital"""
        return (
            self.num_ventanillas_recepcion +
            self.aforo_sala_espera +
            self.numero_boxes_triaje +
            self.numero_consultas +
            self.num_camillas_observacion
        )

    def distancia_a(self, otro: 'Hospital') -> float:
        """Calcula la distancia en km a otro hospital"""
        return self.coordenadas.distancia_a(otro.coordenadas)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "codigo": self.codigo,
            "nombre": self.nombre,
            "latitud": self.latitud,
            "longitud": self.longitud,
            "direccion": self.direccion,
            "num_ventanillas_recepcion": self.num_ventanillas_recepcion,
            "aforo_sala_espera": self.aforo_sala_espera,
            "numero_boxes_triaje": self.numero_boxes_triaje,
            "numero_consultas": self.numero_consultas,
            "num_camillas_observacion": self.num_camillas_observacion,
            "capacidad_total": self.capacidad_total,
            "activo": self.activo,
        }


@dataclass
class ConfiguracionPersonalHospital:
    """
    Configuración de personal mínimo/máximo por puesto y turno
    para un hospital específico.
    """
    id: UUID = field(default_factory=uuid4)
    hospital_id: UUID = field(default_factory=uuid4)

    puesto: str = ""  # ventanilla_recepcion, box_triaje, etc.
    rol: str = ""  # medico, enfermero, auxiliar, etc.

    # Configuración por turno
    turno_manana_min: int = 0
    turno_manana_max: int = 0
    turno_tarde_min: int = 0
    turno_tarde_max: int = 0
    turno_noche_min: int = 0
    turno_noche_max: int = 0

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def get_minimo(self, turno: str) -> int:
        """Obtiene el personal mínimo para un turno"""
        mapping = {
            "manana": self.turno_manana_min,
            "tarde": self.turno_tarde_min,
            "noche": self.turno_noche_min,
        }
        return mapping.get(turno, 0)

    def get_maximo(self, turno: str) -> int:
        """Obtiene el personal máximo para un turno"""
        mapping = {
            "manana": self.turno_manana_max,
            "tarde": self.turno_tarde_max,
            "noche": self.turno_noche_max,
        }
        return mapping.get(turno, 0)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "hospital_id": str(self.hospital_id),
            "puesto": self.puesto,
            "rol": self.rol,
            "turno_manana": {"min": self.turno_manana_min, "max": self.turno_manana_max},
            "turno_tarde": {"min": self.turno_tarde_min, "max": self.turno_tarde_max},
            "turno_noche": {"min": self.turno_noche_min, "max": self.turno_noche_max},
        }
