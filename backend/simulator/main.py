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
import time
import json
from threading import Thread
from typing import Dict

# Configurar path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import HospitalId, PatientArrival
from common.kafka_client import KafkaClient, create_all_topics
from common.config import settings
from confluent_kafka import Consumer, KafkaError

from .hospital_simulation import HospitalSimulation
from .flow_engine import Patient

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
        self._incident_consumer: Consumer = None
        self._staff_consumer: Consumer = None

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

    def _consume_incident_patients(self):
        """Thread que consume pacientes de incidentes desde Kafka"""
        logger.info("🚨 Iniciando consumidor de incidentes...")
        
        # Crear consumidor específico para incidentes
        self._incident_consumer = Consumer({
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'group.id': 'simulator-incidents',
            'client.id': 'simulator-incident-consumer',
            'auto.offset.reset': 'latest',
            'enable.auto.commit': True,
        })
        
        self._incident_consumer.subscribe(['incident-patients'])
        logger.info("📡 Suscrito a topic: incident-patients")
        
        while self._running:
            try:
                msg = self._incident_consumer.poll(timeout=0.5)
                
                if msg is None:
                    continue
                    
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    logger.error(f"Error en consumidor: {msg.error()}")
                    continue
                
                # Parsear mensaje
                try:
                    data = json.loads(msg.value().decode('utf-8'))
                    
                    # Obtener hospital_id del mensaje
                    hospital_id_str = data.get('hospital_id')
                    if not hospital_id_str:
                        logger.warning("Mensaje sin hospital_id")
                        continue
                    
                    # Mapear a enum
                    hospital_id_map = {
                        'chuac': HospitalId.CHUAC,
                        'modelo': HospitalId.MODELO,
                        'san_rafael': HospitalId.SAN_RAFAEL,
                    }
                    hospital_id = hospital_id_map.get(hospital_id_str)
                    if not hospital_id:
                        logger.warning(f"Hospital desconocido: {hospital_id_str}")
                        continue
                    
                    # Obtener simulación
                    sim = self.simulations.get(hospital_id)
                    if not sim or not sim.flow_engine:
                        logger.warning(f"Simulación no activa para {hospital_id}")
                        continue
                    
                    # Crear PatientArrival primero, luego Patient.from_arrival
                    from datetime import datetime
                    arrival = PatientArrival(
                        patient_id=data.get('patient_id', 'unknown'),
                        hospital_id=hospital_id,
                        edad=data.get('edad', 30),
                        sexo=data.get('sexo', 'M'),
                        patologia=data.get('patologia', 'Incidente'),
                        hora_llegada=datetime.now(),
                        factor_demanda=1.5  # Incidentes tienen mayor prioridad
                    )
                    
                    # Usar el método from_arrival para crear el paciente correctamente
                    patient = Patient.from_arrival(arrival)
                    
                    # Inyectar al flujo del hospital
                    sim.env.process(sim.flow_engine.process_patient(patient))
                    logger.info(f"🚑 Paciente de incidente inyectado: {patient.patient_id} → {hospital_id.value}")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Error parseando mensaje: {e}")
                except Exception as e:
                    logger.error(f"Error procesando paciente de incidente: {e}")
                    
            except Exception as e:
                logger.error(f"Error en consumidor de incidentes: {e}")
                time.sleep(1)
        
        if self._incident_consumer:
            self._incident_consumer.close()
        logger.info("Consumidor de incidentes detenido")

    def _consume_staff_events(self):
        """Thread que consume eventos de personal desde Kafka para escalar consultas"""
        logger.info("👨‍⚕️ Iniciando consumidor de eventos de personal...")
        
        # Crear consumidor específico para eventos de personal
        self._staff_consumer = Consumer({
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'group.id': 'simulator-staff',
            'client.id': 'simulator-staff-consumer',
            'auto.offset.reset': 'latest',
            'enable.auto.commit': True,
        })
        
        self._staff_consumer.subscribe(['doctor-assigned', 'doctor-unassigned', 'capacity-change'])
        logger.info("📡 Suscrito a topics: doctor-assigned, doctor-unassigned, capacity-change")
        
        while self._running:
            try:
                msg = self._staff_consumer.poll(timeout=0.5)
                
                if msg is None:
                    continue
                    
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    logger.error(f"Error en consumidor staff: {msg.error()}")
                    continue
                
                # Parsear mensaje
                try:
                    topic = msg.topic()
                    data = json.loads(msg.value().decode('utf-8'))
                    
                    # Obtener hospital_id del mensaje
                    hospital_id_str = data.get('hospital_id')
                    if not hospital_id_str:
                        logger.warning(f"Mensaje {topic} sin hospital_id")
                        continue
                    
                    # Solo procesar eventos del CHUAC (único hospital escalable)
                    if hospital_id_str != 'chuac':
                        logger.debug(f"Ignorando evento de {hospital_id_str} (solo CHUAC es escalable)")
                        continue
                    
                    # Obtener simulación
                    sim = self.simulations.get(HospitalId.CHUAC)
                    if not sim or not sim.flow_engine:
                        logger.warning("Simulación CHUAC no activa")
                        continue
                    
                    # Procesar según tipo de evento
                    consulta_id = data.get('consulta_id')
                    if not consulta_id:
                        logger.warning(f"Mensaje {topic} sin consulta_id")
                        continue
                    
                    if topic == 'doctor-assigned':
                        # Médico asignado: obtener nuevo total de médicos
                        medicos_totales = data.get('medicos_totales_consulta', 1)
                        success = sim.flow_engine.scale_consulta(consulta_id, medicos_totales)
                        if success:
                            logger.info(f"🩺 Doctor asignado a consulta {consulta_id} → ahora {medicos_totales} médicos (velocidad x{medicos_totales})")
                        
                    elif topic == 'doctor-unassigned':
                        # Médico desasignado: obtener nuevo total de médicos
                        medicos_restantes = data.get('medicos_restantes_consulta', 1)
                        success = sim.flow_engine.scale_consulta(consulta_id, medicos_restantes)
                        if success:
                            logger.info(f"👋 Doctor desasignado de consulta {consulta_id} → ahora {medicos_restantes} médicos")
                        
                    elif topic == 'capacity-change':
                        # Cambio de capacidad directo
                        medicos_nuevos = data.get('medicos_nuevos', 1)
                        success = sim.flow_engine.scale_consulta(consulta_id, medicos_nuevos)
                        if success:
                            logger.info(f"⚡ Capacidad cambiada en consulta {consulta_id} → {medicos_nuevos} médicos")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Error parseando mensaje staff: {e}")
                except Exception as e:
                    logger.error(f"Error procesando evento de personal: {e}")
                    
            except Exception as e:
                logger.error(f"Error en consumidor de staff: {e}")
                time.sleep(1)
        
        if self._staff_consumer:
            self._staff_consumer.close()
        logger.info("Consumidor de staff detenido")

    def _consume_control_commands(self):
        """Thread que consume comandos de control de simulación desde Kafka"""
        logger.info("⚙️ Iniciando consumidor de comandos de control...")
        
        control_consumer = Consumer({
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'group.id': 'simulator-control',
            'client.id': 'simulator-control-consumer',
            'auto.offset.reset': 'latest',
            'enable.auto.commit': True,
        })
        
        control_consumer.subscribe(['simulation-control'])
        logger.info("📡 Suscrito a topic: simulation-control")
        
        while self._running:
            try:
                msg = control_consumer.poll(timeout=0.5)
                
                if msg is None:
                    continue
                    
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    logger.error(f"Error en consumidor de control: {msg.error()}")
                    continue
                
                try:
                    data = json.loads(msg.value().decode('utf-8'))
                    command = data.get('command')
                    
                    if command == 'set_speed':
                        new_speed = data.get('speed', 1.0)
                        logger.info(f"⚡ Comando set_speed recibido: {new_speed}x")
                        
                        # Actualizar velocidad en todas las simulaciones
                        self.speed = new_speed
                        for hospital_id, sim in self.simulations.items():
                            sim.set_speed(new_speed)
                        
                        logger.info(f"✅ Velocidad actualizada a {new_speed}x en todas las simulaciones")
                        
                    elif command == 'start':
                        logger.info("▶️ Comando start recibido (ya en ejecución)")
                        
                    elif command == 'stop':
                        logger.info("⏹️ Comando stop recibido")
                        self._running = False
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Error parseando mensaje de control: {e}")
                except Exception as e:
                    logger.error(f"Error procesando comando de control: {e}")
                    
            except Exception as e:
                logger.error(f"Error en consumidor de control: {e}")
                time.sleep(1)
        
        control_consumer.close()
        logger.info("Consumidor de control detenido")

    def run(self, duration_hours: float = None):
        """
        Ejecuta las simulaciones.

        Args:
            duration_hours: Duración en horas (None = infinito)
        """
        threads = []

        # Thread para cada hospital
        for hospital_id, sim in self.simulations.items():
            thread = Thread(
                target=sim.run_realtime,
                args=(duration_hours,),
                name=f"sim-{hospital_id.value}"
            )
            thread.start()
            threads.append(thread)

        # Thread para consumir pacientes de incidentes
        incident_thread = Thread(
            target=self._consume_incident_patients,
            name="incident-consumer"
        )
        incident_thread.start()
        threads.append(incident_thread)

        # Thread para consumir eventos de personal (doctor-assigned, etc.)
        staff_thread = Thread(
            target=self._consume_staff_events,
            name="staff-consumer"
        )
        staff_thread.start()
        threads.append(staff_thread)

        # Thread para consumir comandos de control (velocidad, etc.)
        control_thread = Thread(
            target=self._consume_control_commands,
            name="control-consumer"
        )
        control_thread.start()
        threads.append(control_thread)

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
