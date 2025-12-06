"""
Eventos de Dominio: Personal
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


@dataclass(frozen=True)
class DomainEvent:
    """Clase base para eventos de dominio"""
    event_id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass(frozen=True)
class PersonalCreado(DomainEvent):
    """Evento emitido cuando se crea un nuevo personal"""
    personal_id: UUID = field(default_factory=uuid4)
    numero_empleado: str = ""
    nombre_completo: str = ""
    rol: str = ""
    hospital_id: Optional[UUID] = None


@dataclass(frozen=True)
class PersonalActualizado(DomainEvent):
    """Evento emitido cuando se actualiza un personal"""
    personal_id: UUID = field(default_factory=uuid4)
    campos_actualizados: tuple = field(default_factory=tuple)


@dataclass(frozen=True)
class PersonalEliminado(DomainEvent):
    """Evento emitido cuando se elimina un personal"""
    personal_id: UUID = field(default_factory=uuid4)
    numero_empleado: str = ""


@dataclass(frozen=True)
class PersonalAsignadoAHospital(DomainEvent):
    """Evento emitido cuando personal de lista SERGAS es asignado a un hospital"""
    personal_id: UUID = field(default_factory=uuid4)
    hospital_id: UUID = field(default_factory=uuid4)
    turno: str = ""
    fecha_asignacion: datetime = field(default_factory=datetime.now)
    motivo: Optional[str] = None


@dataclass(frozen=True)
class PersonalDevueltoALista(DomainEvent):
    """Evento emitido cuando personal es devuelto a la lista SERGAS"""
    personal_id: UUID = field(default_factory=uuid4)
    hospital_origen_id: Optional[UUID] = None
    motivo: str = ""
    fecha_devolucion: datetime = field(default_factory=datetime.now)
