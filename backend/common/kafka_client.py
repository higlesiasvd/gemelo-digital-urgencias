"""
============================================================================
CLIENTE KAFKA REUTILIZABLE
============================================================================
Proporciona productor y consumidor de Kafka con serialización automática
usando los esquemas definidos en schemas.py
============================================================================
"""

import json
import asyncio
from typing import Callable, Dict, List, Optional, Any
from datetime import datetime
from confluent_kafka import Producer, Consumer, KafkaError, KafkaException
from confluent_kafka.admin import AdminClient, NewTopic
import logging

from .config import settings
from .schemas import KAFKA_TOPICS, validate_event, BaseModel

logger = logging.getLogger(__name__)


class DateTimeEncoder(json.JSONEncoder):
    """Encoder JSON que maneja datetime"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class KafkaClient:
    """Cliente Kafka unificado para productor y consumidor"""

    def __init__(
        self,
        bootstrap_servers: str = None,
        group_id: str = None,
        client_id: str = "gemelo-digital"
    ):
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.group_id = group_id or settings.KAFKA_GROUP_ID
        self.client_id = client_id

        self._producer: Optional[Producer] = None
        self._consumer: Optional[Consumer] = None
        self._admin: Optional[AdminClient] = None
        self._running = False

    # ========================================================================
    # ADMIN
    # ========================================================================

    def get_admin(self) -> AdminClient:
        """Obtiene cliente de administracion"""
        if self._admin is None:
            self._admin = AdminClient({
                'bootstrap.servers': self.bootstrap_servers
            })
        return self._admin

    def create_topics(self, topics: List[str] = None, num_partitions: int = 1, replication_factor: int = 1):
        """Crea topics si no existen"""
        if topics is None:
            topics = list(KAFKA_TOPICS.keys())

        admin = self.get_admin()
        existing_topics = admin.list_topics(timeout=10).topics.keys()

        new_topics = [
            NewTopic(topic, num_partitions=num_partitions, replication_factor=replication_factor)
            for topic in topics if topic not in existing_topics
        ]

        if new_topics:
            futures = admin.create_topics(new_topics)
            for topic, future in futures.items():
                try:
                    future.result()
                    logger.info(f"Topic creado: {topic}")
                except Exception as e:
                    logger.warning(f"Error creando topic {topic}: {e}")

    # ========================================================================
    # PRODUCTOR
    # ========================================================================

    def get_producer(self) -> Producer:
        """Obtiene o crea el productor"""
        if self._producer is None:
            self._producer = Producer({
                'bootstrap.servers': self.bootstrap_servers,
                'client.id': f"{self.client_id}-producer",
                'acks': 'all',
                'retries': 3,
                'retry.backoff.ms': 1000,
            })
        return self._producer

    def _delivery_callback(self, err, msg):
        """Callback de confirmacion de envio"""
        if err:
            logger.error(f"Error enviando mensaje a {msg.topic()}: {err}")
        else:
            logger.debug(f"Mensaje enviado a {msg.topic()} [{msg.partition()}] @ {msg.offset()}")

    def produce(self, topic: str, data: dict | BaseModel, key: str = None, validate: bool = True):
        """
        Produce un mensaje a un topic de Kafka.

        Args:
            topic: Nombre del topic
            data: Datos a enviar (dict o Pydantic model)
            key: Clave del mensaje (opcional)
            validate: Si True, valida el esquema antes de enviar
        """
        producer = self.get_producer()

        # Convertir Pydantic model a dict si es necesario
        if isinstance(data, BaseModel):
            data = data.model_dump()

        # Validar esquema si está habilitado
        if validate and topic in KAFKA_TOPICS:
            try:
                validate_event(topic, data)
            except Exception as e:
                logger.error(f"Error de validacion en topic {topic}: {e}")
                raise ValueError(f"Datos invalidos para topic {topic}: {e}")

        # Serializar a JSON
        value = json.dumps(data, cls=DateTimeEncoder).encode('utf-8')
        key_bytes = key.encode('utf-8') if key else None

        # Enviar
        producer.produce(
            topic=topic,
            value=value,
            key=key_bytes,
            callback=self._delivery_callback
        )

        # Flush para envío inmediato (puede ajustarse para batching)
        producer.poll(0)

    def flush(self, timeout: float = 10.0):
        """Espera a que todos los mensajes pendientes se envíen"""
        if self._producer:
            self._producer.flush(timeout)

    # ========================================================================
    # CONSUMIDOR
    # ========================================================================

    def get_consumer(self, topics: List[str] = None) -> Consumer:
        """Obtiene o crea el consumidor"""
        if self._consumer is None:
            self._consumer = Consumer({
                'bootstrap.servers': self.bootstrap_servers,
                'group.id': self.group_id,
                'client.id': f"{self.client_id}-consumer",
                'auto.offset.reset': 'latest',
                'enable.auto.commit': True,
                'auto.commit.interval.ms': 5000,
            })

            if topics:
                self._consumer.subscribe(topics)
                logger.info(f"Suscrito a topics: {topics}")

        return self._consumer

    def subscribe(self, topics: List[str]):
        """Suscribe el consumidor a topics"""
        consumer = self.get_consumer()
        consumer.subscribe(topics)
        logger.info(f"Suscrito a topics: {topics}")

    def consume_one(self, timeout: float = 1.0) -> Optional[Dict[str, Any]]:
        """
        Consume un mensaje.

        Returns:
            Dict con 'topic', 'key', 'value', 'partition', 'offset' o None
        """
        consumer = self.get_consumer()
        msg = consumer.poll(timeout)

        if msg is None:
            return None

        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                return None
            raise KafkaException(msg.error())

        try:
            value = json.loads(msg.value().decode('utf-8'))
        except json.JSONDecodeError:
            value = msg.value().decode('utf-8')

        return {
            'topic': msg.topic(),
            'key': msg.key().decode('utf-8') if msg.key() else None,
            'value': value,
            'partition': msg.partition(),
            'offset': msg.offset(),
            'timestamp': msg.timestamp()
        }

    async def consume_async(
        self,
        topics: List[str],
        handler: Callable[[str, dict], None],
        validate: bool = True
    ):
        """
        Consume mensajes de forma asíncrona.

        Args:
            topics: Lista de topics a consumir
            handler: Función que procesa cada mensaje (topic, data)
            validate: Si True, valida el esquema de cada mensaje
        """
        self.subscribe(topics)
        self._running = True

        logger.info(f"Iniciando consumo asincrono de: {topics}")

        while self._running:
            try:
                msg = self.consume_one(timeout=0.1)

                if msg:
                    topic = msg['topic']
                    data = msg['value']

                    # Validar si es necesario
                    if validate and topic in KAFKA_TOPICS:
                        try:
                            data = validate_event(topic, data)
                            data = data.model_dump()
                        except Exception as e:
                            logger.warning(f"Mensaje invalido en {topic}: {e}")
                            continue

                    # Procesar mensaje
                    try:
                        await asyncio.get_event_loop().run_in_executor(
                            None, handler, topic, data
                        )
                    except Exception as e:
                        logger.error(f"Error procesando mensaje de {topic}: {e}")

                else:
                    # Sin mensajes, esperar un poco
                    await asyncio.sleep(0.01)

            except Exception as e:
                logger.error(f"Error en consumo: {e}")
                await asyncio.sleep(1)

    def stop(self):
        """Detiene el consumo"""
        self._running = False

    # ========================================================================
    # LIMPIEZA
    # ========================================================================

    def close(self):
        """Cierra todas las conexiones"""
        if self._producer:
            self._producer.flush()
            self._producer = None

        if self._consumer:
            self._consumer.close()
            self._consumer = None

        if self._admin:
            self._admin = None

        logger.info("Cliente Kafka cerrado")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

def create_all_topics():
    """Crea todos los topics definidos en schemas.py"""
    with KafkaClient() as client:
        client.create_topics()
        logger.info(f"Topics creados: {list(KAFKA_TOPICS.keys())}")


def send_event(topic: str, data: dict | BaseModel, key: str = None):
    """Envía un evento a Kafka (función de conveniencia)"""
    with KafkaClient() as client:
        client.produce(topic, data, key)
        client.flush()
