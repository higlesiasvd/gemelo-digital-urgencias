"""
═══════════════════════════════════════════════════════════════════════════════
GEMELO DIGITAL - SIMULADOR DE URGENCIAS v2.0
═══════════════════════════════════════════════════════════════════════════════
Simulador simplificado con flujo realista:
  Llegada → Recepción → Sala Espera → Triaje → Sala Espera → Consulta → Alta/Observación

Características:
- CHUAC como hospital de referencia (casos graves)
- Sistema de derivaciones visible entre hospitales  
- Factores de demanda: clima, eventos, partidos
- Coordinador central para gestión de saturación
═══════════════════════════════════════════════════════════════════════════════
"""

import simpy
import random
import json
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Callable
from enum import IntEnum
from datetime import datetime
import paho.mqtt.client as mqtt

from src.infrastructure.external_services import WeatherService, HolidaysService, EventsService, FootballService


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS Y CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

class NivelTriaje(IntEnum):
    """Niveles de triaje Manchester"""
    ROJO = 1      # Resucitación - Inmediato
    NARANJA = 2   # Emergencia - 10 min
    AMARILLO = 3  # Urgente - 60 min
    VERDE = 4     # Menos urgente - 120 min
    AZUL = 5      # No urgente - 240 min


class EstadoPaciente(IntEnum):
    """Estados del paciente en el flujo"""
    EN_RECEPCION = 1
    ESPERA_TRIAJE = 2
    EN_TRIAJE = 3
    ESPERA_CONSULTA = 4
    EN_CONSULTA = 5
    EN_OBSERVACION = 6
    ALTA = 7
    DERIVADO = 8


# Configuración de triaje basada en datos reales españoles
CONFIG_TRIAJE = {
    NivelTriaje.ROJO: {
        "nombre": "Resucitación",
        "color": "#dc2626",
        "tiempo_max_espera": 0,
        "probabilidad": 0.01,
        "tiempo_consulta": (60, 120),
        "prob_observacion": 0.90,
        "requiere_referencia": True,  # Debe ir al CHUAC
    },
    NivelTriaje.NARANJA: {
        "nombre": "Emergencia", 
        "color": "#ea580c",
        "tiempo_max_espera": 10,
        "probabilidad": 0.08,
        "tiempo_consulta": (30, 60),
        "prob_observacion": 0.60,
        "requiere_referencia": True,
    },
    NivelTriaje.AMARILLO: {
        "nombre": "Urgente",
        "color": "#ca8a04",
        "tiempo_max_espera": 60,
        "probabilidad": 0.18,
        "tiempo_consulta": (20, 40),
        "prob_observacion": 0.25,
        "requiere_referencia": False,
    },
    NivelTriaje.VERDE: {
        "nombre": "Menos urgente",
        "color": "#16a34a",
        "tiempo_max_espera": 120,
        "probabilidad": 0.58,
        "tiempo_consulta": (10, 25),
        "prob_observacion": 0.05,
        "requiere_referencia": False,
    },
    NivelTriaje.AZUL: {
        "nombre": "No urgente",
        "color": "#2563eb",
        "tiempo_max_espera": 240,
        "probabilidad": 0.15,
        "tiempo_consulta": (5, 15),
        "prob_observacion": 0.01,
        "requiere_referencia": False,
    },
}

# Patologías simplificadas por nivel
PATOLOGIAS = {
    NivelTriaje.ROJO: ["PCR", "Politrauma", "Shock", "Hemorragia masiva"],
    NivelTriaje.NARANJA: ["IAM", "Ictus", "Trauma grave", "Disnea severa"],
    NivelTriaje.AMARILLO: ["Dolor torácico", "Fractura", "Fiebre alta", "Abdomen agudo"],
    NivelTriaje.VERDE: ["Contusión", "Infección leve", "Lumbalgia", "Esguince"],
    NivelTriaje.AZUL: ["Certificado", "Revisión", "Molestias crónicas"],
}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE HOSPITALES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ConfigHospital:
    """Configuración de un hospital"""
    id: str
    nombre: str
    lat: float
    lon: float
    # Recursos
    puestos_recepcion: int
    puestos_triaje: int
    boxes_consulta: int
    camas_observacion: int
    # Demanda
    pacientes_dia_base: int
    es_referencia: bool = False  # Solo CHUAC


