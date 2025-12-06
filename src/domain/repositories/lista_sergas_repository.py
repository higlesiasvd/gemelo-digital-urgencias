"""
Interfaz del Repositorio de Lista SERGAS
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from src.domain.entities.personal_lista_sergas import PersonalListaSergas, MotivoEntradaLista


class ListaSergasRepository(ABC):
    """Interfaz abstracta para el repositorio de lista SERGAS"""

    @abstractmethod
    def save(self, personal_lista: PersonalListaSergas) -> PersonalListaSergas:
        """Guarda un personal en lista (crear o actualizar)"""
        pass

    @abstractmethod
    def find_by_id(self, lista_id: UUID) -> Optional[PersonalListaSergas]:
        """Busca por ID de registro en lista"""
        pass

    @abstractmethod
    def find_by_personal_id(self, personal_id: UUID) -> Optional[PersonalListaSergas]:
        """Busca por ID del personal"""
        pass

    @abstractmethod
    def find_all(
        self,
        rol: Optional[str] = None,
        especialidad: Optional[str] = None,
        solo_activos: bool = True,
        disponible_turno: Optional[str] = None
    ) -> List[PersonalListaSergas]:
        """Obtiene personal en lista con filtros opcionales"""
        pass

    @abstractmethod
    def find_disponibles_para_turno(
        self,
        turno: str,
        rol: Optional[str] = None,
        hospital_preferido: Optional[str] = None
    ) -> List[PersonalListaSergas]:
        """Obtiene personal disponible para un turno específico"""
        pass

    @abstractmethod
    def delete(self, lista_id: UUID) -> bool:
        """Elimina un registro de la lista"""
        pass

    @abstractmethod
    def delete_by_personal_id(self, personal_id: UUID) -> bool:
        """Elimina un registro por personal_id"""
        pass

    @abstractmethod
    def count_activos(self, rol: Optional[str] = None) -> int:
        """Cuenta el personal activo en lista"""
        pass

    @abstractmethod
    def count_por_rol(self) -> dict:
        """Obtiene conteo de personal por rol"""
        pass

    # Asignaciones temporales
    @abstractmethod
    def registrar_asignacion(
        self,
        personal_id: UUID,
        origen_tipo: str,
        origen_id: Optional[UUID],
        destino_tipo: str,
        destino_id: Optional[UUID],
        turno: Optional[str] = None,
        motivo: Optional[str] = None,
        creado_por: Optional[str] = None
    ) -> UUID:
        """Registra un movimiento de asignación"""
        pass

    @abstractmethod
    def find_asignaciones_activas(
        self,
        personal_id: Optional[UUID] = None,
        hospital_id: Optional[UUID] = None
    ) -> List[dict]:
        """Obtiene las asignaciones activas"""
        pass

    @abstractmethod
    def completar_asignacion(
        self,
        asignacion_id: UUID,
        fecha_fin_real: Optional[datetime] = None
    ) -> bool:
        """Marca una asignación como completada"""
        pass
