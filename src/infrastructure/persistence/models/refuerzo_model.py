"""
Modelo SQLAlchemy para Solicitudes de Refuerzo
"""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Date, DateTime,
    Text, Enum as SQLEnum, ForeignKey, Table, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base
from .personal_model import RolPersonalDB
from .turno_model import TipoTurnoDB


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


class SolicitudRefuerzoModel(Base):
    """Modelo para solicitudes de refuerzo de personal"""
    __tablename__ = 'solicitudes_refuerzo'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey('hospitales.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    fecha_necesidad = Column(Date, nullable=False, index=True)
    turno_necesario = Column(SQLEnum(TipoTurnoDB), nullable=False)
    rol_requerido = Column(SQLEnum(RolPersonalDB), nullable=False)
    cantidad_personal = Column(Integer, default=1)

    prioridad = Column(SQLEnum(PrioridadRefuerzoDB), nullable=False, index=True)
    motivo = Column(SQLEnum(MotivoRefuerzoDB), nullable=False)
    estado = Column(
        SQLEnum(EstadoSolicitudRefuerzoDB),
        nullable=False,
        default=EstadoSolicitudRefuerzoDB.PENDIENTE,
        index=True
    )

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

    __table_args__ = (
        Index('idx_solicitud_hospital_fecha', 'hospital_id', 'fecha_necesidad'),
        Index('idx_solicitud_estado_prioridad', 'estado', 'prioridad'),
    )

    def __repr__(self):
        return f"<SolicitudRefuerzo {self.hospital_id} {self.fecha_necesidad} - {self.estado.value}>"
