"""
═══════════════════════════════════════════════════════════════════════════════
COORDINADOR DE REFUERZOS - Integración Predictor + Personal
═══════════════════════════════════════════════════════════════════════════════
Servicio que coordina las predicciones de demanda con el sistema de refuerzos.
Escucha eventos de predicción y genera automáticamente solicitudes de refuerzo.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from datetime import datetime, date
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging
import httpx

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Importación condicional de paho-mqtt
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    logger.warning("⚠️ paho-mqtt no disponible")

from src.infrastructure.kafka import (
    get_kafka_producer, KafkaTopic, 
    MensajePrediccionDemanda, MensajeAlertaSaturacion
)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

MQTT_BROKER = os.getenv("MQTT_BROKER", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
PERSONAL_API_URL = os.getenv("PERSONAL_API_URL", "http://personal-api:8000")

# Topics MQTT que escuchamos
MQTT_TOPICS = [
    "hospital/+/stats",           # Estadísticas en tiempo real
    "hospital/+/prediccion",      # Predicciones del sistema
    "simulador/emergencia",       # Eventos de emergencia
]


# ═══════════════════════════════════════════════════════════════════════════════
# UMBRALES DE ALERTA
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UmbralesAlerta:
    """Umbrales para generar alertas y solicitar refuerzos"""
    saturacion_media: float = 0.70
    saturacion_alta: float = 0.85
    saturacion_critica: float = 0.95
    demanda_alta_factor: float = 1.5  # Factor sobre la media
    tiempo_espera_alerta: int = 45  # minutos
    confianza_minima: float = 0.7  # Confianza mínima para actuar


# ═══════════════════════════════════════════════════════════════════════════════
# COORDINADOR DE REFUERZOS
# ═══════════════════════════════════════════════════════════════════════════════

class CoordinadorRefuerzos:
    """
    Coordina las predicciones de demanda con solicitudes de refuerzo.
    
    Flujo:
    1. Recibe predicciones vía MQTT o Kafka
    2. Evalúa si se necesita refuerzo según umbrales
    3. Llama a la API de personal para crear solicitudes
    4. Publica eventos a Kafka para auditoría
    """
    
    def __init__(self):
        self.umbrales = UmbralesAlerta()
        self.kafka_producer = get_kafka_producer()
        self.mqtt_client: Optional[mqtt.Client] = None
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # Cache de estado por hospital
        self.estado_hospitales: Dict[str, Dict[str, Any]] = {}
        
        # Control de solicitudes para evitar duplicados
        self.solicitudes_recientes: Dict[str, datetime] = {}
        self.cooldown_minutos = 30  # No crear solicitudes duplicadas en 30 min
    
    def iniciar_mqtt(self) -> bool:
        """Inicia la conexión MQTT"""
        if not MQTT_AVAILABLE:
            logger.warning("MQTT no disponible, solo modo Kafka")
            return False
        
        try:
            self.mqtt_client = mqtt.Client(client_id="coordinador-refuerzos")
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_message = self._on_mqtt_message
            
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
            
            logger.info(f"✅ Conectado a MQTT: {MQTT_BROKER}:{MQTT_PORT}")
            return True
        except Exception as e:
            logger.error(f"❌ Error conectando MQTT: {e}")
            return False
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """Callback cuando se conecta a MQTT"""
        if rc == 0:
            logger.info("Conectado a MQTT, suscribiendo a topics...")
            for topic in MQTT_TOPICS:
                client.subscribe(topic)
                logger.info(f"  📥 Suscrito a: {topic}")
        else:
            logger.error(f"Error de conexión MQTT: {rc}")
    
    def _on_mqtt_message(self, client, userdata, msg):
        """Callback cuando llega un mensaje MQTT"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            # Procesar según el tipo de mensaje
            if "stats" in topic:
                hospital_id = topic.split("/")[1]
                asyncio.run(self._procesar_stats(hospital_id, payload))
            elif "prediccion" in topic:
                hospital_id = topic.split("/")[1]
                asyncio.run(self._procesar_prediccion(hospital_id, payload))
            elif "emergencia" in topic:
                asyncio.run(self._procesar_emergencia(payload))
                
        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT: {e}")
    
    async def _procesar_stats(self, hospital_id: str, stats: Dict[str, Any]):
        """Procesa estadísticas en tiempo real de un hospital"""
        # Actualizar cache
        self.estado_hospitales[hospital_id] = {
            "ultima_actualizacion": datetime.now(),
            "stats": stats,
        }
        
        # Evaluar si hay situación de alerta
        saturacion = stats.get("nivel_saturacion", 0)
        tiempo_espera = stats.get("tiempo_medio_espera", 0)
        emergencia = stats.get("emergencia_activa", False)
        
        # Generar alerta si es necesario
        if saturacion >= self.umbrales.saturacion_critica or emergencia:
            await self._generar_alerta_saturacion(
                hospital_id, stats, "critica"
            )
        elif saturacion >= self.umbrales.saturacion_alta:
            await self._generar_alerta_saturacion(
                hospital_id, stats, "alta"
            )
        elif saturacion >= self.umbrales.saturacion_media:
            await self._generar_alerta_saturacion(
                hospital_id, stats, "media"
            )
    
    async def _procesar_prediccion(self, hospital_id: str, prediccion: Dict[str, Any]):
        """
        Procesa una predicción de demanda y evalúa si solicitar refuerzo.
        
        Args:
            hospital_id: ID del hospital
            prediccion: Datos de predicción
        """
        demanda_predicha = prediccion.get("demanda_predicha", 0)
        saturacion_predicha = prediccion.get("saturacion_predicha", 0)
        confianza = prediccion.get("confianza", 0.8)
        horizonte_horas = prediccion.get("horizonte_horas", 4)
        
        logger.info(
            f"📊 Predicción recibida para {hospital_id}: "
            f"demanda={demanda_predicha:.1f}, saturación={saturacion_predicha:.2%}"
        )
        
        # Publicar a Kafka para auditoría
        mensaje_prediccion = MensajePrediccionDemanda(
            hospital_id=hospital_id,
            timestamp=datetime.now().isoformat(),
            demanda_actual=self._obtener_demanda_actual(hospital_id),
            demanda_predicha_1h=demanda_predicha,
            demanda_predicha_6h=demanda_predicha * 1.2,
            demanda_predicha_24h=demanda_predicha * 1.5,
            saturacion_actual=self._obtener_saturacion_actual(hospital_id),
            saturacion_predicha=saturacion_predicha,
            confianza=confianza,
            factores=prediccion.get("factores", {}),
            requiere_accion=saturacion_predicha >= self.umbrales.saturacion_alta,
            prioridad=self._calcular_prioridad(saturacion_predicha),
        )
        self.kafka_producer.publicar_prediccion(mensaje_prediccion)
        
        # Evaluar si solicitar refuerzo
        if confianza < self.umbrales.confianza_minima:
            logger.debug(f"Confianza insuficiente ({confianza:.2%}), no se actúa")
            return
        
        if saturacion_predicha >= self.umbrales.saturacion_media:
            await self._solicitar_refuerzo_si_necesario(
                hospital_id, demanda_predicha, saturacion_predicha, confianza
            )
    
    async def _procesar_emergencia(self, emergencia: Dict[str, Any]):
        """Procesa un evento de emergencia masiva"""
        hospital_id = emergencia.get("hospital_id", "")
        victimas = emergencia.get("victimas_estimadas", 0)
        tipo = emergencia.get("tipo", "desconocido")
        
        logger.warning(
            f"🚨 EMERGENCIA en {hospital_id}: {tipo} - {victimas} víctimas estimadas"
        )
        
        # Solicitar refuerzo inmediato con máxima prioridad
        await self._solicitar_refuerzo_emergencia(hospital_id, victimas)
    
    async def _generar_alerta_saturacion(
        self, 
        hospital_id: str, 
        stats: Dict[str, Any],
        nivel: str
    ):
        """Genera y publica una alerta de saturación"""
        from uuid import uuid4
        
        alerta = MensajeAlertaSaturacion(
            alert_id=str(uuid4()),
            hospital_id=hospital_id,
            timestamp=datetime.now().isoformat(),
            nivel_saturacion=stats.get("nivel_saturacion", 0),
            tipo_alerta=nivel,
            boxes_ocupados=stats.get("boxes_ocupados", 0),
            boxes_totales=stats.get("boxes_totales", 0),
            pacientes_espera=stats.get("pacientes_en_espera_atencion", 0),
            tiempo_espera_medio=stats.get("tiempo_medio_espera", 0),
            accion_recomendada=self._recomendar_accion(nivel, stats),
        )
        
        self.kafka_producer.publicar_alerta_saturacion(alerta)
        logger.info(f"⚠️ Alerta de saturación {nivel} publicada para {hospital_id}")
    
    async def _solicitar_refuerzo_si_necesario(
        self,
        hospital_id: str,
        demanda_predicha: float,
        saturacion_predicha: float,
        confianza: float
    ):
        """
        Evalúa y solicita refuerzo llamando a la API de personal.
        """
        # Verificar cooldown
        clave = f"{hospital_id}_{date.today()}"
        if clave in self.solicitudes_recientes:
            ultima = self.solicitudes_recientes[clave]
            minutos_desde_ultima = (datetime.now() - ultima).seconds / 60
            if minutos_desde_ultima < self.cooldown_minutos:
                logger.debug(
                    f"Cooldown activo para {hospital_id}, "
                    f"faltan {self.cooldown_minutos - minutos_desde_ultima:.0f} min"
                )
                return
        
        try:
            # Llamar a la API de personal para evaluar refuerzo
            response = await self.http_client.post(
                f"{PERSONAL_API_URL}/api/refuerzos/evaluar",
                json={
                    "hospital_id": hospital_id,
                    "demanda_predicha": demanda_predicha,
                    "saturacion_predicha": saturacion_predicha,
                    "confianza": confianza,
                }
            )
            
            if response.status_code == 200:
                resultado = response.json()
                if resultado.get("solicitud_creada"):
                    self.solicitudes_recientes[clave] = datetime.now()
                    logger.info(
                        f"✅ Solicitud de refuerzo creada para {hospital_id}: "
                        f"{resultado.get('solicitud_id')}"
                    )
                else:
                    logger.info(f"ℹ️ {resultado.get('mensaje')}")
            else:
                logger.error(
                    f"Error de API ({response.status_code}): {response.text}"
                )
                
        except Exception as e:
            logger.error(f"Error solicitando refuerzo: {e}")
    
    async def _solicitar_refuerzo_emergencia(
        self,
        hospital_id: str,
        victimas_estimadas: int
    ):
        """Solicita refuerzo de emergencia con máxima prioridad"""
        try:
            # Calcular personal necesario según víctimas
            enfermeros_necesarios = max(2, victimas_estimadas // 5)
            medicos_necesarios = max(1, victimas_estimadas // 10)
            
            # Crear solicitudes para cada rol
            for rol, cantidad in [
                ("enfermero", enfermeros_necesarios),
                ("medico", medicos_necesarios),
            ]:
                response = await self.http_client.post(
                    f"{PERSONAL_API_URL}/api/refuerzos",
                    json={
                        "hospital_id": hospital_id,
                        "fecha_necesidad": date.today().isoformat(),
                        "turno_necesario": self._obtener_turno_actual(),
                        "rol_requerido": rol,
                        "cantidad_personal": cantidad,
                        "prioridad": "critica",
                        "motivo": "emergencia_masiva",
                        "notas": f"Emergencia: {victimas_estimadas} víctimas estimadas",
                    }
                )
                
                if response.status_code == 200:
                    logger.info(
                        f"🚨 Refuerzo de emergencia: {cantidad} {rol}(s) para {hospital_id}"
                    )
                    
        except Exception as e:
            logger.error(f"Error en refuerzo de emergencia: {e}")
    
    def _obtener_demanda_actual(self, hospital_id: str) -> int:
        """Obtiene la demanda actual del cache"""
        if hospital_id in self.estado_hospitales:
            stats = self.estado_hospitales[hospital_id].get("stats", {})
            return stats.get("pacientes_llegados_hora", 0)
        return 0
    
    def _obtener_saturacion_actual(self, hospital_id: str) -> float:
        """Obtiene la saturación actual del cache"""
        if hospital_id in self.estado_hospitales:
            stats = self.estado_hospitales[hospital_id].get("stats", {})
            return stats.get("nivel_saturacion", 0)
        return 0.0
    
    def _calcular_prioridad(self, saturacion: float) -> str:
        """Calcula la prioridad según la saturación"""
        if saturacion >= self.umbrales.saturacion_critica:
            return "critica"
        elif saturacion >= self.umbrales.saturacion_alta:
            return "alta"
        elif saturacion >= self.umbrales.saturacion_media:
            return "media"
        return "baja"
    
    def _obtener_turno_actual(self) -> str:
        """Obtiene el turno actual"""
        hora = datetime.now().hour
        if 7 <= hora < 15:
            return "manana"
        elif 15 <= hora < 23:
            return "tarde"
        return "noche"
    
    def _recomendar_accion(self, nivel: str, stats: Dict[str, Any]) -> str:
        """Recomienda una acción basada en el nivel de alerta"""
        if nivel == "critica":
            return "Activar protocolo de emergencia, solicitar refuerzos inmediatos"
        elif nivel == "alta":
            return "Solicitar refuerzos para el próximo turno, evaluar derivaciones"
        elif nivel == "media":
            return "Monitorizar evolución, preparar plan de contingencia"
        return "Mantener vigilancia"
    
    async def cerrar(self):
        """Cierra las conexiones"""
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        await self.http_client.aclose()
        logger.info("Coordinador cerrado")


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON
# ═══════════════════════════════════════════════════════════════════════════════

_coordinador: Optional[CoordinadorRefuerzos] = None


def get_coordinador() -> CoordinadorRefuerzos:
    """Obtiene o crea el coordinador singleton"""
    global _coordinador
    if _coordinador is None:
        _coordinador = CoordinadorRefuerzos()
    return _coordinador


def iniciar_coordinador():
    """Inicia el coordinador de refuerzos"""
    coordinador = get_coordinador()
    coordinador.iniciar_mqtt()
    return coordinador
