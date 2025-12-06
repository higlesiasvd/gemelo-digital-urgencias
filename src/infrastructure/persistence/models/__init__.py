from src.infrastructure.persistence.database import Base

from .hospital_model import HospitalModel, ConfiguracionPersonalHospitalModel
from .personal_model import PersonalModel, RolPersonalDB
from .turno_model import TurnoModel, TipoTurnoDB
from .disponibilidad_model import DisponibilidadModel, EstadoDisponibilidadDB
from .refuerzo_model import SolicitudRefuerzoModel, EstadoSolicitudRefuerzoDB, PrioridadRefuerzoDB, MotivoRefuerzoDB
from .lista_sergas_model import ListaSergasModel, AsignacionTemporalModel
from .configuracion_model import ConfiguracionUmbralesModel, EventoPrediccionModel

__all__ = [
    # Base
    "Base",
    # Modelos
    "HospitalModel",
    "ConfiguracionPersonalHospitalModel",
    "PersonalModel",
    "TurnoModel",
    "DisponibilidadModel",
    "SolicitudRefuerzoModel",
    "ListaSergasModel",
    "AsignacionTemporalModel",
    "ConfiguracionUmbralesModel",
    "EventoPrediccionModel",
    # Enums
    "RolPersonalDB",
    "TipoTurnoDB",
    "EstadoDisponibilidadDB",
    "EstadoSolicitudRefuerzoDB",
    "PrioridadRefuerzoDB",
    "MotivoRefuerzoDB",
]
