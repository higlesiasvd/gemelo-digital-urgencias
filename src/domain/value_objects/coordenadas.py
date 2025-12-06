"""
Value Object: Coordenadas
"""

from dataclasses import dataclass
from typing import Tuple
import math


@dataclass(frozen=True)
class Coordenadas:
    """
    Value Object que representa coordenadas geográficas.
    Inmutable y con validación integrada.
    """
    latitud: float
    longitud: float

    def __post_init__(self):
        if not -90 <= self.latitud <= 90:
            raise ValueError(f"Latitud debe estar entre -90 y 90: {self.latitud}")
        if not -180 <= self.longitud <= 180:
            raise ValueError(f"Longitud debe estar entre -180 y 180: {self.longitud}")

    def distancia_a(self, otras: 'Coordenadas') -> float:
        """
        Calcula la distancia en kilómetros a otras coordenadas usando la fórmula de Haversine.
        """
        R = 6371  # Radio de la Tierra en km

        lat1_rad = math.radians(self.latitud)
        lat2_rad = math.radians(otras.latitud)
        delta_lat = math.radians(otras.latitud - self.latitud)
        delta_lon = math.radians(otras.longitud - self.longitud)

        a = (
            math.sin(delta_lat / 2) ** 2 +
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def to_tuple(self) -> Tuple[float, float]:
        return (self.latitud, self.longitud)

    def __str__(self) -> str:
        return f"({self.latitud}, {self.longitud})"
