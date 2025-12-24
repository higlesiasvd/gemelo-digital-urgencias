"""
============================================================================
ESQUEMAS CENTRALIZADOS - Gemelo Digital Hospitalario
============================================================================
ARCHIVO OBLIGATORIO: Todos los productores y consumidores de Kafka DEBEN
importar estos esquemas para garantizar consistencia total.

Kafka Topics:
- patient-arrivals
- triage-results
- consultation-events
- diversion-alerts
- staff-state
- staff-load
- doctor-assigned
- doctor-unassigned
- capacity-change
- hospital-stats
- system-context
============================================================================
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4


# ============================================================================
# ENUMS
# ============================================================================

class TriageLevel(str, Enum):
    """Niveles de triaje Manchester"""
    ROJO = "rojo"       # Emergencia - atencion inmediata
    NARANJA = "naranja" # Muy urgente - 10 min
    AMARILLO = "amarillo"  # Urgente - 60 min
    VERDE = "verde"     # Normal - 120 min
    AZUL = "azul"       # No urgente - 240 min


class StaffRole(str, Enum):
    """Roles del personal sanitario"""
    CELADOR = "celador"
    ENFERMERIA = "enfermeria"
    MEDICO = "medico"


class StaffState(str, Enum):
    """Estados del personal"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFF_SHIFT = "off-shift"


class HospitalId(str, Enum):
    """Identificadores de hospitales"""
    CHUAC = "chuac"
    MODELO = "modelo"
    SAN_RAFAEL = "san_rafael"


class PatientDestination(str, Enum):
    """Destino del paciente tras consulta"""
    ALTA = "alta"
    OBSERVACION = "observacion"


class ConsultationEventType(str, Enum):
    """Tipos de eventos en consulta"""
    INICIO = "inicio"
    FIN = "fin"


class DiversionReason(str, Enum):
    """Motivos de derivacion"""
    GRAVEDAD = "gravedad"           # Paciente grave en hospital pequeno
    SATURACION = "saturacion"       # Hospital origen saturado
    ESPECIALIDAD = "especialidad"   # Requiere especialidad no disponible


# ============================================================================
# ESQUEMAS DE PACIENTES
# ============================================================================

class PatientBase(BaseModel):
    """Datos base de un paciente"""
    patient_id: str = Field(default_factory=lambda: str(uuid4()))
    edad: int = Field(ge=0, le=120)
    sexo: Literal["M", "F"]
    patologia: str
    timestamp: datetime = Field(default_factory=datetime.now)


class PatientArrival(PatientBase):
    """
    Evento: Llegada de paciente
    Topic: patient-arrivals
    """
    hospital_id: HospitalId
    hora_llegada: datetime = Field(default_factory=datetime.now)
    factor_demanda: float = Field(default=1.0, ge=0.5, le=3.0)

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "edad": 45,
                "sexo": "M",
                "patologia": "dolor_toracico",
                "hospital_id": "chuac",
                "hora_llegada": "2025-12-08T10:30:00",
                "factor_demanda": 1.2
            }
        }


class TriageResult(BaseModel):
    """
    Evento: Resultado de triaje
    Topic: triage-results
    """
    patient_id: str
    hospital_id: HospitalId
    nivel_triaje: TriageLevel
    box_id: int
    tiempo_triaje_minutos: float = Field(ge=0)
    enfermeras_atendieron: int = Field(default=2)
    timestamp: datetime = Field(default_factory=datetime.now)
    requiere_derivacion: bool = Field(default=False)

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "hospital_id": "chuac",
                "nivel_triaje": "amarillo",
                "box_id": 3,
                "tiempo_triaje_minutos": 5.2,
                "enfermeras_atendieron": 2,
                "requiere_derivacion": False
            }
        }


