"""
============================================================================
COORDINADOR CENTRAL - ENTRY POINT
============================================================================
Servicio que coordina los tres hospitales:
- Monitoriza saturación
- Gestiona derivaciones
- Controla escalado del CHUAC
============================================================================
"""

import asyncio
import signal
import sys
import os
import logging
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    HospitalId, HospitalStats, TriageResult, validate_event
)
from common.kafka_client import KafkaClient
from common.config import settings

from .saturation_monitor import SaturationMonitor
from .diversion_manager import DiversionManager
from .scaling_controller import ScalingController

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


class Coordinator:
    """Coordinador central del sistema de urgencias"""

    # Topics a consumir
    SUBSCRIBED_TOPICS = [
        "hospital-stats",
        "triage-results",
        "staff-state",
        "staff-load"
    ]

    def __init__(self):
        self.kafka = KafkaClient(
            client_id="coordinator",
            group_id="coordinator-group"
        )

        self.saturation_monitor = SaturationMonitor()
        self.diversion_manager = DiversionManager(
            self.saturation_monitor,
            self.kafka
        )
        self.scaling_controller = ScalingController(
            self.saturation_monitor,
            self.kafka
        )

        self._running = False

        # Registrar callback de alertas
        self.saturation_monitor.register_alert_callback(self._on_alert)

    def _on_alert(self, hospital_id: HospitalId, level: str, message: str):
        """Callback para alertas de saturación"""
        logger.warning(f"[{level.upper()}] {message}")

        # Publicar alerta a Kafka (opcional, para Node-RED)
        self.kafka.produce("coordinator-alerts", {
            "hospital_id": hospital_id.value,
            "level": level,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }, validate=False)

    def _handle_message(self, topic: str, data: dict):
        """Procesa un mensaje de Kafka"""
        try:
            if topic == "hospital-stats":
                stats = HospitalStats(**data)
                self.saturation_monitor.update_from_stats(stats)

                # Evaluar escalado automático
                if stats.hospital_id == HospitalId.CHUAC:
                    self.scaling_controller.auto_scale()

            elif topic == "triage-results":
                result = TriageResult(**data)
                # Evaluar si hay que derivar
                diversion = self.diversion_manager.process_triage_result(result)
                if diversion:
                    logger.info(f"Derivación generada: {diversion.patient_id}")

            elif topic == "staff-state":
                # Actualizar lista SERGAS si es relevante
                if data.get("hospital_id") == "sergas":
                    # Este sería un evento de actualización de la lista
                    pass

            elif topic == "staff-load":
                # Información adicional de carga
                pass

        except Exception as e:
            logger.error(f"Error procesando mensaje de {topic}: {e}")

    async def _consume_loop(self):
        """Loop de consumo de mensajes"""
        self.kafka.subscribe(self.SUBSCRIBED_TOPICS)

        while self._running:
            msg = self.kafka.consume_one(timeout=0.1)
            if msg:
                self._handle_message(msg['topic'], msg['value'])
            await asyncio.sleep(0.01)

    async def _stats_loop(self):
        """Loop de publicación de estadísticas del coordinador"""
        while self._running:
            await asyncio.sleep(30)  # Cada 30 segundos

            status = self.saturation_monitor.get_system_status()
            status["derivaciones"] = self.diversion_manager.get_stats()
            status["chuac_consultas"] = self.scaling_controller.get_consultas_state()
            status["lista_sergas"] = self.scaling_controller.get_lista_sergas_stats()

            self.kafka.produce("coordinator-status", status, validate=False)

    def start(self):
        """Inicia el coordinador"""
        self._running = True
        logger.info("Coordinador iniciado")

    async def run(self):
        """Ejecuta el coordinador"""
        await asyncio.gather(
            self._consume_loop(),
            self._stats_loop()
        )

    def stop(self):
        """Detiene el coordinador"""
        self._running = False
        self.kafka.close()
        logger.info("Coordinador detenido")


async def run_coordinator():
    """Función principal para ejecutar el coordinador"""
    coordinator = Coordinator()

    def signal_handler(sig, frame):
        logger.info("Señal de terminación recibida")
        coordinator.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        coordinator.start()
        await coordinator.run()
    except Exception as e:
        logger.error(f"Error en coordinador: {e}")
        raise
    finally:
        coordinator.stop()


if __name__ == "__main__":
    asyncio.run(run_coordinator())
