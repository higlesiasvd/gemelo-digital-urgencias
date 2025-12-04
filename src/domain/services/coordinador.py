"""
═══════════════════════════════════════════════════════════════════════════════
COORDINADOR CENTRAL - Sistema de Coordinación de Urgencias
═══════════════════════════════════════════════════════════════════════════════
Gestiona la coordinación entre múltiples hospitales:
- Detecta saturación automáticamente
- Deriva pacientes al hospital con menor tiempo de espera
- Activa modo emergencia cuando se detectan picos anómalos
- Genera alertas para la población

Día 2 del proyecto.
═══════════════════════════════════════════════════════════════════════════════
"""

import simpy
import json
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, TYPE_CHECKING
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


EMERGENCIAS_CONFIG = {
    TipoEmergencia.ACCIDENTE_MULTIPLE: ConfigEmergencia(
        nombre="Accidente Múltiple",
        descripcion="Colisión múltiple en A-6 / AP-9",
        pacientes_extra_min=15,
        pacientes_extra_max=30,
        duracion_horas_min=2,
        duracion_horas_max=4,
        distribucion_triaje={1: 0.20, 2: 0.40, 3: 0.30, 4: 0.10, 5: 0.00}
    ),
    TipoEmergencia.BROTE_VIRICO: ConfigEmergencia(
        nombre="Brote Vírico",
        descripcion="Brote de gastroenteritis / gripe",
        pacientes_extra_min=50,
        pacientes_extra_max=100,
        duracion_horas_min=72,  # 3 días
        duracion_horas_max=168,  # 7 días
        distribucion_triaje={1: 0.00, 2: 0.05, 3: 0.30, 4: 0.50, 5: 0.15}
    ),
    TipoEmergencia.EVENTO_MASIVO: ConfigEmergencia(
        nombre="Evento Masivo",
        descripcion="Incidentes en Riazor / Coliseum",
        pacientes_extra_min=20,
        pacientes_extra_max=50,
        duracion_horas_min=4,
        duracion_horas_max=8,
        distribucion_triaje={1: 0.05, 2: 0.10, 3: 0.30, 4: 0.45, 5: 0.10}
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
