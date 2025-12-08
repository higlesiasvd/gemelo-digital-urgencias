"""
============================================================================
GESTOR DE DERIVACIONES
============================================================================
Gestiona las derivaciones de pacientes entre hospitales basándose en:
- Gravedad del paciente
- Saturación de hospitales
- Capacidades de cada centro
============================================================================
"""

from datetime import datetime
from typing import Optional, List, Dict
from dataclasses import dataclass, field
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    HospitalId, TriageLevel, TriageResult, DiversionAlert, DiversionReason
)
from common.kafka_client import KafkaClient
from .saturation_monitor import SaturationMonitor

logger = logging.getLogger(__name__)


@dataclass
class DiversionStats:
    """Estadísticas de derivaciones"""
    total_derivaciones: int = 0
    derivaciones_por_gravedad: int = 0
    derivaciones_por_saturacion: int = 0
    por_hospital_origen: Dict[str, int] = field(default_factory=dict)
    por_hospital_destino: Dict[str, int] = field(default_factory=dict)


class DiversionManager:
    """Gestor de derivaciones entre hospitales"""

    # Tiempos estimados de traslado (minutos)
    TRASLADO_TIMES = {
        (HospitalId.MODELO, HospitalId.CHUAC): 8,
        (HospitalId.SAN_RAFAEL, HospitalId.CHUAC): 10,
        (HospitalId.CHUAC, HospitalId.MODELO): 8,
        (HospitalId.CHUAC, HospitalId.SAN_RAFAEL): 10,
        (HospitalId.MODELO, HospitalId.SAN_RAFAEL): 15,
        (HospitalId.SAN_RAFAEL, HospitalId.MODELO): 15,
    }

    def __init__(
        self,
        saturation_monitor: SaturationMonitor,
        kafka_client: KafkaClient
    ):
        self.saturation = saturation_monitor
        self.kafka = kafka_client
        self.stats = DiversionStats()

    def process_triage_result(self, result: TriageResult) -> Optional[DiversionAlert]:
        """
        Procesa un resultado de triaje y decide si hay que derivar.

        Reglas de derivación:
        1. Paciente ROJO/NARANJA en hospital pequeño -> CHUAC
        2. Hospital saturado y paciente VERDE/AZUL -> hospital menos saturado

        Returns:
            DiversionAlert si hay que derivar, None si no
        """
        hospital_origen = result.hospital_id
        nivel = result.nivel_triaje

        # Regla 1: Pacientes graves en hospitales pequeños van a CHUAC
        if (nivel in [TriageLevel.ROJO, TriageLevel.NARANJA]
            and hospital_origen != HospitalId.CHUAC):

            return self._create_diversion(
                patient_id=result.patient_id,
                origen=hospital_origen,
                destino=HospitalId.CHUAC,
                nivel=nivel,
                motivo=DiversionReason.GRAVEDAD
            )

        # Regla 2: Derivación por saturación
        if self.saturation.should_divert_from(hospital_origen):
            # Solo derivar pacientes no urgentes si hay saturación
            if nivel in [TriageLevel.VERDE, TriageLevel.AZUL]:
                destino = self.saturation.get_least_saturated(exclude=hospital_origen)
                if destino:
                    return self._create_diversion(
                        patient_id=result.patient_id,
                        origen=hospital_origen,
                        destino=destino,
                        nivel=nivel,
                        motivo=DiversionReason.SATURACION
                    )

        return None

    def _create_diversion(
        self,
        patient_id: str,
        origen: HospitalId,
        destino: HospitalId,
        nivel: TriageLevel,
        motivo: DiversionReason
    ) -> DiversionAlert:
        """Crea y publica una alerta de derivación"""

        tiempo_traslado = self.TRASLADO_TIMES.get(
            (origen, destino),
            12  # Tiempo por defecto
        )

        alert = DiversionAlert(
            patient_id=patient_id,
            hospital_origen=origen,
            hospital_destino=destino,
            motivo=motivo,
            nivel_triaje=nivel,
            tiempo_estimado_traslado=tiempo_traslado
        )

        # Publicar a Kafka
        self.kafka.produce("diversion-alerts", alert)

        # Actualizar estadísticas
        self._update_stats(origen, destino, motivo)

        logger.info(
            f"Derivación: {patient_id} de {origen.value} a {destino.value} "
            f"(motivo: {motivo.value}, nivel: {nivel.value})"
        )

        return alert

    def _update_stats(
        self,
        origen: HospitalId,
        destino: HospitalId,
        motivo: DiversionReason
    ):
        """Actualiza estadísticas de derivaciones"""
        self.stats.total_derivaciones += 1

        if motivo == DiversionReason.GRAVEDAD:
            self.stats.derivaciones_por_gravedad += 1
        elif motivo == DiversionReason.SATURACION:
            self.stats.derivaciones_por_saturacion += 1

        origen_key = origen.value
        destino_key = destino.value

        self.stats.por_hospital_origen[origen_key] = \
            self.stats.por_hospital_origen.get(origen_key, 0) + 1
        self.stats.por_hospital_destino[destino_key] = \
            self.stats.por_hospital_destino.get(destino_key, 0) + 1

    def get_stats(self) -> Dict:
        """Obtiene estadísticas de derivaciones"""
        return {
            "total": self.stats.total_derivaciones,
            "por_gravedad": self.stats.derivaciones_por_gravedad,
            "por_saturacion": self.stats.derivaciones_por_saturacion,
            "por_hospital_origen": self.stats.por_hospital_origen,
            "por_hospital_destino": self.stats.por_hospital_destino
        }

    def can_divert_to(self, hospital_id: HospitalId) -> bool:
        """Verifica si un hospital puede recibir derivaciones"""
        state = self.saturation.get_state(hospital_id)
        if state:
            return state.puede_recibir_derivaciones
        return False