class ConsultationEvent(BaseModel):
    """
    Evento: Eventos de consulta
    Topic: consultation-events
    """
    patient_id: str
    hospital_id: HospitalId
    consulta_id: int
    event_type: ConsultationEventType
    nivel_triaje: TriageLevel
    medicos_atendiendo: int = Field(ge=1, le=4)
    tiempo_consulta_minutos: Optional[float] = None
    destino: Optional[PatientDestination] = None
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "hospital_id": "chuac",
                "consulta_id": 5,
                "event_type": "fin",
                "nivel_triaje": "amarillo",
                "medicos_atendiendo": 2,
                "tiempo_consulta_minutos": 18.5,
                "destino": "alta"
            }
        }


# ============================================================================
# ESQUEMAS DE DERIVACIONES
# ============================================================================

class DiversionAlert(BaseModel):
    """
    Evento: Alerta de derivacion
    Topic: diversion-alerts
    """
    alert_id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    hospital_origen: HospitalId
    hospital_destino: HospitalId
    motivo: DiversionReason
    nivel_triaje: TriageLevel
    tiempo_estimado_traslado: int = Field(ge=0, description="Minutos")
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "hospital_origen": "modelo",
                "hospital_destino": "chuac",
                "motivo": "gravedad",
                "nivel_triaje": "rojo",
                "tiempo_estimado_traslado": 8
            }
        }


# ============================================================================
# ESQUEMAS DE PERSONAL
# ============================================================================

class StaffStateEvent(BaseModel):
    """
    Evento: Estado del personal
    Topic: staff-state
    """
    staff_id: str
    nombre: str
    rol: StaffRole
    hospital_id: HospitalId
    estado: StaffState
    asignacion_actual: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "staff_id": "doc-001",
                "nombre": "Dr. Garcia",
                "rol": "medico",
                "hospital_id": "chuac",
                "estado": "busy",
                "asignacion_actual": "consulta_5"
            }
        }


class StaffLoadEvent(BaseModel):
    """
    Evento: Carga del personal
    Topic: staff-load
    """
    hospital_id: HospitalId
    area: Literal["ventanilla", "triaje", "consultas"]
    personal_ocupado: int
    personal_total: int
    ratio_carga: float = Field(ge=0, le=1)
    pacientes_en_espera: int
    timestamp: datetime = Field(default_factory=datetime.now)

    @validator('ratio_carga', pre=True, always=True)
    def calculate_ratio(cls, v, values):
        if 'personal_total' in values and values['personal_total'] > 0:
            return values['personal_ocupado'] / values['personal_total']
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "hospital_id": "chuac",
                "area": "consultas",
                "personal_ocupado": 8,
                "personal_total": 10,
                "ratio_carga": 0.8,
                "pacientes_en_espera": 12
            }
        }


class DoctorAssigned(BaseModel):
    """
    Evento: Medico asignado a consulta
    Topic: doctor-assigned
    """
    medico_id: str
    medico_nombre: str
    hospital_id: HospitalId  # Todos los hospitales permiten asignación SERGAS
    consulta_id: int = Field(ge=1, le=10)
    medicos_totales_consulta: int = Field(ge=1, le=4)
    velocidad_factor: float = Field(ge=1.0, le=4.0)
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "medico_id": "sergas-001",
                "medico_nombre": "Dra. Martinez",
                "hospital_id": "chuac",
                "consulta_id": 3,
                "medicos_totales_consulta": 2,
                "velocidad_factor": 2.0
            }
        }


class DoctorUnassigned(BaseModel):
    """
    Evento: Medico desasignado de consulta
    Topic: doctor-unassigned
    """
    medico_id: str
    medico_nombre: str
    hospital_id: HospitalId  # Todos los hospitales permiten desasignación SERGAS
    consulta_id: int
    medicos_restantes_consulta: int = Field(ge=1, le=4)
    velocidad_factor: float = Field(ge=1.0, le=4.0)
    motivo: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "medico_id": "sergas-001",
                "medico_nombre": "Dra. Martinez",
                "hospital_id": "chuac",
                "consulta_id": 3,
                "medicos_restantes_consulta": 1,
                "velocidad_factor": 1.0,
                "motivo": "fin_turno"
            }
        }


