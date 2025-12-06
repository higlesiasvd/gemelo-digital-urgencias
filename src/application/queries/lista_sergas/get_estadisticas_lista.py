"""
Query: Obtener Estadísticas de Lista SERGAS
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class GetEstadisticasListaQuery:
    """Query para obtener estadísticas de la lista SERGAS"""
    pass  # No requiere parámetros
