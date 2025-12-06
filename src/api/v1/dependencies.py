"""
Dependencias para inyección en FastAPI
"""

from typing import Generator
from sqlalchemy.orm import Session

from src.infrastructure.persistence.database import get_session
from src.infrastructure.persistence.repositories import (
    SQLAlchemyHospitalRepository,
    SQLAlchemyPersonalRepository,
    SQLAlchemyTurnoRepository,
    SQLAlchemyDisponibilidadRepository,
    SQLAlchemyRefuerzoRepository,
    SQLAlchemyListaSergasRepository,
)
from src.application.handlers.command_handlers import (
    CreateHospitalHandler, UpdateHospitalHandler, DeleteHospitalHandler,
    CreatePersonalHandler, UpdatePersonalHandler, DeletePersonalHandler,
    CreateTurnoHandler, UpdateTurnoHandler, DeleteTurnoHandler,
    RegistrarDisponibilidadHandler, ActualizarDisponibilidadHandler,
    CrearSolicitudRefuerzoHandler, ActualizarEstadoRefuerzoHandler,
    AgregarPersonalListaHandler, AsignarPersonalHospitalHandler, DevolverPersonalListaHandler,
)
from src.application.handlers.query_handlers import (
    GetHospitalHandler, ListHospitalesHandler, GetResumenHospitalHandler,
    GetPersonalHandler, ListPersonalHandler, GetDisponiblesRefuerzoHandler,
    GetTurnoHandler, ListTurnosHandler, GetResumenTurnosHandler,
    GetDisponibilidadHandler, ListDisponibilidadesHandler,
    GetSolicitudHandler, ListSolicitudesHandler, GetPendientesHandler,
    ListPersonalDisponibleHandler, GetEstadisticasListaHandler,
)


def get_db() -> Generator[Session, None, None]:
    """Obtiene una sesión de base de datos"""
    db = get_session()
    try:
        yield db
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════
# HOSPITAL DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_hospital_repository(db: Session) -> SQLAlchemyHospitalRepository:
    return SQLAlchemyHospitalRepository(db)


def get_create_hospital_handler(db: Session) -> CreateHospitalHandler:
    return CreateHospitalHandler(get_hospital_repository(db))


def get_update_hospital_handler(db: Session) -> UpdateHospitalHandler:
    return UpdateHospitalHandler(get_hospital_repository(db))


def get_delete_hospital_handler(db: Session) -> DeleteHospitalHandler:
    return DeleteHospitalHandler(get_hospital_repository(db))


def get_hospital_query_handler(db: Session) -> GetHospitalHandler:
    return GetHospitalHandler(get_hospital_repository(db))


def get_list_hospitales_handler(db: Session) -> ListHospitalesHandler:
    return ListHospitalesHandler(get_hospital_repository(db))


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONAL DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_personal_repository(db: Session) -> SQLAlchemyPersonalRepository:
    return SQLAlchemyPersonalRepository(db)


def get_create_personal_handler(db: Session) -> CreatePersonalHandler:
    return CreatePersonalHandler(get_personal_repository(db))


def get_update_personal_handler(db: Session) -> UpdatePersonalHandler:
    return UpdatePersonalHandler(get_personal_repository(db))


def get_delete_personal_handler(db: Session) -> DeletePersonalHandler:
    return DeletePersonalHandler(get_personal_repository(db))


def get_personal_query_handler(db: Session) -> GetPersonalHandler:
    return GetPersonalHandler(get_personal_repository(db))


def get_list_personal_handler(db: Session) -> ListPersonalHandler:
    return ListPersonalHandler(get_personal_repository(db))


def get_disponibles_refuerzo_handler(db: Session) -> GetDisponiblesRefuerzoHandler:
    return GetDisponiblesRefuerzoHandler(get_personal_repository(db))


# ═══════════════════════════════════════════════════════════════════════════════
# TURNO DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_turno_repository(db: Session) -> SQLAlchemyTurnoRepository:
    return SQLAlchemyTurnoRepository(db)


def get_create_turno_handler(db: Session) -> CreateTurnoHandler:
    return CreateTurnoHandler(get_turno_repository(db))


