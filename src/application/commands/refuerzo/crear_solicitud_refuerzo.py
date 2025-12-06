"""
Command: Crear Solicitud de Refuerzo
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class CrearSolicitudRefuerzoCommand:
    """Comando para crear una solicitud de refuerzo"""
    hospital_id: UUID
    fecha_necesidad: date
    turno_necesario: str  # manana, tarde, noche
    rol_requerido: str  # medico, enfermero, auxiliar
    cantidad_personal: int = 1
    prioridad: str = "media"  # baja, media, alta, critica
    motivo: str = "alta_demanda_predicha"
    generado_automaticamente: bool = False
    solicitado_por: Optional[str] = None
    notas: Optional[str] = None
    demanda_predicha: Optional[float] = None
    saturacion_predicha: Optional[float] = None
    confianza_prediccion: Optional[float] = None
