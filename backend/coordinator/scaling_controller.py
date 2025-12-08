"""
============================================================================
CONTROLADOR DE ESCALADO
============================================================================
Controla el escalado dinámico de médicos en las consultas del CHUAC.
Solo el CHUAC permite escalado (1-4 médicos por consulta).
============================================================================
"""

from datetime import datetime
from typing import Dict, Optional, List
from dataclasses import dataclass, field
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    HospitalId, CapacityChange, DoctorAssigned, DoctorUnassigned,
    HOSPITAL_CONFIGS
)
from common.kafka_client import KafkaClient
from .saturation_monitor import SaturationMonitor

logger = logging.getLogger(__name__)


@dataclass
class ConsultaState:
    """Estado de una consulta"""
    consulta_id: int
    medicos_asignados: int = 1
    medicos_lista_sergas: List[str] = field(default_factory=list)

    @property
    def velocidad_factor(self) -> float:
        """Factor de velocidad según número de médicos"""
        return min(self.medicos_asignados, 4) * 1.0


class ScalingController:
    """Controlador de escalado dinámico del CHUAC"""

    # Umbrales para escalado automático
    THRESHOLD_SCALE_UP = 0.80  # Escalar si saturación > 80%
    THRESHOLD_SCALE_DOWN = 0.50  # Reducir si saturación < 50%

    def __init__(
        self,
        saturation_monitor: SaturationMonitor,
        kafka_client: KafkaClient
    ):
        self.saturation = saturation_monitor
        self.kafka = kafka_client

        # Estado de consultas del CHUAC
        config = HOSPITAL_CONFIGS[HospitalId.CHUAC]
        self.consultas: Dict[int, ConsultaState] = {
            i: ConsultaState(consulta_id=i)
            for i in range(1, config.num_consultas + 1)
        }

        # Lista SERGAS (médicos disponibles)
        self.lista_sergas_disponibles: List[Dict] = []

    def set_lista_sergas(self, medicos: List[Dict]):
        """Actualiza la lista de médicos disponibles del SERGAS"""
        self.lista_sergas_disponibles = [m for m in medicos if m.get("disponible", True)]
        logger.info(f"Lista SERGAS actualizada: {len(self.lista_sergas_disponibles)} médicos disponibles")

    def scale_consulta(self, consulta_id: int, num_medicos: int) -> Optional[CapacityChange]:
        """
        Escala una consulta a un número específico de médicos.

        Args:
            consulta_id: ID de la consulta (1-10)
            num_medicos: Número de médicos objetivo (1-4)

        Returns:
            CapacityChange event si el escalado fue exitoso
        """
        if consulta_id not in self.consultas:
            logger.warning(f"Consulta {consulta_id} no existe")
            return None

        if num_medicos < 1 or num_medicos > 4:
            logger.warning(f"Número de médicos debe estar entre 1 y 4")
            return None

        consulta = self.consultas[consulta_id]
        medicos_previos = consulta.medicos_asignados

        if num_medicos == medicos_previos:
            return None  # Sin cambio

        # Calcular diferencia
        diferencia = num_medicos - medicos_previos

        if diferencia > 0:
            # Necesitamos añadir médicos
            medicos_necesarios = diferencia
            if len(self.lista_sergas_disponibles) < medicos_necesarios:
                logger.warning(
                    f"No hay suficientes médicos en lista SERGAS "
                    f"({len(self.lista_sergas_disponibles)} disponibles, {medicos_necesarios} necesarios)"
                )
                return None

            # Asignar médicos
            for _ in range(medicos_necesarios):
                medico = self.lista_sergas_disponibles.pop(0)
                consulta.medicos_lista_sergas.append(medico["medico_id"])

                # Emitir evento
                self.kafka.produce("doctor-assigned", DoctorAssigned(
                    medico_id=medico["medico_id"],
                    medico_nombre=medico.get("nombre", "N/A"),
                    hospital_id="chuac",
                    consulta_id=consulta_id,
                    medicos_totales_consulta=consulta.medicos_asignados + 1,
                    velocidad_factor=float(consulta.medicos_asignados + 1)
                ))
                consulta.medicos_asignados += 1

        else:
            # Reducir médicos
            medicos_a_quitar = abs(diferencia)
            for _ in range(medicos_a_quitar):
                if consulta.medicos_lista_sergas:
                    medico_id = consulta.medicos_lista_sergas.pop()
                    consulta.medicos_asignados -= 1

                    # Devolver a lista SERGAS
                    self.lista_sergas_disponibles.append({
                        "medico_id": medico_id,
                        "disponible": True
                    })

                    # Emitir evento
                    self.kafka.produce("doctor-unassigned", DoctorUnassigned(
                        medico_id=medico_id,
                        medico_nombre="N/A",
                        hospital_id="chuac",
                        consulta_id=consulta_id,
                        medicos_restantes_consulta=consulta.medicos_asignados,
                        velocidad_factor=float(max(1, consulta.medicos_asignados)),
                        motivo="reduccion_carga"
                    ))

        # Emitir cambio de capacidad
        change = CapacityChange(
            hospital_id=HospitalId.CHUAC,
            consulta_id=consulta_id,
            medicos_previos=medicos_previos,
            medicos_nuevos=num_medicos,
            velocidad_previa=float(medicos_previos),
            velocidad_nueva=float(num_medicos),
            motivo="escalado_manual"
        )

        self.kafka.produce("capacity-change", change)

        logger.info(
            f"Consulta {consulta_id} escalada: {medicos_previos} -> {num_medicos} médicos"
        )

        return change

    def auto_scale(self) -> List[CapacityChange]:
        """
        Evalúa y aplica escalado automático basado en saturación.

        Returns:
            Lista de cambios de capacidad realizados
        """
        chuac_state = self.saturation.get_state(HospitalId.CHUAC)
        if not chuac_state:
            return []

        changes = []
        saturacion = chuac_state.saturacion

        if saturacion >= self.THRESHOLD_SCALE_UP:
            # Intentar escalar consultas que tengan menos de 4 médicos
            for consulta_id, consulta in self.consultas.items():
                if consulta.medicos_asignados < 4:
                    change = self.scale_consulta(
                        consulta_id,
                        min(consulta.medicos_asignados + 1, 4)
                    )
                    if change:
                        changes.append(change)
                        # Solo escalar una consulta por iteración
                        break

        elif saturacion <= self.THRESHOLD_SCALE_DOWN:
            # Intentar reducir consultas que tengan más de 1 médico
            for consulta_id, consulta in self.consultas.items():
                if consulta.medicos_asignados > 1:
                    change = self.scale_consulta(
                        consulta_id,
                        max(consulta.medicos_asignados - 1, 1)
                    )
                    if change:
                        changes.append(change)
                        break

        return changes

    def get_consultas_state(self) -> Dict:
        """Obtiene el estado de todas las consultas"""
        return {
            consulta_id: {
                "medicos": consulta.medicos_asignados,
                "velocidad": consulta.velocidad_factor,
                "medicos_sergas": consulta.medicos_lista_sergas
            }
            for consulta_id, consulta in self.consultas.items()
        }

    def get_lista_sergas_stats(self) -> Dict:
        """Obtiene estadísticas de la lista SERGAS"""
        asignados = sum(len(c.medicos_lista_sergas) for c in self.consultas.values())
        return {
            "disponibles": len(self.lista_sergas_disponibles),
            "asignados": asignados,
            "total": len(self.lista_sergas_disponibles) + asignados
        }
