"""
Entidad de Dominio: Personal
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class RolPersonal(str, Enum):
    """Roles del personal sanitario"""
    MEDICO = "medico"
    ENFERMERO = "enfermero"
    AUXILIAR = "auxiliar"
    ADMINISTRATIVO = "administrativo"
    CELADOR = "celador"
    TECNICO = "tecnico"


@dataclass
class Personal:
    """
    Entidad que representa un miembro del personal sanitario.
    """
    id: UUID = field(default_factory=uuid4)
    numero_empleado: str = ""
    nombre: str = ""
    apellidos: str = ""
    dni: str = ""
    email: str = ""
    telefono: str = ""

    rol: RolPersonal = RolPersonal.ENFERMERO
    especialidad: Optional[str] = None

    hospital_id: Optional[UUID] = None
    unidad: str = "urgencias"

    fecha_alta: date = field(default_factory=date.today)
    activo: bool = True
    acepta_refuerzos: bool = True
    horas_semanales_contrato: int = 40

    # Campos para Lista SERGAS
    en_lista_sergas: bool = False
    fecha_entrada_lista_sergas: Optional[datetime] = None
    hospital_origen_id: Optional[UUID] = None

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.apellidos}"

    @property
    def esta_asignado_hospital(self) -> bool:
        """Indica si está asignado a un hospital"""
        return self.hospital_id is not None and not self.en_lista_sergas

    def mover_a_lista_sergas(self, motivo: str = "voluntario") -> None:
        """Mueve al personal a la lista SERGAS"""
        if self.en_lista_sergas:
            raise ValueError("El personal ya está en lista SERGAS")

        self.hospital_origen_id = self.hospital_id
        # Mantener hospital_id (no poner None) pero marcar en_lista_sergas
        self.en_lista_sergas = True
        self.fecha_entrada_lista_sergas = datetime.now()
        self.updated_at = datetime.now()

    def asignar_a_hospital(self, hospital_id: UUID) -> None:
        """Asigna al personal a un hospital"""
        self.hospital_id = hospital_id
        self.en_lista_sergas = False
        self.fecha_entrada_lista_sergas = None
        self.updated_at = datetime.now()

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "numero_empleado": self.numero_empleado,
            "nombre": self.nombre,
            "apellidos": self.apellidos,
            "nombre_completo": self.nombre_completo,
            "dni": self.dni,
            "email": self.email,
            "telefono": self.telefono,
            "rol": self.rol.value,
            "especialidad": self.especialidad,
            "hospital_id": str(self.hospital_id) if self.hospital_id else None,
            "unidad": self.unidad,
            "fecha_alta": self.fecha_alta.isoformat(),
            "activo": self.activo,
            "acepta_refuerzos": self.acepta_refuerzos,
            "horas_semanales_contrato": self.horas_semanales_contrato,
            "en_lista_sergas": self.en_lista_sergas,
            "esta_asignado_hospital": self.esta_asignado_hospital,
        }
