"""
Entidades del dominio
"""

from .hospital import Hospital, ConfiguracionPersonalHospital
from .personal import Personal, RolPersonal
from .turno import Turno, TipoTurno
from .disponibilidad import Disponibilidad, EstadoDisponibilidad
from .solicitud_refuerzo import (
    SolicitudRefuerzo,
    ResumenPersonalHospital,
    EstadoSolicitudRefuerzo,
    PrioridadRefuerzo,
    MotivoRefuerzo,
)
from .personal_lista_sergas import PersonalListaSergas

__all__ = [
    "Hospital",
    "ConfiguracionPersonalHospital",
    "Personal",
    "RolPersonal",
    "Turno",
    "TipoTurno",
    "Disponibilidad",
    "EstadoDisponibilidad",
    "SolicitudRefuerzo",
    "ResumenPersonalHospital",
    "EstadoSolicitudRefuerzo",
    "PrioridadRefuerzo",
    "MotivoRefuerzo",
    "PersonalListaSergas",
]
