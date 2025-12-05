"""
═══════════════════════════════════════════════════════════════════════════════
COORDINADOR CENTRAL - Sistema de Coordinación de Urgencias
═══════════════════════════════════════════════════════════════════════════════
Gestiona la coordinación entre múltiples hospitales:
- Detecta saturación automáticamente
- Deriva pacientes al hospital con menor tiempo de espera
- Activa modo emergencia cuando se detectan picos anómalos
- Genera alertas para la población
- DISTRIBUCIÓN INTELIGENTE de pacientes en incidentes

Día 2 del proyecto.
═══════════════════════════════════════════════════════════════════════════════
"""

import simpy
import json
import random
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, TYPE_CHECKING
from enum import Enum
from datetime import datetime
import paho.mqtt.client as mqtt

if TYPE_CHECKING:
    from simulador import HospitalUrgencias, Paciente


# ═══════════════════════════════════════════════════════════════════════════════
# TIPOS DE EMERGENCIA
# ═══════════════════════════════════════════════════════════════════════════════

class TipoEmergencia(Enum):
    """Tipos de emergencias masivas"""
    ACCIDENTE_MULTIPLE = "accidente_multiple"
    BROTE_VIRICO = "brote_virico"
    EVENTO_MASIVO = "evento_masivo"
    INCENDIO = "incendio"
    INTOXICACION_MASIVA = "intoxicacion_masiva"


@dataclass
class ConfigEmergencia:
    """Configuración de cada tipo de emergencia"""
    nombre: str
    descripcion: str
    pacientes_extra_min: int
    pacientes_extra_max: int
    duracion_horas_min: float
    duracion_horas_max: float
    # Distribución de triaje durante emergencia (niveles 1-5)
    distribucion_triaje: Dict[int, float]
    # Ubicación típica del incidente (lat, lon) - None = aleatorio
    ubicacion_tipica: Optional[Tuple[float, float]] = None


# Coordenadas de referencia en A Coruña
UBICACIONES_INCIDENTES = {
    "autopista_a6": (43.3300, -8.3800),  # A-6 salida A Coruña
    "autopista_ap9": (43.3400, -8.3500),  # AP-9 
    "centro_ciudad": (43.3713, -8.3960),  # Centro
    "riazor": (43.3623, -8.4115),  # Estadio Riazor
    "coliseum": (43.3350, -8.4100),  # Coliseum
    "puerto": (43.3680, -8.3950),  # Puerto
    "marineda": (43.3480, -8.4200),  # Marineda City
}

