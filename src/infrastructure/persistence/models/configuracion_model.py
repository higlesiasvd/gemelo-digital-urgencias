"""
Modelos SQLAlchemy para Configuración y Eventos
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base


class ConfiguracionUmbralesModel(Base):
    """Configuración de umbrales para alertas y refuerzos por hospital"""
    __tablename__ = 'configuracion_umbrales'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey('hospitales.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )

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


class EventoPrediccionModel(Base):
    """Modelo para guardar eventos de predicción y sus acciones"""
    __tablename__ = 'eventos_prediccion'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    hospital_id = Column(
        UUID(as_uuid=True),
        ForeignKey('hospitales.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

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
