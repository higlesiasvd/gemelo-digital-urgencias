"""
Query Handlers - Implementación de todos los query handlers
"""

from typing import Optional, List, Dict
from datetime import date

from src.domain.entities.hospital import Hospital, ConfiguracionPersonalHospital
from src.domain.entities.personal import Personal, RolPersonal
from src.domain.entities.turno import Turno, TipoTurno
from src.domain.entities.disponibilidad import Disponibilidad, EstadoDisponibilidad
from src.domain.entities.solicitud_refuerzo import SolicitudRefuerzo, EstadoSolicitudRefuerzo, PrioridadRefuerzo
from src.domain.entities.personal_lista_sergas import PersonalListaSergas

from src.domain.repositories.hospital_repository import HospitalRepository
from src.domain.repositories.personal_repository import PersonalRepository
from src.domain.repositories.turno_repository import TurnoRepository
from src.domain.repositories.disponibilidad_repository import DisponibilidadRepository
from src.domain.repositories.refuerzo_repository import RefuerzoRepository
from src.domain.repositories.lista_sergas_repository import ListaSergasRepository

from src.application.queries.hospital import GetHospitalQuery, ListHospitalesQuery, GetResumenHospitalQuery
from src.application.queries.personal import GetPersonalQuery, ListPersonalQuery, GetDisponiblesRefuerzoQuery
from src.application.queries.turno import GetTurnoQuery, ListTurnosQuery, GetResumenTurnosQuery
from src.application.queries.disponibilidad import GetDisponibilidadQuery, ListDisponibilidadesQuery
from src.application.queries.refuerzo import GetSolicitudQuery, ListSolicitudesQuery, GetPendientesQuery
from src.application.queries.lista_sergas import ListPersonalDisponibleQuery, GetEstadisticasListaQuery


# ═══════════════════════════════════════════════════════════════════════════════
# HOSPITAL QUERY HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class GetHospitalHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, query: GetHospitalQuery) -> Optional[Hospital]:
        if query.hospital_id:
            return self.repository.find_by_id(query.hospital_id)
        elif query.codigo:
            return self.repository.find_by_codigo(query.codigo)
        return None


class ListHospitalesHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, query: ListHospitalesQuery) -> List[Hospital]:
        return self.repository.find_all(solo_activos=query.solo_activos)


