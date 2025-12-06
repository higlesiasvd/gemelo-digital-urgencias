"""
Value Objects: Configuración de Puesto
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict


class TipoPuesto(str, Enum):
    """Tipos de puesto en urgencias"""
    VENTANILLA_RECEPCION = "ventanilla_recepcion"
    BOX_TRIAJE = "box_triaje"
    CONSULTA = "consulta"
    CAMILLA_OBSERVACION = "camilla_observacion"
    SALA_ESPERA = "sala_espera"


@dataclass(frozen=True)
class ConfiguracionPuesto:
    """
    Value Object que representa la configuración de personal
    mínimo y máximo para un puesto específico por turno.
    """
    puesto: TipoPuesto
    rol: str
    turno_manana_min: int = 0
    turno_manana_max: int = 0
    turno_tarde_min: int = 0
    turno_tarde_max: int = 0
    turno_noche_min: int = 0
    turno_noche_max: int = 0

    def __post_init__(self):
        # Validar que min <= max para cada turno
        if self.turno_manana_min > self.turno_manana_max:
            raise ValueError("turno_manana_min no puede ser mayor que turno_manana_max")
        if self.turno_tarde_min > self.turno_tarde_max:
            raise ValueError("turno_tarde_min no puede ser mayor que turno_tarde_max")
        if self.turno_noche_min > self.turno_noche_max:
            raise ValueError("turno_noche_min no puede ser mayor que turno_noche_max")

    def get_minimo_por_turno(self, turno: str) -> int:
        """Obtiene el mínimo de personal para un turno específico"""
        mapping = {
            "manana": self.turno_manana_min,
            "tarde": self.turno_tarde_min,
            "noche": self.turno_noche_min,
        }
        return mapping.get(turno, 0)

    def get_maximo_por_turno(self, turno: str) -> int:
        """Obtiene el máximo de personal para un turno específico"""
        mapping = {
            "manana": self.turno_manana_max,
            "tarde": self.turno_tarde_max,
            "noche": self.turno_noche_max,
        }
        return mapping.get(turno, 0)

    def to_dict(self) -> Dict:
        return {
            "puesto": self.puesto.value,
            "rol": self.rol,
            "turno_manana": {"min": self.turno_manana_min, "max": self.turno_manana_max},
            "turno_tarde": {"min": self.turno_tarde_min, "max": self.turno_tarde_max},
            "turno_noche": {"min": self.turno_noche_min, "max": self.turno_noche_max},
        }
