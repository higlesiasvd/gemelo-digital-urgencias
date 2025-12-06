"""
Interfaz del Repositorio de Hospitales
"""

from abc import ABC, abstractmethod
from typing import Optional, List
from uuid import UUID

from src.domain.entities.hospital import Hospital, ConfiguracionPersonalHospital


class HospitalRepository(ABC):
    """Interfaz abstracta para el repositorio de hospitales"""

    @abstractmethod
    def save(self, hospital: Hospital) -> Hospital:
        """Guarda un hospital (crear o actualizar)"""
        pass

    @abstractmethod
    def find_by_id(self, hospital_id: UUID) -> Optional[Hospital]:
        """Busca un hospital por su ID"""
        pass

    @abstractmethod
    def find_by_codigo(self, codigo: str) -> Optional[Hospital]:
        """Busca un hospital por su código"""
        pass

    @abstractmethod
    def find_all(self, solo_activos: bool = True) -> List[Hospital]:
        """Obtiene todos los hospitales"""
        pass

    @abstractmethod
    def delete(self, hospital_id: UUID) -> bool:
        """Elimina un hospital por su ID"""
        pass

    @abstractmethod
    def exists(self, hospital_id: UUID) -> bool:
        """Verifica si existe un hospital"""
        pass

    # Configuración de personal
    @abstractmethod
    def save_configuracion(self, config: ConfiguracionPersonalHospital) -> ConfiguracionPersonalHospital:
        """Guarda una configuración de personal"""
        pass

    @abstractmethod
    def find_configuraciones(self, hospital_id: UUID) -> List[ConfiguracionPersonalHospital]:
        """Obtiene todas las configuraciones de personal de un hospital"""
        pass

    @abstractmethod
    def find_configuracion(
        self,
        hospital_id: UUID,
        puesto: str,
        rol: str
    ) -> Optional[ConfiguracionPersonalHospital]:
        """Busca una configuración específica"""
        pass

    @abstractmethod
    def delete_configuracion(self, config_id: UUID) -> bool:
        """Elimina una configuración de personal"""
        pass