# ============================================================================
# ESQUEMAS DE CAPACIDAD
# ============================================================================

class CapacityChange(BaseModel):
    """
    Evento: Cambio de capacidad en hospital
    Topic: capacity-change
    """
    hospital_id: HospitalId
    consulta_id: int
    medicos_previos: int = Field(ge=1, le=4)
    medicos_nuevos: int = Field(ge=1, le=4)
    velocidad_previa: float
    velocidad_nueva: float
    motivo: str
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "hospital_id": "chuac",
                "consulta_id": 5,
                "medicos_previos": 1,
                "medicos_nuevos": 2,
                "velocidad_previa": 1.0,
                "velocidad_nueva": 2.0,
                "motivo": "saturacion_alta"
            }
        }


# ============================================================================
# ESQUEMAS DE PACIENTES EN COLA (para visualización en dashboard)
# ============================================================================

class PatientInQueue(BaseModel):
    """Paciente en una cola del hospital (para visualización)"""
    patient_id: str
    nombre: str  # Nombre generado para visualización
    edad: int
    sexo: Literal["M", "F"]
    patologia: str
    area: Literal["ventanilla", "triaje", "consulta"]
    nivel_triaje: Optional[TriageLevel] = None  # Solo para triaje y consulta
    tiempo_en_area: float = Field(ge=0, description="Minutos en el área actual")
    consulta_id: Optional[int] = None  # Solo para consulta

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "nombre": "María García",
                "edad": 45,
                "sexo": "F",
                "patologia": "dolor_toracico",
                "area": "triaje",
                "nivel_triaje": "amarillo",
                "tiempo_en_area": 3.5
            }
        }


# ============================================================================
# ESQUEMAS DE ESTADISTICAS Y CONTEXTO
# ============================================================================

class HospitalStats(BaseModel):
    """
    Evento: Estadisticas de hospital
    Topic: hospital-stats
    """
    hospital_id: HospitalId

    # Ventanilla
    ventanillas_ocupadas: int
    ventanillas_totales: int
    cola_ventanilla: int

    # Triaje
    boxes_ocupados: int
    boxes_totales: int
    cola_triaje: int

    # Consultas
    consultas_ocupadas: int
    consultas_totales: int
    cola_consulta: int

    # Metricas
    saturacion_global: float = Field(ge=0, le=1)
    tiempo_medio_espera_triaje: float
    tiempo_medio_espera_consulta: float
    tiempo_medio_total: float

    # Contadores
    pacientes_atendidos_hora: int
    pacientes_llegados_hora: int
    pacientes_derivados_enviados: int
    pacientes_derivados_recibidos: int

    # Estado
    emergencia_activa: bool = False

    # Pacientes en cada área (para visualización en dashboard)
    pacientes_ventanilla: List['PatientInQueue'] = Field(default_factory=list)
    pacientes_triaje: List['PatientInQueue'] = Field(default_factory=list)
    pacientes_consulta: List['PatientInQueue'] = Field(default_factory=list)

    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "hospital_id": "chuac",
                "ventanillas_ocupadas": 2,
                "ventanillas_totales": 2,
                "cola_ventanilla": 3,
                "boxes_ocupados": 4,
                "boxes_totales": 5,
                "cola_triaje": 8,
                "consultas_ocupadas": 8,
                "consultas_totales": 10,
                "cola_consulta": 15,
                "saturacion_global": 0.75,
                "tiempo_medio_espera_triaje": 12.5,
                "tiempo_medio_espera_consulta": 25.3,
                "tiempo_medio_total": 45.8,
                "pacientes_atendidos_hora": 45,
                "pacientes_llegados_hora": 52,
                "pacientes_derivados_enviados": 0,
                "pacientes_derivados_recibidos": 3,
                "emergencia_activa": False
            }
        }


