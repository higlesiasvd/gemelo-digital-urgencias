"""
Entidades del dominio
"""

from .personal import (
    Personal,
    Turno,
    Disponibilidad,
    SolicitudRefuerzo,
    ResumenPersonalHospital,
    RolPersonal,
    TipoTurno,
    EstadoDisponibilidad,
    EstadoSolicitudRefuerzo,
    PrioridadRefuerzo,
    MotivoRefuerzo,
)

__all__ = [
    "Personal",
    "Turno", 
    "Disponibilidad",
    "SolicitudRefuerzo",
    "ResumenPersonalHospital",
    "RolPersonal",
    "TipoTurno",
    "EstadoDisponibilidad",
    "EstadoSolicitudRefuerzo",
    "PrioridadRefuerzo",
    "MotivoRefuerzo",
]
