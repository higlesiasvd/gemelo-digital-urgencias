"""
═══════════════════════════════════════════════════════════════════════════════
MODELOS SQLALCHEMY PARA PERSONAL SANITARIO
═══════════════════════════════════════════════════════════════════════════════
Modelos de base de datos PostgreSQL para la gestión del personal.
═══════════════════════════════════════════════════════════════════════════════
"""

from datetime import datetime, date, time
from typing import Optional, List
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Date, Time, DateTime, 
    Text, Enum as SQLEnum, ForeignKey, Table, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS PARA LA BASE DE DATOS
# ═══════════════════════════════════════════════════════════════════════════════

class RolPersonalDB(str, enum.Enum):
    MEDICO = "medico"
    ENFERMERO = "enfermero"
    AUXILIAR = "auxiliar"
    ADMINISTRATIVO = "administrativo"
    CELADOR = "celador"
    TECNICO = "tecnico"


class TipoTurnoDB(str, enum.Enum):
    MANANA = "manana"
    TARDE = "tarde"
    NOCHE = "noche"
    GUARDIA_24H = "guardia_24h"
    REFUERZO = "refuerzo"


class EstadoDisponibilidadDB(str, enum.Enum):
    DISPONIBLE = "disponible"
    EN_DESCANSO = "en_descanso"
    BAJA_MEDICA = "baja_medica"
    BAJA_MATERNAL = "baja_maternal"
    VACACIONES = "vacaciones"
    PERMISO = "permiso"
    FORMACION = "formacion"
    GUARDIA_LOCALIZADA = "guardia_localizada"
    REFUERZO_DISPONIBLE = "refuerzo_disponible"
    NO_DISPONIBLE = "no_disponible"


class EstadoSolicitudRefuerzoDB(str, enum.Enum):
    PENDIENTE = "pendiente"
    ENVIADA = "enviada"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    EN_CAMINO = "en_camino"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"
    EXPIRADA = "expirada"


class PrioridadRefuerzoDB(str, enum.Enum):
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


class MotivoRefuerzoDB(str, enum.Enum):
    ALTA_DEMANDA_PREDICHA = "alta_demanda_predicha"
    EMERGENCIA_MASIVA = "emergencia_masiva"
    BAJA_INESPERADA = "baja_inesperada"
    EVENTO_ESPECIAL = "evento_especial"
    COBERTURA_VACACIONES = "cobertura_vacaciones"
    SATURACION_ACTUAL = "saturacion_actual"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLAS DE RELACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# Tabla de relación entre solicitudes de refuerzo y personal asignado
solicitud_personal = Table(
    'solicitud_personal',
    Base.metadata,
    Column('solicitud_id', UUID(as_uuid=True), ForeignKey('solicitudes_refuerzo.id'), primary_key=True),
    Column('personal_id', UUID(as_uuid=True), ForeignKey('personal.id'), primary_key=True),
    Column('aceptado', Boolean, default=False),
    Column('fecha_respuesta', DateTime, nullable=True),
    Column('created_at', DateTime, default=func.now()),
)


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO: PERSONAL
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalModel(Base):
    """Modelo de base de datos para el personal sanitario"""
    __tablename__ = 'personal'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    numero_empleado = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(150), nullable=False)
    dni = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False)
    telefono = Column(String(20), nullable=True)
    
    rol = Column(SQLEnum(RolPersonalDB), nullable=False, index=True)
    especialidad = Column(String(100), nullable=True)  # Para médicos
    
    hospital_id = Column(String(50), nullable=False, index=True)
    unidad = Column(String(100), default='urgencias')
    
    fecha_alta = Column(Date, nullable=False, default=date.today)
    activo = Column(Boolean, default=True, index=True)
    acepta_refuerzos = Column(Boolean, default=True)
    horas_semanales_contrato = Column(Integer, default=40)
    
    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    turnos = relationship("TurnoModel", back_populates="personal", lazy="dynamic")
    disponibilidades = relationship("DisponibilidadModel", back_populates="personal", lazy="dynamic")
    solicitudes = relationship(
        "SolicitudRefuerzoModel",
        secondary=solicitud_personal,
        back_populates="personal_asignado"
    )
    
    # Índices compuestos
    __table_args__ = (
        Index('idx_personal_hospital_rol', 'hospital_id', 'rol'),
        Index('idx_personal_activo_refuerzo', 'activo', 'acepta_refuerzos'),
    )
    
    def __repr__(self):
        return f"<Personal {self.numero_empleado}: {self.nombre} {self.apellidos}>"


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO: TURNO
# ═══════════════════════════════════════════════════════════════════════════════

