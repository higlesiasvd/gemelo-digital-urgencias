"""
============================================================================
SIMULADOR - ENTRY POINT
============================================================================
Ejecuta la simulación de los tres hospitales de forma coordinada.
============================================================================
"""

import asyncio
import signal
import sys
import os
import logging
from threading import Thread
from typing import Dict

# Configurar path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import HospitalId
from common.kafka_client import KafkaClient, create_all_topics
from common.config import settings

from .hospital_simulation import HospitalSimulation

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


class SimulatorOrchestrator:
    """Orquestador de simulaciones de múltiples hospitales"""

    def __init__(self, speed: float = 1.0):
        self.speed = speed
        self.kafka = KafkaClient(client_id="simulator")
        self.simulations: Dict[HospitalId, HospitalSimulation] = {}
        self._running = False

    def setup(self):
        """Configura el simulador"""
        # Crear topics de Kafka
        logger.info("Creando topics de Kafka...")
        create_all_topics()

        # Crear simulaciones para cada hospital
        for hospital_id in HospitalId:
            self.simulations[hospital_id] = HospitalSimulation(
                hospital_id=hospital_id,
                kafka_client=self.kafka,
                speed=self.speed
            )
            logger.info(f"Simulación configurada para {hospital_id.value}")

    def start(self):
        """Inicia todas las simulaciones"""
        self._running = True

        for hospital_id, sim in self.simulations.items():
            sim.start()

        logger.info("Todas las simulaciones iniciadas")

    def run(self, duration_hours: float = None):
        """
        Ejecuta las simulaciones.

        Args:
            duration_hours: Duración en horas (None = infinito)
        """
        threads = []

        for hospital_id, sim in self.simulations.items():
            thread = Thread(
                target=sim.run_realtime,
                args=(duration_hours,),
                name=f"sim-{hospital_id.value}"
            )
            thread.start()
            threads.append(thread)

        # Esperar a que terminen
        for thread in threads:
            thread.join()

    def stop(self):
        """Detiene todas las simulaciones"""
        self._running = False

        for hospital_id, sim in self.simulations.items():
            sim.stop()

        self.kafka.close()
        logger.info("Simulador detenido")

    def get_simulation(self, hospital_id: HospitalId) -> HospitalSimulation:
        """Obtiene una simulación específica"""
        return self.simulations.get(hospital_id)

    def scale_hospital_consulta(
        self,
        hospital_id: HospitalId,
        consulta_id: int,
        num_medicos: int
    ) -> bool:
        """Escala médicos en una consulta de un hospital"""
        sim = self.simulations.get(hospital_id)
        if sim:
            return sim.scale_consulta(consulta_id, num_medicos)
        return False


def run_simulation(
    speed: float = None,
    duration_hours: float = None
):
    """
    Función principal para ejecutar la simulación.

    Args:
        speed: Velocidad de simulación (1.0 = tiempo real)
        duration_hours: Duración en horas (None = infinito)
    """
    speed = speed or settings.SIMULATION_SPEED
    duration = duration_hours or (settings.SIMULATION_DURATION / 60 if settings.SIMULATION_DURATION > 0 else None)

    logger.info(f"Iniciando simulador (velocidad: {speed}x, duración: {duration or 'infinito'}h)")

    orchestrator = SimulatorOrchestrator(speed=speed)

    # Manejar señales de terminación
    def signal_handler(sig, frame):
        logger.info("Señal de terminación recibida")
        orchestrator.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        orchestrator.setup()
        orchestrator.start()
        orchestrator.run(duration_hours=duration)
    except Exception as e:
        logger.error(f"Error en simulación: {e}")
        raise
    finally:
        orchestrator.stop()


if __name__ == "__main__":
    run_simulation()