EMERGENCIAS_CONFIG = {
    TipoEmergencia.ACCIDENTE_MULTIPLE: ConfigEmergencia(
        nombre="Accidente Múltiple",
        descripcion="Colisión múltiple en A-6 / AP-9",
        pacientes_extra_min=15,
        pacientes_extra_max=30,
        duracion_horas_min=2,
        duracion_horas_max=4,
        distribucion_triaje={1: 0.20, 2: 0.40, 3: 0.30, 4: 0.10, 5: 0.00},
        ubicacion_tipica=UBICACIONES_INCIDENTES["autopista_a6"]
    ),
    TipoEmergencia.BROTE_VIRICO: ConfigEmergencia(
        nombre="Brote Vírico",
        descripcion="Brote de gastroenteritis / gripe",
        pacientes_extra_min=50,
        pacientes_extra_max=100,
        duracion_horas_min=72,  # 3 días
        duracion_horas_max=168,  # 7 días
        distribucion_triaje={1: 0.00, 2: 0.05, 3: 0.30, 4: 0.50, 5: 0.15},
        ubicacion_tipica=None  # Distribuido por toda la ciudad
    ),
    TipoEmergencia.EVENTO_MASIVO: ConfigEmergencia(
        nombre="Evento Masivo",
        descripcion="Incidentes en Riazor / Coliseum",
        pacientes_extra_min=20,
        pacientes_extra_max=50,
        duracion_horas_min=4,
        duracion_horas_max=8,
        distribucion_triaje={1: 0.05, 2: 0.10, 3: 0.30, 4: 0.45, 5: 0.10},
        ubicacion_tipica=UBICACIONES_INCIDENTES["riazor"]
    ),
    TipoEmergencia.INCENDIO: ConfigEmergencia(
        nombre="Incendio en Edificio",
        descripcion="Incendio con múltiples afectados",
        pacientes_extra_min=10,
        pacientes_extra_max=25,
        duracion_horas_min=3,
        duracion_horas_max=6,
        distribucion_triaje={1: 0.15, 2: 0.35, 3: 0.35, 4: 0.15, 5: 0.00},
        ubicacion_tipica=UBICACIONES_INCIDENTES["centro_ciudad"]
    ),
    TipoEmergencia.INTOXICACION_MASIVA: ConfigEmergencia(
        nombre="Intoxicación Alimentaria Masiva",
        descripcion="Intoxicación masiva en evento/restaurante",
        pacientes_extra_min=30,
        pacientes_extra_max=80,
        duracion_horas_min=6,
        duracion_horas_max=12,
        distribucion_triaje={1: 0.02, 2: 0.10, 3: 0.35, 4: 0.45, 5: 0.08},
        ubicacion_tipica=UBICACIONES_INCIDENTES["marineda"]
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTA DEL SISTEMA
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Alerta:
    """Representa una alerta del sistema"""
    tipo: str
    nivel: str  # info, warning, critical
    mensaje: str
    hospital_id: Optional[str]
    timestamp: float
    datos: Dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "tipo": self.tipo,
            "nivel": self.nivel,
            "mensaje": self.mensaje,
            "hospital_id": self.hospital_id,
            "timestamp": self.timestamp,
            "datos": self.datos
        }


# ═══════════════════════════════════════════════════════════════════════════════
# COORDINADOR CENTRAL
# ═══════════════════════════════════════════════════════════════════════════════

class CoordinadorCentral:
    """
    Coordina múltiples hospitales y gestiona:
    - Derivaciones entre hospitales
    - Detección automática de saturación
    - Activación de modo emergencia
    - Alertas a la población
    """
    
    # Umbrales de saturación
    UMBRAL_SATURACION_WARNING = 0.70  # 70% ocupación
    UMBRAL_SATURACION_CRITICAL = 0.85  # 85% ocupación
    UMBRAL_DERIVACION = 0.80  # Derivar cuando supera 80%
    
    def __init__(self, env: simpy.Environment, hospitales: Dict[str, 'HospitalUrgencias'],
                 mqtt_client: Optional[mqtt.Client] = None):
        self.env = env
        self.hospitales = hospitales
        self.mqtt_client = mqtt_client
        
        # Estado
        self.emergencia_activa = False
        self.tipo_emergencia: Optional[TipoEmergencia] = None
        self.emergencia_inicio: Optional[float] = None
        self.emergencia_fin: Optional[float] = None
        
        # Estadísticas de coordinación
        self.derivaciones_totales = 0
        self.derivaciones_por_hospital: Dict[str, int] = {h: 0 for h in hospitales}
        self.alertas_emitidas: List[Alerta] = []
        
        # Minutos ahorrados por derivaciones (estimado)
        self.minutos_ahorrados = 0
        
        print(f"🎯 Coordinador Central inicializado")
        print(f"   - Hospitales coordinados: {len(hospitales)}")
        print(f"   - Umbral derivación: {self.UMBRAL_DERIVACION*100:.0f}%")
    
    def proceso_coordinacion(self):
        """Proceso principal de coordinación (cada minuto simulado)"""
        while True:
            yield self.env.timeout(1)  # Cada minuto
            
            # Verificar estado de emergencia
            self._verificar_emergencia()
            
            # Verificar saturación de hospitales
            self._verificar_saturacion()
            
            # Publicar estado del coordinador
            self._publicar_estado()
    
    def _verificar_emergencia(self):
        """Verifica si debe terminar una emergencia activa"""
        if self.emergencia_activa and self.emergencia_fin:
            if self.env.now >= self.emergencia_fin:
                self._desactivar_emergencia()
    
    def _verificar_saturacion(self):
        """Verifica niveles de saturación y emite alertas"""
        for hospital_id, hospital in self.hospitales.items():
            saturacion = hospital.stats.nivel_saturacion
            
            # Alerta crítica
            if saturacion >= self.UMBRAL_SATURACION_CRITICAL:
                if not any(a.tipo == "saturacion_critica" and a.hospital_id == hospital_id 
                          and self.env.now - a.timestamp < 30 for a in self.alertas_emitidas):
                    self._emitir_alerta(Alerta(
                        tipo="saturacion_critica",
                        nivel="critical",
                        mensaje=f"⚠️ SATURACIÓN CRÍTICA en {hospital.config.nombre}",
                        hospital_id=hospital_id,
                        timestamp=self.env.now,
                        datos={"saturacion": saturacion, "boxes_ocupados": hospital.stats.boxes_ocupados}
                    ))
            
            # Alerta warning
            elif saturacion >= self.UMBRAL_SATURACION_WARNING:
                if not any(a.tipo == "saturacion_alta" and a.hospital_id == hospital_id 
                          and self.env.now - a.timestamp < 60 for a in self.alertas_emitidas):
                    self._emitir_alerta(Alerta(
                        tipo="saturacion_alta",
                        nivel="warning",
                        mensaje=f"⚡ Saturación alta en {hospital.config.nombre}",
                        hospital_id=hospital_id,
                        timestamp=self.env.now,
                        datos={"saturacion": saturacion}
                    ))
    
    def decidir_hospital_destino(self, hospital_origen: str, nivel_triaje: int) -> Optional[str]:
        """
        Decide si derivar un paciente y a qué hospital.
        
        Returns:
            ID del hospital destino, o None si no se deriva
        """
        hospital = self.hospitales[hospital_origen]
        
        # No derivar si el hospital origen no está saturado
        if hospital.stats.nivel_saturacion < self.UMBRAL_DERIVACION:
            return None
        
        # No derivar casos críticos (nivel 1) - se atienden donde llegan
        if nivel_triaje == 1:
            return None
        
        # Buscar hospital con menor saturación
        mejor_hospital = None
        menor_saturacion = hospital.stats.nivel_saturacion
        
        for h_id, h in self.hospitales.items():
            if h_id != hospital_origen:
                if h.stats.nivel_saturacion < menor_saturacion:
                    menor_saturacion = h.stats.nivel_saturacion
                    mejor_hospital = h_id
        
        # Solo derivar si hay mejora significativa (>10%)
        if mejor_hospital and (hospital.stats.nivel_saturacion - menor_saturacion) > 0.10:
            self.derivaciones_totales += 1
            self.derivaciones_por_hospital[hospital_origen] += 1
            
            # Estimar minutos ahorrados (diferencia de tiempos de espera)
            tiempo_origen = hospital.stats.tiempo_medio_espera
            tiempo_destino = self.hospitales[mejor_hospital].stats.tiempo_medio_espera
            ahorro = max(0, tiempo_origen - tiempo_destino)
            self.minutos_ahorrados += ahorro
            
            # Log de derivación
            print(f"   🚑 Derivación: {hospital_origen.upper()} → {mejor_hospital.upper()} "
                  f"(saturación {hospital.stats.nivel_saturacion*100:.0f}% → {menor_saturacion*100:.0f}%)")
            
            return mejor_hospital
        
        return None
    
    def calcular_tiempo_espera_estimado(self, hospital_id: str, nivel_triaje: int) -> float:
        """Calcula el tiempo de espera estimado para un paciente"""
        hospital = self.hospitales[hospital_id]
        
        # Tiempo base según ocupación
        ocupacion = hospital.boxes.count / hospital.config.num_boxes
        
        # Pacientes en cola con mayor o igual prioridad
        pacientes_prioritarios = sum(
            1 for p in hospital.cola_espera_atencion 
            if p.nivel_triaje.value <= nivel_triaje
        )
        
        # Estimación: cada paciente ~ 20-40 min
        tiempo_base = pacientes_prioritarios * 25
        
        # Factor de ocupación
        if ocupacion > 0.8:
            tiempo_base *= 1.5
        elif ocupacion > 0.6:
            tiempo_base *= 1.2
        
        return tiempo_base
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # DISTRIBUCIÓN INTELIGENTE DE PACIENTES EN INCIDENTES
    # ═══════════════════════════════════════════════════════════════════════════════
    
    def _calcular_distancia(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calcula distancia en km usando fórmula de Haversine"""
        R = 6371  # Radio de la Tierra en km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def _calcular_score_hospital(self, hospital_id: str, ubicacion_incidente: Optional[Tuple[float, float]], 
                                  nivel_triaje: int) -> Tuple[float, Dict]:
        """
        Calcula un score para cada hospital considerando:
        - Distancia al incidente (peso: 30%)
        - Nivel de saturación actual (peso: 35%)
        - Tiempo de espera estimado (peso: 25%)
        - Capacidad disponible (peso: 10%)
        
        Returns:
            (score, detalles) - menor score = mejor opción
        """
        hospital = self.hospitales[hospital_id]
        
        # 1. DISTANCIA (0-10 km normalizado a 0-1)
        if ubicacion_incidente:
            distancia = self._calcular_distancia(
                ubicacion_incidente[0], ubicacion_incidente[1],
                hospital.config.lat, hospital.config.lon
            )
            # Normalizar: 0 km = 0, 10+ km = 1
            score_distancia = min(distancia / 10.0, 1.0)
        else:
            # Sin ubicación específica, usar score neutral
            score_distancia = 0.5
        
        # 2. SATURACIÓN (0-1)
        score_saturacion = hospital.stats.nivel_saturacion
        
        # 3. TIEMPO DE ESPERA ESTIMADO (normalizado a 0-1, max 120 min)
        tiempo_espera = self.calcular_tiempo_espera_estimado(hospital_id, nivel_triaje)
        score_tiempo = min(tiempo_espera / 120.0, 1.0)
        
        # 4. CAPACIDAD DISPONIBLE (invertido: más capacidad = menor score)
        boxes_libres = hospital.config.num_boxes - hospital.boxes.count
        capacidad_relativa = boxes_libres / hospital.config.num_boxes
        score_capacidad = 1.0 - capacidad_relativa
        
        # SCORE FINAL PONDERADO
        score_final = (
            score_distancia * 0.30 +
            score_saturacion * 0.35 +
            score_tiempo * 0.25 +
            score_capacidad * 0.10
        )
        
        detalles = {
            "hospital": hospital_id,
            "hospital_nombre": hospital.config.nombre.split(" - ")[0],
            "distancia_km": round(distancia, 2) if ubicacion_incidente else None,
            "saturacion_pct": round(score_saturacion * 100, 1),
            "tiempo_espera_min": round(tiempo_espera, 0),
            "boxes_libres": boxes_libres,
            "score_final": round(score_final, 3)
        }
        
        return score_final, detalles
    
    def distribuir_pacientes_incidente(self, tipo_emergencia: TipoEmergencia, 
                                        ubicacion: Optional[Tuple[float, float]] = None) -> Dict[str, int]:
        """
        Distribuye inteligentemente los pacientes de un incidente entre hospitales.
        
        Args:
            tipo_emergencia: Tipo de emergencia
            ubicacion: Coordenadas (lat, lon) del incidente. Si None, usa ubicación típica del tipo
        
        Returns:
            Dict con cantidad de pacientes asignados a cada hospital
        """
        config = EMERGENCIAS_CONFIG[tipo_emergencia]
        
        # Usar ubicación proporcionada o la típica del tipo de emergencia
        ubicacion_final = ubicacion or config.ubicacion_tipica
        
        # Generar número de pacientes
        num_pacientes = random.randint(config.pacientes_extra_min, config.pacientes_extra_max)
        
        # Calcular scores para cada hospital
        scores = {}
        detalles_hospitales = []
        for h_id in self.hospitales:
            # Usar nivel triaje promedio (3) para el cálculo inicial
            score, detalles = self._calcular_score_hospital(h_id, ubicacion_final, nivel_triaje=3)
            scores[h_id] = score
            detalles_hospitales.append(detalles)
        
        # Invertir scores para obtener pesos (menor score = mayor peso)
        max_score = max(scores.values()) + 0.001  # Evitar división por 0
        pesos = {h_id: max_score - score for h_id, score in scores.items()}
        total_pesos = sum(pesos.values())
        
        # Normalizar pesos
        pesos_normalizados = {h_id: peso / total_pesos for h_id, peso in pesos.items()}
        
        # Distribuir pacientes proporcionalmente
        distribucion = {}
        pacientes_asignados = 0
        
        for h_id in sorted(pesos_normalizados.keys(), key=lambda x: pesos_normalizados[x], reverse=True):
            if h_id == list(pesos_normalizados.keys())[-1]:
                # Último hospital recibe los restantes
                distribucion[h_id] = num_pacientes - pacientes_asignados
            else:
                asignados = int(num_pacientes * pesos_normalizados[h_id])
                # Mínimo 1 paciente por hospital si hay capacidad
                asignados = max(1, asignados) if pesos_normalizados[h_id] > 0.1 else asignados
                distribucion[h_id] = asignados
                pacientes_asignados += asignados
        
        # Publicar análisis de distribución
        print(f"\n{'─'*60}")
        print(f"📊 ANÁLISIS DE DISTRIBUCIÓN INTELIGENTE")
        print(f"   Tipo: {config.nombre}")
        print(f"   Ubicación: {ubicacion_final if ubicacion_final else 'Distribuido'}")
        print(f"   Total pacientes: {num_pacientes}")
        print(f"{'─'*60}")
        
        for detalles in sorted(detalles_hospitales, key=lambda x: x['score_final']):
            h_id = detalles['hospital']
            asignados = distribucion.get(h_id, 0)
            print(f"   🏥 {detalles['hospital_nombre']}: {asignados} pacientes")
            print(f"      - Distancia: {detalles['distancia_km']} km" if detalles['distancia_km'] else "      - Distancia: N/A")
            print(f"      - Saturación: {detalles['saturacion_pct']}%")
            print(f"      - Tiempo espera: {detalles['tiempo_espera_min']} min")
            print(f"      - Boxes libres: {detalles['boxes_libres']}")
            print(f"      - Score: {detalles['score_final']} (menor = mejor)")
        
        print(f"{'─'*60}\n")
        
        # Publicar por MQTT
        if self.mqtt_client:
            self.mqtt_client.publish("urgencias/coordinador/distribucion", json.dumps({
                "tipo_emergencia": tipo_emergencia.value,
                "ubicacion": ubicacion_final,
                "total_pacientes": num_pacientes,
                "distribucion": distribucion,
                "analisis": detalles_hospitales,
                "timestamp": self.env.now
            }))
        
        return distribucion
    
    def activar_emergencia_global(self, tipo: TipoEmergencia, ubicacion: Optional[Tuple[float, float]] = None):
        """
        Activa una emergencia global y distribuye pacientes inteligentemente.
        Esta es la nueva forma de activar incidentes sin especificar hospital.
        """
        if self.emergencia_activa:
            print(f"⚠️  Ya hay una emergencia activa: {self.tipo_emergencia.value}")
            return {}
        
        config = EMERGENCIAS_CONFIG[tipo]
        self.emergencia_activa = True
        self.tipo_emergencia = tipo
        self.emergencia_inicio = self.env.now
        
        # Calcular duración
        duracion = random.uniform(config.duracion_horas_min, config.duracion_horas_max) * 60
        self.emergencia_fin = self.env.now + duracion
        
        # Distribuir pacientes inteligentemente
        distribucion = self.distribuir_pacientes_incidente(tipo, ubicacion)
        
        # Activar emergencia en hospitales con pacientes asignados
        for hospital_id, num_pacientes in distribucion.items():
            if num_pacientes > 0:
                hospital = self.hospitales[hospital_id]
                hospital.activar_emergencia(tipo.value, num_pacientes)
        
        # Emitir alerta global
        self._emitir_alerta(Alerta(
            tipo="emergencia_activada",
            nivel="critical",
            mensaje=f"🚨 EMERGENCIA: {config.nombre} - {config.descripcion}",
            hospital_id=None,
            timestamp=self.env.now,
            datos={
                "tipo_emergencia": tipo.value,
                "duracion_estimada_horas": round(duracion / 60, 1),
                "pacientes_esperados": sum(distribucion.values()),
                "distribucion": distribucion
            }
        ))
        
        # Alerta a la población
        self._emitir_alerta_poblacion(tipo)
        
        print(f"\n{'═'*60}")
        print(f"🚨 EMERGENCIA GLOBAL ACTIVADA: {config.nombre}")
        print(f"   {config.descripcion}")
        print(f"   Duración estimada: {duracion/60:.1f} horas")
        print(f"   Pacientes distribuidos: {sum(distribucion.values())}")
        for h_id, count in distribucion.items():
            print(f"   - {h_id.upper()}: {count} pacientes")
        print(f"{'═'*60}\n")
        
        return distribucion

    def activar_emergencia(self, tipo: TipoEmergencia):
        """Activa modo emergencia en todo el sistema"""
        if self.emergencia_activa:
            print(f"⚠️  Ya hay una emergencia activa: {self.tipo_emergencia.value}")
            return
        
        config = EMERGENCIAS_CONFIG[tipo]
        self.emergencia_activa = True
        self.tipo_emergencia = tipo
        self.emergencia_inicio = self.env.now
        
        # Calcular duración
        duracion = random.uniform(config.duracion_horas_min, config.duracion_horas_max) * 60
        self.emergencia_fin = self.env.now + duracion
        
        # Activar en todos los hospitales
        for hospital in self.hospitales.values():
            hospital.activar_emergencia(tipo.value)
        
        # Emitir alerta
        self._emitir_alerta(Alerta(
            tipo="emergencia_activada",
            nivel="critical",
            mensaje=f"🚨 EMERGENCIA: {config.nombre} - {config.descripcion}",
            hospital_id=None,
            timestamp=self.env.now,
            datos={
                "tipo_emergencia": tipo.value,
                "duracion_estimada_horas": duracion / 60,
                "pacientes_esperados": f"{config.pacientes_extra_min}-{config.pacientes_extra_max}"
            }
        ))
        
        # Alerta a la población
        self._emitir_alerta_poblacion(tipo)
        
        print(f"\n{'═'*60}")
        print(f"🚨 EMERGENCIA ACTIVADA: {config.nombre}")
        print(f"   {config.descripcion}")
        print(f"   Duración estimada: {duracion/60:.1f} horas")
        print(f"   Pacientes esperados: {config.pacientes_extra_min}-{config.pacientes_extra_max}")
        print(f"{'═'*60}\n")
    
    def _desactivar_emergencia(self):
        """Desactiva el modo emergencia"""
        if not self.emergencia_activa:
            return
        
        tipo = self.tipo_emergencia
        self.emergencia_activa = False
        self.tipo_emergencia = None
        self.emergencia_inicio = None
        self.emergencia_fin = None
        
        # Desactivar en todos los hospitales
        for hospital in self.hospitales.values():
            hospital.desactivar_emergencia()
        
        self._emitir_alerta(Alerta(
            tipo="emergencia_finalizada",
            nivel="info",
            mensaje=f"✅ Emergencia finalizada: {tipo.value}",
            hospital_id=None,
            timestamp=self.env.now,
            datos={}
        ))
        
        print(f"\n✅ EMERGENCIA FINALIZADA\n")
    
    def _emitir_alerta_poblacion(self, tipo: TipoEmergencia):
        """Emite alerta a la población para reducir demanda"""
        mensajes = {
            TipoEmergencia.ACCIDENTE_MULTIPLE: 
                "🚨 ALERTA: Accidente múltiple en curso. Si su urgencia no es grave, "
                "por favor espere o acuda a su centro de salud.",
            TipoEmergencia.BROTE_VIRICO:
                "🦠 ALERTA SANITARIA: Brote vírico activo. Si presenta síntomas leves, "
                "contacte con su médico de atención primaria antes de acudir a urgencias.",
            TipoEmergencia.EVENTO_MASIVO:
                "🏟️ ALERTA: Incidentes en evento masivo. Urgencias con alta ocupación. "
                "Acuda solo en caso de urgencia real."
        }
        
        self._emitir_alerta(Alerta(
            tipo="alerta_poblacion",
            nivel="warning",
            mensaje=mensajes[tipo],
            hospital_id=None,
            timestamp=self.env.now,
            datos={"tipo_emergencia": tipo.value}
        ))
    
    def _emitir_alerta(self, alerta: Alerta):
        """Emite una alerta y la publica por MQTT"""
        self.alertas_emitidas.append(alerta)
        
        # Mantener solo últimas 100 alertas
        if len(self.alertas_emitidas) > 100:
            self.alertas_emitidas = self.alertas_emitidas[-50:]
        
        if self.mqtt_client:
            topic = "urgencias/coordinador/alertas"
            self.mqtt_client.publish(topic, json.dumps(alerta.to_dict()))
    
    def _publicar_estado(self):
        """Publica el estado del coordinador por MQTT"""
        if not self.mqtt_client:
            return

        estado = {
            "timestamp": self.env.now,
            "emergencia_activa": self.emergencia_activa,
            "tipo_emergencia": self.tipo_emergencia.value if self.tipo_emergencia else None,
            "derivaciones_totales": self.derivaciones_totales,
            "minutos_ahorrados": self.minutos_ahorrados,
            "alertas_emitidas": len(self.alertas_emitidas),
            "hospitales": {}
        }
        
        for h_id, hospital in self.hospitales.items():
            estado["hospitales"][h_id] = {
                "saturacion": hospital.stats.nivel_saturacion,
                "boxes_ocupados": hospital.stats.boxes_ocupados,
                "boxes_totales": hospital.stats.boxes_totales,
                "en_cola": hospital.stats.pacientes_en_espera_atencion,
                "tiempo_espera": hospital.stats.tiempo_medio_espera
            }
        
        self.mqtt_client.publish("urgencias/coordinador/estado", json.dumps(estado))
    
    def obtener_resumen(self) -> Dict:
        """Obtiene resumen de la coordinación"""
        return {
            "derivaciones_totales": self.derivaciones_totales,
            "derivaciones_por_hospital": self.derivaciones_por_hospital,
            "minutos_ahorrados": self.minutos_ahorrados,
            "alertas_emitidas": len(self.alertas_emitidas),
            "emergencias_gestionadas": sum(
                1 for a in self.alertas_emitidas if a.tipo == "emergencia_activada"
            )
        }


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR DE EMERGENCIAS ALEATORIAS (para pruebas)
# ═══════════════════════════════════════════════════════════════════════════════

class GeneradorEmergencias:
    """Genera emergencias aleatorias durante la simulación"""
    
    def __init__(self, env: simpy.Environment, coordinador: CoordinadorCentral,
                 probabilidad_diaria: float = 0.3):
        """
        Args:
            probabilidad_diaria: Probabilidad de que ocurra una emergencia cada día
        """
        self.env = env
        self.coordinador = coordinador
        self.probabilidad_diaria = probabilidad_diaria
    
    def proceso_emergencias(self):
        """Proceso que genera emergencias aleatorias"""
        while True:
            # Esperar un tiempo aleatorio (media 8-16 horas)
            yield self.env.timeout(random.uniform(8 * 60, 16 * 60))
            
            # Probabilidad de emergencia
            if random.random() < self.probabilidad_diaria / 2:
                # Seleccionar tipo aleatorio
                tipo = random.choice(list(TipoEmergencia))
                
                # Solo activar si no hay emergencia activa
                if not self.coordinador.emergencia_activa:
                    self.coordinador.activar_emergencia(tipo)
