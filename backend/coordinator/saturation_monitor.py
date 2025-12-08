"""
============================================================================
MONITOR DE SATURACION
============================================================================
Monitoriza los niveles de saturación de cada hospital y emite alertas.
============================================================================
"""

from datetime import datetime
from typing import Dict, Optional, List
from dataclasses import dataclass, field
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import HospitalId, HospitalStats

logger = logging.getLogger(__name__)


@dataclass
class HospitalState:
    """Estado actual de un hospital"""
    hospital_id: HospitalId
    saturacion: float = 0.0
    boxes_ocupados: int = 0
    boxes_totales: int = 0
    consultas_ocupadas: int = 0
    consultas_totales: int = 0
    cola_triaje: int = 0
    cola_consulta: int = 0
    tiempo_espera_triaje: float = 0.0
    tiempo_espera_consulta: float = 0.0
    emergencia_activa: bool = False
    last_update: datetime = field(default_factory=datetime.now)

    @property
    def esta_saturado(self) -> bool:
        """Hospital saturado si >85% ocupación"""
        return self.saturacion > 0.85

    @property
    def esta_critico(self) -> bool:
        """Hospital crítico si >95% ocupación"""
        return self.saturacion > 0.95

    @property
    def puede_recibir_derivaciones(self) -> bool:
        """Puede recibir pacientes derivados si <70% ocupación"""
        return self.saturacion < 0.70


class SaturationMonitor:
    """Monitoriza la saturación de todos los hospitales"""

    # Umbrales
    THRESHOLD_WARNING = 0.70
    THRESHOLD_HIGH = 0.85
    THRESHOLD_CRITICAL = 0.95

    def __init__(self):
        self.hospital_states: Dict[HospitalId, HospitalState] = {
            hospital_id: HospitalState(hospital_id=hospital_id)
            for hospital_id in HospitalId
        }
        self._alert_callbacks: List = []

    def register_alert_callback(self, callback):
        """Registra un callback para alertas"""
        self._alert_callbacks.append(callback)

    def update_from_stats(self, stats: HospitalStats):
        """Actualiza el estado de un hospital desde estadísticas"""
        state = self.hospital_states.get(stats.hospital_id)
        if not state:
            return

        state.saturacion = stats.saturacion_global
        state.boxes_ocupados = stats.boxes_ocupados
        state.boxes_totales = stats.boxes_totales
        state.consultas_ocupadas = stats.consultas_ocupadas
        state.consultas_totales = stats.consultas_totales
        state.cola_triaje = stats.cola_triaje
        state.cola_consulta = stats.cola_consulta
        state.tiempo_espera_triaje = stats.tiempo_medio_espera_triaje
        state.tiempo_espera_consulta = stats.tiempo_medio_espera_consulta
        state.emergencia_activa = stats.emergencia_activa
        state.last_update = datetime.now()

        # Verificar umbrales y emitir alertas
        self._check_thresholds(state)

    def _check_thresholds(self, state: HospitalState):
        """Verifica umbrales y emite alertas"""
        hospital_id = state.hospital_id

        if state.saturacion >= self.THRESHOLD_CRITICAL:
            self._emit_alert(
                hospital_id,
                "critical",
                f"CRITICO: {hospital_id.value} al {state.saturacion*100:.0f}% de capacidad"
            )
        elif state.saturacion >= self.THRESHOLD_HIGH:
            self._emit_alert(
                hospital_id,
                "warning",
                f"ALERTA: {hospital_id.value} al {state.saturacion*100:.0f}% de capacidad"
            )
        elif state.saturacion >= self.THRESHOLD_WARNING:
            self._emit_alert(
                hospital_id,
                "info",
                f"AVISO: {hospital_id.value} al {state.saturacion*100:.0f}% de capacidad"
            )

    def _emit_alert(self, hospital_id: HospitalId, level: str, message: str):
        """Emite una alerta a los callbacks registrados"""
        for callback in self._alert_callbacks:
            try:
                callback(hospital_id, level, message)
            except Exception as e:
                logger.error(f"Error en callback de alerta: {e}")

    def get_state(self, hospital_id: HospitalId) -> Optional[HospitalState]:
        """Obtiene el estado de un hospital"""
        return self.hospital_states.get(hospital_id)

    def get_all_states(self) -> Dict[HospitalId, HospitalState]:
        """Obtiene el estado de todos los hospitales"""
        return self.hospital_states

    def get_least_saturated(self, exclude: HospitalId = None) -> Optional[HospitalId]:
        """
        Obtiene el hospital menos saturado.

        Args:
            exclude: Hospital a excluir de la búsqueda

        Returns:
            ID del hospital menos saturado
        """
        candidates = [
            (hid, state) for hid, state in self.hospital_states.items()
            if hid != exclude and state.puede_recibir_derivaciones
        ]

        if not candidates:
            return None

        # Ordenar por saturación ascendente
        candidates.sort(key=lambda x: x[1].saturacion)
        return candidates[0][0]

    def should_divert_from(self, hospital_id: HospitalId) -> bool:
        """Indica si un hospital debería derivar pacientes"""
        state = self.hospital_states.get(hospital_id)
        if not state:
            return False

        return state.esta_saturado

    def get_system_status(self) -> Dict:
        """Obtiene el estado general del sistema"""
        total_saturacion = sum(s.saturacion for s in self.hospital_states.values())
        avg_saturacion = total_saturacion / len(self.hospital_states)

        critical_count = sum(1 for s in self.hospital_states.values() if s.esta_critico)
        saturated_count = sum(1 for s in self.hospital_states.values() if s.esta_saturado)

        if critical_count > 0:
            status = "CRITICO"
        elif saturated_count > 0:
            status = "ALERTA"
        elif avg_saturacion > self.THRESHOLD_WARNING:
            status = "ATENCION"
        else:
            status = "NORMAL"

        return {
            "status": status,
            "saturacion_media": round(avg_saturacion, 3),
            "hospitales_criticos": critical_count,
            "hospitales_saturados": saturated_count,
            "hospitales": {
                hid.value: {
                    "saturacion": round(state.saturacion, 3),
                    "esta_saturado": state.esta_saturado,
                    "esta_critico": state.esta_critico,
                    "puede_recibir": state.puede_recibir_derivaciones
                }
                for hid, state in self.hospital_states.items()
            },
            "timestamp": datetime.now().isoformat()
        }
