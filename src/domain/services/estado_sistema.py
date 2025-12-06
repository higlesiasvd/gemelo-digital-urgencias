"""
═══════════════════════════════════════════════════════════════════════════════
ESTADO DEL SISTEMA - Servicio Unificado para UI
═══════════════════════════════════════════════════════════════════════════════
Servicio que centraliza el estado del sistema y lo expone para la UI.
Consume datos del simulador v2 y los transforma al formato esperado por el frontend.
═══════════════════════════════════════════════════════════════════════════════
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Callable
from enum import Enum
import threading
import time

import paho.mqtt.client as mqtt

from src.infrastructure.external_services import (
    WeatherService, HolidaysService, EventsService, FootballService
)


# ═══════════════════════════════════════════════════════════════════════════════
# TIPOS PARA LA UI
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EstadoHospitalUI:
    """Estado de un hospital para la UI (formato compatible con frontend)"""
    hospital_id: str
    nombre: str
    # Ocupación
    ocupacion_boxes: float
    ocupacion_observacion: float
    boxes_ocupados: int
    boxes_totales: int
    observacion_ocupadas: int
    observacion_totales: int
    # Colas
    pacientes_en_espera_triaje: int
    pacientes_en_espera_atencion: int
    # Tiempos
    tiempo_medio_espera: float
    tiempo_medio_atencion: float
    tiempo_medio_total: float
    # Contadores
    pacientes_llegados_hora: int
    pacientes_atendidos_hora: int
    pacientes_derivados: int
    # Estado
    nivel_saturacion: float
    emergencia_activa: bool
    timestamp: float
    
    def to_dict(self) -> dict:
        return {
            "hospital_id": self.hospital_id,
            "nombre": self.nombre,
            "ocupacion_boxes": round(self.ocupacion_boxes, 2),
            "ocupacion_observacion": round(self.ocupacion_observacion, 2),
            "boxes_ocupados": self.boxes_ocupados,
            "boxes_totales": self.boxes_totales,
            "observacion_ocupadas": self.observacion_ocupadas,
            "observacion_totales": self.observacion_totales,
            "pacientes_en_espera_triaje": self.pacientes_en_espera_triaje,
            "pacientes_en_espera_atencion": self.pacientes_en_espera_atencion,
            "tiempo_medio_espera": round(self.tiempo_medio_espera, 1),
            "tiempo_medio_atencion": round(self.tiempo_medio_atencion, 1),
            "tiempo_medio_total": round(self.tiempo_medio_total, 1),
            "pacientes_llegados_hora": self.pacientes_llegados_hora,
            "pacientes_atendidos_hora": self.pacientes_atendidos_hora,
            "pacientes_derivados": self.pacientes_derivados,
            "nivel_saturacion": round(self.nivel_saturacion, 2),
            "emergencia_activa": self.emergencia_activa,
            "timestamp": self.timestamp,
        }


@dataclass
class DerivacionUI:
    """Derivación para visualización en UI"""
    id: int
    timestamp: float
    paciente_id: int
    nivel_triaje: int
    triaje_nombre: str
    triaje_color: str
    hospital_origen: str
    hospital_destino: str
    motivo: str
    estado: str = "en_curso"  # en_curso, completada
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "paciente_id": self.paciente_id,
            "nivel_triaje": self.nivel_triaje,
            "triaje_nombre": self.triaje_nombre,
            "triaje_color": self.triaje_color,
            "hospital_origen": self.hospital_origen,
            "hospital_destino": self.hospital_destino,
            "motivo": self.motivo,
            "estado": self.estado,
        }


@dataclass
class IncidenteUI:
    """Incidente para visualización en UI"""
    id: int
    tipo: str
    descripcion: str
    hospital_id: str
    timestamp: float
    pacientes_generados: int
    nivel_predominante: int
    nivel_nombre: str
    activo: bool = True
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "tipo": self.tipo,
            "descripcion": self.descripcion,
            "hospital_id": self.hospital_id,
            "timestamp": self.timestamp,
            "pacientes_generados": self.pacientes_generados,
            "nivel_predominante": self.nivel_predominante,
            "nivel_nombre": self.nivel_nombre,
            "activo": self.activo,
        }


@dataclass
class ContextoExternoUI:
    """Contexto externo (clima, eventos) para UI"""
    temperatura: float
    condicion_climatica: str
    esta_lloviendo: bool
    es_festivo: bool
    es_fin_de_semana: bool
    factor_eventos: float
    factor_festivos: float
    eventos_proximos: List[str] = field(default_factory=list)
    partido_proximo: bool = False
    
    def to_dict(self) -> dict:
        return {
            "temperatura": self.temperatura,
            "condicion_climatica": self.condicion_climatica,
            "esta_lloviendo": self.esta_lloviendo,
            "es_festivo": self.es_festivo,
            "es_fin_de_semana": self.es_fin_de_semana,
            "factor_eventos": round(self.factor_eventos, 2),
            "factor_festivos": round(self.factor_festivos, 2),
            "eventos_proximos": self.eventos_proximos,
            "partido_proximo": self.partido_proximo,
        }


@dataclass
class EstadoSistemaUI:
    """Estado completo del sistema para UI"""
    hospitales: Dict[str, EstadoHospitalUI]
    derivaciones_activas: List[DerivacionUI]
    derivaciones_recientes: List[DerivacionUI]
    incidentes_activos: List[IncidenteUI]
    contexto: Optional[ContextoExternoUI]
    alerta_sistema: bool
    timestamp: float
    
    def to_dict(self) -> dict:
        return {
            "hospitales": {k: v.to_dict() for k, v in self.hospitales.items()},
            "derivaciones_activas": [d.to_dict() for d in self.derivaciones_activas],
            "derivaciones_recientes": [d.to_dict() for d in self.derivaciones_recientes[-10:]],
            "incidentes_activos": [i.to_dict() for i in self.incidentes_activos],
            "contexto": self.contexto.to_dict() if self.contexto else None,
            "alerta_sistema": self.alerta_sistema,
            "timestamp": self.timestamp,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE HOSPITALES (para nombres)
# ═══════════════════════════════════════════════════════════════════════════════

NOMBRES_HOSPITALES = {
    "chuac": "CHUAC - Hospital Universitario",
    "modelo": "Hospital Modelo HM",
    "san_rafael": "Hospital San Rafael",
}

TRIAJE_CONFIG = {
    1: {"nombre": "Resucitación", "color": "#dc2626"},
    2: {"nombre": "Emergencia", "color": "#ea580c"},
    3: {"nombre": "Urgente", "color": "#ca8a04"},
    4: {"nombre": "Menos urgente", "color": "#16a34a"},
    5: {"nombre": "No urgente", "color": "#2563eb"},
}


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLICADOR MQTT PARA UI
# ═══════════════════════════════════════════════════════════════════════════════

class PublicadorEstadoUI:
    """
    Publica el estado del sistema a MQTT para que el frontend lo consuma.
    Transforma los datos del simulador v2 al formato esperado por la UI.
    """
    
    def __init__(
        self,
        mqtt_broker: str = "localhost",
        mqtt_port: int = 1883,
    ):
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.mqtt_client: Optional[mqtt.Client] = None
        
        # Estado actual
        self.hospitales: Dict[str, EstadoHospitalUI] = {}
        self.derivaciones: List[DerivacionUI] = []
        self.incidentes: List[IncidenteUI] = []
        self.contexto: Optional[ContextoExternoUI] = None
        self.alerta_sistema: bool = False
        
        # Servicios externos
        self.weather_service = WeatherService()
        self.holidays_service = HolidaysService()
        self.events_service = EventsService()
        self.football_service = FootballService()
        
        # Contador de derivaciones
        self.derivacion_counter = 0
        
        # Conectar MQTT
        self._conectar_mqtt()
    
    def _conectar_mqtt(self):
        """Conecta al broker MQTT"""
        try:
            self.mqtt_client = mqtt.Client(
                client_id=f"estado-ui-{int(time.time())}"
            )
            self.mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
            print(f"📡 Publicador UI conectado a MQTT {self.mqtt_broker}:{self.mqtt_port}")
        except Exception as e:
            print(f"⚠️ Error conectando a MQTT: {e}")
            self.mqtt_client = None
    
    def actualizar_hospital(
        self,
        hospital_id: str,
        estado_simulador: dict,
    ):
        """
        Actualiza el estado de un hospital desde el simulador v2.
        
        Args:
            hospital_id: ID del hospital
            estado_simulador: Diccionario con estado del simulador
        """
        estado = EstadoHospitalUI(
            hospital_id=hospital_id,
            nombre=NOMBRES_HOSPITALES.get(hospital_id, hospital_id),
            ocupacion_boxes=estado_simulador.get("ocupacion_boxes", 0),
            ocupacion_observacion=estado_simulador.get("observacion_ocupadas", 0) / 
                                  max(estado_simulador.get("observacion_total", 1), 1),
            boxes_ocupados=estado_simulador.get("boxes_ocupados", 0),
            boxes_totales=estado_simulador.get("boxes_total", 0),
            observacion_ocupadas=estado_simulador.get("observacion_ocupadas", 0),
            observacion_totales=estado_simulador.get("observacion_total", 0),
            pacientes_en_espera_triaje=estado_simulador.get("en_sala_espera", 0),
            pacientes_en_espera_atencion=sum(
                estado_simulador.get("cola_por_nivel", {}).values()
            ),
            tiempo_medio_espera=estado_simulador.get("tiempo_espera_medio", 0),
            tiempo_medio_atencion=15,  # Estimado
            tiempo_medio_total=estado_simulador.get("tiempo_espera_medio", 0) + 20,
            pacientes_llegados_hora=estado_simulador.get("pacientes_hora", 0),
            pacientes_atendidos_hora=estado_simulador.get("pacientes_hora", 0),
            pacientes_derivados=estado_simulador.get("derivaciones_enviadas", 0),
            nivel_saturacion=estado_simulador.get("saturacion", 0),
            emergencia_activa=estado_simulador.get("alerta_activa", False),
            timestamp=estado_simulador.get("timestamp", time.time()),
        )
        
        self.hospitales[hospital_id] = estado
        self._publicar_hospital(hospital_id, estado)
    
    def registrar_derivacion(
        self,
        paciente_id: int,
        nivel_triaje: int,
        hospital_origen: str,
        hospital_destino: str,
        motivo: str,
        timestamp: float,
    ):
        """Registra una nueva derivación"""
        self.derivacion_counter += 1
        
        triaje_info = TRIAJE_CONFIG.get(nivel_triaje, {"nombre": "?", "color": "#666"})
        
        derivacion = DerivacionUI(
            id=self.derivacion_counter,
            timestamp=timestamp,
            paciente_id=paciente_id,
            nivel_triaje=nivel_triaje,
            triaje_nombre=triaje_info["nombre"],
            triaje_color=triaje_info["color"],
            hospital_origen=hospital_origen,
            hospital_destino=hospital_destino,
            motivo=motivo,
        )
        
        self.derivaciones.append(derivacion)
        self._publicar_derivacion(derivacion)
        
        # Limpiar derivaciones antiguas (más de 100)
        if len(self.derivaciones) > 100:
            self.derivaciones = self.derivaciones[-100:]
    
    def registrar_incidente(
        self,
        incidente_id: int,
        tipo: str,
        descripcion: str,
        hospital_id: str,
        timestamp: float,
        pacientes_generados: int,
        nivel_predominante: int,
    ):
        """Registra un nuevo incidente"""
        nivel_info = TRIAJE_CONFIG.get(nivel_predominante, {"nombre": "?"})
        
        incidente = IncidenteUI(
            id=incidente_id,
            tipo=tipo,
            descripcion=descripcion,
            hospital_id=hospital_id,
            timestamp=timestamp,
            pacientes_generados=pacientes_generados,
            nivel_predominante=nivel_predominante,
            nivel_nombre=nivel_info["nombre"],
        )
        
        self.incidentes.append(incidente)
        self._publicar_incidente(incidente)
    
    def actualizar_contexto(self):
        """Actualiza el contexto externo (clima, eventos, etc.)"""
        from datetime import date
        
        try:
            # Clima
            clima = self.weather_service.obtener_clima()
            temperatura = clima.temperatura if clima else 15.0
            esta_lloviendo = clima.esta_lloviendo() if clima else False
            condicion = clima.descripcion if clima else "Despejado"
            
            # Festivos
            hoy = date.today()
            es_festivo = self.holidays_service.es_festivo(hoy)
            es_fin_de_semana = hoy.weekday() >= 5
            
            # Eventos
            eventos = self.events_service.obtener_eventos_fecha(hoy)
            eventos_nombres = [e.nombre for e in eventos[:3]] if eventos else []
            
            # Partidos
            partidos = self.football_service.obtener_proximos_partidos(dias=1)
            partido_proximo = len(partidos) > 0 if partidos else False
            
            # Calcular factores
            factor_eventos = 1.0 + (0.15 * len(eventos_nombres))
            factor_festivos = 1.25 if es_festivo else (1.1 if es_fin_de_semana else 1.0)
            
            self.contexto = ContextoExternoUI(
                temperatura=temperatura,
                condicion_climatica=condicion,
                esta_lloviendo=esta_lloviendo,
                es_festivo=es_festivo,
                es_fin_de_semana=es_fin_de_semana,
                factor_eventos=factor_eventos,
                factor_festivos=factor_festivos,
                eventos_proximos=eventos_nombres,
                partido_proximo=partido_proximo,
            )
            
            self._publicar_contexto()
            
        except Exception as e:
            print(f"⚠️ Error actualizando contexto: {e}")
    
    def obtener_estado_completo(self) -> EstadoSistemaUI:
        """Obtiene el estado completo del sistema"""
        derivaciones_activas = [
            d for d in self.derivaciones 
            if d.estado == "en_curso"
        ]
        
        incidentes_activos = [
            i for i in self.incidentes 
            if i.activo
        ]
        
        return EstadoSistemaUI(
            hospitales=self.hospitales,
            derivaciones_activas=derivaciones_activas,
            derivaciones_recientes=self.derivaciones[-10:],
            incidentes_activos=incidentes_activos,
            contexto=self.contexto,
            alerta_sistema=self.alerta_sistema,
            timestamp=time.time(),
        )
    
    def _publicar_hospital(self, hospital_id: str, estado: EstadoHospitalUI):
        """Publica estado de hospital a MQTT"""
        if self.mqtt_client:
            topic = f"hospital/{hospital_id}/stats"
            self.mqtt_client.publish(topic, json.dumps(estado.to_dict()))
    
    def _publicar_derivacion(self, derivacion: DerivacionUI):
        """Publica derivación a MQTT"""
        if self.mqtt_client:
            topic = "hospital/derivaciones"
            self.mqtt_client.publish(topic, json.dumps(derivacion.to_dict()))
            
            # También publicar a topic específico por hospital
            topic_origen = f"hospital/{derivacion.hospital_origen}/derivacion_saliente"
            topic_destino = f"hospital/{derivacion.hospital_destino}/derivacion_entrante"
            self.mqtt_client.publish(topic_origen, json.dumps(derivacion.to_dict()))
            self.mqtt_client.publish(topic_destino, json.dumps(derivacion.to_dict()))
    
    def _publicar_incidente(self, incidente: IncidenteUI):
        """Publica incidente a MQTT"""
        if self.mqtt_client:
            topic = "hospital/incidentes"
            self.mqtt_client.publish(topic, json.dumps(incidente.to_dict()))
    
    def _publicar_contexto(self):
        """Publica contexto externo a MQTT"""
        if self.mqtt_client and self.contexto:
            topic = "sistema/contexto"
            self.mqtt_client.publish(topic, json.dumps(self.contexto.to_dict()))
    
    def publicar_estado_completo(self):
        """Publica el estado completo del sistema"""
        if self.mqtt_client:
            estado = self.obtener_estado_completo()
            topic = "sistema/estado"
            self.mqtt_client.publish(topic, json.dumps(estado.to_dict()))


# ═══════════════════════════════════════════════════════════════════════════════
# ADAPTADOR PARA SIMULADOR V2
# ═══════════════════════════════════════════════════════════════════════════════

class AdaptadorSimuladorUI:
    """
    Adaptador que conecta el simulador v2 con el publicador de UI.
    Escucha eventos del simulador y los transforma para la UI.
    """
    
    def __init__(
        self,
        publicador: PublicadorEstadoUI,
    ):
        self.publicador = publicador
    
    def on_estado_hospital(self, hospital_id: str, estado: dict):
        """Callback cuando cambia el estado de un hospital"""
        self.publicador.actualizar_hospital(hospital_id, estado)
    
    def on_derivacion(self, derivacion: dict):
        """Callback cuando ocurre una derivación"""
        self.publicador.registrar_derivacion(
            paciente_id=derivacion.get("paciente_id", 0),
            nivel_triaje=derivacion.get("nivel_triaje", 4),
            hospital_origen=derivacion.get("origen", ""),
            hospital_destino=derivacion.get("destino", ""),
            motivo=derivacion.get("motivo", ""),
            timestamp=derivacion.get("timestamp", time.time()),
        )
    
    def on_incidente(self, incidente: dict):
        """Callback cuando ocurre un incidente"""
        self.publicador.registrar_incidente(
            incidente_id=incidente.get("id", 0),
            tipo=incidente.get("tipo", ""),
            descripcion=incidente.get("descripcion", ""),
            hospital_id=incidente.get("hospital_id", ""),
            timestamp=incidente.get("timestamp", time.time()),
            pacientes_generados=incidente.get("pacientes_generados", 0),
            nivel_predominante=incidente.get("nivel_predominante", 4),
        )
