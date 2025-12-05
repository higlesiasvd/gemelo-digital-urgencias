"""
═══════════════════════════════════════════════════════════════════════════════
SERVICIO DE KAFKA - Pipeline de Mensajería
═══════════════════════════════════════════════════════════════════════════════
Gestiona la comunicación asíncrona entre servicios usando Apache Kafka.

Topics:
- predicciones.demanda: Eventos de predicción de demanda
- personal.refuerzos: Solicitudes y respuestas de refuerzos
- personal.disponibilidad: Cambios en disponibilidad del personal
- alertas.saturacion: Alertas de saturación de hospitales
- eventos.emergencias: Eventos de emergencia masiva
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Optional, Callable, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Importación condicional de kafka-python
try:
    from kafka import KafkaProducer, KafkaConsumer
    from kafka.admin import KafkaAdminClient, NewTopic
    from kafka.errors import TopicAlreadyExistsError, NoBrokersAvailable
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    logger.warning("⚠️  kafka-python no disponible. Usando modo fallback.")


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_CLIENT_ID = os.getenv("KAFKA_CLIENT_ID", "urgencias-digital-twin")


class KafkaTopic(str, Enum):
    """Topics de Kafka utilizados en el sistema"""
    PREDICCIONES_DEMANDA = "predicciones.demanda"
    PERSONAL_REFUERZOS = "personal.refuerzos"
    PERSONAL_DISPONIBILIDAD = "personal.disponibilidad"
    ALERTAS_SATURACION = "alertas.saturacion"
    EVENTOS_EMERGENCIAS = "eventos.emergencias"
    METRICAS_HOSPITAL = "metricas.hospital"


# ═══════════════════════════════════════════════════════════════════════════════
# MODELOS DE MENSAJES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MensajePrediccionDemanda:
    """Mensaje de predicción de demanda"""
    hospital_id: str
    timestamp: str
    demanda_actual: int
    demanda_predicha_1h: float
    demanda_predicha_6h: float
    demanda_predicha_24h: float
    saturacion_actual: float
    saturacion_predicha: float
    confianza: float
    factores: Dict[str, float]  # clima, eventos, festivo
    requiere_accion: bool
    prioridad: str  # baja, media, alta, critica


@dataclass
class MensajeSolicitudRefuerzo:
    """Mensaje de solicitud de refuerzo de personal"""
    solicitud_id: str
    hospital_id: str
    timestamp: str
    fecha_necesidad: str
    turno: str
    rol_requerido: str
    cantidad: int
    prioridad: str
    motivo: str
    demanda_predicha: Optional[float]
    saturacion_predicha: Optional[float]
    estado: str  # pendiente, enviada, aceptada, rechazada
    personal_asignado: List[str]


@dataclass
class MensajeDisponibilidad:
    """Mensaje de cambio en disponibilidad del personal"""
    personal_id: str
    hospital_id: str
    timestamp: str
    estado_anterior: str
    estado_nuevo: str
    fecha_inicio: str
    fecha_fin: Optional[str]
    motivo: Optional[str]


@dataclass
class MensajeAlertaSaturacion:
    """Mensaje de alerta de saturación"""
    alert_id: str
    hospital_id: str
    timestamp: str
    nivel_saturacion: float
    tipo_alerta: str  # media, alta, critica
    boxes_ocupados: int
    boxes_totales: int
    pacientes_espera: int
    tiempo_espera_medio: float
    accion_recomendada: str


@dataclass
class MensajeEmergencia:
    """Mensaje de evento de emergencia"""
    emergencia_id: str
    hospital_id: str
    timestamp: str
    tipo_emergencia: str
    victimas_estimadas: int
    nivel_activacion: int  # 1, 2 o 3
    recursos_adicionales: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTOR DE KAFKA
# ═══════════════════════════════════════════════════════════════════════════════

class KafkaEventProducer:
    """Productor de eventos para Kafka"""
    
    def __init__(self, bootstrap_servers: str = KAFKA_BOOTSTRAP_SERVERS):
        self.bootstrap_servers = bootstrap_servers
        self.producer: Optional[KafkaProducer] = None
        self._connected = False
        
    def connect(self) -> bool:
        """Conecta al broker de Kafka"""
        if not KAFKA_AVAILABLE:
            logger.warning("Kafka no disponible, usando modo simulado")
            return False
            
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                client_id=KAFKA_CLIENT_ID,
                value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks='all',  # Esperar confirmación de todas las réplicas
                retries=3,
                max_in_flight_requests_per_connection=1,
            )
            self._connected = True
            logger.info(f"✅ Conectado a Kafka: {self.bootstrap_servers}")
            return True
        except NoBrokersAvailable:
            logger.warning(f"⚠️  No se puede conectar a Kafka: {self.bootstrap_servers}")
            self._connected = False
            return False
        except Exception as e:
            logger.error(f"❌ Error conectando a Kafka: {e}")
            self._connected = False
            return False
    
    def disconnect(self):
        """Desconecta del broker"""
        if self.producer:
            self.producer.flush()
            self.producer.close()
            self._connected = False
            logger.info("🔌 Desconectado de Kafka")
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    def send(self, topic: KafkaTopic, message: Any, key: Optional[str] = None) -> bool:
        """
        Envía un mensaje a un topic de Kafka.
        
        Args:
            topic: Topic de destino
            message: Mensaje a enviar (dataclass o dict)
            key: Clave para particionado (opcional)
        
        Returns:
            True si se envió correctamente
        """
        if not self._connected:
            logger.debug(f"[KAFKA MOCK] {topic.value}: {message}")
            return True
            
        try:
            # Convertir dataclass a dict si es necesario
            if hasattr(message, '__dataclass_fields__'):
                message = asdict(message)
            
            future = self.producer.send(topic.value, value=message, key=key)
            # Esperar confirmación
            record_metadata = future.get(timeout=10)
            logger.debug(
                f"📤 Mensaje enviado a {topic.value} "
                f"[partition={record_metadata.partition}, offset={record_metadata.offset}]"
            )
            return True
        except Exception as e:
            logger.error(f"❌ Error enviando mensaje a {topic.value}: {e}")
            return False
    
    # Métodos de conveniencia para cada tipo de mensaje
    
    def publicar_prediccion(self, prediccion: MensajePrediccionDemanda) -> bool:
        """Publica una predicción de demanda"""
        return self.send(
            KafkaTopic.PREDICCIONES_DEMANDA, 
            prediccion,
            key=prediccion.hospital_id
        )
    
    def publicar_solicitud_refuerzo(self, solicitud: MensajeSolicitudRefuerzo) -> bool:
        """Publica una solicitud de refuerzo"""
        return self.send(
            KafkaTopic.PERSONAL_REFUERZOS,
            solicitud,
            key=solicitud.hospital_id
        )
    
    def publicar_cambio_disponibilidad(self, cambio: MensajeDisponibilidad) -> bool:
        """Publica un cambio de disponibilidad"""
        return self.send(
            KafkaTopic.PERSONAL_DISPONIBILIDAD,
            cambio,
            key=cambio.hospital_id
        )
    
    def publicar_alerta_saturacion(self, alerta: MensajeAlertaSaturacion) -> bool:
        """Publica una alerta de saturación"""
        return self.send(
            KafkaTopic.ALERTAS_SATURACION,
            alerta,
            key=alerta.hospital_id
        )
    
    def publicar_emergencia(self, emergencia: MensajeEmergencia) -> bool:
        """Publica un evento de emergencia"""
        return self.send(
            KafkaTopic.EVENTOS_EMERGENCIAS,
            emergencia,
            key=emergencia.hospital_id
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONSUMIDOR DE KAFKA
# ═══════════════════════════════════════════════════════════════════════════════

class KafkaEventConsumer:
    """Consumidor de eventos de Kafka"""
    
    def __init__(
        self,
        topics: List[KafkaTopic],
        group_id: str,
        bootstrap_servers: str = KAFKA_BOOTSTRAP_SERVERS
    ):
        self.topics = [t.value for t in topics]
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers
        self.consumer: Optional[KafkaConsumer] = None
        self._running = False
        self._handlers: Dict[str, Callable] = {}
    
    def connect(self) -> bool:
        """Conecta al broker de Kafka"""
        if not KAFKA_AVAILABLE:
            logger.warning("Kafka no disponible para consumidor")
            return False
            
        try:
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                auto_offset_reset='earliest',
                enable_auto_commit=True,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                consumer_timeout_ms=1000,
            )
            logger.info(f"✅ Consumidor conectado a topics: {self.topics}")
            return True
        except Exception as e:
            logger.error(f"❌ Error conectando consumidor: {e}")
            return False
    
    def register_handler(self, topic: KafkaTopic, handler: Callable):
        """Registra un handler para un topic específico"""
        self._handlers[topic.value] = handler
        logger.info(f"📌 Handler registrado para {topic.value}")
    
    def start(self):
        """Inicia el consumo de mensajes"""
        if not self.consumer:
            if not self.connect():
                return
        
        self._running = True
        logger.info("🔄 Iniciando consumo de mensajes...")
        
        while self._running:
            try:
                for message in self.consumer:
                    topic = message.topic
                    if topic in self._handlers:
                        try:
                            self._handlers[topic](message.value)
                        except Exception as e:
                            logger.error(f"Error procesando mensaje de {topic}: {e}")
            except Exception as e:
                if self._running:
                    logger.error(f"Error en bucle de consumo: {e}")
    
    def stop(self):
        """Detiene el consumo de mensajes"""
        self._running = False
        if self.consumer:
            self.consumer.close()
            logger.info("🛑 Consumidor detenido")


# ═══════════════════════════════════════════════════════════════════════════════
# ADMINISTRADOR DE KAFKA
# ═══════════════════════════════════════════════════════════════════════════════

def crear_topics_kafka(bootstrap_servers: str = KAFKA_BOOTSTRAP_SERVERS) -> bool:
    """
    Crea los topics necesarios en Kafka si no existen.
    
    Returns:
        True si se crearon o ya existían todos los topics
    """
    if not KAFKA_AVAILABLE:
        logger.warning("Kafka no disponible, saltando creación de topics")
        return False
    
    try:
        admin_client = KafkaAdminClient(
            bootstrap_servers=bootstrap_servers,
            client_id=f"{KAFKA_CLIENT_ID}-admin"
        )
        
        topics_to_create = [
            NewTopic(
                name=topic.value,
                num_partitions=3,
                replication_factor=1,
                topic_configs={
                    'retention.ms': str(7 * 24 * 60 * 60 * 1000),  # 7 días
                    'cleanup.policy': 'delete',
                }
            )
            for topic in KafkaTopic
        ]
        
        try:
            admin_client.create_topics(new_topics=topics_to_create, validate_only=False)
            logger.info(f"✅ Topics creados: {[t.value for t in KafkaTopic]}")
        except TopicAlreadyExistsError:
            logger.info("Topics ya existen, continuando...")
        
        admin_client.close()
        return True
        
    except NoBrokersAvailable:
        logger.warning(f"⚠️  No se puede conectar a Kafka para crear topics")
        return False
    except Exception as e:
        logger.error(f"❌ Error creando topics: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# INSTANCIA GLOBAL DEL PRODUCTOR
# ═══════════════════════════════════════════════════════════════════════════════

# Productor global para uso en toda la aplicación
_producer: Optional[KafkaEventProducer] = None


def get_kafka_producer() -> KafkaEventProducer:
    """Obtiene o crea el productor global de Kafka"""
    global _producer
    if _producer is None:
        _producer = KafkaEventProducer()
        _producer.connect()
    return _producer


def init_kafka():
    """Inicializa Kafka: crea topics y conecta productor"""
    crear_topics_kafka()
    return get_kafka_producer()
