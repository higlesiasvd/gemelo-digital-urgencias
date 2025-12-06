from .hospital_router import router as hospital_router
from .personal_router import router as personal_router
from .turno_router import router as turno_router
from .disponibilidad_router import router as disponibilidad_router
from .refuerzo_router import router as refuerzo_router
from .lista_sergas_router import router as lista_sergas_router

__all__ = [
    "hospital_router",
    "personal_router",
    "turno_router",
    "disponibilidad_router",
    "refuerzo_router",
    "lista_sergas_router",
]