HOSPITALES = {
    "chuac": ConfigHospital(
        id="chuac",
        nombre="CHUAC - Complexo Hospitalario Universitario",
        lat=43.3712, lon=-8.4188,
        puestos_recepcion=4,
        puestos_triaje=3,
        boxes_consulta=25,
        camas_observacion=20,
        pacientes_dia_base=450,
        es_referencia=True,
    ),
    "modelo": ConfigHospital(
        id="modelo",
        nombre="Hospital Modelo HM",
        lat=43.3651, lon=-8.4016,
        puestos_recepcion=2,
        puestos_triaje=2,
        boxes_consulta=10,
        camas_observacion=8,
        pacientes_dia_base=150,
        es_referencia=False,
    ),
    "san_rafael": ConfigHospital(
        id="san_rafael",
        nombre="Hospital San Rafael",
        lat=43.3583, lon=-8.4123,
        puestos_recepcion=2,
        puestos_triaje=1,
        boxes_consulta=8,
        camas_observacion=6,
        pacientes_dia_base=100,
        es_referencia=False,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# MODELO DE PACIENTE (SIMPLIFICADO)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Paciente:
    """Paciente en urgencias - datos esenciales"""
    id: int
    hospital_id: str
    nivel_triaje: NivelTriaje
    patologia: str
    estado: EstadoPaciente = EstadoPaciente.EN_RECEPCION
    
    # Tiempos (en minutos de simulación)
    t_llegada: float = 0
    t_fin_recepcion: float = 0
    t_fin_triaje: float = 0
    t_inicio_consulta: float = 0
    t_fin_consulta: float = 0
    t_salida: float = 0
    
    # Derivación
    derivado_desde: Optional[str] = None
    derivado_a: Optional[str] = None
    motivo_derivacion: Optional[str] = None
    
    @property
    def tiempo_espera_total(self) -> float:
        """Tiempo total de espera (sin ser atendido)"""
        if self.t_inicio_consulta > 0:
            return self.t_inicio_consulta - self.t_llegada
        return 0
    
    @property
    def tiempo_en_sistema(self) -> float:
        """Tiempo total en el sistema"""
        if self.t_salida > 0:
            return self.t_salida - self.t_llegada
        return 0
    
    def to_dict(self) -> dict:
        config = CONFIG_TRIAJE[self.nivel_triaje]
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "nivel_triaje": self.nivel_triaje.value,
            "triaje_nombre": config["nombre"],
            "triaje_color": config["color"],
            "patologia": self.patologia,
            "estado": self.estado.name,
            "t_llegada": round(self.t_llegada, 1),
            "t_espera": round(self.tiempo_espera_total, 1),
            "derivado_desde": self.derivado_desde,
            "derivado_a": self.derivado_a,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ESTADÍSTICAS DEL HOSPITAL
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EstadoHospital:
    """Estado actual del hospital para visualización"""
    hospital_id: str
    timestamp: float
    
    # Ocupación
    en_recepcion: int = 0
    en_sala_espera: int = 0
    en_triaje: int = 0
    en_consulta: int = 0
    en_observacion: int = 0
    
    # Capacidades
    boxes_ocupados: int = 0
    boxes_total: int = 0
    observacion_ocupadas: int = 0
    observacion_total: int = 0
    
    # Colas por prioridad
    cola_por_nivel: Dict[int, int] = field(default_factory=dict)
    
    # Métricas
    tiempo_espera_medio: float = 0
    pacientes_hora: int = 0
    derivaciones_enviadas: int = 0
    derivaciones_recibidas: int = 0
    
    # Alertas
    saturacion: float = 0  # 0-1
    alerta_activa: bool = False
    
    def to_dict(self) -> dict:
        return {
            "hospital_id": self.hospital_id,
            "timestamp": self.timestamp,
            "en_recepcion": self.en_recepcion,
            "en_sala_espera": self.en_sala_espera,
            "en_triaje": self.en_triaje,
            "en_consulta": self.en_consulta,
            "en_observacion": self.en_observacion,
            "boxes_ocupados": self.boxes_ocupados,
            "boxes_total": self.boxes_total,
            "ocupacion_boxes": round(self.boxes_ocupados / max(self.boxes_total, 1), 2),
            "cola_por_nivel": self.cola_por_nivel,
            "tiempo_espera_medio": round(self.tiempo_espera_medio, 1),
            "pacientes_hora": self.pacientes_hora,
            "derivaciones_enviadas": self.derivaciones_enviadas,
            "derivaciones_recibidas": self.derivaciones_recibidas,
            "saturacion": round(self.saturacion, 2),
            "alerta_activa": self.alerta_activa,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# COORDINADOR DE DERIVACIONES
# ═══════════════════════════════════════════════════════════════════════════════

class CoordinadorDerivaciones:
    """
    Coordinador central que gestiona derivaciones entre hospitales.
    
    Reglas:
    1. Casos graves (rojo/naranja) van al CHUAC si es posible
    2. Si CHUAC está saturado (>85%), activar derivación inversa
    3. Derivar al hospital con menor saturación
    """
    
    UMBRAL_SATURACION_ALTA = 0.85
    UMBRAL_SATURACION_CRITICA = 0.95
    
    def __init__(self, hospitales: Dict[str, 'HospitalUrgencias']):
        self.hospitales = hospitales
        self.derivaciones: List[dict] = []
        self.alerta_sistema = False
        self.callbacks: List[Callable] = []
        
    def registrar_callback(self, callback: Callable):
        """Registrar callback para eventos de derivación"""
        self.callbacks.append(callback)
        
    def _notificar(self, evento: dict):
        """Notificar a todos los callbacks registrados"""
        for callback in self.callbacks:
            try:
                callback(evento)
            except Exception:
                pass
    
    def evaluar_derivacion(self, paciente: Paciente, hospital_origen: str) -> Optional[str]:
        """
        Evalúa si un paciente debe ser derivado y a dónde.
        
        Returns:
            hospital_id destino o None si no hay derivación
        """
        config_triaje = CONFIG_TRIAJE[paciente.nivel_triaje]
        hospital = self.hospitales[hospital_origen]
        saturacion_origen = hospital.calcular_saturacion()
        
        # Caso 1: Paciente grave en hospital no de referencia
        if config_triaje["requiere_referencia"] and not hospital.config.es_referencia:
            chuac = self.hospitales["chuac"]
            sat_chuac = chuac.calcular_saturacion()
            
            # Si CHUAC no está saturado, derivar allí
            if sat_chuac < self.UMBRAL_SATURACION_ALTA:
                return self._registrar_derivacion(
                    paciente, hospital_origen, "chuac",
                    "Caso grave - derivación a hospital de referencia"
                )
        
        # Caso 2: Hospital origen saturado
        if saturacion_origen >= self.UMBRAL_SATURACION_ALTA:
            # Buscar hospital con menor saturación
            mejor_destino = None
            menor_saturacion = saturacion_origen
            
            for h_id, h in self.hospitales.items():
                if h_id != hospital_origen:
                    sat = h.calcular_saturacion()
                    if sat < menor_saturacion - 0.1:  # Al menos 10% menos saturado
                        menor_saturacion = sat
                        mejor_destino = h_id
            
            if mejor_destino:
                return self._registrar_derivacion(
                    paciente, hospital_origen, mejor_destino,
                    f"Saturación alta ({saturacion_origen:.0%}) - derivación por capacidad"
                )
        
        # Caso 3: CHUAC saturado crítico - derivación inversa
        if hospital_origen == "chuac":
            sat_chuac = self.hospitales["chuac"].calcular_saturacion()
            if sat_chuac >= self.UMBRAL_SATURACION_CRITICA:
                # Solo derivar casos no graves
                if not config_triaje["requiere_referencia"]:
                    # Elegir hospital menos saturado
                    opciones = [(h_id, h.calcular_saturacion()) 
                                for h_id, h in self.hospitales.items() 
                                if h_id != "chuac"]
                    if opciones:
                        mejor = min(opciones, key=lambda x: x[1])
                        if mejor[1] < self.UMBRAL_SATURACION_ALTA:
                            self.alerta_sistema = True
                            return self._registrar_derivacion(
                                paciente, "chuac", mejor[0],
                                "ALERTA: CHUAC saturado - derivación de casos no graves"
                            )
        
        return None
    
    def _registrar_derivacion(self, paciente: Paciente, origen: str, destino: str, motivo: str) -> str:
        """Registra una derivación"""
        derivacion = {
            "timestamp": paciente.t_llegada,
            "paciente_id": paciente.id,
            "nivel_triaje": paciente.nivel_triaje.value,
            "origen": origen,
            "destino": destino,
            "motivo": motivo,
        }
        self.derivaciones.append(derivacion)
        
        # Actualizar paciente
        paciente.derivado_desde = origen
        paciente.derivado_a = destino
        paciente.motivo_derivacion = motivo
        paciente.estado = EstadoPaciente.DERIVADO
        
        # Notificar
        self._notificar({
            "tipo": "derivacion",
            "data": derivacion
        })
        
        return destino
    
    def obtener_estado_sistema(self) -> dict:
        """Estado global del sistema para visualización"""
        estados = {}
        for h_id, h in self.hospitales.items():
            estados[h_id] = {
                "saturacion": h.calcular_saturacion(),
                "en_espera": len(h.cola_espera),
                "alerta": h.calcular_saturacion() >= self.UMBRAL_SATURACION_ALTA
            }
        
        return {
            "hospitales": estados,
            "alerta_sistema": self.alerta_sistema,
            "total_derivaciones": len(self.derivaciones),
            "derivaciones_recientes": self.derivaciones[-10:] if self.derivaciones else []
        }


# ═══════════════════════════════════════════════════════════════════════════════
# HOSPITAL DE URGENCIAS
# ═══════════════════════════════════════════════════════════════════════════════

class HospitalUrgencias:
    """
    Simula el servicio de urgencias con flujo simplificado:
    Llegada → Recepción (~5min) → Triaje (~10min) → Espera → Consulta → Alta/Observación
    """
    
    def __init__(
        self, 
        env: simpy.Environment, 
        config: ConfigHospital,
        mqtt_client: Optional[mqtt.Client] = None,
        coordinador: Optional[CoordinadorDerivaciones] = None,
        factor_demanda: float = 1.0
    ):
        self.env = env
        self.config = config
        self.mqtt_client = mqtt_client
        self.coordinador = coordinador
        self.factor_demanda = factor_demanda
        
        # Recursos SimPy
        self.recepcion = simpy.Resource(env, capacity=config.puestos_recepcion)
        self.triaje = simpy.Resource(env, capacity=config.puestos_triaje)
        self.boxes = simpy.PriorityResource(env, capacity=config.boxes_consulta)
        self.observacion = simpy.Resource(env, capacity=config.camas_observacion)
        
        # Estado
        self.paciente_counter = 0
        self.pacientes_activos: Dict[int, Paciente] = {}
        self.cola_espera: List[Paciente] = []  # Cola para consulta (post-triaje)
        self.historial: List[Paciente] = []
        
        # Métricas
        self.llegadas_hora: List[float] = []
        self.tiempos_espera: List[float] = []
        self.derivaciones_enviadas = 0
        self.derivaciones_recibidas = 0
        
        # Servicios externos para factores de demanda
        self.weather_service = WeatherService()
        self.holidays_service = HolidaysService()
        self.events_service = EventsService()
        self.football_service = FootballService()
        
    def calcular_saturacion(self) -> float:
        """Calcula nivel de saturación del hospital (0-1)"""
        # Peso: ocupación boxes (50%) + cola espera (30%) + observación (20%)
        ocupacion_boxes = self.boxes.count / self.config.boxes_consulta
        cola_normalizada = min(len(self.cola_espera) / 20, 1.0)  # Normalizar a 20 pacientes
        ocupacion_obs = self.observacion.count / self.config.camas_observacion
        
        return 0.5 * ocupacion_boxes + 0.3 * cola_normalizada + 0.2 * ocupacion_obs
    
    def calcular_factor_demanda(self) -> float:
        """Calcula factor de demanda basado en contexto externo"""
        factor = 1.0
        
        # Factor horario
        hora = (self.env.now / 60) % 24
        if 8 <= hora < 14:
            factor *= 1.3  # Mañana alta demanda
        elif 14 <= hora < 22:
            factor *= 1.1  # Tarde moderada
        elif 22 <= hora or hora < 6:
            factor *= 0.6  # Noche baja
        
        # Factor día de semana
        dia = int((self.env.now / (24 * 60)) % 7)
        if dia in [5, 6]:  # Fin de semana
            factor *= 1.2
        
        # Factor externo (clima, eventos, festivos)
        factor *= self.factor_demanda
        
        return factor
    
    def generar_nivel_triaje(self) -> NivelTriaje:
        """Genera nivel de triaje según probabilidades"""
        r = random.random()
        acum = 0
        for nivel in NivelTriaje:
            acum += CONFIG_TRIAJE[nivel]["probabilidad"]
            if r <= acum:
                return nivel
        return NivelTriaje.VERDE
    
    def proceso_llegadas(self):
        """Proceso principal de llegada de pacientes"""
        while True:
            # Tiempo entre llegadas (exponencial)
            tasa_base = self.config.pacientes_dia_base / (24 * 60)
            tasa = tasa_base * self.calcular_factor_demanda()
            tiempo = random.expovariate(tasa) if tasa > 0 else 60
            
            yield self.env.timeout(tiempo)
            
            # Crear paciente
            self.paciente_counter += 1
            nivel = self.generar_nivel_triaje()
            paciente = Paciente(
                id=self.paciente_counter,
                hospital_id=self.config.id,
                nivel_triaje=nivel,
                patologia=random.choice(PATOLOGIAS[nivel]),
                t_llegada=self.env.now,
            )
            
            self.pacientes_activos[paciente.id] = paciente
            self.llegadas_hora.append(self.env.now)
            
            # Iniciar proceso del paciente
            self.env.process(self.proceso_paciente(paciente))
    
    def proceso_paciente(self, paciente: Paciente):
        """Flujo completo del paciente"""
        
        # 1. RECEPCIÓN (~5 minutos)
        paciente.estado = EstadoPaciente.EN_RECEPCION
        with self.recepcion.request() as req:
            yield req
            tiempo_recepcion = random.uniform(3, 7)
            yield self.env.timeout(tiempo_recepcion)
            paciente.t_fin_recepcion = self.env.now
        
        # 2. ESPERA PARA TRIAJE
        paciente.estado = EstadoPaciente.ESPERA_TRIAJE
        
        # 3. TRIAJE (~10 minutos)
        with self.triaje.request() as req:
            yield req
            paciente.estado = EstadoPaciente.EN_TRIAJE
            tiempo_triaje = random.uniform(8, 12)
            yield self.env.timeout(tiempo_triaje)
            paciente.t_fin_triaje = self.env.now
        
        # Evaluar derivación después del triaje
        if self.coordinador:
            destino = self.coordinador.evaluar_derivacion(paciente, self.config.id)
            if destino:
                # Paciente derivado - transferir al otro hospital
                self.derivaciones_enviadas += 1
                if paciente.id in self.pacientes_activos:
                    del self.pacientes_activos[paciente.id]
                
                # El coordinador lo insertará en el hospital destino
                hospital_destino = self.coordinador.hospitales[destino]
                hospital_destino.recibir_derivado(paciente)
                
                self._publicar_evento("derivacion", paciente)
                return
        
        # 4. ESPERA PARA CONSULTA (cola por prioridad)
        paciente.estado = EstadoPaciente.ESPERA_CONSULTA
        self.cola_espera.append(paciente)
        self.cola_espera.sort(key=lambda p: p.nivel_triaje.value)  # Ordenar por prioridad
        
        # 5. CONSULTA EN BOX
        with self.boxes.request(priority=paciente.nivel_triaje.value) as req:
            yield req
            if paciente in self.cola_espera:
                self.cola_espera.remove(paciente)
            paciente.estado = EstadoPaciente.EN_CONSULTA
            paciente.t_inicio_consulta = self.env.now
            
            config = CONFIG_TRIAJE[paciente.nivel_triaje]
            tiempo_min, tiempo_max = config["tiempo_consulta"]
            yield self.env.timeout(random.uniform(tiempo_min, tiempo_max))
            paciente.t_fin_consulta = self.env.now
        
        # Registrar tiempo de espera
        self.tiempos_espera.append(paciente.tiempo_espera_total)
        
        # 6. DECISIÓN: OBSERVACIÓN O ALTA
        if random.random() < config["prob_observacion"]:
            # Pasar a observación
            paciente.estado = EstadoPaciente.EN_OBSERVACION
            with self.observacion.request() as req:
                yield req
                tiempo_obs = random.uniform(60, 240)  # 1-4 horas
                yield self.env.timeout(tiempo_obs)
        
        # 7. ALTA
        paciente.estado = EstadoPaciente.ALTA
        paciente.t_salida = self.env.now
        
        # Mover a historial (eliminación segura)
        if paciente.id in self.pacientes_activos:
            del self.pacientes_activos[paciente.id]
        self.historial.append(paciente)
        
        self._publicar_evento("alta", paciente)
    
    def recibir_derivado(self, paciente: Paciente):
        """Recibe un paciente derivado de otro hospital"""
        paciente.hospital_id = self.config.id
        paciente.t_llegada = self.env.now  # Hora de llegada al nuevo hospital
        self.derivaciones_recibidas += 1
        self.pacientes_activos[paciente.id] = paciente
        
        # Iniciar proceso (salta recepción, va directo a consulta)
        self.env.process(self._proceso_derivado(paciente))
    
    def _proceso_derivado(self, paciente: Paciente):
        """Proceso para paciente derivado (prioridad en consulta)"""
        paciente.estado = EstadoPaciente.ESPERA_CONSULTA
        self.cola_espera.insert(0, paciente)  # Prioridad
        
        with self.boxes.request(priority=paciente.nivel_triaje.value) as req:
            yield req
            if paciente in self.cola_espera:
                self.cola_espera.remove(paciente)
            paciente.estado = EstadoPaciente.EN_CONSULTA
            paciente.t_inicio_consulta = self.env.now
            
            config = CONFIG_TRIAJE[paciente.nivel_triaje]
            tiempo_min, tiempo_max = config["tiempo_consulta"]
            yield self.env.timeout(random.uniform(tiempo_min, tiempo_max))
            paciente.t_fin_consulta = self.env.now
        
        # Registrar tiempo de espera
        self.tiempos_espera.append(paciente.tiempo_espera_total)
        
        # Observación si es necesario
        if random.random() < config["prob_observacion"]:
            paciente.estado = EstadoPaciente.EN_OBSERVACION
            with self.observacion.request() as req:
                yield req
                yield self.env.timeout(random.uniform(60, 240))
        
        paciente.estado = EstadoPaciente.ALTA
        paciente.t_salida = self.env.now
        
        # Eliminación segura
        if paciente.id in self.pacientes_activos:
            del self.pacientes_activos[paciente.id]
        self.historial.append(paciente)
    
    def obtener_estado(self) -> EstadoHospital:
        """Obtiene estado actual para visualización"""
        # Contar pacientes por estado
        en_recepcion = sum(1 for p in self.pacientes_activos.values() if p.estado == EstadoPaciente.EN_RECEPCION)
        en_triaje = sum(1 for p in self.pacientes_activos.values() if p.estado == EstadoPaciente.EN_TRIAJE)
        en_espera = sum(1 for p in self.pacientes_activos.values() if p.estado in [EstadoPaciente.ESPERA_TRIAJE, EstadoPaciente.ESPERA_CONSULTA])
        en_consulta = self.boxes.count
        en_observacion = self.observacion.count
        
        # Cola por nivel
        cola_nivel = {}
        for nivel in NivelTriaje:
            cola_nivel[nivel.value] = sum(1 for p in self.cola_espera if p.nivel_triaje == nivel)
        
        # Tiempo espera medio (últimos 10)
        tiempo_medio = sum(self.tiempos_espera[-10:]) / max(len(self.tiempos_espera[-10:]), 1)
        
        # Llegadas última hora
        hace_1h = self.env.now - 60
        llegadas_hora = sum(1 for t in self.llegadas_hora if t > hace_1h)
        
        return EstadoHospital(
            hospital_id=self.config.id,
            timestamp=self.env.now,
            en_recepcion=en_recepcion,
            en_sala_espera=en_espera,
            en_triaje=en_triaje,
            en_consulta=en_consulta,
            en_observacion=en_observacion,
            boxes_ocupados=self.boxes.count,
            boxes_total=self.config.boxes_consulta,
            observacion_ocupadas=self.observacion.count,
            observacion_total=self.config.camas_observacion,
            cola_por_nivel=cola_nivel,
            tiempo_espera_medio=tiempo_medio,
            pacientes_hora=llegadas_hora,
            derivaciones_enviadas=self.derivaciones_enviadas,
            derivaciones_recibidas=self.derivaciones_recibidas,
            saturacion=self.calcular_saturacion(),
            alerta_activa=self.calcular_saturacion() >= 0.85,
        )
    
    def _publicar_evento(self, tipo: str, paciente: Paciente):
        """Publica evento MQTT"""
        if self.mqtt_client and self.mqtt_client.is_connected():
            topic = f"urgencias/{self.config.id}/{tipo}"
            payload = json.dumps(paciente.to_dict())
            self.mqtt_client.publish(topic, payload)


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR DE INCIDENTES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Incidente:
    """Incidente que genera múltiples pacientes simultáneamente"""
    id: int
    tipo: str
    descripcion: str
    hospital_id: str
    timestamp: float
    pacientes_generados: int
    nivel_predominante: NivelTriaje
    activo: bool = True


class GeneradorIncidentes:
    """
    Genera incidentes aleatorios que provocan picos de demanda.
    Útil para visualizar derivaciones entre hospitales.
    """
    
    TIPOS_INCIDENTE = [
        {
            "tipo": "accidente_trafico",
            "descripcion": "Accidente de tráfico múltiple",
            "pacientes": (3, 8),
            "nivel": NivelTriaje.NARANJA,
            "prob_grave": 0.3,
        },
        {
            "tipo": "incendio",
            "descripcion": "Incendio en edificio",
            "pacientes": (5, 15),
            "nivel": NivelTriaje.NARANJA,
            "prob_grave": 0.2,
        },
        {
            "tipo": "intoxicacion_masiva",
            "descripcion": "Intoxicación alimentaria masiva",
            "pacientes": (10, 30),
            "nivel": NivelTriaje.AMARILLO,
            "prob_grave": 0.05,
        },
        {
            "tipo": "evento_deportivo",
            "descripcion": "Lesiones en evento deportivo",
            "pacientes": (5, 12),
            "nivel": NivelTriaje.VERDE,
            "prob_grave": 0.1,
        },
        {
            "tipo": "ola_calor",
            "descripcion": "Golpes de calor por ola de calor",
            "pacientes": (8, 20),
            "nivel": NivelTriaje.AMARILLO,
            "prob_grave": 0.15,
        },
    ]
    
    def __init__(self, hospitales: Dict[str, HospitalUrgencias], coordinador: CoordinadorDerivaciones):
        self.hospitales = hospitales
        self.coordinador = coordinador
        self.incidentes: List[Incidente] = []
        self.incidente_counter = 0
        self.paciente_global_counter = 10000  # Empezar en 10000 para evitar colisiones
        
    def generar_incidente(self, env: simpy.Environment, hospital_id: str = None) -> Incidente:
        """Genera un incidente aleatorio"""
        self.incidente_counter += 1
        
        # Seleccionar tipo aleatorio
        config = random.choice(self.TIPOS_INCIDENTE)
        
        # Seleccionar hospital (preferentemente no CHUAC para ver derivaciones)
        if hospital_id is None:
            # Usar hospitales disponibles que no sean de referencia
            hospitales_no_ref = [
                h_id for h_id, h in self.hospitales.items() 
                if not h.config.es_referencia
            ]
            if hospitales_no_ref:
                hospital_id = random.choice(hospitales_no_ref)
            else:
                hospital_id = random.choice(list(self.hospitales.keys()))
        
        num_pacientes = random.randint(*config["pacientes"])
        
        incidente = Incidente(
            id=self.incidente_counter,
            tipo=config["tipo"],
            descripcion=config["descripcion"],
            hospital_id=hospital_id,
            timestamp=env.now,
            pacientes_generados=num_pacientes,
            nivel_predominante=config["nivel"],
        )
        
        self.incidentes.append(incidente)
        
        # Generar pacientes del incidente
        hospital = self.hospitales[hospital_id]
        for i in range(num_pacientes):
            # Determinar nivel según probabilidad de gravedad
            if random.random() < config["prob_grave"]:
                nivel = random.choice([NivelTriaje.ROJO, NivelTriaje.NARANJA])
            else:
                nivel = config["nivel"]
            
            # ID único global para evitar colisiones
            self.paciente_global_counter += 1
            paciente = Paciente(
                id=self.paciente_global_counter,
                hospital_id=hospital_id,
                nivel_triaje=nivel,
                patologia=f"{config['descripcion']} - Víctima {i+1}",
                t_llegada=env.now + random.uniform(0, 10),  # Llegadas escalonadas
            )
            
            hospital.pacientes_activos[paciente.id] = paciente
            env.process(hospital.proceso_paciente(paciente))
        
        return incidente
    
    def proceso_incidentes_aleatorios(self, env: simpy.Environment, intervalo_medio: float = 120):
        """Genera incidentes aleatorios durante la simulación"""
        while True:
            # Esperar tiempo aleatorio (exponencial)
            yield env.timeout(random.expovariate(1/intervalo_medio))
            
            incidente = self.generar_incidente(env)
            print(f"\n🚨 INCIDENTE [{env.now:.0f}min]: {incidente.descripcion}")
            print(f"   Hospital: {incidente.hospital_id.upper()}")
            print(f"   Pacientes: {incidente.pacientes_generados}")
            print(f"   Nivel predominante: {CONFIG_TRIAJE[incidente.nivel_predominante]['nombre']}")


# ═══════════════════════════════════════════════════════════════════════════════
# SIMULADOR PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

class SimuladorUrgencias:
    """
    Simulador principal que coordina múltiples hospitales.
    """
    
    def __init__(
        self,
        hospitales_ids: List[str] = None,
        mqtt_broker: str = "localhost",
        mqtt_port: int = 1883,
        velocidad: float = 1.0,
        con_incidentes: bool = True,
        intervalo_incidentes: float = 90,  # minutos entre incidentes
    ):
        self.env = simpy.Environment()
        self.velocidad = velocidad
        self.hospitales_ids = hospitales_ids or list(HOSPITALES.keys())
        self.con_incidentes = con_incidentes
        self.intervalo_incidentes = intervalo_incidentes
        
        # MQTT
        self.mqtt_client = self._conectar_mqtt(mqtt_broker, mqtt_port)
        
        # Crear hospitales
        self.hospitales: Dict[str, HospitalUrgencias] = {}
        for h_id in self.hospitales_ids:
            config = HOSPITALES[h_id]
            self.hospitales[h_id] = HospitalUrgencias(
                env=self.env,
                config=config,
                mqtt_client=self.mqtt_client,
            )
        
        # Crear coordinador
        self.coordinador = CoordinadorDerivaciones(self.hospitales)
        for h in self.hospitales.values():
            h.coordinador = self.coordinador
        
        # Generador de incidentes
        self.generador_incidentes = GeneradorIncidentes(self.hospitales, self.coordinador)
        
        # Servicios externos
        self.weather_service = WeatherService()
        self.holidays_service = HolidaysService()
        self.events_service = EventsService()
        
    def _conectar_mqtt(self, broker: str, port: int) -> Optional[mqtt.Client]:
        """Conecta al broker MQTT"""
        try:
            client = mqtt.Client(client_id=f"simulador-{random.randint(1000,9999)}")
            client.connect(broker, port, 60)
            client.loop_start()
            return client
        except Exception:
            return None
    
    def actualizar_factores_demanda(self):
        """Actualiza factores de demanda externos"""
        from datetime import date
        factor = 1.0
        
        # Clima
        try:
            clima = self.weather_service.obtener_clima()
            if clima:
                factor *= clima.factor_temperatura()
                factor *= clima.factor_lluvia()
        except (ConnectionError, TimeoutError):
            pass
        
        # Festivos
        try:
            if self.holidays_service.es_festivo(date.today()):
                factor *= 1.25
        except (ConnectionError, TimeoutError):
            pass
        
        # Eventos
        try:
            eventos = self.events_service.obtener_eventos_fecha(date.today())
            if eventos:
                factor *= 1.15
        except (ConnectionError, TimeoutError):
            pass
        
        # Aplicar a todos los hospitales
        for h in self.hospitales.values():
            h.factor_demanda = factor
    
    def proceso_publicar_estado(self, intervalo: float = 5):
        """Publica estado de hospitales periódicamente"""
        while True:
            yield self.env.timeout(intervalo)
            
            for h_id, hospital in self.hospitales.items():
                estado = hospital.obtener_estado()
                
                if self.mqtt_client and self.mqtt_client.is_connected():
                    topic = f"urgencias/{h_id}/estado"
                    payload = json.dumps(estado.to_dict())
                    self.mqtt_client.publish(topic, payload)
            
            # Estado del coordinador
            if self.mqtt_client and self.mqtt_client.is_connected():
                estado_coord = self.coordinador.obtener_estado_sistema()
                self.mqtt_client.publish("urgencias/coordinador/estado", json.dumps(estado_coord))
    
    def ejecutar(self, duracion_horas: float = 24):
        """Ejecuta la simulación"""
        print(f"\n{'═'*60}")
        print("  SIMULADOR DE URGENCIAS v2.0")
        print(f"  Hospitales: {', '.join(self.hospitales_ids)}")
        print(f"  Duración: {duracion_horas} horas simuladas")
        print(f"  Incidentes: {'Sí' if self.con_incidentes else 'No'}")
        print(f"{'═'*60}\n")
        
        # Iniciar procesos
        for hospital in self.hospitales.values():
            self.env.process(hospital.proceso_llegadas())
        
        self.env.process(self.proceso_publicar_estado())
        
        # Iniciar generador de incidentes si está habilitado
        if self.con_incidentes:
            self.env.process(
                self.generador_incidentes.proceso_incidentes_aleatorios(
                    self.env, 
                    self.intervalo_incidentes
                )
            )
        
        # Ejecutar
        duracion_minutos = duracion_horas * 60
        self.env.run(until=duracion_minutos)
        
        # Resumen
        self._imprimir_resumen()
    
    def _imprimir_resumen(self):
        """Imprime resumen de la simulación"""
        print(f"\n{'═'*60}")
        print("  RESUMEN DE SIMULACIÓN")
        print(f"{'═'*60}\n")
        
        total_sistema = 0
        for h in self.hospitales.values():
            total = len(h.historial) + len(h.pacientes_activos)
            total_sistema += total
            espera_media = sum(h.tiempos_espera) / max(len(h.tiempos_espera), 1)
            
            print(f"📍 {h.config.nombre}")
            print(f"   Pacientes total: {total}")
            print(f"   Pacientes atendidos: {len(h.historial)}")
            print(f"   En sistema: {len(h.pacientes_activos)}")
            print(f"   Tiempo espera medio: {espera_media:.1f} min")
            print(f"   Derivaciones enviadas: {h.derivaciones_enviadas}")
            print(f"   Derivaciones recibidas: {h.derivaciones_recibidas}")
            print()
        
        print(f"📊 Total pacientes sistema: {total_sistema}")
        print(f"🔄 Total derivaciones: {len(self.coordinador.derivaciones)}")
        
        # Mostrar incidentes si hubo
        if self.generador_incidentes.incidentes:
            print(f"🚨 Incidentes generados: {len(self.generador_incidentes.incidentes)}")
        
        if self.coordinador.alerta_sistema:
            print("⚠️  Hubo alertas de saturación del sistema")


# ═══════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    sim = SimuladorUrgencias(
        hospitales_ids=["chuac", "modelo", "san_rafael"],
        mqtt_broker="localhost",
        mqtt_port=1883,
    )
    sim.ejecutar(duracion_horas=24)
