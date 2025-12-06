"""
Value Object: Configuración de Turno
"""

from dataclasses import dataclass
from datetime import time
from typing import Optional


@dataclass(frozen=True)
class ConfiguracionTurno:
    """
    Value Object que representa la configuración horaria de un turno.
    """
    nombre: str
    hora_inicio: time
    hora_fin: time
    descripcion: Optional[str] = None

    def __post_init__(self):
        if not self.nombre:
            raise ValueError("El nombre del turno no puede estar vacío")

    @property
    def duracion_horas(self) -> float:
        """Calcula la duración del turno en horas"""
        inicio_mins = self.hora_inicio.hour * 60 + self.hora_inicio.minute
        fin_mins = self.hora_fin.hour * 60 + self.hora_fin.minute

        if fin_mins < inicio_mins:
            # Turno que cruza medianoche
            fin_mins += 24 * 60

        return (fin_mins - inicio_mins) / 60

    @property
    def cruza_medianoche(self) -> bool:
        """Indica si el turno cruza la medianoche"""
        return self.hora_fin < self.hora_inicio

    def to_dict(self) -> dict:
        return {
            "nombre": self.nombre,
            "hora_inicio": self.hora_inicio.isoformat(),
            "hora_fin": self.hora_fin.isoformat(),
            "duracion_horas": self.duracion_horas,
            "cruza_medianoche": self.cruza_medianoche,
            "descripcion": self.descripcion,
        }


# Turnos predefinidos
TURNO_MANANA = ConfiguracionTurno(
    nombre="manana",
    hora_inicio=time(7, 0),
    hora_fin=time(15, 0),
    descripcion="Turno de mañana"
)

TURNO_TARDE = ConfiguracionTurno(
    nombre="tarde",
    hora_inicio=time(15, 0),
    hora_fin=time(23, 0),
    descripcion="Turno de tarde"
)

TURNO_NOCHE = ConfiguracionTurno(
    nombre="noche",
    hora_inicio=time(23, 0),
    hora_fin=time(7, 0),
    descripcion="Turno de noche"
)
