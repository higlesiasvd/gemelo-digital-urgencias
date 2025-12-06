"""
API Module - Gemelo Digital Hospitalario
"""

from .v1.routers import (
    hospital_router,
    personal_router,
    turno_router,
    disponibilidad_router,
    refuerzo_router,
    lista_sergas_router,
)

__all__ = [
    "hospital_router",
    "personal_router",
    "turno_router",
    "disponibilidad_router",
    "refuerzo_router",
    "lista_sergas_router",
]
