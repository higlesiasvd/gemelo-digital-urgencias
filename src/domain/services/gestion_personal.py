"""
═══════════════════════════════════════════════════════════════════════════════
SERVICIO DE GESTIÓN DE PERSONAL
═══════════════════════════════════════════════════════════════════════════════
Servicio de dominio para la gestión completa del personal sanitario.
Incluye lógica de negocio para refuerzos automáticos basados en predicciones.
═══════════════════════════════════════════════════════════════════════════════
"""

from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
from dataclasses import dataclass
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..entities.personal import (
    Personal, Turno, Disponibilidad, SolicitudRefuerzo, ResumenPersonalHospital,
    RolPersonal, TipoTurno, EstadoDisponibilidad, EstadoSolicitudRefuerzo,
    PrioridadRefuerzo, MotivoRefuerzo
)
from ...infrastructure.persistence.models import (
    PersonalModel, TurnoModel, DisponibilidadModel, 
    SolicitudRefuerzoModel, ConfiguracionUmbralesModel
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE TURNOS
# ═══════════════════════════════════════════════════════════════════════════════

HORARIOS_TURNO = {
    TipoTurno.MANANA: (time(7, 0), time(15, 0)),
    TipoTurno.TARDE: (time(15, 0), time(23, 0)),
    TipoTurno.NOCHE: (time(23, 0), time(7, 0)),
    TipoTurno.GUARDIA_24H: (time(8, 0), time(8, 0)),
    TipoTurno.REFUERZO: (time(0, 0), time(0, 0)),  # Variable
}


def obtener_turno_actual() -> TipoTurno:
    """Determina el turno actual según la hora"""
    hora_actual = datetime.now().hour
    if 7 <= hora_actual < 15:
        return TipoTurno.MANANA
    elif 15 <= hora_actual < 23:
        return TipoTurno.TARDE
    else:
        return TipoTurno.NOCHE


# ═══════════════════════════════════════════════════════════════════════════════
# REPOSITORIO DE PERSONAL
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalRepository:
    """Repositorio para operaciones de base de datos del personal"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def crear(self, personal: Personal) -> PersonalModel:
        """Crea un nuevo registro de personal"""
        modelo = PersonalModel(
            id=personal.id,
            numero_empleado=personal.numero_empleado,
            nombre=personal.nombre,
            apellidos=personal.apellidos,
            dni=personal.dni,
            email=personal.email,
            telefono=personal.telefono,
            rol=personal.rol.value,
            especialidad=personal.especialidad,
            hospital_id=personal.hospital_id,
            unidad=personal.unidad,
            fecha_alta=personal.fecha_alta,
            activo=personal.activo,
            acepta_refuerzos=personal.acepta_refuerzos,
            horas_semanales_contrato=personal.horas_semanales_contrato,
        )
        self.session.add(modelo)
        self.session.commit()
        return modelo
    
    def obtener_por_id(self, personal_id: UUID) -> Optional[PersonalModel]:
        """Obtiene un personal por su ID"""
        return self.session.query(PersonalModel).filter(
            PersonalModel.id == personal_id
        ).first()
    
    def obtener_por_hospital(
        self, 
        hospital_id: str, 
        rol: Optional[RolPersonal] = None,
        solo_activos: bool = True
    ) -> List[PersonalModel]:
        """Obtiene el personal de un hospital"""
        query = self.session.query(PersonalModel).filter(
            PersonalModel.hospital_id == hospital_id
        )
        if solo_activos:
            query = query.filter(PersonalModel.activo == True)
        if rol:
            query = query.filter(PersonalModel.rol == rol.value)
        return query.all()
    
    def obtener_disponibles_refuerzo(
        self,
        hospital_id: Optional[str] = None,
        rol: Optional[RolPersonal] = None,
        fecha: date = None
    ) -> List[PersonalModel]:
        """Obtiene personal disponible para refuerzos"""
        if fecha is None:
            fecha = date.today()
        
        # Subconsulta para personal con indisponibilidad activa
        subquery = self.session.query(DisponibilidadModel.personal_id).filter(
            and_(
                DisponibilidadModel.estado != 'disponible',
                DisponibilidadModel.fecha_inicio <= fecha,
                or_(
                    DisponibilidadModel.fecha_fin.is_(None),
                    DisponibilidadModel.fecha_fin >= fecha
                )
            )
        ).subquery()
        
        query = self.session.query(PersonalModel).filter(
            and_(
                PersonalModel.activo == True,
                PersonalModel.acepta_refuerzos == True,
                ~PersonalModel.id.in_(subquery)
            )
        )
        
        if hospital_id:
            query = query.filter(PersonalModel.hospital_id == hospital_id)
        if rol:
            query = query.filter(PersonalModel.rol == rol.value)
        
        return query.all()
    
    def contar_por_hospital_y_rol(self, hospital_id: str) -> Dict[str, int]:
        """Cuenta el personal por rol en un hospital"""
        result = self.session.query(
            PersonalModel.rol,
            func.count(PersonalModel.id)
        ).filter(
            PersonalModel.hospital_id == hospital_id,
            PersonalModel.activo == True
        ).group_by(PersonalModel.rol).all()
        
        return {rol: count for rol, count in result}


# ═══════════════════════════════════════════════════════════════════════════════
# REPOSITORIO DE TURNOS
# ═══════════════════════════════════════════════════════════════════════════════

class TurnoRepository:
    """Repositorio para operaciones de turnos"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def crear(self, turno: Turno) -> TurnoModel:
        """Crea un nuevo turno"""
        modelo = TurnoModel(
            id=turno.id,
            personal_id=turno.personal_id,
            hospital_id=turno.hospital_id,
            fecha=turno.fecha,
            tipo_turno=turno.tipo_turno.value,
            hora_inicio=turno.hora_inicio,
            hora_fin=turno.hora_fin,
            es_refuerzo=turno.es_refuerzo,
            confirmado=turno.confirmado,
            notas=turno.notas,
        )
        self.session.add(modelo)
        self.session.commit()
        return modelo
    
    def obtener_turnos_fecha(
        self,
        hospital_id: str,
        fecha: date,
        tipo_turno: Optional[TipoTurno] = None
    ) -> List[TurnoModel]:
        """Obtiene los turnos de un hospital en una fecha"""
        query = self.session.query(TurnoModel).filter(
            TurnoModel.hospital_id == hospital_id,
            TurnoModel.fecha == fecha,
            TurnoModel.confirmado == True
        )
        if tipo_turno:
            query = query.filter(TurnoModel.tipo_turno == tipo_turno.value)
        return query.all()
    
    def contar_personal_turno(
        self,
        hospital_id: str,
        fecha: date,
        tipo_turno: TipoTurno
    ) -> Dict[str, int]:
        """Cuenta el personal programado por rol para un turno específico"""
        result = self.session.query(
            PersonalModel.rol,
            func.count(TurnoModel.id)
        ).join(
            PersonalModel, TurnoModel.personal_id == PersonalModel.id
        ).filter(
            TurnoModel.hospital_id == hospital_id,
            TurnoModel.fecha == fecha,
            TurnoModel.tipo_turno == tipo_turno.value,
            TurnoModel.confirmado == True
        ).group_by(PersonalModel.rol).all()
        
        return {rol: count for rol, count in result}


# ═══════════════════════════════════════════════════════════════════════════════
# REPOSITORIO DE SOLICITUDES DE REFUERZO
# ═══════════════════════════════════════════════════════════════════════════════

class SolicitudRefuerzoRepository:
    """Repositorio para solicitudes de refuerzo"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def crear(self, solicitud: SolicitudRefuerzo) -> SolicitudRefuerzoModel:
        """Crea una nueva solicitud de refuerzo"""
        modelo = SolicitudRefuerzoModel(
            id=solicitud.id,
            hospital_id=solicitud.hospital_id,
            fecha_necesidad=solicitud.fecha_necesidad,
            turno_necesario=solicitud.turno_necesario.value,
            rol_requerido=solicitud.rol_requerido.value,
            cantidad_personal=solicitud.cantidad_personal,
            prioridad=solicitud.prioridad.value,
            motivo=solicitud.motivo.value,
            estado=solicitud.estado.value,
            demanda_predicha=solicitud.demanda_predicha,
            saturacion_predicha=solicitud.saturacion_predicha,
            confianza_prediccion=solicitud.confianza_prediccion,
            generado_automaticamente=solicitud.generado_automaticamente,
            solicitado_por=solicitud.solicitado_por,
            notas=solicitud.notas,
        )
        self.session.add(modelo)
        self.session.commit()
        return modelo
    
    def obtener_pendientes(
        self,
        hospital_id: Optional[str] = None
    ) -> List[SolicitudRefuerzoModel]:
        """Obtiene solicitudes pendientes"""
        query = self.session.query(SolicitudRefuerzoModel).filter(
            SolicitudRefuerzoModel.estado.in_([
                'pendiente', 'enviada'
            ])
        )
        if hospital_id:
            query = query.filter(SolicitudRefuerzoModel.hospital_id == hospital_id)
        return query.order_by(SolicitudRefuerzoModel.prioridad.desc()).all()
    
    def actualizar_estado(
        self,
        solicitud_id: UUID,
        nuevo_estado: EstadoSolicitudRefuerzo
    ) -> Optional[SolicitudRefuerzoModel]:
        """Actualiza el estado de una solicitud"""
        solicitud = self.session.query(SolicitudRefuerzoModel).filter(
            SolicitudRefuerzoModel.id == solicitud_id
        ).first()
        
        if solicitud:
            solicitud.estado = nuevo_estado.value
            solicitud.updated_at = datetime.now()
            if nuevo_estado in [
                EstadoSolicitudRefuerzo.ACEPTADA,
                EstadoSolicitudRefuerzo.RECHAZADA
            ]:
                solicitud.respondido_at = datetime.now()
            self.session.commit()
        
        return solicitud


# ═══════════════════════════════════════════════════════════════════════════════
# SERVICIO DE GESTIÓN DE PERSONAL
# ═══════════════════════════════════════════════════════════════════════════════

class GestionPersonalService:
    """
    Servicio principal para la gestión del personal sanitario.
    Coordina la lógica de negocio entre repositorios y servicios externos.
    """
    
    def __init__(self, session: Session):
        self.session = session
        self.personal_repo = PersonalRepository(session)
        self.turno_repo = TurnoRepository(session)
        self.solicitud_repo = SolicitudRefuerzoRepository(session)
    
    def obtener_resumen_hospital(
        self,
        hospital_id: str,
        fecha: Optional[date] = None,
        turno: Optional[TipoTurno] = None
    ) -> ResumenPersonalHospital:
        """
        Genera un resumen del estado del personal en un hospital.
        """
        if fecha is None:
            fecha = date.today()
        if turno is None:
            turno = obtener_turno_actual()
        
        # Contar personal total por rol
        personal_por_rol = self.personal_repo.contar_por_hospital_y_rol(hospital_id)
        
        # Contar personal programado para el turno
        programados = self.turno_repo.contar_personal_turno(hospital_id, fecha, turno)
        
        # Obtener solicitudes pendientes
        solicitudes_pendientes = len(self.solicitud_repo.obtener_pendientes(hospital_id))
        
        resumen = ResumenPersonalHospital(
            hospital_id=hospital_id,
            fecha=fecha,
            turno=turno,
            medicos_programados=programados.get('medico', 0),
            medicos_disponibles=personal_por_rol.get('medico', 0),
            enfermeros_programados=programados.get('enfermero', 0),
            enfermeros_disponibles=personal_por_rol.get('enfermero', 0),
            auxiliares_programados=programados.get('auxiliar', 0),
            auxiliares_disponibles=personal_por_rol.get('auxiliar', 0),
            refuerzos_solicitados=solicitudes_pendientes,
        )
        
        # Calcular totales
        resumen.total_programado = (
            resumen.medicos_programados + 
            resumen.enfermeros_programados + 
            resumen.auxiliares_programados
        )
        
        return resumen
    
    def evaluar_necesidad_refuerzo(
        self,
        hospital_id: str,
        demanda_predicha: float,
        saturacion_predicha: float,
        confianza: float = 0.8
    ) -> Optional[SolicitudRefuerzo]:
        """
        Evalúa si se necesita solicitar refuerzo basándose en predicciones.
        
        Args:
            hospital_id: ID del hospital
            demanda_predicha: Demanda predicha (pacientes/hora)
            saturacion_predicha: Saturación predicha (0-1)
            confianza: Nivel de confianza de la predicción
        
        Returns:
            Solicitud de refuerzo si es necesaria, None si no
        """
        # Obtener configuración de umbrales
        config = self.session.query(ConfiguracionUmbralesModel).filter(
            ConfiguracionUmbralesModel.hospital_id == hospital_id
        ).first()
        
        if not config or not config.refuerzos_automaticos:
            return None
        
        # Determinar prioridad según saturación predicha
        if saturacion_predicha >= config.umbral_saturacion_critica:
            prioridad = PrioridadRefuerzo.CRITICA
        elif saturacion_predicha >= config.umbral_saturacion_alta:
            prioridad = PrioridadRefuerzo.ALTA
        elif saturacion_predicha >= config.umbral_saturacion_media:
            prioridad = PrioridadRefuerzo.MEDIA
        else:
            # No se necesita refuerzo
            return None
        
        # Calcular turno para el que se necesita refuerzo
        horas_anticipacion = config.horas_anticipacion_refuerzo
        fecha_necesidad = date.today()
        hora_actual = datetime.now().hour
        
        if hora_actual + horas_anticipacion >= 24:
            fecha_necesidad = date.today() + timedelta(days=1)
        
        turno_necesario = self._calcular_turno_para_hora(hora_actual + horas_anticipacion)
        
        # Determinar rol y cantidad necesaria
        rol_requerido, cantidad = self._calcular_personal_necesario(
            hospital_id,
            saturacion_predicha,
            demanda_predicha,
            config
        )
        
        if cantidad == 0:
            return None
        
        # Crear solicitud
        solicitud = SolicitudRefuerzo(
            id=uuid4(),
            hospital_id=hospital_id,
            fecha_necesidad=fecha_necesidad,
            turno_necesario=turno_necesario,
            rol_requerido=rol_requerido,
            cantidad_personal=cantidad,
            prioridad=prioridad,
            motivo=MotivoRefuerzo.ALTA_DEMANDA_PREDICHA,
            estado=EstadoSolicitudRefuerzo.PENDIENTE,
            demanda_predicha=demanda_predicha,
            saturacion_predicha=saturacion_predicha,
            confianza_prediccion=confianza,
            generado_automaticamente=True,
        )
        
        return solicitud
    
    def crear_solicitud_refuerzo(
        self,
        solicitud: SolicitudRefuerzo
    ) -> SolicitudRefuerzoModel:
        """Crea y guarda una solicitud de refuerzo"""
        modelo = self.solicitud_repo.crear(solicitud)
        logger.info(
            f"Solicitud de refuerzo creada: {solicitud.id} "
            f"para {solicitud.hospital_id} - {solicitud.prioridad.value}"
        )
        return modelo
    
    def buscar_personal_para_refuerzo(
        self,
        solicitud: SolicitudRefuerzo
    ) -> List[PersonalModel]:
        """
        Busca personal disponible para cubrir una solicitud de refuerzo.
        Prioriza personal del mismo hospital, luego de otros hospitales.
        """
        # Primero buscar en el mismo hospital
        candidatos = self.personal_repo.obtener_disponibles_refuerzo(
            hospital_id=solicitud.hospital_id,
            rol=solicitud.rol_requerido,
            fecha=solicitud.fecha_necesidad
        )
        
        # Si no hay suficientes, buscar en otros hospitales
        if len(candidatos) < solicitud.cantidad_personal:
            otros_candidatos = self.personal_repo.obtener_disponibles_refuerzo(
                hospital_id=None,  # Todos los hospitales
                rol=solicitud.rol_requerido,
                fecha=solicitud.fecha_necesidad
            )
            # Filtrar los que ya están en la lista
            ids_ya_incluidos = {c.id for c in candidatos}
            otros_candidatos = [
                c for c in otros_candidatos 
                if c.id not in ids_ya_incluidos
            ]
            candidatos.extend(otros_candidatos)
        
        return candidatos[:solicitud.cantidad_personal * 2]  # Devolver el doble por si hay rechazos
    
    def _calcular_turno_para_hora(self, hora: int) -> TipoTurno:
        """Calcula el turno correspondiente a una hora"""
        hora = hora % 24
        if 7 <= hora < 15:
            return TipoTurno.MANANA
        elif 15 <= hora < 23:
            return TipoTurno.TARDE
        else:
            return TipoTurno.NOCHE
    
    def _calcular_personal_necesario(
        self,
        hospital_id: str,
        saturacion: float,
        demanda: float,
        config: ConfiguracionUmbralesModel
    ) -> Tuple[RolPersonal, int]:
        """
        Calcula qué tipo y cantidad de personal se necesita.
        
        Returns:
            Tupla (RolPersonal, cantidad)
        """
        turno_actual = obtener_turno_actual()
        
        # Obtener personal actual
        programados = self.turno_repo.contar_personal_turno(
            hospital_id, date.today(), turno_actual
        )
        
        enfermeros_actuales = programados.get('enfermero', 0)
        medicos_actuales = programados.get('medico', 0)
        
        # Calcular déficit
        # Usar demanda predicha para estimar pacientes
        pacientes_estimados = demanda * 2  # Factor de acumulación
        
        enfermeros_necesarios = max(
            0,
            int(pacientes_estimados / config.ratio_paciente_enfermero_objetivo) - enfermeros_actuales
        )
        
        medicos_necesarios = max(
            0,
            int(pacientes_estimados / config.ratio_paciente_medico_objetivo) - medicos_actuales
        )
        
        # Priorizar enfermeros si faltan ambos
        if enfermeros_necesarios > 0:
            return RolPersonal.ENFERMERO, min(enfermeros_necesarios, 3)
        elif medicos_necesarios > 0:
            return RolPersonal.MEDICO, min(medicos_necesarios, 2)
        else:
            # Si la saturación es alta pero tenemos personal, añadir auxiliares
            if saturacion >= 0.8:
                return RolPersonal.AUXILIAR, 1
            return RolPersonal.ENFERMERO, 0
