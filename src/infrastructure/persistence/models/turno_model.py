"""
Modelo SQLAlchemy para Turnos
"""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Boolean, Date, Time, DateTime,
    Text, Enum as SQLEnum, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base


class TipoTurnoDB(str, enum.Enum):
    MANANA = "manana"
    TARDE = "tarde"
    NOCHE = "noche"
    GUARDIA_24H = "guardia_24h"
    REFUERZO = "refuerzo"


class TurnoModel(Base):
    """Modelo de base de datos para los turnos de trabajo"""
    __tablename__ = 'turnos'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    personal_id = Column(
        UUID(as_uuid=True),
        ForeignKey('personal.id', ondelete='CASCADE'),
        nullable=False
    )
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey('hospitales.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

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

    __table_args__ = (
        Index('idx_turno_fecha_hospital', 'fecha', 'hospital_id'),
        Index('idx_turno_personal_fecha', 'personal_id', 'fecha'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<Turno {self.fecha} {self.tipo_turno.value}>"
