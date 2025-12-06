"""
Interfaz del Repositorio de Disponibilidad
"""

from abc import ABC, abstractmethod
from datetime import date
from typing import Optional, List
from uuid import UUID

from src.domain.entities.disponibilidad import Disponibilidad, EstadoDisponibilidad


class DisponibilidadRepository(ABC):
    """Interfaz abstracta para el repositorio de disponibilidad"""

    @abstractmethod
    def save(self, disponibilidad: Disponibilidad) -> Disponibilidad:
        """Guarda una disponibilidad (crear o actualizar)"""
        pass

    @abstractmethod
    def find_by_id(self, disponibilidad_id: UUID) -> Optional[Disponibilidad]:
        """Busca una disponibilidad por su ID"""
        pass

    @abstractmethod
    def find_all(
        self,
        personal_id: Optional[UUID] = None,
        estado: Optional[EstadoDisponibilidad] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        solo_vigentes: bool = False
    ) -> List[Disponibilidad]:
        """Obtiene disponibilidades con filtros opcionales"""
        pass

    @abstractmethod
    def find_vigentes_personal(self, personal_id: UUID) -> List[Disponibilidad]:
        """Obtiene las disponibilidades vigentes de un personal"""
        pass

    @abstractmethod
    def find_bajas_vigentes(
        self,
        hospital_id: Optional[UUID] = None
    ) -> List[Disponibilidad]:
        """Obtiene las bajas vigentes, opcionalmente filtradas por hospital"""
        pass

    @abstractmethod
    def delete(self, disponibilidad_id: UUID) -> bool:
        """Elimina una disponibilidad por su ID"""
        pass

    @abstractmethod
    def count_bajas_por_hospital(self, hospital_id: UUID) -> int:
        """Cuenta las bajas vigentes de un hospital"""
        pass
