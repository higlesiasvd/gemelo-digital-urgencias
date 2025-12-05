"""
═══════════════════════════════════════════════════════════════════════════════
GEMELO DIGITAL - URGENCIAS HOSPITALARIAS A CORUÑA
═══════════════════════════════════════════════════════════════════════════════
Simulador de eventos discretos para urgencias hospitalarias usando SimPy.

Autor: Proyecto Gemelos Digitales
Versión: 2.0 - Día 2 (3 hospitales + coordinador)
═══════════════════════════════════════════════════════════════════════════════
"""

import simpy
import random
import json
import time
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt
from collections import defaultdict
import threading
import os

# Servicios externos y generador de pacientes
from infrastructure.external_services import WeatherService, HolidaysService, EventsService, FootballService
from domain.services.generador_pacientes import GeneradorPacientes
from config.hospital_config import NivelTriaje, CONFIG_TRIAJE, PATOLOGIAS as PATOLOGIAS_CONFIG


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN Y CONSTANTES
# ═══════════════════════════════════════════════════════════════════════════════

# Nota: Ahora usamos NivelTriaje y CONFIG_TRIAJE de config.hospital_config


@dataclass
class ConfigTriaje:
    """Configuración por nivel de triaje"""
    nombre: str
    color: str
    tiempo_max_espera: int  # minutos
    probabilidad: float     # % de pacientes
    tiempo_atencion_min: int  # minutos
    tiempo_atencion_max: int  # minutos
    prob_observacion: float   # probabilidad de pasar a observación
    prob_ingreso: float       # probabilidad de ingreso hospitalario


# Configuración basada en datos reales de España
CONFIG_TRIAJE = {
    NivelTriaje.ROJO: ConfigTriaje(
        nombre="Resucitación", color="rojo",
        tiempo_max_espera=0, probabilidad=0.001,
        tiempo_atencion_min=60, tiempo_atencion_max=120,
        prob_observacion=0.9, prob_ingreso=0.7
    ),
    NivelTriaje.NARANJA: ConfigTriaje(
        nombre="Emergencia", color="naranja",
        tiempo_max_espera=10, probabilidad=0.083,
        tiempo_atencion_min=45, tiempo_atencion_max=90,
        prob_observacion=0.6, prob_ingreso=0.4
    ),
    NivelTriaje.AMARILLO: ConfigTriaje(
        nombre="Urgente", color="amarillo",
        tiempo_max_espera=60, probabilidad=0.179,
        tiempo_atencion_min=30, tiempo_atencion_max=60,
        prob_observacion=0.3, prob_ingreso=0.15
    ),
    NivelTriaje.VERDE: ConfigTriaje(
        nombre="Menos urgente", color="verde",
        tiempo_max_espera=120, probabilidad=0.627,
        tiempo_atencion_min=15, tiempo_atencion_max=30,
        prob_observacion=0.05, prob_ingreso=0.02
    ),
    NivelTriaje.AZUL: ConfigTriaje(
        nombre="No urgente", color="azul",
        tiempo_max_espera=240, probabilidad=0.11,
        tiempo_atencion_min=10, tiempo_atencion_max=20,
        prob_observacion=0.01, prob_ingreso=0.005
    ),
}


# Patologías por nivel de triaje
PATOLOGIAS = {
    NivelTriaje.ROJO: [
        "PCR", "Politrauma grave", "Shock séptico", 
        "Hemorragia masiva", "Parada respiratoria"
    ],
    NivelTriaje.NARANJA: [
        "IAM", "Ictus", "Trauma moderado", "Disnea severa",
        "Dolor torácico con signos de alarma", "Intoxicación grave"
    ],
    NivelTriaje.AMARILLO: [
        "Dolor torácico", "Fractura", "Fiebre alta", "Dolor abdominal agudo",
        "Crisis asmática", "Cefalea intensa", "Herida profunda"
    ],
    NivelTriaje.VERDE: [
        "Contusión", "Herida menor", "Infección urinaria", "Gastroenteritis",
        "Lumbalgia", "Esguince", "Otitis", "Faringitis"
    ],
    NivelTriaje.AZUL: [
        "Receta médica", "Certificado", "Molestias crónicas",
        "Revisión de herida", "Retirada de puntos", "Consulta administrativa"
    ],
}


@dataclass
class ConfigHospital:
    """Configuración de un hospital"""
    id: str
    nombre: str
    num_boxes: int
    num_camas_observacion: int
    pacientes_dia_base: int  # Media de pacientes por día
    lat: float  # Latitud para el mapa
    lon: float  # Longitud para el mapa


