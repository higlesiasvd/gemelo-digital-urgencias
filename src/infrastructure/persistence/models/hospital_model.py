"""
Modelos SQLAlchemy para Hospitales
"""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    Text, Enum as SQLEnum, ForeignKey, Index, Numeric
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base


class TipoPuestoDB(str, enum.Enum):
    VENTANILLA_RECEPCION = "ventanilla_recepcion"
    BOX_TRIAJE = "box_triaje"
    CONSULTA = "consulta"
    CAMILLA_OBSERVACION = "camilla_observacion"
    SALA_ESPERA = "sala_espera"


class HospitalModel(Base):
    """Modelo de base de datos para hospitales"""
    __tablename__ = 'hospitales'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)

    # Ubicación
    latitud = Column(Numeric(10, 8), nullable=False)
    longitud = Column(Numeric(11, 8), nullable=False)
    direccion = Column(Text, nullable=True)

    # Infraestructura física
    num_ventanillas_recepcion = Column(Integer, nullable=False, default=0)
    aforo_sala_espera = Column(Integer, nullable=False, default=0)
    numero_boxes_triaje = Column(Integer, nullable=False, default=0)
    numero_consultas = Column(Integer, nullable=False, default=0)
    num_camillas_observacion = Column(Integer, nullable=False, default=0)

    # Estado
    activo = Column(Boolean, default=True, index=True)

    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_hospitales_codigo', 'codigo'),
        Index('idx_hospitales_activo', 'activo'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<Hospital {self.codigo}: {self.nombre}>"


class ConfiguracionPersonalHospitalModel(Base):
    """Configuración de personal mínimo/máximo por puesto y turno"""
    __tablename__ = 'configuracion_personal_hospital'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey('hospitales.id', ondelete='CASCADE'),
        nullable=False
    )

    puesto = Column(SQLEnum(TipoPuestoDB), nullable=False)
    rol = Column(String(50), nullable=False)

    # Configuración por turno (mínimo y máximo)
    turno_manana_min = Column(Integer, nullable=False, default=0)
    turno_manana_max = Column(Integer, nullable=False, default=0)
    turno_tarde_min = Column(Integer, nullable=False, default=0)
    turno_tarde_max = Column(Integer, nullable=False, default=0)
    turno_noche_min = Column(Integer, nullable=False, default=0)
    turno_noche_max = Column(Integer, nullable=False, default=0)

    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_config_personal_hospital', 'hospital_id'),
        Index('idx_config_personal_puesto', 'puesto'),
        # Unique constraint
        {'extend_existing': True},
    )

    def __repr__(self):
        return f"<ConfigPersonal {self.hospital_id} - {self.puesto.value}/{self.rol}>"
