"""
Modelos SQLAlchemy para Lista SERGAS y Asignaciones Temporales
"""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime,
    Text, Enum as SQLEnum, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base


class MotivoEntradaListaDB(str, enum.Enum):
    BAJA_HOSPITAL = "baja_hospital"
    FIN_CONTRATO = "fin_contrato"
    VOLUNTARIO = "voluntario"
    REDUCCION_PLANTILLA = "reduccion_plantilla"
    NUEVO_INGRESO = "nuevo_ingreso"


class EstadoAsignacionDB(str, enum.Enum):
    ACTIVA = "activa"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"


class ListaSergasModel(Base):
    """Pool de personal disponible para reforzar cualquier hospital"""
    __tablename__ = 'lista_sergas'
    __table_args__ = (
        Index('idx_lista_sergas_activo', 'activo'),
        Index('idx_lista_sergas_rol', 'rol'),
        Index('idx_lista_sergas_disponibilidad',
              'disponible_turno_manana',
              'disponible_turno_tarde',
              'disponible_turno_noche'),
        {'extend_existing': True}
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    personal_id = Column(
        UUID(as_uuid=True),
        ForeignKey('personal.id', ondelete='CASCADE'),
        nullable=False,
        unique=True
    )

    # Info desnormalizada para consultas rápidas
    nombre_completo = Column(String(250), nullable=False)
    rol = Column(String(50), nullable=False, index=True)
    especialidad = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)

    # Disponibilidad para refuerzos por turno
    disponible_turno_manana = Column(Boolean, default=True)
    disponible_turno_tarde = Column(Boolean, default=True)
    disponible_turno_noche = Column(Boolean, default=True)

    # Preferencias
    hospitales_preferidos = Column(ARRAY(String), nullable=True)
    distancia_maxima_km = Column(Integer, nullable=True)

    # Estado
    activo = Column(Boolean, default=True, index=True)
    fecha_entrada = Column(DateTime, default=func.now())
    motivo_entrada = Column(SQLEnum(MotivoEntradaListaDB), nullable=True)

    # Última asignación
    ultima_asignacion_hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey('hospitales.id', ondelete='SET NULL'),
        nullable=True
    )
    ultima_asignacion_fecha = Column(DateTime, nullable=True)

    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<ListaSergas {self.nombre_completo} - {self.rol}>"


class AsignacionTemporalModel(Base):
    """Historial de movimientos entre lista_sergas y hospitales"""
    __tablename__ = 'asignaciones_temporales'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    personal_id = Column(
        UUID(as_uuid=True),
        ForeignKey('personal.id', ondelete='CASCADE'),
        nullable=False
    )

    # Origen del movimiento
    origen_tipo = Column(String(20), nullable=False)  # 'lista_sergas' o 'hospital'
    origen_id = Column(UUID(as_uuid=True), nullable=True)  # hospital_id si viene de hospital

    # Destino del movimiento
    destino_tipo = Column(String(20), nullable=False)  # 'lista_sergas' o 'hospital'
    destino_id = Column(UUID(as_uuid=True), nullable=True)  # hospital_id si va a hospital

    # Detalles de la asignación
    fecha_asignacion = Column(DateTime, default=func.now())
    fecha_fin_prevista = Column(DateTime, nullable=True)
    fecha_fin_real = Column(DateTime, nullable=True)
    turno = Column(String(20), nullable=True)
    motivo = Column(Text, nullable=True)

    # Estado
    estado = Column(
        SQLEnum(EstadoAsignacionDB),
        default=EstadoAsignacionDB.ACTIVA,
        index=True
    )

    # Metadatos
    creado_por = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index('idx_asignaciones_personal', 'personal_id'),
        Index('idx_asignaciones_estado', 'estado'),
        Index('idx_asignaciones_fecha', 'fecha_asignacion'),
    )

    def __repr__(self):
        return f"<Asignacion {self.personal_id}: {self.origen_tipo} -> {self.destino_tipo}>"
