"""
Entidad de Dominio: Disponibilidad
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class EstadoDisponibilidad(str, Enum):
    """Estado de disponibilidad del personal"""
    DISPONIBLE = "disponible"
    EN_DESCANSO = "en_descanso"
    BAJA_MEDICA = "baja_medica"
    BAJA_MATERNAL = "baja_maternal"
    VACACIONES = "vacaciones"
    PERMISO = "permiso"
    FORMACION = "formacion"
    GUARDIA_LOCALIZADA = "guardia_localizada"
    REFUERZO_DISPONIBLE = "refuerzo_disponible"
    NO_DISPONIBLE = "no_disponible"


@dataclass
class Disponibilidad:
    """
    Entidad que registra la disponibilidad/indisponibilidad del personal.
    Usado para bajas, vacaciones, permisos, etc.
    """
    id: UUID = field(default_factory=uuid4)
    personal_id: UUID = field(default_factory=uuid4)

    estado: EstadoDisponibilidad = EstadoDisponibilidad.DISPONIBLE
    fecha_inicio: date = field(default_factory=date.today)
    fecha_fin: Optional[date] = None

    motivo: Optional[str] = None
    documento_justificante: Optional[str] = None
    aprobado_por: Optional[str] = None

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def esta_vigente(self) -> bool:
        """Comprueba si la indisponibilidad está vigente hoy"""
        hoy = date.today()
        if self.fecha_fin is None:
            return hoy >= self.fecha_inicio
        return self.fecha_inicio <= hoy <= self.fecha_fin

    @property
    def dias_duracion(self) -> Optional[int]:
        """Calcula los días de duración"""
        if self.fecha_fin is None:
            return None
        return (self.fecha_fin - self.fecha_inicio).days + 1

    @property
    def es_baja(self) -> bool:
        """Indica si es una baja médica o maternal"""
        return self.estado in [
            EstadoDisponibilidad.BAJA_MEDICA,
            EstadoDisponibilidad.BAJA_MATERNAL
        ]

    @property
    def es_ausencia_programada(self) -> bool:
        """Indica si es una ausencia programada (vacaciones, permiso, etc.)"""
        return self.estado in [
            EstadoDisponibilidad.VACACIONES,
            EstadoDisponibilidad.PERMISO,
            EstadoDisponibilidad.FORMACION
        ]

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "personal_id": str(self.personal_id),
            "estado": self.estado.value,
            "fecha_inicio": self.fecha_inicio.isoformat(),
            "fecha_fin": self.fecha_fin.isoformat() if self.fecha_fin else None,
            "motivo": self.motivo,
            "esta_vigente": self.esta_vigente,
            "dias_duracion": self.dias_duracion,
            "es_baja": self.es_baja,
            "es_ausencia_programada": self.es_ausencia_programada,
        }
