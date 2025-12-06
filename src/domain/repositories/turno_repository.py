"""
Interfaz del Repositorio de Turnos
"""

from abc import ABC, abstractmethod
from datetime import date
from typing import Optional, List
from uuid import UUID

from src.domain.entities.turno import Turno, TipoTurno


class TurnoRepository(ABC):
    """Interfaz abstracta para el repositorio de turnos"""

    @abstractmethod
    def save(self, turno: Turno) -> Turno:
        """Guarda un turno (crear o actualizar)"""
        pass

    @abstractmethod
    def find_by_id(self, turno_id: UUID) -> Optional[Turno]:
        """Busca un turno por su ID"""
        pass

    @abstractmethod
    def find_all(
        self,
        hospital_id: Optional[UUID] = None,
        personal_id: Optional[UUID] = None,
        fecha: Optional[date] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        tipo_turno: Optional[TipoTurno] = None,
        es_refuerzo: Optional[bool] = None
    ) -> List[Turno]:
        """Obtiene turnos con filtros opcionales"""
        pass

    @abstractmethod
    def find_by_personal_fecha(
        self,
        personal_id: UUID,
        fecha: date
    ) -> List[Turno]:
        """Obtiene los turnos de un personal en una fecha"""
        pass

    @abstractmethod
    def find_by_hospital_fecha(
        self,
        hospital_id: UUID,
        fecha: date,
        tipo_turno: Optional[TipoTurno] = None
    ) -> List[Turno]:
        """Obtiene los turnos de un hospital en una fecha"""
        pass

    @abstractmethod
    def delete(self, turno_id: UUID) -> bool:
        """Elimina un turno por su ID"""
        pass

    @abstractmethod
    def count_by_hospital_fecha_turno(
        self,
        hospital_id: UUID,
        fecha: date,
        tipo_turno: TipoTurno,
        rol: Optional[str] = None
    ) -> int:
        """Cuenta turnos por hospital, fecha y tipo"""
        pass