class TurnoModel(Base):
    """Modelo de base de datos para los turnos de trabajo"""
    __tablename__ = 'turnos'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    personal_id = Column(UUID(as_uuid=True), ForeignKey('personal.id'), nullable=False)
    hospital_id = Column(String(50), nullable=False, index=True)
    
    fecha = Column(Date, nullable=False, index=True)
    tipo_turno = Column(SQLEnum(TipoTurnoDB), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    
    es_refuerzo = Column(Boolean, default=False)
    confirmado = Column(Boolean, default=True)
    notas = Column(Text, nullable=True)
    
    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    personal = relationship("PersonalModel", back_populates="turnos")
    
    # Índices compuestos
    __table_args__ = (
        Index('idx_turno_fecha_hospital', 'fecha', 'hospital_id'),
        Index('idx_turno_personal_fecha', 'personal_id', 'fecha'),
    )
    
    def __repr__(self):
        return f"<Turno {self.fecha} {self.tipo_turno.value}>"


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO: DISPONIBILIDAD
# ═══════════════════════════════════════════════════════════════════════════════

class DisponibilidadModel(Base):
    """Modelo para registrar disponibilidad/indisponibilidad del personal"""
    __tablename__ = 'disponibilidades'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    personal_id = Column(UUID(as_uuid=True), ForeignKey('personal.id'), nullable=False)
    
    estado = Column(SQLEnum(EstadoDisponibilidadDB), nullable=False, index=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=True)  # NULL = indefinido
    
    motivo = Column(Text, nullable=True)
    documento_justificante = Column(String(500), nullable=True)
    aprobado_por = Column(String(150), nullable=True)
    
    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    personal = relationship("PersonalModel", back_populates="disponibilidades")
    
    # Índices compuestos
    __table_args__ = (
        Index('idx_disponibilidad_personal_fecha', 'personal_id', 'fecha_inicio', 'fecha_fin'),
        Index('idx_disponibilidad_estado_fecha', 'estado', 'fecha_inicio'),
    )
    
    def __repr__(self):
        return f"<Disponibilidad {self.estado.value} desde {self.fecha_inicio}>"


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO: SOLICITUD DE REFUERZO
# ═══════════════════════════════════════════════════════════════════════════════

class SolicitudRefuerzoModel(Base):
    """Modelo para solicitudes de refuerzo de personal"""
    __tablename__ = 'solicitudes_refuerzo'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(String(50), nullable=False, index=True)
    
    fecha_necesidad = Column(Date, nullable=False, index=True)
    turno_necesario = Column(SQLEnum(TipoTurnoDB), nullable=False)
    rol_requerido = Column(SQLEnum(RolPersonalDB), nullable=False)
    cantidad_personal = Column(Integer, default=1)
    
    prioridad = Column(SQLEnum(PrioridadRefuerzoDB), nullable=False, index=True)
    motivo = Column(SQLEnum(MotivoRefuerzoDB), nullable=False)
    estado = Column(SQLEnum(EstadoSolicitudRefuerzoDB), nullable=False, default=EstadoSolicitudRefuerzoDB.PENDIENTE, index=True)
    
    # Datos de predicción
    demanda_predicha = Column(Float, nullable=True)
    saturacion_predicha = Column(Float, nullable=True)
    confianza_prediccion = Column(Float, nullable=True)
    
    # Metadatos
    generado_automaticamente = Column(Boolean, default=True)
    solicitado_por = Column(String(150), nullable=True)
    notas = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    respondido_at = Column(DateTime, nullable=True)
    
    # Relaciones
    personal_asignado = relationship(
        "PersonalModel",
        secondary=solicitud_personal,
        back_populates="solicitudes"
    )
    
    # Índices compuestos
    __table_args__ = (
        Index('idx_solicitud_hospital_fecha', 'hospital_id', 'fecha_necesidad'),
        Index('idx_solicitud_estado_prioridad', 'estado', 'prioridad'),
    )
    
    def __repr__(self):
        return f"<SolicitudRefuerzo {self.hospital_id} {self.fecha_necesidad} - {self.estado.value}>"


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO: EVENTO DE PREDICCIÓN (para auditoría)
# ═══════════════════════════════════════════════════════════════════════════════

class EventoPrediccionModel(Base):
    """Modelo para guardar eventos de predicción y sus acciones"""
    __tablename__ = 'eventos_prediccion'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(String(50), nullable=False, index=True)
    
    # Datos de la predicción
    timestamp_prediccion = Column(DateTime, nullable=False)
    horizonte_horas = Column(Integer, default=24)
    demanda_actual = Column(Integer, nullable=True)
    demanda_predicha = Column(Float, nullable=False)
    saturacion_actual = Column(Float, nullable=True)
    saturacion_predicha = Column(Float, nullable=True)
    
    # Factores que afectaron la predicción
    factor_clima = Column(Float, default=1.0)
    factor_eventos = Column(Float, default=1.0)
    factor_festivo = Column(Float, default=1.0)
    
    # Resultado
    umbral_alerta = Column(Float, nullable=True)
    genero_alerta = Column(Boolean, default=False)
    solicitud_refuerzo_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Metadatos
    datos_adicionales = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('idx_evento_hospital_timestamp', 'hospital_id', 'timestamp_prediccion'),
    )
    
    def __repr__(self):
        return f"<EventoPrediccion {self.hospital_id} {self.timestamp_prediccion}>"


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO: CONFIGURACIÓN DE UMBRALES
# ═══════════════════════════════════════════════════════════════════════════════

