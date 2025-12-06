"""
Eventos de Dominio: Hospital
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
class HospitalCreado(DomainEvent):
    """Evento emitido cuando se crea un nuevo hospital"""
    hospital_id: UUID = field(default_factory=uuid4)
    codigo: str = ""
    nombre: str = ""


@dataclass(frozen=True)
class HospitalActualizado(DomainEvent):
    """Evento emitido cuando se actualiza un hospital"""
    hospital_id: UUID = field(default_factory=uuid4)
    campos_actualizados: tuple = field(default_factory=tuple)


@dataclass(frozen=True)
class ConfiguracionActualizada(DomainEvent):
    """Evento emitido cuando se actualiza la configuración de personal de un hospital"""
    hospital_id: UUID = field(default_factory=uuid4)
    puesto: str = ""
    rol: str = ""
