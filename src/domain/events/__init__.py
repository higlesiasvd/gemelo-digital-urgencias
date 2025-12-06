from .personal_events import (
    PersonalCreado,
    PersonalActualizado,
    PersonalEliminado,
    PersonalAsignadoAHospital,
    PersonalDevueltoALista,
)
from .hospital_events import (
    HospitalCreado,
    HospitalActualizado,
    ConfiguracionActualizada,
)

__all__ = [
    "PersonalCreado",
    "PersonalActualizado",
    "PersonalEliminado",
    "PersonalAsignadoAHospital",
    "PersonalDevueltoALista",
    "HospitalCreado",
    "HospitalActualizado",
    "ConfiguracionActualizada",
]