class GetResumenHospitalHandler:
    def __init__(
        self,
        hospital_repository: HospitalRepository,
        personal_repository: PersonalRepository,
        turno_repository: TurnoRepository,
        disponibilidad_repository: DisponibilidadRepository,
        refuerzo_repository: RefuerzoRepository
    ):
        self.hospital_repository = hospital_repository
        self.personal_repository = personal_repository
        self.turno_repository = turno_repository
        self.disponibilidad_repository = disponibilidad_repository
        self.refuerzo_repository = refuerzo_repository

    def handle(self, query: GetResumenHospitalQuery) -> Optional[Dict]:
        hospital = self.hospital_repository.find_by_id(query.hospital_id)
        if not hospital:
            return None

        fecha = query.fecha or date.today()

        # Contar personal por rol
        personal_total = self.personal_repository.find_all(
            hospital_id=query.hospital_id,
            solo_activos=True
        )

        medicos = [p for p in personal_total if p.rol == RolPersonal.MEDICO]
        enfermeros = [p for p in personal_total if p.rol == RolPersonal.ENFERMERO]
        auxiliares = [p for p in personal_total if p.rol == RolPersonal.AUXILIAR]

        # Contar bajas
        bajas = self.disponibilidad_repository.count_bajas_por_hospital(query.hospital_id)

        # Solicitudes pendientes
        pendientes = self.refuerzo_repository.count_pendientes_por_hospital(query.hospital_id)

        return {
            "hospital": hospital.to_dict(),
            "personal": {
                "total": len(personal_total),
                "medicos": len(medicos),
                "enfermeros": len(enfermeros),
                "auxiliares": len(auxiliares),
                "en_baja": bajas,
            },
            "refuerzos_pendientes": pendientes,
            "fecha": fecha.isoformat(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONAL QUERY HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class GetPersonalHandler:
    def __init__(self, repository: PersonalRepository):
        self.repository = repository

    def handle(self, query: GetPersonalQuery) -> Optional[Personal]:
        if query.personal_id:
            return self.repository.find_by_id(query.personal_id)
        elif query.numero_empleado:
            return self.repository.find_by_numero_empleado(query.numero_empleado)
        elif query.dni:
            return self.repository.find_by_dni(query.dni)
        return None


class ListPersonalHandler:
    def __init__(self, repository: PersonalRepository):
        self.repository = repository

    def handle(self, query: ListPersonalQuery) -> List[Personal]:
        rol = RolPersonal(query.rol) if query.rol else None
        return self.repository.find_all(
            hospital_id=query.hospital_id,
            rol=rol,
            solo_activos=query.solo_activos,
            acepta_refuerzos=query.acepta_refuerzos,
            en_lista_sergas=query.en_lista_sergas,
        )


class GetDisponiblesRefuerzoHandler:
    def __init__(self, repository: PersonalRepository):
        self.repository = repository

    def handle(self, query: GetDisponiblesRefuerzoQuery) -> List[Personal]:
        rol = RolPersonal(query.rol) if query.rol else None
        return self.repository.find_disponibles_refuerzo(
            rol=rol,
            excluir_hospital_id=query.excluir_hospital_id,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TURNO QUERY HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class GetTurnoHandler:
    def __init__(self, repository: TurnoRepository):
        self.repository = repository

    def handle(self, query: GetTurnoQuery) -> Optional[Turno]:
        return self.repository.find_by_id(query.turno_id)


class ListTurnosHandler:
    def __init__(self, repository: TurnoRepository):
        self.repository = repository

    def handle(self, query: ListTurnosQuery) -> List[Turno]:
        tipo = TipoTurno(query.tipo_turno) if query.tipo_turno else None
        return self.repository.find_all(
            hospital_id=query.hospital_id,
            personal_id=query.personal_id,
            fecha=query.fecha,
            fecha_desde=query.fecha_desde,
            fecha_hasta=query.fecha_hasta,
            tipo_turno=tipo,
            es_refuerzo=query.es_refuerzo,
        )


class GetResumenTurnosHandler:
    def __init__(self, repository: TurnoRepository, personal_repository: PersonalRepository):
        self.repository = repository
        self.personal_repository = personal_repository

    def handle(self, query: GetResumenTurnosQuery) -> Dict:
        fecha = query.fecha or date.today()
        turnos = self.repository.find_by_hospital_fecha(query.hospital_id, fecha)

        resumen = {
            "hospital_id": str(query.hospital_id),
            "fecha": fecha.isoformat(),
            "turnos": {
                "manana": {"total": 0, "refuerzos": 0},
                "tarde": {"total": 0, "refuerzos": 0},
                "noche": {"total": 0, "refuerzos": 0},
            }
        }

        for turno in turnos:
            tipo = turno.tipo_turno.value
            if tipo in resumen["turnos"]:
                resumen["turnos"][tipo]["total"] += 1
                if turno.es_refuerzo:
                    resumen["turnos"][tipo]["refuerzos"] += 1

        return resumen


# ═══════════════════════════════════════════════════════════════════════════════
# DISPONIBILIDAD QUERY HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class GetDisponibilidadHandler:
    def __init__(self, repository: DisponibilidadRepository):
        self.repository = repository

    def handle(self, query: GetDisponibilidadQuery) -> Optional[Disponibilidad]:
        return self.repository.find_by_id(query.disponibilidad_id)


class ListDisponibilidadesHandler:
    def __init__(self, repository: DisponibilidadRepository):
        self.repository = repository

    def handle(self, query: ListDisponibilidadesQuery) -> List[Disponibilidad]:
        estado = EstadoDisponibilidad(query.estado) if query.estado else None
        return self.repository.find_all(
            personal_id=query.personal_id,
            estado=estado,
            fecha_desde=query.fecha_desde,
            fecha_hasta=query.fecha_hasta,
            solo_vigentes=query.solo_vigentes,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# REFUERZO QUERY HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class GetSolicitudHandler:
    def __init__(self, repository: RefuerzoRepository):
        self.repository = repository

    def handle(self, query: GetSolicitudQuery) -> Optional[SolicitudRefuerzo]:
        return self.repository.find_by_id(query.solicitud_id)


class ListSolicitudesHandler:
    def __init__(self, repository: RefuerzoRepository):
        self.repository = repository

    def handle(self, query: ListSolicitudesQuery) -> List[SolicitudRefuerzo]:
        estado = EstadoSolicitudRefuerzo(query.estado) if query.estado else None
        prioridad = PrioridadRefuerzo(query.prioridad) if query.prioridad else None
        return self.repository.find_all(
            hospital_id=query.hospital_id,
            estado=estado,
            prioridad=prioridad,
            fecha_desde=query.fecha_desde,
            fecha_hasta=query.fecha_hasta,
            generado_automaticamente=query.generado_automaticamente,
        )


class GetPendientesHandler:
    def __init__(self, repository: RefuerzoRepository):
        self.repository = repository

    def handle(self, query: GetPendientesQuery) -> List[SolicitudRefuerzo]:
        return self.repository.find_pendientes(hospital_id=query.hospital_id)


# ═══════════════════════════════════════════════════════════════════════════════
# LISTA SERGAS QUERY HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class ListPersonalDisponibleHandler:
    def __init__(self, repository: ListaSergasRepository):
        self.repository = repository

    def handle(self, query: ListPersonalDisponibleQuery) -> List[PersonalListaSergas]:
        if query.disponible_turno and query.hospital_preferido:
            return self.repository.find_disponibles_para_turno(
                turno=query.disponible_turno,
                rol=query.rol,
                hospital_preferido=query.hospital_preferido,
            )
        return self.repository.find_all(
            rol=query.rol,
            especialidad=query.especialidad,
            solo_activos=query.solo_activos,
            disponible_turno=query.disponible_turno,
        )


class GetEstadisticasListaHandler:
    def __init__(self, repository: ListaSergasRepository):
        self.repository = repository

    def handle(self, query: GetEstadisticasListaQuery) -> Dict:
        total_activos = self.repository.count_activos()
        por_rol = self.repository.count_por_rol()

        return {
            "total_activos": total_activos,
            "por_rol": por_rol,
        }
