"""
Modelo SQLAlchemy para Personal
"""

from datetime import datetime, date
from uuid import uuid4
import enum

from sqlalchemy import (
    Column, String, Integer, Boolean, Date, DateTime,
    Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.infrastructure.persistence.database import Base


class RolPersonalDB(str, enum.Enum):
    MEDICO = "medico"
    ENFERMERO = "enfermero"
    AUXILIAR = "auxiliar"
    ADMINISTRATIVO = "administrativo"
    CELADOR = "celador"
    TECNICO = "tecnico"


class PersonalModel(Base):
    """Modelo de base de datos para el personal sanitario"""
    __tablename__ = 'personal'
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    numero_empleado = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(150), nullable=False)
    dni = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False)
    telefono = Column(String(20), nullable=True)

    rol = Column(SQLEnum(RolPersonalDB), nullable=False, index=True)
    especialidad = Column(String(100), nullable=True)

    # Usar String para hospital_id (compatible con la tabla existente)
    hospital_id = Column(String(50), nullable=False, index=True)
    unidad = Column(String(100), default='urgencias')

    fecha_alta = Column(Date, nullable=False, default=date.today)
    activo = Column(Boolean, default=True, index=True)
    acepta_refuerzos = Column(Boolean, default=True)
    horas_semanales_contrato = Column(Integer, default=40)

    # Campos para gestión de lista SERGAS
    en_lista_sergas = Column(Boolean, default=False)
    fecha_entrada_lista_sergas = Column(Date, nullable=True)
    hospital_origen_id = Column(String(50), nullable=True)

    # Metadatos
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Sin relaciones para mantener compatibilidad con el schema existente
    
    def to_dict(self):
        """Convierte el modelo a diccionario"""
        return {
            'id': str(self.id),
            'numero_empleado': self.numero_empleado,
            'nombre': self.nombre,
            'apellidos': self.apellidos,
            'dni': self.dni,
            'email': self.email,
            'telefono': self.telefono,
            'rol': self.rol.value if self.rol else None,
            'especialidad': self.especialidad,
            'hospital_id': self.hospital_id,
            'unidad': self.unidad,
            'fecha_alta': self.fecha_alta.isoformat() if self.fecha_alta else None,
            'activo': self.activo,
            'acepta_refuerzos': self.acepta_refuerzos,
            'horas_semanales_contrato': self.horas_semanales_contrato,
            'en_lista_sergas': self.en_lista_sergas,
            'fecha_entrada_lista_sergas': self.fecha_entrada_lista_sergas.isoformat() if self.fecha_entrada_lista_sergas else None,
            'hospital_origen_id': self.hospital_origen_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Personal {self.numero_empleado}: {self.nombre} {self.apellidos}>"
