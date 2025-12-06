"""
Interfaz del Repositorio de Personal
"""

from abc import ABC, abstractmethod
from typing import Optional, List
from uuid import UUID

from src.domain.entities.personal import Personal, RolPersonal


class PersonalRepository(ABC):
    """Interfaz abstracta para el repositorio de personal"""

    @abstractmethod
    def save(self, personal: Personal) -> Personal:
        """Guarda un personal (crear o actualizar)"""
        pass

    @abstractmethod
    def find_by_id(self, personal_id: UUID) -> Optional[Personal]:
        """Busca un personal por su ID"""
        pass

    @abstractmethod
    def find_by_numero_empleado(self, numero_empleado: str) -> Optional[Personal]:
        """Busca un personal por su número de empleado"""
        pass

    @abstractmethod
    def find_by_dni(self, dni: str) -> Optional[Personal]:
        """Busca un personal por su DNI"""
        pass

    @abstractmethod
    def find_all(
        self,
        hospital_id: Optional[UUID] = None,
        rol: Optional[RolPersonal] = None,
        solo_activos: bool = True,
        acepta_refuerzos: Optional[bool] = None,
        en_lista_sergas: Optional[bool] = None
    ) -> List[Personal]:
        """Obtiene personal con filtros opcionales"""
        pass

    @abstractmethod
    def find_disponibles_refuerzo(
        self,
        rol: Optional[RolPersonal] = None,
        excluir_hospital_id: Optional[UUID] = None
    ) -> List[Personal]:
        """Obtiene personal disponible para refuerzos"""
        pass

    @abstractmethod
    def delete(self, personal_id: UUID) -> bool:
        """Elimina un personal por su ID"""
        pass

    @abstractmethod
    def exists(self, personal_id: UUID) -> bool:
        """Verifica si existe un personal"""
        pass

    @abstractmethod
    def count_by_hospital(self, hospital_id: UUID, rol: Optional[RolPersonal] = None) -> int:
        """Cuenta el personal de un hospital"""
        pass
