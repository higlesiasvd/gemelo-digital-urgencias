"""
Query: Listar Hospitales
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ListHospitalesQuery:
    """Query para listar hospitales"""
    solo_activos: bool = True
