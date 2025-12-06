"""
Entidad de Dominio: Personal en Lista SERGAS
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4


class MotivoEntradaLista(str, Enum):
    """Motivos de entrada a la lista SERGAS"""
    BAJA_HOSPITAL = "baja_hospital"
    FIN_CONTRATO = "fin_contrato"
    VOLUNTARIO = "voluntario"
    REDUCCION_PLANTILLA = "reduccion_plantilla"
    NUEVO_INGRESO = "nuevo_ingreso"


@dataclass
class PersonalListaSergas:
    """
    Entidad que representa un miembro del personal en el pool
    de la lista SERGAS, disponible para reforzar cualquier hospital.
    """
    id: UUID = field(default_factory=uuid4)
    personal_id: UUID = field(default_factory=uuid4)

    # Info desnormalizada para consultas rápidas
    nombre_completo: str = ""
    rol: str = ""
    especialidad: Optional[str] = None
    telefono: Optional[str] = None

    # Disponibilidad por turno
    disponible_turno_manana: bool = True
    disponible_turno_tarde: bool = True
    disponible_turno_noche: bool = True

    # Preferencias
    hospitales_preferidos: List[str] = field(default_factory=list)
    distancia_maxima_km: Optional[int] = None

    # Estado
    activo: bool = True
    fecha_entrada: datetime = field(default_factory=datetime.now)
    motivo_entrada: Optional[MotivoEntradaLista] = None

    # Última asignación
    ultima_asignacion_hospital_id: Optional[UUID] = None
    ultima_asignacion_fecha: Optional[datetime] = None

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def dias_en_lista(self) -> int:
        """Calcula los días que lleva en la lista"""
        return (datetime.now() - self.fecha_entrada).days

    @property
    def disponible_algun_turno(self) -> bool:
        """Indica si está disponible para algún turno"""
        return any([
            self.disponible_turno_manana,
            self.disponible_turno_tarde,
            self.disponible_turno_noche
        ])

    def esta_disponible_para_turno(self, turno: str) -> bool:
        """Verifica disponibilidad para un turno específico"""
        mapping = {
            "manana": self.disponible_turno_manana,
            "tarde": self.disponible_turno_tarde,
            "noche": self.disponible_turno_noche,
        }
        return mapping.get(turno, False)

    def prefiere_hospital(self, hospital_codigo: str) -> bool:
        """Verifica si tiene preferencia por un hospital"""
        if not self.hospitales_preferidos:
            return True  # Sin preferencias = todos los hospitales
        return hospital_codigo in self.hospitales_preferidos

    def registrar_asignacion(self, hospital_id: UUID) -> None:
        """Registra una asignación a un hospital"""
        self.ultima_asignacion_hospital_id = hospital_id
        self.ultima_asignacion_fecha = datetime.now()
        self.updated_at = datetime.now()

    def desactivar(self) -> None:
        """Desactiva al personal de la lista"""
        self.activo = False
        self.updated_at = datetime.now()

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "personal_id": str(self.personal_id),
            "nombre_completo": self.nombre_completo,
            "rol": self.rol,
            "especialidad": self.especialidad,
            "telefono": self.telefono,
            "disponibilidad": {
                "manana": self.disponible_turno_manana,
                "tarde": self.disponible_turno_tarde,
                "noche": self.disponible_turno_noche,
            },
            "hospitales_preferidos": self.hospitales_preferidos,
            "distancia_maxima_km": self.distancia_maxima_km,
            "activo": self.activo,
            "dias_en_lista": self.dias_en_lista,
            "fecha_entrada": self.fecha_entrada.isoformat(),
            "motivo_entrada": self.motivo_entrada.value if self.motivo_entrada else None,
            "ultima_asignacion": {
                "hospital_id": str(self.ultima_asignacion_hospital_id) if self.ultima_asignacion_hospital_id else None,
                "fecha": self.ultima_asignacion_fecha.isoformat() if self.ultima_asignacion_fecha else None,
            },
        }
