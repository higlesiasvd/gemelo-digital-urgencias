"""
============================================================================
SIMULACION DE HOSPITAL
============================================================================
Orquesta la simulación completa de un hospital, incluyendo:
- Generación de pacientes
- Flujo de atención
- Publicación de eventos a Kafka
============================================================================
"""

import simpy
import asyncio
import random
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging
import threading

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    HospitalId, PatientArrival, TriageResult, ConsultationEvent,
    HospitalStats, SystemContext, HOSPITAL_CONFIGS
)
from common.kafka_client import KafkaClient
from common.config import settings

from .patient_generator import PatientGenerator
from .flow_engine import FlowEngine, Patient
from .demand_factors import DemandFactors

logger = logging.getLogger(__name__)


class HospitalSimulation:
    """Simulación completa de un hospital"""

    def __init__(
        self,
        hospital_id: HospitalId,
        kafka_client: KafkaClient,
        speed: float = 1.0
    ):
        self.hospital_id = hospital_id
        self.kafka = kafka_client
        self.speed = speed
        self.config = HOSPITAL_CONFIGS[hospital_id]

        self.env: Optional[simpy.Environment] = None
        self.flow_engine: Optional[FlowEngine] = None
        self.patient_generator = PatientGenerator()
        self.demand_factors = DemandFactors()

        self._running = False
        self._context: Dict = {}

    def _on_triage(self, event: TriageResult):
        """Callback cuando se completa un triaje"""
        self.kafka.produce("triage-results", event)

    def _on_consultation(self, event: ConsultationEvent):
        """Callback cuando hay un evento de consulta"""
        self.kafka.produce("consultation-events", event)

    def _update_context(self):
        """Actualiza el contexto externo"""
        self._context = self.demand_factors.calculate_total_factor()

        # Publicar contexto
        context_event = SystemContext(
            temperatura=self._context.get("clima", {}).get("temperatura", 15.0) if self._context.get("clima") else 15.0,
            lluvia_mm=self._context.get("clima", {}).get("lluvia_1h", 0) if self._context.get("clima") else 0,
            condicion=self._context.get("clima", {}).get("descripcion", "normal") if self._context.get("clima") else "normal",
            factor_clima=self._context.get("factor_clima", 1.0),
            evento_activo=self._context.get("evento_activo"),
            factor_evento=self._context.get("factor_evento", 1.0),
            es_festivo=False,
            factor_festivo=1.0,
            factor_total=self._context.get("factor_total", 1.0)
        )
        self.kafka.produce("system-context", context_event)

    def _generate_patients(self):
        """Proceso de generación de pacientes"""
        while self._running:
            # Actualizar contexto cada hora simulada (60 minutos)
            if self.env.now % 60 < 1:
                self._update_context()

            # Calcular tasa de llegadas
            factor_total = self._context.get("factor_total", 1.0)
            arrival_rate = self.patient_generator.get_arrival_rate(
                self.hospital_id, factor_total
            )

            # Tiempo hasta siguiente paciente (distribución exponencial)
            # Convertir de pacientes/hora a minutos entre llegadas
            inter_arrival_time = random.expovariate(arrival_rate / 60)

            yield self.env.timeout(inter_arrival_time)

            if not self._running:
                break

            # Generar paciente
            arrival = self.patient_generator.generate_patient(
                self.hospital_id,
                factor_demanda=factor_total,
                context=self._context
            )

            # Publicar llegada
            self.kafka.produce("patient-arrivals", arrival)

            # Procesar paciente
            patient = Patient.from_arrival(arrival)
            self.env.process(self.flow_engine.process_patient(patient))

    def _publish_stats(self):
        """Proceso de publicación periódica de estadísticas"""
        while self._running:
            yield self.env.timeout(2)  # Cada 2 minutos simulados (más frecuente para ver flujo)

            stats = self.flow_engine.get_stats()
            self.kafka.produce("hospital-stats", stats)

    def start(self):
        """Inicia la simulación"""
        self.env = simpy.Environment()
        self.flow_engine = FlowEngine(
            self.env,
            self.hospital_id,
            on_triage=self._on_triage,
            on_consultation=self._on_consultation
        )

        self._running = True

        # Iniciar procesos
        self.env.process(self._generate_patients())
        self.env.process(self._publish_stats())

        # Actualizar contexto inicial
        self._update_context()

        logger.info(f"Simulación iniciada para {self.hospital_id.value}")

    def run(self, until: float = None):
        """
        Ejecuta la simulación.

        Args:
            until: Tiempo de simulación en minutos (None = infinito)
        """
        if until:
            self.env.run(until=until / self.speed)
        else:
            # Ejecutar indefinidamente en pasos
            while self._running:
                self.env.step()

    def run_realtime(self, duration_hours: float = None):
        """
        Ejecuta la simulación en tiempo real.

        Args:
            duration_hours: Duración en horas reales (None = infinito)
        """
        import time

        start_time = time.time()
        last_sim_time = 0

        while self._running:
            # Tiempo real transcurrido en segundos
            real_elapsed = time.time() - start_time

            # Tiempo simulado objetivo (convertir segundos reales a minutos SimPy)
            # Con speed=1.0: 60 segundos reales = 1 minuto SimPy (tiempo real)
            # Con speed=10.0: 60 segundos reales = 10 minutos SimPy (10x más rápido)
            sim_target = (real_elapsed / 60) * self.speed

            # Avanzar simulación
            if sim_target > last_sim_time:
                self.env.run(until=sim_target)
                last_sim_time = sim_target

            # Verificar duración
            if duration_hours and real_elapsed >= duration_hours * 3600:
                break

            # Pequeña pausa para no saturar CPU
            time.sleep(0.01)

    def stop(self):
        """Detiene la simulación"""
        self._running = False
        logger.info(f"Simulación detenida para {self.hospital_id.value}")

    def scale_consulta(self, consulta_id: int, num_medicos: int) -> bool:
        """Escala médicos en una consulta"""
        if self.flow_engine:
            return self.flow_engine.scale_consulta(consulta_id, num_medicos)
        return False

    def set_speed(self, new_speed: float):
        """Cambia la velocidad de simulación dinámicamente"""
        old_speed = self.speed
        self.speed = new_speed
        logger.info(f"Velocidad cambiada de {old_speed}x a {new_speed}x para {self.hospital_id.value}")

    def get_stats(self) -> Optional[HospitalStats]:
        """Obtiene estadísticas actuales"""
        if self.flow_engine:
            return self.flow_engine.get_stats()
        return None

    def receive_diverted_patient(self, patient: PatientArrival):
        """Recibe un paciente derivado de otro hospital"""
        if self.flow_engine:
            p = Patient.from_arrival(patient)
            self.env.process(self.flow_engine.process_patient(p))
            self.flow_engine.resources.pacientes_derivados_recibidos += 1
            logger.info(f"Paciente derivado recibido: {patient.patient_id}")
