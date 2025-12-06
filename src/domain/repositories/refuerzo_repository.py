"""
Interfaz del Repositorio de Solicitudes de Refuerzo
"""

from abc import ABC, abstractmethod
from datetime import date
from typing import Optional, List
from uuid import UUID

from src.domain.entities.solicitud_refuerzo import (
    SolicitudRefuerzo,
    EstadoSolicitudRefuerzo,
    PrioridadRefuerzo
)


class RefuerzoRepository(ABC):
    """Interfaz abstracta para el repositorio de solicitudes de refuerzo"""

    @abstractmethod
    def save(self, solicitud: SolicitudRefuerzo) -> SolicitudRefuerzo:
        """Guarda una solicitud (crear o actualizar)"""
        pass

    @abstractmethod
    def find_by_id(self, solicitud_id: UUID) -> Optional[SolicitudRefuerzo]:
        """Busca una solicitud por su ID"""
        pass

    @abstractmethod
    def find_all(
        self,
        hospital_id: Optional[UUID] = None,
        estado: Optional[EstadoSolicitudRefuerzo] = None,
        prioridad: Optional[PrioridadRefuerzo] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        generado_automaticamente: Optional[bool] = None
    ) -> List[SolicitudRefuerzo]:
        """Obtiene solicitudes con filtros opcionales"""
        pass

    @abstractmethod
    def find_pendientes(
        self,
        hospital_id: Optional[UUID] = None
    ) -> List[SolicitudRefuerzo]:
        """Obtiene las solicitudes pendientes"""
        pass

    @abstractmethod
    def find_urgentes(self) -> List[SolicitudRefuerzo]:
        """Obtiene las solicitudes urgentes (alta y crítica)"""
        pass

    @abstractmethod
    def delete(self, solicitud_id: UUID) -> bool:
        """Elimina una solicitud por su ID"""
        pass

    @abstractmethod
    def count_pendientes_por_hospital(self, hospital_id: UUID) -> int:
        """Cuenta las solicitudes pendientes de un hospital"""
        pass

    @abstractmethod
    def asignar_personal(
        self,
        solicitud_id: UUID,
        personal_id: UUID
    ) -> bool:
        """Asigna personal a una solicitud"""
        pass
