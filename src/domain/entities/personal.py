"""
═══════════════════════════════════════════════════════════════════════════════
ENTIDADES DE PERSONAL SANITARIO
═══════════════════════════════════════════════════════════════════════════════
Modelos de dominio para la gestión del personal sanitario hospitalario.
Incluye: Personal, Turnos, Disponibilidad, Bajas y Solicitudes de Refuerzo.
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from datetime import datetime, date, time
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4


class RolPersonal(str, Enum):
    """Roles del personal sanitario"""
    MEDICO = "medico"
    ENFERMERO = "enfermero"
    AUXILIAR = "auxiliar"
    ADMINISTRATIVO = "administrativo"
    CELADOR = "celador"
    TECNICO = "tecnico"


class TipoTurno(str, Enum):
    """Tipos de turno disponibles"""
    MANANA = "manana"      # 07:00 - 15:00
    TARDE = "tarde"        # 15:00 - 23:00
    NOCHE = "noche"        # 23:00 - 07:00
    GUARDIA_24H = "guardia_24h"
    REFUERZO = "refuerzo"  # Turno extra por alta demanda


class EstadoDisponibilidad(str, Enum):
    """Estado de disponibilidad del personal"""
    DISPONIBLE = "disponible"        # Trabajando normalmente
    EN_DESCANSO = "en_descanso"      # Descanso programado
    BAJA_MEDICA = "baja_medica"      # Baja por enfermedad
    BAJA_MATERNAL = "baja_maternal"  # Baja maternal/paternal
    VACACIONES = "vacaciones"        # Período vacacional
    PERMISO = "permiso"              # Permiso personal
    FORMACION = "formacion"          # En curso/formación
    GUARDIA_LOCALIZADA = "guardia_localizada"  # Disponible para llamar
    REFUERZO_DISPONIBLE = "refuerzo_disponible"  # Acepta refuerzos
    NO_DISPONIBLE = "no_disponible"


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
class Personal:
    """
    Representa un miembro del personal sanitario.
    """
    id: UUID = field(default_factory=uuid4)
    numero_empleado: str = ""
    nombre: str = ""
    apellidos: str = ""
    dni: str = ""
    email: str = ""
    telefono: str = ""
    rol: RolPersonal = RolPersonal.ENFERMERO
    especialidad: Optional[str] = None  # Para médicos
    hospital_id: str = ""
    unidad: str = "urgencias"
    fecha_alta: date = field(default_factory=date.today)
    activo: bool = True
    acepta_refuerzos: bool = True  # Si acepta ser llamado para refuerzos
    horas_semanales_contrato: int = 40
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellidos}"
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "numero_empleado": self.numero_empleado,
            "nombre": self.nombre,
            "apellidos": self.apellidos,
            "nombre_completo": self.nombre_completo,
            "dni": self.dni,
            "email": self.email,
            "telefono": self.telefono,
            "rol": self.rol.value,
            "especialidad": self.especialidad,
            "hospital_id": self.hospital_id,
            "unidad": self.unidad,
            "fecha_alta": self.fecha_alta.isoformat(),
            "activo": self.activo,
            "acepta_refuerzos": self.acepta_refuerzos,
            "horas_semanales_contrato": self.horas_semanales_contrato,
        }


@dataclass
class Turno:
    """
    Define un turno de trabajo específico.
    """
    id: UUID = field(default_factory=uuid4)
    personal_id: UUID = field(default_factory=uuid4)
    hospital_id: str = ""
    fecha: date = field(default_factory=date.today)
    tipo_turno: TipoTurno = TipoTurno.MANANA
    hora_inicio: time = field(default_factory=lambda: time(7, 0))
    hora_fin: time = field(default_factory=lambda: time(15, 0))
    es_refuerzo: bool = False
    confirmado: bool = True
    notas: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def duracion_horas(self) -> float:
        """Calcula la duración del turno en horas"""
        inicio = datetime.combine(self.fecha, self.hora_inicio)
        fin = datetime.combine(self.fecha, self.hora_fin)
        if fin < inicio:  # Turno nocturno que cruza medianoche
            fin = datetime.combine(self.fecha, self.hora_fin) + timedelta(days=1)
        return (fin - inicio).seconds / 3600
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "personal_id": str(self.personal_id),
            "hospital_id": self.hospital_id,
            "fecha": self.fecha.isoformat(),
            "tipo_turno": self.tipo_turno.value,
            "hora_inicio": self.hora_inicio.isoformat(),
            "hora_fin": self.hora_fin.isoformat(),
            "duracion_horas": self.duracion_horas,
            "es_refuerzo": self.es_refuerzo,
            "confirmado": self.confirmado,
            "notas": self.notas,
        }


@dataclass
class Disponibilidad:
    """
    Registro de disponibilidad/indisponibilidad del personal.
    Usado para bajas, vacaciones, permisos, etc.
    """
    id: UUID = field(default_factory=uuid4)
    personal_id: UUID = field(default_factory=uuid4)
    estado: EstadoDisponibilidad = EstadoDisponibilidad.DISPONIBLE
    fecha_inicio: date = field(default_factory=date.today)
    fecha_fin: Optional[date] = None  # None = indefinido
    motivo: Optional[str] = None
    documento_justificante: Optional[str] = None  # Ruta al documento
    aprobado_por: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    @property
    def esta_vigente(self) -> bool:
        """Comprueba si la indisponibilidad está vigente hoy"""
        hoy = date.today()
        if self.fecha_fin is None:
            return hoy >= self.fecha_inicio
        return self.fecha_inicio <= hoy <= self.fecha_fin
    
    @property
    def dias_duracion(self) -> Optional[int]:
        """Calcula los días de duración"""
        if self.fecha_fin is None:
            return None
        return (self.fecha_fin - self.fecha_inicio).days + 1
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "personal_id": str(self.personal_id),
            "estado": self.estado.value,
            "fecha_inicio": self.fecha_inicio.isoformat(),
            "fecha_fin": self.fecha_fin.isoformat() if self.fecha_fin else None,
            "motivo": self.motivo,
            "esta_vigente": self.esta_vigente,
            "dias_duracion": self.dias_duracion,
        }


@dataclass
class SolicitudRefuerzo:
    """
    Solicitud de refuerzo de personal generada automáticamente
    por el sistema de predicción o manualmente por supervisores.
    """
    id: UUID = field(default_factory=uuid4)
    hospital_id: str = ""
    fecha_necesidad: date = field(default_factory=date.today)
    turno_necesario: TipoTurno = TipoTurno.MANANA
    rol_requerido: RolPersonal = RolPersonal.ENFERMERO
    cantidad_personal: int = 1
    prioridad: PrioridadRefuerzo = PrioridadRefuerzo.MEDIA
    motivo: MotivoRefuerzo = MotivoRefuerzo.ALTA_DEMANDA_PREDICHA
    estado: EstadoSolicitudRefuerzo = EstadoSolicitudRefuerzo.PENDIENTE
    
    # Datos de predicción que generó la solicitud
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
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "hospital_id": self.hospital_id,
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
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class ResumenPersonalHospital:
    """
    Resumen del estado del personal en un hospital para un turno específico.
    """
    hospital_id: str
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
            "hospital_id": self.hospital_id,
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


# Importar timedelta para el cálculo de turnos nocturnos
from datetime import timedelta
