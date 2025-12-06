"""
Módulo de persistencia - PostgreSQL
"""

from src.infrastructure.persistence.database import Base

from .models import (
    HospitalModel,
    ConfiguracionPersonalHospitalModel,
    PersonalModel,
    TurnoModel,
    DisponibilidadModel,
    SolicitudRefuerzoModel,
    ListaSergasModel,
    AsignacionTemporalModel,
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
    init_db,
    get_db_session,
    get_db,
    get_session,
    check_database_connection,
    get_database_url,
)

from .repositories import (
    SQLAlchemyHospitalRepository,
    SQLAlchemyPersonalRepository,
    SQLAlchemyTurnoRepository,
    SQLAlchemyDisponibilidadRepository,
    SQLAlchemyRefuerzoRepository,
    SQLAlchemyListaSergasRepository,
)

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
    "init_db",
    "get_db_session",
    "get_db",
    "get_session",
    "check_database_connection",
    "get_database_url",
    # Repositories
    "SQLAlchemyHospitalRepository",
    "SQLAlchemyPersonalRepository",
    "SQLAlchemyTurnoRepository",
    "SQLAlchemyDisponibilidadRepository",
    "SQLAlchemyRefuerzoRepository",
    "SQLAlchemyListaSergasRepository",
]