class ConfiguracionUmbralesModel(Base):
    """Configuración de umbrales para alertas y refuerzos por hospital"""
    __tablename__ = 'configuracion_umbrales'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(String(50), nullable=False, unique=True, index=True)
    
    # Umbrales de saturación
    umbral_saturacion_media = Column(Float, default=0.7)
    umbral_saturacion_alta = Column(Float, default=0.85)
    umbral_saturacion_critica = Column(Float, default=0.95)
    
    # Umbrales de demanda (pacientes/hora)
    umbral_demanda_normal = Column(Float, nullable=True)
    umbral_demanda_alta = Column(Float, nullable=True)
    
    # Ratios de personal recomendados
    ratio_paciente_enfermero_objetivo = Column(Float, default=5.0)
    ratio_paciente_medico_objetivo = Column(Float, default=10.0)
    
    # Personal mínimo por turno
    medicos_minimo_manana = Column(Integer, default=2)
    medicos_minimo_tarde = Column(Integer, default=2)
    medicos_minimo_noche = Column(Integer, default=1)
    enfermeros_minimo_manana = Column(Integer, default=6)
    enfermeros_minimo_tarde = Column(Integer, default=6)
    enfermeros_minimo_noche = Column(Integer, default=4)
    
    # Configuración de alertas automáticas
    alertas_activas = Column(Boolean, default=True)
    refuerzos_automaticos = Column(Boolean, default=True)
    horas_anticipacion_refuerzo = Column(Integer, default=4)
    
    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ConfiguracionUmbrales {self.hospital_id}>"