def get_update_turno_handler(db: Session) -> UpdateTurnoHandler:
    return UpdateTurnoHandler(get_turno_repository(db))


def get_delete_turno_handler(db: Session) -> DeleteTurnoHandler:
    return DeleteTurnoHandler(get_turno_repository(db))


def get_turno_query_handler(db: Session) -> GetTurnoHandler:
    return GetTurnoHandler(get_turno_repository(db))


def get_list_turnos_handler(db: Session) -> ListTurnosHandler:
    return ListTurnosHandler(get_turno_repository(db))


def get_resumen_turnos_handler(db: Session) -> GetResumenTurnosHandler:
    return GetResumenTurnosHandler(
        get_turno_repository(db),
        get_personal_repository(db)
    )


# ═══════════════════════════════════════════════════════════════════════════════
# DISPONIBILIDAD DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_disponibilidad_repository(db: Session) -> SQLAlchemyDisponibilidadRepository:
    return SQLAlchemyDisponibilidadRepository(db)


def get_registrar_disponibilidad_handler(db: Session) -> RegistrarDisponibilidadHandler:
    return RegistrarDisponibilidadHandler(get_disponibilidad_repository(db))


def get_actualizar_disponibilidad_handler(db: Session) -> ActualizarDisponibilidadHandler:
    return ActualizarDisponibilidadHandler(get_disponibilidad_repository(db))


def get_disponibilidad_query_handler(db: Session) -> GetDisponibilidadHandler:
    return GetDisponibilidadHandler(get_disponibilidad_repository(db))


def get_list_disponibilidades_handler(db: Session) -> ListDisponibilidadesHandler:
    return ListDisponibilidadesHandler(get_disponibilidad_repository(db))


# ═══════════════════════════════════════════════════════════════════════════════
# REFUERZO DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_refuerzo_repository(db: Session) -> SQLAlchemyRefuerzoRepository:
    return SQLAlchemyRefuerzoRepository(db)


def get_crear_solicitud_refuerzo_handler(db: Session) -> CrearSolicitudRefuerzoHandler:
    return CrearSolicitudRefuerzoHandler(get_refuerzo_repository(db))


def get_actualizar_estado_refuerzo_handler(db: Session) -> ActualizarEstadoRefuerzoHandler:
    return ActualizarEstadoRefuerzoHandler(get_refuerzo_repository(db))


def get_solicitud_query_handler(db: Session) -> GetSolicitudHandler:
    return GetSolicitudHandler(get_refuerzo_repository(db))


def get_list_solicitudes_handler(db: Session) -> ListSolicitudesHandler:
    return ListSolicitudesHandler(get_refuerzo_repository(db))


def get_pendientes_handler(db: Session) -> GetPendientesHandler:
    return GetPendientesHandler(get_refuerzo_repository(db))


# ═══════════════════════════════════════════════════════════════════════════════
# LISTA SERGAS DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

def get_lista_sergas_repository(db: Session) -> SQLAlchemyListaSergasRepository:
    return SQLAlchemyListaSergasRepository(db)


def get_agregar_personal_lista_handler(db: Session) -> AgregarPersonalListaHandler:
    return AgregarPersonalListaHandler(
        get_lista_sergas_repository(db),
        get_personal_repository(db)
    )


def get_asignar_personal_hospital_handler(db: Session) -> AsignarPersonalHospitalHandler:
    return AsignarPersonalHospitalHandler(
        get_lista_sergas_repository(db),
        get_personal_repository(db)
    )


def get_devolver_personal_lista_handler(db: Session) -> DevolverPersonalListaHandler:
    return DevolverPersonalListaHandler(
        get_lista_sergas_repository(db),
        get_personal_repository(db)
    )


def get_list_personal_disponible_handler(db: Session) -> ListPersonalDisponibleHandler:
    return ListPersonalDisponibleHandler(get_lista_sergas_repository(db))


def get_estadisticas_lista_handler(db: Session) -> GetEstadisticasListaHandler:
    return GetEstadisticasListaHandler(get_lista_sergas_repository(db))
