"""
Entidad de Dominio: Turno
"""

from dataclasses import dataclass, field
from datetime import datetime, date, time, timedelta
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class TipoTurno(str, Enum):
    """Tipos de turno disponibles"""
    MANANA = "manana"
    TARDE = "tarde"
    NOCHE = "noche"
    GUARDIA_24H = "guardia_24h"
    REFUERZO = "refuerzo"


@dataclass
class Turno:
    """
    Entidad que representa un turno de trabajo.
    """
    id: UUID = field(default_factory=uuid4)
    personal_id: UUID = field(default_factory=uuid4)
    hospital_id: UUID = field(default_factory=uuid4)

    fecha: date = field(default_factory=date.today)
    tipo_turno: TipoTurno = TipoTurno.MANANA
    hora_inicio: time = field(default_factory=lambda: time(7, 0))
    hora_fin: time = field(default_factory=lambda: time(15, 0))

    es_refuerzo: bool = False
    confirmado: bool = True
    notas: Optional[str] = None

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def duracion_horas(self) -> float:
        """Calcula la duración del turno en horas"""
        inicio = datetime.combine(self.fecha, self.hora_inicio)
        fin = datetime.combine(self.fecha, self.hora_fin)
        if fin < inicio:
            fin = fin + timedelta(days=1)
        return (fin - inicio).seconds / 3600

    @property
    def cruza_medianoche(self) -> bool:
        """Indica si el turno cruza la medianoche"""
        return self.hora_fin < self.hora_inicio

    def esta_en_curso(self, momento: Optional[datetime] = None) -> bool:
        """Verifica si el turno está en curso en un momento dado"""
        if momento is None:
            momento = datetime.now()

        inicio = datetime.combine(self.fecha, self.hora_inicio)
        fin = datetime.combine(self.fecha, self.hora_fin)

        if self.cruza_medianoche:
            fin = fin + timedelta(days=1)

        return inicio <= momento <= fin

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "personal_id": str(self.personal_id),
            "hospital_id": str(self.hospital_id),
            "fecha": self.fecha.isoformat(),
            "tipo_turno": self.tipo_turno.value,
            "hora_inicio": self.hora_inicio.isoformat(),
            "hora_fin": self.hora_fin.isoformat(),
            "duracion_horas": self.duracion_horas,
            "es_refuerzo": self.es_refuerzo,
            "confirmado": self.confirmado,
            "notas": self.notas,
        }
