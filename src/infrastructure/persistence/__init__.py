"""
Módulo de persistencia - PostgreSQL
"""

from .models import (
    Base,
    PersonalModel,
    TurnoModel,
    DisponibilidadModel,
    SolicitudRefuerzoModel,
    EventoPrediccionModel,
    ConfiguracionUmbralesModel,
    RolPersonalDB,
    TipoTurnoDB,
    EstadoDisponibilidadDB,
    EstadoSolicitudRefuerzoDB,
    PrioridadRefuerzoDB,
    MotivoRefuerzoDB,
)

from .database import (
    init_database,
    get_db_session,
    get_db,
    check_database_connection,
    get_database_url,
)

__all__ = [
    # Base
    "Base",
    # Modelos
    "PersonalModel",
    "TurnoModel", 
    "DisponibilidadModel",
    "SolicitudRefuerzoModel",
    "EventoPrediccionModel",
    "ConfiguracionUmbralesModel",
    # Enums
    "RolPersonalDB",
    "TipoTurnoDB",
    "EstadoDisponibilidadDB",
    "EstadoSolicitudRefuerzoDB",
    "PrioridadRefuerzoDB",
    "MotivoRefuerzoDB",
    # Database
    "init_database",
    "get_db_session",
    "get_db",
    "check_database_connection",
    "get_database_url",
]