class SystemContext(BaseModel):
    """
    Evento: Contexto del sistema
    Topic: system-context
    """
    # Clima
    temperatura: float
    lluvia_mm: float
    condicion: str
    factor_clima: float = Field(ge=0.5, le=2.0)

    # Eventos
    evento_activo: Optional[str] = None
    factor_evento: float = Field(default=1.0, ge=0.5, le=2.0)

    # Festivos
    es_festivo: bool = False
    factor_festivo: float = Field(default=1.0)

    # Factor total
    factor_total: float = Field(ge=0.5, le=3.0)

    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "temperatura": 12.5,
                "lluvia_mm": 2.3,
                "condicion": "lluvia_moderada",
                "factor_clima": 1.15,
                "evento_activo": "Partido Deportivo",
                "factor_evento": 1.2,
                "es_festivo": False,
                "factor_festivo": 1.0,
                "factor_total": 1.38
            }
        }


# ============================================================================
# ESQUEMAS DE CONFIGURACION DE HOSPITAL
# ============================================================================

class HospitalConfig(BaseModel):
    """Configuracion de un hospital"""
    hospital_id: HospitalId
    nombre: str

    # Ventanillas
    num_ventanillas: int
    celadores_por_ventanilla: int = 1
    tiempo_ventanilla_min: float = 2.0

    # Triaje
    num_boxes: int
    enfermeras_por_box: int = 2
    tiempo_triaje_min: float = 5.0

    # Consultas
    num_consultas: int
    enfermeras_por_consulta: int = 2
    medicos_min_consulta: int = 1
    medicos_max_consulta: int
    escalable: bool

    # Tiempos base por nivel triaje (minutos)
    tiempo_consulta_rojo: float = 45.0
    tiempo_consulta_naranja: float = 30.0
    tiempo_consulta_amarillo: float = 20.0
    tiempo_consulta_verde: float = 15.0
    tiempo_consulta_azul: float = 10.0


# Configuraciones predefinidas de hospitales
HOSPITAL_CONFIGS = {
    HospitalId.CHUAC: HospitalConfig(
        hospital_id=HospitalId.CHUAC,
        nombre="CHUAC - Complejo Hospitalario Universitario A Coruna",
        num_ventanillas=2,
        num_boxes=5,
        num_consultas=10,
        medicos_min_consulta=1,
        medicos_max_consulta=4,
        escalable=True
    ),
    HospitalId.MODELO: HospitalConfig(
        hospital_id=HospitalId.MODELO,
        nombre="Hospital HM Modelo",
        num_ventanillas=1,
        num_boxes=1,
        num_consultas=4,
        medicos_min_consulta=1,
        medicos_max_consulta=1,
        escalable=False
    ),
    HospitalId.SAN_RAFAEL: HospitalConfig(
        hospital_id=HospitalId.SAN_RAFAEL,
        nombre="Hospital San Rafael",
        num_ventanillas=1,
        num_boxes=1,
        num_consultas=4,
        medicos_min_consulta=1,
        medicos_max_consulta=1,
        escalable=False
    )
}


# ============================================================================
# LISTA DE TOPICS KAFKA
# ============================================================================

KAFKA_TOPICS = {
    "patient-arrivals": PatientArrival,
    "incident-patients": PatientArrival,  # External patients from incidents
    "triage-results": TriageResult,
    "consultation-events": ConsultationEvent,
    "diversion-alerts": DiversionAlert,
    "staff-state": StaffStateEvent,
    "staff-load": StaffLoadEvent,
    "doctor-assigned": DoctorAssigned,
    "doctor-unassigned": DoctorUnassigned,
    "capacity-change": CapacityChange,
    "hospital-stats": HospitalStats,
    "system-context": SystemContext,
}


def get_topic_schema(topic: str) -> type:
    """Obtiene el esquema Pydantic para un topic de Kafka"""
    if topic not in KAFKA_TOPICS:
        raise ValueError(f"Topic desconocido: {topic}. Topics validos: {list(KAFKA_TOPICS.keys())}")
    return KAFKA_TOPICS[topic]


def validate_event(topic: str, data: dict) -> BaseModel:
    """Valida y parsea un evento de Kafka"""
    schema = get_topic_schema(topic)
    return schema(**data)
