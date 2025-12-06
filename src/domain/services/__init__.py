"""
═══════════════════════════════════════════════════════════════════════════════
SERVICIOS DE DOMINIO - Lógica de negocio compleja
═══════════════════════════════════════════════════════════════════════════════

Servicios disponibles:
- simulador: Simulador de urgencias (simplificado)
- estado_sistema: Estado unificado para UI
- predictor: Predictor de demanda
- gestion_personal: Gestión de personal sanitario
"""

# Importaciones principales para uso externo
from src.domain.services.simulador import (
    SimuladorUrgencias,
    HospitalUrgencias,
    CoordinadorDerivaciones,
    GeneradorIncidentes,
    Paciente,
    NivelTriaje,
    EstadoPaciente,
    HOSPITALES,
)

from src.domain.services.estado_sistema import (
    PublicadorEstadoUI,
    AdaptadorSimuladorUI,
    EstadoHospitalUI,
    DerivacionUI,
    IncidenteUI,
)

__all__ = [
    # Simulador v2
    "SimuladorUrgencias",
    "HospitalUrgencias",
    "CoordinadorDerivaciones",
    "GeneradorIncidentes",
    "Paciente",
    "NivelTriaje",
    "EstadoPaciente",
    "HOSPITALES",
    # Estado UI
    "PublicadorEstadoUI",
    "AdaptadorSimuladorUI",
    "EstadoHospitalUI",
    "DerivacionUI",
    "IncidenteUI",
]
