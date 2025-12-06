"""
Command Handlers - Implementación de todos los command handlers
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from src.domain.entities.hospital import Hospital, ConfiguracionPersonalHospital
from src.domain.entities.personal import Personal, RolPersonal
from src.domain.entities.turno import Turno, TipoTurno
from src.domain.entities.disponibilidad import Disponibilidad, EstadoDisponibilidad
from src.domain.entities.solicitud_refuerzo import (
    SolicitudRefuerzo, EstadoSolicitudRefuerzo,
    PrioridadRefuerzo, MotivoRefuerzo
)
from src.domain.entities.personal_lista_sergas import PersonalListaSergas, MotivoEntradaLista

from src.domain.repositories.hospital_repository import HospitalRepository
from src.domain.repositories.personal_repository import PersonalRepository
from src.domain.repositories.turno_repository import TurnoRepository
from src.domain.repositories.disponibilidad_repository import DisponibilidadRepository
from src.domain.repositories.refuerzo_repository import RefuerzoRepository
from src.domain.repositories.lista_sergas_repository import ListaSergasRepository

from src.application.commands.hospital import (
    CreateHospitalCommand, UpdateHospitalCommand, DeleteHospitalCommand
)
from src.application.commands.personal import (
    CreatePersonalCommand, UpdatePersonalCommand, DeletePersonalCommand
)
from src.application.commands.turno import (
    CreateTurnoCommand, UpdateTurnoCommand, DeleteTurnoCommand
)
from src.application.commands.disponibilidad import (
    RegistrarDisponibilidadCommand, ActualizarDisponibilidadCommand
)
from src.application.commands.refuerzo import (
    CrearSolicitudRefuerzoCommand, ActualizarEstadoRefuerzoCommand,
    EvaluarNecesidadRefuerzoCommand
)
from src.application.commands.lista_sergas import (
    AgregarPersonalListaCommand, AsignarPersonalHospitalCommand,
    DevolverPersonalListaCommand
)


# ═══════════════════════════════════════════════════════════════════════════════
# HOSPITAL HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class CreateHospitalHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, command: CreateHospitalCommand) -> Hospital:
        hospital = Hospital(
            codigo=command.codigo,
            nombre=command.nombre,
            latitud=command.latitud,
            longitud=command.longitud,
            direccion=command.direccion,
            num_ventanillas_recepcion=command.num_ventanillas_recepcion,
            aforo_sala_espera=command.aforo_sala_espera,
            numero_boxes_triaje=command.numero_boxes_triaje,
            numero_consultas=command.numero_consultas,
            num_camillas_observacion=command.num_camillas_observacion,
        )
        return self.repository.save(hospital)


class UpdateHospitalHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, command: UpdateHospitalCommand) -> Optional[Hospital]:
        hospital = self.repository.find_by_id(command.hospital_id)
        if not hospital:
            return None

        if command.nombre is not None:
            hospital.nombre = command.nombre
        if command.latitud is not None:
            hospital.latitud = command.latitud
        if command.longitud is not None:
            hospital.longitud = command.longitud
        if command.direccion is not None:
            hospital.direccion = command.direccion
        if command.num_ventanillas_recepcion is not None:
            hospital.num_ventanillas_recepcion = command.num_ventanillas_recepcion
        if command.aforo_sala_espera is not None:
            hospital.aforo_sala_espera = command.aforo_sala_espera
        if command.numero_boxes_triaje is not None:
            hospital.numero_boxes_triaje = command.numero_boxes_triaje
        if command.numero_consultas is not None:
            hospital.numero_consultas = command.numero_consultas
        if command.num_camillas_observacion is not None:
            hospital.num_camillas_observacion = command.num_camillas_observacion
        if command.activo is not None:
            hospital.activo = command.activo

        hospital.updated_at = datetime.now()
        return self.repository.save(hospital)


class DeleteHospitalHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, command: DeleteHospitalCommand) -> bool:
        return self.repository.delete(command.hospital_id)


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONAL HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class CreatePersonalHandler:
    def __init__(self, repository: PersonalRepository):
        self.repository = repository

    def handle(self, command: CreatePersonalCommand) -> Personal:
        personal = Personal(
            numero_empleado=command.numero_empleado,
            nombre=command.nombre,
            apellidos=command.apellidos,
            dni=command.dni,
            email=command.email,
            telefono=command.telefono or "",
            rol=RolPersonal(command.rol),
            especialidad=command.especialidad,
            hospital_id=command.hospital_id,
            unidad=command.unidad,
            fecha_alta=command.fecha_alta or datetime.now().date(),
            acepta_refuerzos=command.acepta_refuerzos,
            horas_semanales_contrato=command.horas_semanales_contrato,
            en_lista_sergas=command.en_lista_sergas,
        )
        return self.repository.save(personal)


class UpdatePersonalHandler:
    def __init__(self, repository: PersonalRepository):
        self.repository = repository

    def handle(self, command: UpdatePersonalCommand) -> Optional[Personal]:
        personal = self.repository.find_by_id(command.personal_id)
        if not personal:
            return None

        if command.nombre is not None:
            personal.nombre = command.nombre
        if command.apellidos is not None:
            personal.apellidos = command.apellidos
        if command.email is not None:
            personal.email = command.email
        if command.telefono is not None:
            personal.telefono = command.telefono
        if command.rol is not None:
            personal.rol = RolPersonal(command.rol)
        if command.especialidad is not None:
            personal.especialidad = command.especialidad
        if command.hospital_id is not None:
            personal.hospital_id = command.hospital_id
        if command.unidad is not None:
            personal.unidad = command.unidad
        if command.activo is not None:
            personal.activo = command.activo
        if command.acepta_refuerzos is not None:
            personal.acepta_refuerzos = command.acepta_refuerzos
        if command.horas_semanales_contrato is not None:
            personal.horas_semanales_contrato = command.horas_semanales_contrato

        personal.updated_at = datetime.now()
        return self.repository.save(personal)


class DeletePersonalHandler:
    def __init__(self, repository: PersonalRepository):
        self.repository = repository

    def handle(self, command: DeletePersonalCommand) -> bool:
        return self.repository.delete(command.personal_id)


# ═══════════════════════════════════════════════════════════════════════════════
# TURNO HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class CreateTurnoHandler:
    def __init__(self, repository: TurnoRepository):
        self.repository = repository

    def handle(self, command: CreateTurnoCommand) -> Turno:
        turno = Turno(
            personal_id=command.personal_id,
            hospital_id=command.hospital_id,
            fecha=command.fecha,
            tipo_turno=TipoTurno(command.tipo_turno),
            hora_inicio=command.hora_inicio,
            hora_fin=command.hora_fin,
            es_refuerzo=command.es_refuerzo,
            confirmado=command.confirmado,
            notas=command.notas,
        )
        return self.repository.save(turno)


class UpdateTurnoHandler:
    def __init__(self, repository: TurnoRepository):
        self.repository = repository

    def handle(self, command: UpdateTurnoCommand) -> Optional[Turno]:
        turno = self.repository.find_by_id(command.turno_id)
        if not turno:
            return None

        if command.tipo_turno is not None:
            turno.tipo_turno = TipoTurno(command.tipo_turno)
        if command.hora_inicio is not None:
            turno.hora_inicio = command.hora_inicio
        if command.hora_fin is not None:
            turno.hora_fin = command.hora_fin
        if command.es_refuerzo is not None:
            turno.es_refuerzo = command.es_refuerzo
        if command.confirmado is not None:
            turno.confirmado = command.confirmado
        if command.notas is not None:
            turno.notas = command.notas

        turno.updated_at = datetime.now()
        return self.repository.save(turno)


class DeleteTurnoHandler:
    def __init__(self, repository: TurnoRepository):
        self.repository = repository

    def handle(self, command: DeleteTurnoCommand) -> bool:
        return self.repository.delete(command.turno_id)


# ═══════════════════════════════════════════════════════════════════════════════
# DISPONIBILIDAD HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class RegistrarDisponibilidadHandler:
    def __init__(self, repository: DisponibilidadRepository):
        self.repository = repository

    def handle(self, command: RegistrarDisponibilidadCommand) -> Disponibilidad:
        disponibilidad = Disponibilidad(
            personal_id=command.personal_id,
            estado=EstadoDisponibilidad(command.estado),
            fecha_inicio=command.fecha_inicio,
            fecha_fin=command.fecha_fin,
            motivo=command.motivo,
            documento_justificante=command.documento_justificante,
            aprobado_por=command.aprobado_por,
        )
        return self.repository.save(disponibilidad)


class ActualizarDisponibilidadHandler:
    def __init__(self, repository: DisponibilidadRepository):
        self.repository = repository

    def handle(self, command: ActualizarDisponibilidadCommand) -> Optional[Disponibilidad]:
        disponibilidad = self.repository.find_by_id(command.disponibilidad_id)
        if not disponibilidad:
            return None

        if command.estado is not None:
            disponibilidad.estado = EstadoDisponibilidad(command.estado)
        if command.fecha_fin is not None:
            disponibilidad.fecha_fin = command.fecha_fin
        if command.motivo is not None:
            disponibilidad.motivo = command.motivo
        if command.documento_justificante is not None:
            disponibilidad.documento_justificante = command.documento_justificante
        if command.aprobado_por is not None:
            disponibilidad.aprobado_por = command.aprobado_por

        disponibilidad.updated_at = datetime.now()
        return self.repository.save(disponibilidad)


# ═══════════════════════════════════════════════════════════════════════════════
# REFUERZO HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class CrearSolicitudRefuerzoHandler:
    def __init__(self, repository: RefuerzoRepository):
        self.repository = repository

    def handle(self, command: CrearSolicitudRefuerzoCommand) -> SolicitudRefuerzo:
        solicitud = SolicitudRefuerzo(
            hospital_id=command.hospital_id,
            fecha_necesidad=command.fecha_necesidad,
            turno_necesario=TipoTurno(command.turno_necesario),
            rol_requerido=RolPersonal(command.rol_requerido),
            cantidad_personal=command.cantidad_personal,
            prioridad=PrioridadRefuerzo(command.prioridad),
            motivo=MotivoRefuerzo(command.motivo),
            generado_automaticamente=command.generado_automaticamente,
            solicitado_por=command.solicitado_por,
            notas=command.notas,
            demanda_predicha=command.demanda_predicha,
            saturacion_predicha=command.saturacion_predicha,
            confianza_prediccion=command.confianza_prediccion,
        )
        return self.repository.save(solicitud)


class ActualizarEstadoRefuerzoHandler:
    def __init__(self, repository: RefuerzoRepository):
        self.repository = repository

    def handle(self, command: ActualizarEstadoRefuerzoCommand) -> Optional[SolicitudRefuerzo]:
        solicitud = self.repository.find_by_id(command.solicitud_id)
        if not solicitud:
            return None

        nuevo_estado = EstadoSolicitudRefuerzo(command.nuevo_estado)
        solicitud.estado = nuevo_estado

        if nuevo_estado in [EstadoSolicitudRefuerzo.ACEPTADA, EstadoSolicitudRefuerzo.RECHAZADA]:
            solicitud.respondido_at = datetime.now()

        if command.notas is not None:
            solicitud.notas = command.notas

        solicitud.updated_at = datetime.now()
        return self.repository.save(solicitud)


# ═══════════════════════════════════════════════════════════════════════════════
# LISTA SERGAS HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

class AgregarPersonalListaHandler:
    def __init__(
        self,
        lista_repository: ListaSergasRepository,
        personal_repository: PersonalRepository
    ):
        self.lista_repository = lista_repository
        self.personal_repository = personal_repository

    def handle(self, command: AgregarPersonalListaCommand) -> PersonalListaSergas:
        # Obtener datos del personal
        personal = self.personal_repository.find_by_id(command.personal_id)
        if not personal:
            raise ValueError(f"Personal no encontrado: {command.personal_id}")

        # Actualizar personal para marcarlo en lista SERGAS
        personal.mover_a_lista_sergas(command.motivo_entrada)
        self.personal_repository.save(personal)

        # Crear registro en lista SERGAS
        personal_lista = PersonalListaSergas(
            personal_id=command.personal_id,
            nombre_completo=personal.nombre_completo,
            rol=personal.rol.value,
            especialidad=personal.especialidad,
            telefono=personal.telefono,
            disponible_turno_manana=command.disponible_turno_manana,
            disponible_turno_tarde=command.disponible_turno_tarde,
            disponible_turno_noche=command.disponible_turno_noche,
            hospitales_preferidos=list(command.hospitales_preferidos),
            distancia_maxima_km=command.distancia_maxima_km,
            motivo_entrada=MotivoEntradaLista(command.motivo_entrada),
        )

        # Registrar asignación
        self.lista_repository.registrar_asignacion(
            personal_id=command.personal_id,
            origen_tipo="hospital",
            origen_id=personal.hospital_origen_id,
            destino_tipo="lista_sergas",
            destino_id=None,
            motivo=command.motivo_entrada,
        )

        return self.lista_repository.save(personal_lista)


class AsignarPersonalHospitalHandler:
    def __init__(
        self,
        lista_repository: ListaSergasRepository,
        personal_repository: PersonalRepository
    ):
        self.lista_repository = lista_repository
        self.personal_repository = personal_repository

    def handle(self, command: AsignarPersonalHospitalCommand) -> Personal:
        # Verificar que está en lista SERGAS
        personal_lista = self.lista_repository.find_by_personal_id(command.personal_id)
        if not personal_lista:
            raise ValueError(f"Personal no encontrado en lista SERGAS: {command.personal_id}")

        if not personal_lista.activo:
            raise ValueError("El personal no está activo en la lista")

        if not personal_lista.esta_disponible_para_turno(command.turno):
            raise ValueError(f"El personal no está disponible para el turno {command.turno}")

        # Obtener y actualizar personal
        personal = self.personal_repository.find_by_id(command.personal_id)
        if not personal:
            raise ValueError(f"Personal no encontrado: {command.personal_id}")

        personal.asignar_a_hospital(command.hospital_id)
        self.personal_repository.save(personal)

        # Desactivar de lista SERGAS
        personal_lista.registrar_asignacion(command.hospital_id)
        personal_lista.desactivar()
        self.lista_repository.save(personal_lista)

        # Registrar asignación
        self.lista_repository.registrar_asignacion(
            personal_id=command.personal_id,
            origen_tipo="lista_sergas",
            origen_id=None,
            destino_tipo="hospital",
            destino_id=command.hospital_id,
            turno=command.turno,
            motivo=command.motivo,
            creado_por=command.creado_por,
        )

        return personal


class DevolverPersonalListaHandler:
    def __init__(
        self,
        lista_repository: ListaSergasRepository,
        personal_repository: PersonalRepository
    ):
        self.lista_repository = lista_repository
        self.personal_repository = personal_repository

    def handle(self, command: DevolverPersonalListaCommand) -> PersonalListaSergas:
        # Obtener personal
        personal = self.personal_repository.find_by_id(command.personal_id)
        if not personal:
            raise ValueError(f"Personal no encontrado: {command.personal_id}")

        if personal.en_lista_sergas:
            raise ValueError("El personal ya está en lista SERGAS")

        hospital_origen_id = personal.hospital_id

        # Mover a lista SERGAS
        personal.mover_a_lista_sergas(command.motivo)
        self.personal_repository.save(personal)

        # Crear/reactivar registro en lista SERGAS
        personal_lista = self.lista_repository.find_by_personal_id(command.personal_id)
        if personal_lista:
            personal_lista.activo = True
            personal_lista.fecha_entrada = datetime.now()
            personal_lista.motivo_entrada = MotivoEntradaLista(command.motivo)
        else:
            personal_lista = PersonalListaSergas(
                personal_id=command.personal_id,
                nombre_completo=personal.nombre_completo,
                rol=personal.rol.value,
                especialidad=personal.especialidad,
                telefono=personal.telefono,
                motivo_entrada=MotivoEntradaLista(command.motivo),
            )

        self.lista_repository.save(personal_lista)

        # Registrar asignación
        self.lista_repository.registrar_asignacion(
            personal_id=command.personal_id,
            origen_tipo="hospital",
            origen_id=hospital_origen_id,
            destino_tipo="lista_sergas",
            destino_id=None,
            motivo=command.motivo,
            creado_por=command.creado_por,
        )

        return personal_lista
