"""
Entidad de Dominio: Solicitud de Refuerzo
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4

from .personal import RolPersonal
from .turno import TipoTurno


class EstadoSolicitudRefuerzo(str, Enum):
    """Estados de una solicitud de refuerzo de personal"""
    PENDIENTE = "pendiente"
    ENVIADA = "enviada"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    EN_CAMINO = "en_camino"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"
    EXPIRADA = "expirada"


class PrioridadRefuerzo(str, Enum):
    """Niveles de prioridad para solicitudes de refuerzo"""
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


class MotivoRefuerzo(str, Enum):
    """Motivos para solicitar refuerzo"""
    ALTA_DEMANDA_PREDICHA = "alta_demanda_predicha"
    EMERGENCIA_MASIVA = "emergencia_masiva"
    BAJA_INESPERADA = "baja_inesperada"
    EVENTO_ESPECIAL = "evento_especial"
    COBERTURA_VACACIONES = "cobertura_vacaciones"
    SATURACION_ACTUAL = "saturacion_actual"


@dataclass
class SolicitudRefuerzo:
    """
    Entidad que representa una solicitud de refuerzo de personal
    generada automáticamente o manualmente.
    """
    id: UUID = field(default_factory=uuid4)
    hospital_id: UUID = field(default_factory=uuid4)

    fecha_necesidad: date = field(default_factory=date.today)
    turno_necesario: TipoTurno = TipoTurno.MANANA
    rol_requerido: RolPersonal = RolPersonal.ENFERMERO
    cantidad_personal: int = 1

    prioridad: PrioridadRefuerzo = PrioridadRefuerzo.MEDIA
    motivo: MotivoRefuerzo = MotivoRefuerzo.ALTA_DEMANDA_PREDICHA
    estado: EstadoSolicitudRefuerzo = EstadoSolicitudRefuerzo.PENDIENTE

    # Datos de predicción
    demanda_predicha: Optional[float] = None
    saturacion_predicha: Optional[float] = None
    confianza_prediccion: Optional[float] = None

    # Personal asignado
    personal_asignado_ids: List[UUID] = field(default_factory=list)

    # Metadatos
    generado_automaticamente: bool = True
    solicitado_por: Optional[str] = None
    notas: Optional[str] = None

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    respondido_at: Optional[datetime] = None

    @property
    def esta_pendiente(self) -> bool:
        return self.estado == EstadoSolicitudRefuerzo.PENDIENTE

    @property
    def esta_completada(self) -> bool:
        return self.estado == EstadoSolicitudRefuerzo.COMPLETADA

    @property
    def es_urgente(self) -> bool:
        return self.prioridad in [PrioridadRefuerzo.ALTA, PrioridadRefuerzo.CRITICA]

    def aceptar(self) -> None:
        """Marca la solicitud como aceptada"""
        self.estado = EstadoSolicitudRefuerzo.ACEPTADA
        self.respondido_at = datetime.now()
        self.updated_at = datetime.now()

    def rechazar(self) -> None:
        """Marca la solicitud como rechazada"""
        self.estado = EstadoSolicitudRefuerzo.RECHAZADA
        self.respondido_at = datetime.now()
        self.updated_at = datetime.now()

    def completar(self) -> None:
        """Marca la solicitud como completada"""
        self.estado = EstadoSolicitudRefuerzo.COMPLETADA
        self.updated_at = datetime.now()

    def cancelar(self) -> None:
        """Cancela la solicitud"""
        self.estado = EstadoSolicitudRefuerzo.CANCELADA
        self.updated_at = datetime.now()

    def asignar_personal(self, personal_id: UUID) -> None:
        """Asigna personal a la solicitud"""
        if personal_id not in self.personal_asignado_ids:
            self.personal_asignado_ids.append(personal_id)
            self.updated_at = datetime.now()

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "hospital_id": str(self.hospital_id),
            "fecha_necesidad": self.fecha_necesidad.isoformat(),
            "turno_necesario": self.turno_necesario.value,
            "rol_requerido": self.rol_requerido.value,
            "cantidad_personal": self.cantidad_personal,
            "prioridad": self.prioridad.value,
            "motivo": self.motivo.value,
            "estado": self.estado.value,
            "demanda_predicha": self.demanda_predicha,
            "saturacion_predicha": self.saturacion_predicha,
            "confianza_prediccion": self.confianza_prediccion,
            "personal_asignado_ids": [str(p) for p in self.personal_asignado_ids],
            "generado_automaticamente": self.generado_automaticamente,
            "solicitado_por": self.solicitado_por,
            "notas": self.notas,
            "es_urgente": self.es_urgente,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class ResumenPersonalHospital:
    """
    Resumen del estado del personal en un hospital para un turno específico.
    """
    hospital_id: UUID
    fecha: date
    turno: TipoTurno

    # Contadores por rol
    medicos_programados: int = 0
    medicos_disponibles: int = 0
    enfermeros_programados: int = 0
    enfermeros_disponibles: int = 0
    auxiliares_programados: int = 0
    auxiliares_disponibles: int = 0

    # Personal en diferentes estados
    total_programado: int = 0
    total_trabajando: int = 0
    en_baja: int = 0
    en_vacaciones: int = 0
    en_descanso: int = 0

    # Refuerzos
    refuerzos_solicitados: int = 0
    refuerzos_confirmados: int = 0
    personal_guardia_localizada: int = 0

    # Ratios
    ratio_pacientes_enfermero: float = 0.0
    ratio_pacientes_medico: float = 0.0
    cobertura_porcentaje: float = 100.0

    def to_dict(self) -> dict:
        return {
            "hospital_id": str(self.hospital_id),
            "fecha": self.fecha.isoformat(),
            "turno": self.turno.value,
            "medicos": {
                "programados": self.medicos_programados,
                "disponibles": self.medicos_disponibles,
            },
            "enfermeros": {
                "programados": self.enfermeros_programados,
                "disponibles": self.enfermeros_disponibles,
            },
            "auxiliares": {
                "programados": self.auxiliares_programados,
                "disponibles": self.auxiliares_disponibles,
            },
            "totales": {
                "programado": self.total_programado,
                "trabajando": self.total_trabajando,
                "en_baja": self.en_baja,
                "en_vacaciones": self.en_vacaciones,
                "en_descanso": self.en_descanso,
            },
            "refuerzos": {
                "solicitados": self.refuerzos_solicitados,
                "confirmados": self.refuerzos_confirmados,
                "guardia_localizada": self.personal_guardia_localizada,
            },
            "ratios": {
                "pacientes_enfermero": self.ratio_pacientes_enfermero,
                "pacientes_medico": self.ratio_pacientes_medico,
                "cobertura_porcentaje": self.cobertura_porcentaje,
            },
        }