# Hospitales de A Coruña - Configurados para colas realistas (30-60 min)
HOSPITALES = {
    "chuac": ConfigHospital(
        id="chuac",
        nombre="CHUAC - Complexo Hospitalario Universitario A Coruña",
        num_boxes=40,
        num_camas_observacion=30,
        pacientes_dia_base=720,  # Aumentado para colas de 30-60 min (era 420)
        lat=43.3487,
        lon=-8.4066
    ),
    "hm_modelo": ConfigHospital(
        id="hm_modelo",
        nombre="HM Modelo",
        num_boxes=15,
        num_camas_observacion=10,
        pacientes_dia_base=240,  # Aumentado para colas (era 120)
        lat=43.3623,
        lon=-8.4115
    ),
    "san_rafael": ConfigHospital(
        id="san_rafael",
        nombre="Hospital San Rafael",
        num_boxes=12,
        num_camas_observacion=8,
        pacientes_dia_base=180,  # Aumentado para colas (era 80)
        lat=43.3571,
        lon=-8.4189
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO DE PACIENTE
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Paciente:
    """Representa un paciente en urgencias"""
    id: int
    hospital_id: str
    nivel_triaje: NivelTriaje
    patologia: str
    hora_llegada: float
    edad: int = 0  # Edad del paciente (se genera aleatoriamente)
    hora_triaje: Optional[float] = None
    hora_inicio_atencion: Optional[float] = None
    hora_fin_atencion: Optional[float] = None
    hora_entrada_observacion: Optional[float] = None
    hora_salida: Optional[float] = None
    destino: str = "alta"  # alta, ingreso, derivado
    derivado_a: Optional[str] = None
    
    @property
    def tiempo_espera_triaje(self) -> Optional[float]:
        if self.hora_triaje:
            return self.hora_triaje - self.hora_llegada
        return None
    
    @property
    def tiempo_espera_atencion(self) -> Optional[float]:
        if self.hora_inicio_atencion and self.hora_triaje:
            return self.hora_inicio_atencion - self.hora_triaje
        return None
    
    @property
    def tiempo_total(self) -> Optional[float]:
        if self.hora_salida:
            return self.hora_salida - self.hora_llegada
        return None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "nivel_triaje": self.nivel_triaje.value,
            "nivel_triaje_nombre": CONFIG_TRIAJE[self.nivel_triaje].nombre,
            "nivel_triaje_color": CONFIG_TRIAJE[self.nivel_triaje].color,
            "patologia": self.patologia,
            "hora_llegada": self.hora_llegada,
            "hora_triaje": self.hora_triaje,
            "hora_inicio_atencion": self.hora_inicio_atencion,
            "hora_fin_atencion": self.hora_fin_atencion,
            "hora_entrada_observacion": self.hora_entrada_observacion,
            "hora_salida": self.hora_salida,
            "destino": self.destino,
            "tiempo_espera_triaje": self.tiempo_espera_triaje,
            "tiempo_espera_atencion": self.tiempo_espera_atencion,
            "tiempo_total": self.tiempo_total,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ESTADÍSTICAS DEL HOSPITAL
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EstadisticasHospital:
    """Estadísticas en tiempo real del hospital"""
    hospital_id: str
    timestamp: float
    
    # Ocupación actual
    boxes_ocupados: int = 0
    boxes_totales: int = 0
    observacion_ocupadas: int = 0
    observacion_totales: int = 0
    
    # Colas
    pacientes_en_espera_triaje: int = 0
    pacientes_en_espera_atencion: int = 0
    pacientes_en_espera_por_nivel: Dict[int, int] = field(default_factory=dict)
    
    # Tiempos medios (últimos 30 min)
    tiempo_medio_espera: float = 0.0
    tiempo_medio_atencion: float = 0.0
    tiempo_medio_total: float = 0.0
    
    # Contadores
    pacientes_atendidos_hora: int = 0
    pacientes_llegados_hora: int = 0
    pacientes_derivados: int = 0
    
    # Alertas
    nivel_saturacion: float = 0.0  # 0-1
    emergencia_activa: bool = False
    
    def to_dict(self) -> dict:
        return {
            "hospital_id": self.hospital_id,
            "timestamp": self.timestamp,
            "boxes_ocupados": self.boxes_ocupados,
            "boxes_totales": self.boxes_totales,
            "ocupacion_boxes": self.boxes_ocupados / self.boxes_totales if self.boxes_totales > 0 else 0,
            "observacion_ocupadas": self.observacion_ocupadas,
            "observacion_totales": self.observacion_totales,
            "ocupacion_observacion": self.observacion_ocupadas / self.observacion_totales if self.observacion_totales > 0 else 0,
            "pacientes_en_espera_triaje": self.pacientes_en_espera_triaje,
            "pacientes_en_espera_atencion": self.pacientes_en_espera_atencion,
            "pacientes_en_espera_por_nivel": self.pacientes_en_espera_por_nivel,
            "tiempo_medio_espera": self.tiempo_medio_espera,
            "tiempo_medio_atencion": self.tiempo_medio_atencion,
            "tiempo_medio_total": self.tiempo_medio_total,
            "pacientes_atendidos_hora": self.pacientes_atendidos_hora,
            "pacientes_llegados_hora": self.pacientes_llegados_hora,
            "pacientes_derivados": self.pacientes_derivados,
            "nivel_saturacion": self.nivel_saturacion,
            "emergencia_activa": self.emergencia_activa,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SIMULADOR DE HOSPITAL
# ═══════════════════════════════════════════════════════════════════════════════

class HospitalUrgencias:
    """
    Simula el servicio de urgencias de un hospital.
    
    Flujo del paciente:
    1. Llegada → 2. Triaje → 3. Espera → 4. Box atención → 
    5. (Opcional) Observación → 6. Alta/Ingreso
    """
    
    def __init__(self, env: simpy.Environment, config: ConfigHospital, mqtt_client: Optional[mqtt.Client] = None,
                 weather_service=None, holidays_service=None, events_service=None):
        self.env = env
        self.config = config
        self.mqtt_client = mqtt_client
        self.coordinador = None  # Se asigna desde SimuladorUrgencias si hay múltiples hospitales

        # Generador de pacientes con datos realistas
        self.generador_pacientes = GeneradorPacientes(
            weather_service=weather_service,
            holidays_service=holidays_service,
            events_service=events_service,
            seed=None  # Usar seed aleatorio para cada hospital
        )

        # Recursos SimPy
        self.triaje = simpy.Resource(env, capacity=2)  # 2 puestos de triaje
        self.boxes = simpy.PriorityResource(env, capacity=config.num_boxes)
        self.observacion = simpy.Resource(env, capacity=config.num_camas_observacion)
        
        # Estado
        self.paciente_counter = 0
        self.pacientes_activos: Dict[int, Paciente] = {}
        self.pacientes_completados: List[Paciente] = []
        self.cola_espera_atencion: List[Paciente] = []
        
        # Estadísticas
        self.stats = EstadisticasHospital(
            hospital_id=config.id,
            timestamp=0,
            boxes_totales=config.num_boxes,
            observacion_totales=config.num_camas_observacion
        )
        
        # Métricas para cálculos
        self.tiempos_espera_recientes: List[float] = []
        self.llegadas_ultima_hora: List[float] = []
        self.atendidos_ultima_hora: List[float] = []
        
        # Control de emergencia
        self.emergencia_activa = False
        self.tipo_emergencia: Optional[str] = None
        
    def generar_nivel_triaje(self) -> NivelTriaje:
        """Genera un nivel de triaje basado en probabilidades reales"""
        r = random.random()
        acumulado = 0
        for nivel, config in CONFIG_TRIAJE.items():
            acumulado += config.probabilidad
            if r <= acumulado:
                return nivel
        return NivelTriaje.VERDE  # Por defecto
    
    def generar_patologia(self, nivel: NivelTriaje) -> str:
        """Genera una patología aleatoria según el nivel de triaje"""
        return random.choice(PATOLOGIAS[nivel])
    
    def calcular_tiempo_entre_llegadas(self) -> float:
        """
        Calcula el tiempo hasta la próxima llegada.
        Usa distribución exponencial con variación horaria.
        """
        # Pacientes por minuto (media)
        pacientes_por_minuto = self.config.pacientes_dia_base / (24 * 60)
        
        # Variación horaria (más pacientes por la mañana y tarde)
        hora_simulada = (self.env.now / 60) % 24
        if 8 <= hora_simulada < 14:  # Mañana
            factor = 1.4
        elif 14 <= hora_simulada < 22:  # Tarde
            factor = 1.2
        elif 22 <= hora_simulada or hora_simulada < 2:  # Noche temprana
            factor = 0.9
        else:  # Madrugada
            factor = 0.5
        
        # Si hay emergencia activa, aumentar llegadas significativamente
        # para forzar saturación y coordinación entre hospitales
        if self.emergencia_activa:
            factor *= 3.0
        
        tasa = pacientes_por_minuto * factor
        return random.expovariate(tasa)
    
    def proceso_llegada_pacientes(self):
        """Proceso principal de llegada de pacientes"""
        while True:
            # Calcular tiempo entre llegadas usando el contexto
            contexto = self.generador_pacientes.generar_contexto(self.env.now)
            tiempo_espera = self.generador_pacientes.calcular_tiempo_entre_llegadas(
                self.config.pacientes_dia_base,
                contexto
            )

            # Si hay emergencia activa, reducir tiempo entre llegadas drásticamente
            # para forzar saturación y trigger de coordinación hospitalaria
            if self.emergencia_activa:
                tiempo_espera *= 0.25

            yield self.env.timeout(tiempo_espera)

            # Crear paciente usando el generador realista
            self.paciente_counter += 1
            paciente_data = self.generador_pacientes.generar_paciente_completo(
                paciente_id=self.paciente_counter,
                hospital_id=self.config.id,
                tiempo_simulado=self.env.now
            )

            # Convertir a objeto Paciente para el simulador
            paciente = Paciente(
                id=paciente_data['id'],
                hospital_id=paciente_data['hospital_id'],
                nivel_triaje=paciente_data['nivel_triaje'],
                patologia=paciente_data['patologia'],
                hora_llegada=self.env.now,
                edad=paciente_data['edad']
            )

            self.pacientes_activos[paciente.id] = paciente
            self.llegadas_ultima_hora.append(self.env.now)

            # Publicar evento de llegada con contexto enriquecido
            self.publicar_evento("llegada", paciente, contexto=paciente_data.get('contexto'))

            # Iniciar proceso de atención
            self.env.process(self.proceso_atencion_paciente(paciente))
    
    def proceso_atencion_paciente(self, paciente: Paciente):
        """Proceso completo de atención de un paciente"""
        config_triaje = CONFIG_TRIAJE[paciente.nivel_triaje]
        
        # ═══ FASE 1: TRIAJE ═══
        with self.triaje.request() as req:
            yield req
            paciente.hora_triaje = self.env.now
            # Tiempo de triaje: 1-2 minutos
            yield self.env.timeout(random.uniform(1, 2))
        
        self.publicar_evento("triaje_completado", paciente)
        
        # ═══ FASE 1.5: CONSULTAR DERIVACIÓN ═══
        if self.coordinador:
            hospital_destino = self.coordinador.decidir_hospital_destino(
                self.config.id, 
                paciente.nivel_triaje.value
            )
            if hospital_destino:
                # Derivar paciente
                paciente.destino = "derivado"
                paciente.derivado_a = hospital_destino
                paciente.hora_salida = self.env.now
                
                # Mover a completados
                del self.pacientes_activos[paciente.id]
                self.pacientes_completados.append(paciente)
                
                self.publicar_evento("derivacion", paciente)
                
                # Crear nuevo proceso en hospital destino
                # (En una implementación real, habría tiempo de traslado)
                return  # Termina el proceso en este hospital
        
        # ═══ FASE 2: ESPERA Y ATENCIÓN EN BOX ═══
        # Prioridad: menor número = mayor prioridad (nivel 1 = máxima)
        prioridad = paciente.nivel_triaje.value
        
        self.cola_espera_atencion.append(paciente)
        
        with self.boxes.request(priority=prioridad) as req:
            yield req
            
            # Ya no está en cola
            if paciente in self.cola_espera_atencion:
                self.cola_espera_atencion.remove(paciente)
            
            paciente.hora_inicio_atencion = self.env.now
            
            # Guardar tiempo de espera
            if paciente.tiempo_espera_atencion:
                self.tiempos_espera_recientes.append(paciente.tiempo_espera_atencion)
            
            self.publicar_evento("inicio_atencion", paciente)
            
            # Tiempo de atención según nivel
            tiempo_atencion = random.uniform(
                config_triaje.tiempo_atencion_min,
                config_triaje.tiempo_atencion_max
            )
            yield self.env.timeout(tiempo_atencion)
            
            paciente.hora_fin_atencion = self.env.now
        
        # ═══ FASE 3: OBSERVACIÓN (si procede) ═══
        if random.random() < config_triaje.prob_observacion:
            with self.observacion.request() as req:
                yield req
                paciente.hora_entrada_observacion = self.env.now
                self.publicar_evento("entrada_observacion", paciente)
                
                # Tiempo en observación: 2-6 horas
                yield self.env.timeout(random.uniform(120, 360))
        
        # ═══ FASE 4: ALTA O INGRESO ═══
        if random.random() < config_triaje.prob_ingreso:
            paciente.destino = "ingreso"
        else:
            paciente.destino = "alta"
        
        paciente.hora_salida = self.env.now
        
        # Mover a completados
        del self.pacientes_activos[paciente.id]
        self.pacientes_completados.append(paciente)
        self.atendidos_ultima_hora.append(self.env.now)
        
        # Mantener solo últimos 1000 pacientes en memoria
        if len(self.pacientes_completados) > 1000:
            self.pacientes_completados = self.pacientes_completados[-500:]
        
        self.publicar_evento("salida", paciente)
    
    def proceso_actualizacion_estadisticas(self):
        """Actualiza y publica estadísticas cada minuto simulado"""
        while True:
            yield self.env.timeout(1)  # Cada minuto simulado
            
            # Limpiar métricas antiguas (más de 60 minutos)
            tiempo_limite = self.env.now - 60
            self.llegadas_ultima_hora = [t for t in self.llegadas_ultima_hora if t > tiempo_limite]
            self.atendidos_ultima_hora = [t for t in self.atendidos_ultima_hora if t > tiempo_limite]
            self.tiempos_espera_recientes = self.tiempos_espera_recientes[-100:]
            
            # Calcular estadísticas
            self.stats.timestamp = self.env.now
            self.stats.boxes_ocupados = self.boxes.count
            self.stats.observacion_ocupadas = self.observacion.count
            self.stats.pacientes_en_espera_triaje = len(self.triaje.queue)
            self.stats.pacientes_en_espera_atencion = len(self.cola_espera_atencion)
            
            # Pacientes por nivel en espera
            espera_por_nivel = defaultdict(int)
            for p in self.cola_espera_atencion:
                espera_por_nivel[p.nivel_triaje.value] += 1
            self.stats.pacientes_en_espera_por_nivel = dict(espera_por_nivel)
            
            # Tiempos medios
            if self.tiempos_espera_recientes:
                self.stats.tiempo_medio_espera = sum(self.tiempos_espera_recientes) / len(self.tiempos_espera_recientes)
            
            # Calcular tiempos de pacientes completados recientemente
            recientes = [p for p in self.pacientes_completados if p.hora_salida and p.hora_salida > tiempo_limite]
            if recientes:
                tiempos_totales = [p.tiempo_total for p in recientes if p.tiempo_total]
                if tiempos_totales:
                    self.stats.tiempo_medio_total = sum(tiempos_totales) / len(tiempos_totales)
            
            self.stats.pacientes_llegados_hora = len(self.llegadas_ultima_hora)
            self.stats.pacientes_atendidos_hora = len(self.atendidos_ultima_hora)
            
            # Nivel de saturación
            ocupacion_boxes = self.boxes.count / self.config.num_boxes
            ocupacion_obs = self.observacion.count / self.config.num_camas_observacion
            cola_relativa = len(self.cola_espera_atencion) / self.config.num_boxes
            
            self.stats.nivel_saturacion = min(1.0, (ocupacion_boxes * 0.4 + ocupacion_obs * 0.3 + cola_relativa * 0.3))
            self.stats.emergencia_activa = self.emergencia_activa
            
            # Publicar estadísticas
            self.publicar_estadisticas()
    
    def publicar_evento(self, tipo: str, paciente: Paciente, contexto=None):
        """Publica un evento de paciente via MQTT"""
        if self.mqtt_client:
            topic = f"urgencias/{self.config.id}/eventos/{tipo}"
            # Aplanar datos del paciente para facilitar procesamiento en Node-RED
            payload = {
                "tipo": tipo,
                "timestamp": self.env.now,
                "paciente_id": paciente.id,
                "edad": paciente.edad,
                "nivel_triaje": paciente.nivel_triaje.name if paciente.nivel_triaje else "desconocido",
                "patologia": paciente.patologia or "no_especificada",
                "tiempo_total": paciente.tiempo_total or 0,
                "tiempo_espera_atencion": paciente.tiempo_espera_atencion or 0,
                "destino": paciente.destino or "",
                "derivado_a": getattr(paciente, 'derivado_a', None) or ""
            }

            # Añadir datos de contexto si están disponibles
            if contexto:
                payload["contexto"] = contexto

            self.mqtt_client.publish(topic, json.dumps(payload))
    
    def publicar_estadisticas(self):
        """Publica estadísticas via MQTT"""
        if self.mqtt_client:
            topic = f"urgencias/{self.config.id}/stats"
            payload = json.dumps(self.stats.to_dict())
            self.mqtt_client.publish(topic, payload)
            
            # También publicar estado de recursos individuales
            topic_boxes = f"urgencias/{self.config.id}/recursos/boxes"
            self.mqtt_client.publish(topic_boxes, json.dumps({
                "ocupados": self.boxes.count,
                "totales": self.config.num_boxes,
                "en_cola": len(self.boxes.queue)
            }))
    
    def activar_emergencia(self, tipo: str, num_pacientes: int = 0):
        """Activa modo emergencia (accidente múltiple, brote, evento masivo)
        
        Args:
            tipo: Tipo de emergencia
            num_pacientes: Número de pacientes a generar por el coordinador inteligente
        """
        self.emergencia_activa = True
        self.tipo_emergencia = tipo
        print(f"🚨 [{self.config.id}] EMERGENCIA ACTIVADA: {tipo}")
        
        if self.mqtt_client:
            self.mqtt_client.publish(
                f"urgencias/{self.config.id}/alertas",
                json.dumps({
                    "tipo": "emergencia_activada",
                    "emergencia": tipo,
                    "num_pacientes": num_pacientes,
                    "timestamp": self.env.now
                })
            )
        
        # Generar pacientes de emergencia si se especificó número
        if num_pacientes > 0:
            self.env.process(self._generar_pacientes_emergencia(tipo, num_pacientes))
    
    def _generar_pacientes_emergencia(self, tipo: str, num_pacientes: int):
        """Genera pacientes de emergencia en ráfaga"""
        print(f"🚑 [{self.config.id}] Generando {num_pacientes} pacientes de emergencia...")
        
        # Mapear tipo de emergencia a niveles de triaje más probables
        niveles_emergencia = {
            "ACCIDENTE_TRAFICO": [NivelTriaje.ROJO, NivelTriaje.NARANJA, NivelTriaje.AMARILLO],
            "INCENDIO": [NivelTriaje.ROJO, NivelTriaje.NARANJA, NivelTriaje.AMARILLO],
            "INTOXICACION_MASIVA": [NivelTriaje.NARANJA, NivelTriaje.AMARILLO, NivelTriaje.VERDE],
            "EVENTO_DEPORTIVO": [NivelTriaje.AMARILLO, NivelTriaje.VERDE, NivelTriaje.AZUL],
            "GRIPE_MASIVA": [NivelTriaje.AMARILLO, NivelTriaje.VERDE, NivelTriaje.VERDE],
            "OLA_CALOR": [NivelTriaje.AMARILLO, NivelTriaje.NARANJA, NivelTriaje.VERDE],
        }
        
        niveles = niveles_emergencia.get(tipo, [NivelTriaje.AMARILLO, NivelTriaje.NARANJA, NivelTriaje.VERDE])
        
        for i in range(num_pacientes):
            # Pequeño delay entre pacientes (1-5 minutos simulados)
            yield self.env.timeout(random.uniform(1, 5))
            
            # Crear paciente de emergencia con los campos correctos
            nivel = random.choice(niveles)
            self.paciente_counter += 1
            paciente = Paciente(
                id=self.paciente_counter,
                hospital_id=self.config.id,
                nivel_triaje=nivel,
                patologia=f"Emergencia {tipo}",
                hora_llegada=self.env.now,
                edad=random.randint(18, 75)
            )
            
            self.pacientes_activos[paciente.id] = paciente
            
            # Publicar evento de llegada
            self.publicar_evento("llegada_emergencia", paciente)
            
            # Iniciar proceso de atención
            self.env.process(self.proceso_atencion_paciente(paciente))
            
            print(f"   🏥 [{self.config.id}] Paciente {i+1}/{num_pacientes} - Triaje: {nivel.value}", flush=True)
        
        print(f"✅ [{self.config.id}] {num_pacientes} pacientes de emergencia ingresados", flush=True)
    
    def desactivar_emergencia(self):
        """Desactiva modo emergencia"""
        self.emergencia_activa = False
        self.tipo_emergencia = None
        print(f"✅ [{self.config.id}] Emergencia desactivada")
        
        if self.mqtt_client:
            self.mqtt_client.publish(
                f"urgencias/{self.config.id}/alertas",
                json.dumps({
                    "tipo": "emergencia_desactivada",
                    "timestamp": self.env.now
                })
            )


# ═══════════════════════════════════════════════════════════════════════════════
# CLIENTE MQTT
# ═══════════════════════════════════════════════════════════════════════════════

class MQTTManager:
    """Gestiona la conexión MQTT"""

    def __init__(self, broker: str = "localhost", port: int = 1883):
        self.broker = broker
        self.port = port
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.connected = False
        self.hospitales = {}  # Referencia a los hospitales para comandos

    def set_hospitales(self, hospitales: Dict[str, 'HospitalUrgencias']):
        """Configura la referencia a los hospitales para comandos"""
        self.hospitales = hospitales

    def conectar(self):
        """Conecta al broker MQTT"""
        try:
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message  # Añadir callback de mensajes
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"⚠️  No se pudo conectar a MQTT ({self.broker}:{self.port}): {e}")
            print("   La simulación continuará sin publicar eventos.")
            return False

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.connected = True
            print(f"✅ Conectado a MQTT broker ({self.broker}:{self.port})")
            # Suscribirse al topic de comandos para todos los hospitales
            client.subscribe("urgencias/+/comando")
            # Suscribirse al topic del coordinador central para incidentes globales
            client.subscribe("urgencias/coordinador/incidente")
            print(f"📡 Suscrito a urgencias/+/comando para recibir comandos")
            print(f"📡 Suscrito a urgencias/coordinador/incidente para incidentes globales")
        else:
            print(f"❌ Error de conexión MQTT: {rc}")

    def _on_message(self, client, userdata, msg):
        """Callback para mensajes MQTT - maneja comandos de incidentes"""
        import sys
        try:
            topic = msg.topic
            print(f"📥 Mensaje MQTT recibido en topic: {topic}", flush=True)
            payload = json.loads(msg.payload.decode())
            
            # Manejar incidente global del coordinador
            if topic == "urgencias/coordinador/incidente":
                print(f"🚨 Comando de incidente global recibido: {payload}", flush=True)
                sys.stdout.flush()
                self._procesar_incidente_global(payload)
                return
            
            # Extraer hospital_id del topic (formato: urgencias/{hospital_id}/comando)
            parts = topic.split('/')
            if len(parts) >= 3 and parts[2] == 'comando':
                hospital_id = parts[1]
                print(f"📨 Comando recibido para {hospital_id}: {payload.get('tipo', 'unknown')}", flush=True)

                # Procesar comando de activar emergencia (legacy - hospital específico)
                if payload.get('tipo') == 'activar_emergencia' and hospital_id in self.hospitales:
                    tipo_emergencia = payload.get('emergencia', 'accidente_multiple')
                    num_pacientes = payload.get('num_pacientes', 10)
                    hospital = self.hospitales[hospital_id]
                    hospital.activar_emergencia(tipo_emergencia, num_pacientes)
                    print(f"✅ Emergencia '{tipo_emergencia}' activada en {hospital_id}", flush=True)

        except Exception as e:
            print(f"⚠️  Error procesando comando MQTT: {e}", flush=True)
            import traceback
            traceback.print_exc()
    
    def _procesar_incidente_global(self, payload):
        """Procesa un incidente global usando el coordinador inteligente"""
        from domain.services.coordinador import CoordinadorCentral, TipoEmergencia, UBICACIONES_INCIDENTES
        
        tipo_emergencia_str = payload.get('tipo_emergencia', 'ACCIDENTE_TRAFICO')
        num_pacientes_total = payload.get('num_pacientes', 20)
        ubicacion_nombre = payload.get('ubicacion', 'centro')
        
        # Mapear string a enum TipoEmergencia
        tipo_mapping = {
            'ACCIDENTE_TRAFICO': TipoEmergencia.ACCIDENTE_MULTIPLE,
            'ACCIDENTE_MULTIPLE': TipoEmergencia.ACCIDENTE_MULTIPLE,
            'INCENDIO': TipoEmergencia.INCENDIO,
            'INTOXICACION_MASIVA': TipoEmergencia.INTOXICACION_MASIVA,
            'EVENTO_DEPORTIVO': TipoEmergencia.EVENTO_MASIVO,
            'GRIPE_MASIVA': TipoEmergencia.BROTE_VIRICO,
            'OLA_CALOR': TipoEmergencia.BROTE_VIRICO,  # Mapear a brote vírico
            'BROTE_VIRICO': TipoEmergencia.BROTE_VIRICO,
        }
        
        tipo_emergencia = tipo_mapping.get(tipo_emergencia_str.upper(), TipoEmergencia.ACCIDENTE_MULTIPLE)
        
        # Mapear nombre de ubicación a coordenadas
        ubicacion_mapping = {
            'autopista': UBICACIONES_INCIDENTES.get('autopista_a6'),
            'riazor': UBICACIONES_INCIDENTES.get('riazor'),
            'centro': UBICACIONES_INCIDENTES.get('centro_ciudad'),
            'marineda': UBICACIONES_INCIDENTES.get('marineda'),
        }
        
        ubicacion_coords = ubicacion_mapping.get(ubicacion_nombre.lower())
        
        print(f"🚨 INCIDENTE GLOBAL: {tipo_emergencia.value}")
        print(f"   📍 Ubicación: {ubicacion_nombre} -> {ubicacion_coords}")
        print(f"   👥 Pacientes solicitados: {num_pacientes_total}")
        
        # Usar el coordinador existente de la instancia SimuladorUrgencias
        # El MQTTManager tiene referencia a hospitales pero necesitamos acceder al coordinador
        if not self.hospitales:
            print("⚠️  No hay hospitales configurados")
            return
        
        # Crear coordinador temporal para la distribución
        coordinador = CoordinadorCentral(
            env=list(self.hospitales.values())[0].env,
            hospitales=self.hospitales,
            mqtt_client=self.client
        )
        
        # Obtener distribución inteligente
        distribucion = coordinador.distribuir_pacientes_incidente(
            tipo_emergencia=tipo_emergencia,
            ubicacion=ubicacion_coords
        )
        
        print(f"📊 Distribución calculada:")
        for hospital_id, num_pacientes in distribucion.items():
            print(f"   🏥 {hospital_id}: {num_pacientes} pacientes")
        
        # Activar emergencia en cada hospital con sus pacientes asignados
        for hospital_id, num_pacientes in distribucion.items():
            if hospital_id in self.hospitales and num_pacientes > 0:
                hospital = self.hospitales[hospital_id]
                hospital.activar_emergencia(tipo_emergencia.value, num_pacientes)
        
        # Publicar resumen de la distribución
        if self.connected:
            self.client.publish("urgencias/coordinador/distribucion", json.dumps({
                "tipo_emergencia": tipo_emergencia.value,
                "ubicacion": ubicacion_nombre,
                "total_pacientes": sum(distribucion.values()),
                "distribucion": [{"hospital": h, "pacientes": p} for h, p in distribucion.items()],
                "timestamp": datetime.now().isoformat()
            }))

    def _on_disconnect(self, client, userdata, rc, properties=None, reason=None):
        self.connected = False
        print("⚠️  Desconectado de MQTT")

    def desconectar(self):
        """Desconecta del broker"""
        self.client.loop_stop()
        self.client.disconnect()


# ═══════════════════════════════════════════════════════════════════════════════
# SIMULACIÓN PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

class SimuladorUrgencias:
    """Controlador principal de la simulación"""
    
    def __init__(self, hospitales_ids: List[str] = ["chuac"],
                 mqtt_broker: str = "localhost", mqtt_port: int = 1883,
                 velocidad: float = 60.0, emergencias_aleatorias: bool = False,
                 prediccion_activa: bool = True):
        """
        Args:
            hospitales_ids: Lista de IDs de hospitales a simular
            mqtt_broker: Dirección del broker MQTT
            mqtt_port: Puerto del broker MQTT
            velocidad: Factor de velocidad (60 = 1 hora simulada por minuto real)
            emergencias_aleatorias: Si True, genera emergencias aleatorias
            prediccion_activa: Si True, activa el servicio de predicción
        """
        self.env = simpy.Environment()
        self.velocidad = velocidad
        self.hospitales: Dict[str, HospitalUrgencias] = {}
        self.ultima_hora_impresa = -1  # Control para evitar duplicados
        self.coordinador = None
        self.servicio_prediccion = None

        # Conectar MQTT
        self.mqtt_manager = MQTTManager(mqtt_broker, mqtt_port)
        mqtt_client = self.mqtt_manager.client if self.mqtt_manager.conectar() else None

        # Inicializar servicios externos (compartidos por todos los hospitales)
        print("🌐 Inicializando servicios externos...")
        self.weather_service = WeatherService()  # Open-Meteo (gratis)
        self.holidays_service = HolidaysService()
        self.events_service = EventsService()
        self.football_service = FootballService()  # TheSportsDB (gratis)
        print("✅ Servicios externos inicializados")
        
        # Crear hospitales
        for hospital_id in hospitales_ids:
            if hospital_id in HOSPITALES:
                config = HOSPITALES[hospital_id]
                hospital = HospitalUrgencias(
                    self.env, config, mqtt_client,
                    weather_service=self.weather_service,
                    holidays_service=self.holidays_service,
                    events_service=self.events_service
                )
                self.hospitales[hospital_id] = hospital

                # Iniciar procesos
                self.env.process(hospital.proceso_llegada_pacientes())
                self.env.process(hospital.proceso_actualizacion_estadisticas())

                print(f"🏥 Hospital {config.nombre} inicializado")
                print(f"   - Boxes: {config.num_boxes}")
                print(f"   - Observación: {config.num_camas_observacion}")
                print(f"   - Pacientes/día estimados: {config.pacientes_dia_base}")
                print(f"   - GeneradorPacientes: ✅ Activo con APIs gratuitas")

        # Configurar MQTT manager con referencia a hospitales para comandos
        if mqtt_client:
            self.mqtt_manager.set_hospitales(self.hospitales)
            print("📡 MQTT configurado para recibir comandos de incidentes")

        # Iniciar proceso de publicación de datos contextuales
        if mqtt_client:
            self.env.process(self._proceso_publicar_contexto(mqtt_client))
        
        # Crear coordinador si hay múltiples hospitales
        if len(self.hospitales) > 1:
            from domain.services.coordinador import CoordinadorCentral, GeneradorEmergencias
            
            self.coordinador = CoordinadorCentral(self.env, self.hospitales, mqtt_client)
            self.env.process(self.coordinador.proceso_coordinacion())
            
            # Vincular hospitales al coordinador para derivaciones
            for hospital in self.hospitales.values():
                hospital.coordinador = self.coordinador
            
            # Generador de emergencias aleatorias (opcional)
            if emergencias_aleatorias:
                generador = GeneradorEmergencias(self.env, self.coordinador)
                self.env.process(generador.proceso_emergencias())
                print(f"⚡ Generador de emergencias aleatorias activado")
        
        # Crear servicio de predicción
        if prediccion_activa:
            try:
                from domain.services.predictor import ServicioPrediccion
                self.servicio_prediccion = ServicioPrediccion(
                    list(self.hospitales.keys()),
                    mqtt_client
                )
                self.servicio_prediccion.inicializar()
                self.env.process(self._proceso_prediccion())
            except Exception as e:
                print(f"⚠️  No se pudo inicializar predicción: {e}")
    
    def _proceso_publicar_contexto(self, mqtt_client):
        """Proceso que publica datos contextuales (clima, eventos, fútbol) cada 30 minutos simulados"""
        while True:
            yield self.env.timeout(30)  # Cada 30 minutos simulados

            try:
                # Publicar datos de clima
                clima = self.weather_service.obtener_clima()
                mqtt_client.publish("urgencias/contexto/clima", json.dumps(clima.to_dict()))

                # Publicar próximos festivos
                festivos = self.holidays_service.obtener_proximos_festivos(dias=7)
                mqtt_client.publish("urgencias/contexto/festivos", json.dumps({
                    "festivos": [{"nombre": f.nombre, "fecha": f.fecha.isoformat(), "factor_demanda": f.factor_demanda} for f in festivos]
                }))

                # Publicar eventos locales próximos
                eventos = self.events_service.obtener_proximos_eventos(dias=7)
                mqtt_client.publish("urgencias/contexto/eventos", json.dumps({
                    "eventos": [{"nombre": e.nombre, "fecha": e.fecha.isoformat(), "asistentes": e.asistentes_esperados} for e in eventos]
                }))

                # Publicar próximos partidos del Deportivo
                partidos = self.football_service.obtener_proximos_partidos(dias=14)
                if partidos:
                    mqtt_client.publish("urgencias/contexto/futbol", json.dumps({
                        "partidos": [{
                            "local": p.equipo_local,
                            "visitante": p.equipo_visitante,
                            "fecha": p.fecha.isoformat(),
                            "en_casa": p.es_en_casa,
                            "asistentes": p.asistentes_estimados
                        } for p in partidos[:5]]  # Solo próximos 5 partidos
                    }))
            except Exception as e:
                print(f"⚠️  Error publicando contexto: {e}")

    def _proceso_prediccion(self):
        """Proceso que actualiza predicciones y detecta anomalías cada hora simulada"""
        while True:
            yield self.env.timeout(60)  # Cada hora simulada

            if self.servicio_prediccion:
                # Recopilar llegadas de la última hora
                datos_actuales = {}
                for h_id, hospital in self.hospitales.items():
                    # Usar pacientes_llegados_hora que ya está calculado en stats
                    datos_actuales[h_id] = hospital.stats.pacientes_llegados_hora

                # Analizar anomalías
                alertas = self.servicio_prediccion.analizar_situacion(datos_actuales)

                if alertas:
                    for alerta in alertas:
                        print(f"   🔮 {alerta['mensaje']}")

                # Actualizar predicciones cada hora simulada (para testing)
                # Cambiar a 360 (6 horas) para producción
                if int(self.env.now) % 60 == 0:
                    self.servicio_prediccion.actualizar_predicciones()
    
    def ejecutar(self, duracion_horas: float = 24, tiempo_real: bool = True):
        """
        Ejecuta la simulación.
        
        Args:
            duracion_horas: Duración en horas simuladas (0 = infinito)
            tiempo_real: Si True, la simulación corre en tiempo real escalado
        """
        modo_infinito = duracion_horas <= 0
        duracion_minutos = float('inf') if modo_infinito else duracion_horas * 60
        
        print(f"\n{'═'*60}")
        print(f"🚀 Iniciando simulación")
        if modo_infinito:
            print(f"   Duración: ♾️  MODO CONTINUO INFINITO")
        else:
            print(f"   Duración: {duracion_horas} horas simuladas")
        print(f"   Velocidad: {self.velocidad}x (1 min real = {self.velocidad} min simulados)")
        print(f"{'═'*60}\n")
        
        if tiempo_real:
            # Ejecutar en tiempo real escalado
            self._ejecutar_tiempo_real(duracion_minutos)
        else:
            # Ejecutar lo más rápido posible
            self.env.run(until=duracion_minutos)
        
        self._imprimir_resumen()
    
    def _ejecutar_tiempo_real(self, duracion_minutos: float):
        """Ejecuta la simulación sincronizada con tiempo real"""
        import math
        inicio = time.time()
        paso = 1.0  # Avanzar 1 minuto simulado cada iteración
        modo_infinito = math.isinf(duracion_minutos)
        
        while modo_infinito or self.env.now < duracion_minutos:
            # Calcular cuánto tiempo simulado debería haber pasado
            tiempo_real_transcurrido = time.time() - inicio
            tiempo_simulado_objetivo = tiempo_real_transcurrido * self.velocidad
            
            # Avanzar simulación si es necesario
            if self.env.now < tiempo_simulado_objetivo:
                if modo_infinito:
                    siguiente = min(self.env.now + paso, tiempo_simulado_objetivo)
                else:
                    siguiente = min(self.env.now + paso, tiempo_simulado_objetivo, duracion_minutos)
                self.env.run(until=siguiente)
            
            # Mostrar progreso cada hora simulada (evitando duplicados)
            hora_actual = int(self.env.now // 60)
            if hora_actual > self.ultima_hora_impresa and hora_actual > 0:
                self.ultima_hora_impresa = hora_actual
                self._imprimir_estado()
            
            # Pequeña pausa para no saturar CPU
            time.sleep(0.01)
    
    def _imprimir_estado(self):
        """Imprime el estado actual de los hospitales"""
        hora = int(self.env.now // 60)
        minuto = int(self.env.now % 60)
        print(f"\n⏰ Hora simulada: {hora:02d}:{minuto:02d}")
        
        for hospital_id, hospital in self.hospitales.items():
            stats = hospital.stats
            ocupacion = (stats.boxes_ocupados / stats.boxes_totales * 100) if stats.boxes_totales > 0 else 0
            
            # Emoji según saturación
            if stats.nivel_saturacion > 0.8:
                emoji = "🔴"
            elif stats.nivel_saturacion > 0.5:
                emoji = "🟡"
            else:
                emoji = "🟢"
            
            print(f"   {emoji} {hospital_id.upper()}: "
                  f"Boxes {stats.boxes_ocupados}/{stats.boxes_totales} ({ocupacion:.0f}%) | "
                  f"Cola: {stats.pacientes_en_espera_atencion} | "
                  f"Llegadas/h: {stats.pacientes_llegados_hora}")
    
    def _imprimir_resumen(self):
        """Imprime resumen final de la simulación"""
        print(f"\n{'═'*60}")
        print("📊 RESUMEN DE SIMULACIÓN")
        print(f"{'═'*60}")
        
        total_pacientes_sistema = 0
        total_derivados = 0
        
        for hospital_id, hospital in self.hospitales.items():
            total_atendidos = len(hospital.pacientes_completados)
            total_pacientes_sistema += total_atendidos
            
            # Calcular estadísticas
            tiempos_totales = [p.tiempo_total for p in hospital.pacientes_completados if p.tiempo_total]
            tiempo_medio = sum(tiempos_totales) / len(tiempos_totales) if tiempos_totales else 0
            
            tiempos_espera = [p.tiempo_espera_atencion for p in hospital.pacientes_completados if p.tiempo_espera_atencion]
            espera_media = sum(tiempos_espera) / len(tiempos_espera) if tiempos_espera else 0
            
            # Contar por destino
            altas = sum(1 for p in hospital.pacientes_completados if p.destino == "alta")
            ingresos = sum(1 for p in hospital.pacientes_completados if p.destino == "ingreso")
            derivados = sum(1 for p in hospital.pacientes_completados if p.destino == "derivado")
            total_derivados += derivados
            
            print(f"\n🏥 {hospital.config.nombre}")
            print(f"   Total pacientes atendidos: {total_atendidos}")
            print(f"   Tiempo medio total: {tiempo_medio:.1f} minutos")
            print(f"   Tiempo medio espera: {espera_media:.1f} minutos")
            print(f"   Altas: {altas} | Ingresos: {ingresos} | Derivados: {derivados}")
        
        # Resumen del coordinador
        if self.coordinador:
            print(f"\n{'─'*60}")
            print("🎯 COORDINACIÓN CENTRAL")
            resumen = self.coordinador.obtener_resumen()
            print(f"   Derivaciones totales: {resumen['derivaciones_totales']}")
            print(f"   Minutos ahorrados (estimado): {resumen['minutos_ahorrados']:.0f}")
            print(f"   Alertas emitidas: {resumen['alertas_emitidas']}")
            if resumen['emergencias_gestionadas'] > 0:
                print(f"   Emergencias gestionadas: {resumen['emergencias_gestionadas']}")
        
        # Resumen del predictor
        if self.servicio_prediccion:
            print(f"\n{'─'*60}")
            print("🔮 PREDICCIÓN DE DEMANDA")
            resumen_pred = self.servicio_prediccion.detector.obtener_resumen()
            print(f"   Anomalías detectadas (24h): {resumen_pred['anomalias_ultimas_24h']}")
            
            # Mostrar predicción próximas 3 horas
            proximas = self.servicio_prediccion.obtener_prediccion_proximas_horas(3)
            print(f"   Predicción próximas 3 horas:")
            for h_id, datos in proximas.items():
                print(f"      {h_id.upper()}: {datos['total_esperado']:.0f} llegadas esperadas")
        
        print(f"\n{'═'*60}")
        print(f"   TOTAL PACIENTES EN EL SISTEMA: {total_pacientes_sistema}")
        print(f"{'═'*60}\n")
    
    def detener(self):
        """Detiene la simulación y limpia recursos"""
        self.mqtt_manager.desconectar()


# ═══════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    import os
    
    # Leer variables de entorno (para Docker)
    env_broker = os.environ.get("MQTT_BROKER", "localhost")
    env_port = int(os.environ.get("MQTT_PORT", "1883"))
    env_hospitales = os.environ.get("HOSPITALES", "chuac").split()
    env_duracion = float(os.environ.get("DURACION", "24"))
    env_velocidad = float(os.environ.get("VELOCIDAD", "60"))
    
    parser = argparse.ArgumentParser(description="Gemelo Digital - Urgencias Hospitalarias A Coruña")
    parser.add_argument("--hospitales", nargs="+", default=env_hospitales,
                        choices=["chuac", "hm_modelo", "san_rafael"],
                        help="Hospitales a simular")
    parser.add_argument("--duracion", type=float, default=env_duracion,
                        help="Duración en horas simuladas (default: 24)")
    parser.add_argument("--velocidad", type=float, default=env_velocidad,
                        help="Factor de velocidad (default: 60 = 1h sim/min real)")
    parser.add_argument("--mqtt-broker", default=env_broker,
                        help="Dirección del broker MQTT")
    parser.add_argument("--mqtt-port", type=int, default=env_port,
                        help="Puerto del broker MQTT")
    parser.add_argument("--rapido", action="store_true",
                        help="Ejecutar sin sincronización de tiempo real")
    parser.add_argument("--emergencias", action="store_true",
                        help="Activar emergencias aleatorias durante la simulación")
    parser.add_argument("--sin-prediccion", action="store_true",
                        help="Desactivar el servicio de predicción")
    
    args = parser.parse_args()
    
    # Crear y ejecutar simulador
    simulador = SimuladorUrgencias(
        hospitales_ids=args.hospitales,
        mqtt_broker=args.mqtt_broker,
        mqtt_port=args.mqtt_port,
        velocidad=args.velocidad,
        emergencias_aleatorias=args.emergencias,
        prediccion_activa=not args.sin_prediccion
    )
    
    try:
        simulador.ejecutar(
            duracion_horas=args.duracion,
            tiempo_real=not args.rapido
        )
    except KeyboardInterrupt:
        print("\n\n⚠️  Simulación interrumpida por el usuario")
    finally:
        simulador.detener()
