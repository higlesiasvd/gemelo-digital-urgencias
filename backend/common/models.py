"""
============================================================================
MODELOS DE BASE DE DATOS - SQLAlchemy
============================================================================
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey,
    CheckConstraint, UniqueConstraint, Enum as SQLEnum, create_engine
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

from .config import settings
from .schemas import StaffRole, StaffState, HospitalId

Base = declarative_base()


# ============================================================================
# MODELOS
# ============================================================================

class Staff(Base):
    """Personal del hospital"""
    __tablename__ = "staff"

    staff_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    rol = Column(String(20), nullable=False)
    hospital_id = Column(String(20), nullable=False)
    asignacion_actual = Column(String(50), nullable=True)
    estado = Column(String(20), default="available")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        CheckConstraint(rol.in_(['celador', 'enfermeria', 'medico']), name='check_rol'),
        CheckConstraint(estado.in_(['available', 'busy', 'off-shift']), name='check_estado'),
    )

    def to_dict(self):
        return {
            "staff_id": str(self.staff_id),
            "nombre": self.nombre,
            "rol": self.rol,
            "hospital_id": self.hospital_id,
            "asignacion_actual": self.asignacion_actual,
            "estado": self.estado,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Consulta(Base):
    """Configuracion de consultas por hospital"""
    __tablename__ = "consultas"

    consulta_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hospital_id = Column(String(20), nullable=False)
    numero_consulta = Column(Integer, nullable=False)
    enfermeras_asignadas = Column(Integer, default=2)
    medicos_asignados = Column(Integer, default=1)
    activa = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint('hospital_id', 'numero_consulta', name='uq_hospital_consulta'),
        CheckConstraint('medicos_asignados >= 1 AND medicos_asignados <= 4', name='check_medicos'),
    )

    def to_dict(self):
        return {
            "consulta_id": str(self.consulta_id),
            "hospital_id": self.hospital_id,
            "numero_consulta": self.numero_consulta,
            "enfermeras_asignadas": self.enfermeras_asignadas,
            "medicos_asignados": self.medicos_asignados,
            "activa": self.activa,
        }


class ListaSergas(Base):
    """Medicos disponibles en la lista del SERGAS para refuerzo"""
    __tablename__ = "lista_sergas"

    medico_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    especialidad = Column(String(50), nullable=True)
    disponible = Column(Boolean, default=True)
    asignado_a_hospital = Column(String(20), nullable=True)
    asignado_a_consulta = Column(Integer, nullable=True)
    fecha_asignacion = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "medico_id": str(self.medico_id),
            "nombre": self.nombre,
            "especialidad": self.especialidad,
            "disponible": self.disponible,
            "asignado_a_hospital": self.asignado_a_hospital,
            "asignado_a_consulta": self.asignado_a_consulta,
            "fecha_asignacion": self.fecha_asignacion.isoformat() if self.fecha_asignacion else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============================================================================
# CONEXION A BASE DE DATOS
# ============================================================================

def get_engine():
    """Crea el engine de SQLAlchemy"""
    return create_engine(
        settings.postgres_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True
    )


def get_session():
    """Crea una sesion de base de datos"""
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def init_db():
    """Inicializa la base de datos creando todas las tablas"""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    print("Base de datos inicializada")


def get_db():
    """Dependency para FastAPI"""
    db = get_session()
    try:
        yield db
    finally:
        db.close()
