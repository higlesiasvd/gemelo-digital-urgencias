"""
Modelo SQLAlchemy para Disponibilidad
"""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Date, DateTime, Text,
    Enum as SQLEnum, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base


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


class DisponibilidadModel(Base):
    """Modelo para registrar disponibilidad/indisponibilidad del personal"""
    __tablename__ = 'disponibilidades'
    __table_args__ = (
        Index('idx_disponibilidad_personal_fecha', 'personal_id', 'fecha_inicio', 'fecha_fin'),
        Index('idx_disponibilidad_estado_fecha', 'estado', 'fecha_inicio'),
        {'extend_existing': True}
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    personal_id = Column(
        UUID(as_uuid=True),
        ForeignKey('personal.id', ondelete='CASCADE'),
        nullable=False
    )

    estado = Column(SQLEnum(EstadoDisponibilidadDB), nullable=False, index=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=True)

    motivo = Column(Text, nullable=True)
    documento_justificante = Column(String(500), nullable=True)
    aprobado_por = Column(String(150), nullable=True)

    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Disponibilidad {self.estado.value} desde {self.fecha_inicio}>"
