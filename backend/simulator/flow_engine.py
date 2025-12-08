"""
============================================================================
MOTOR DE FLUJO DE PACIENTES
============================================================================
Simula el flujo completo de un paciente:
1. Llegada -> Ventanilla (2 min)
2. Sala espera triaje
3. Triaje (5 min) -> Clasificación Manchester
4. Sala espera priorizada
5. Consulta (tiempo según nivel + médicos)
6. Alta (85%) u Observación (15%)
============================================================================
"""

import simpy
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    TriageLevel, HospitalId, PatientArrival, TriageResult,
    ConsultationEvent, ConsultationEventType, PatientDestination,
    HospitalStats, HOSPITAL_CONFIGS
)

logger = logging.getLogger(__name__)


@dataclass
class Patient:
    """Representación interna de un paciente en simulación"""
    patient_id: str
    edad: int
    sexo: str
    patologia: str
    hospital_id: HospitalId
    hora_llegada: datetime
    factor_demanda: float = 1.0

    # Se completan durante la simulación
    nivel_triaje: Optional[TriageLevel] = None
    tiempo_ventanilla: float = 0
    tiempo_espera_triaje: float = 0
    tiempo_triaje: float = 0
    tiempo_espera_consulta: float = 0
    tiempo_consulta: float = 0
    tiempo_total: float = 0
    destino: Optional[PatientDestination] = None
    derivado: bool = False
    derivado_a: Optional[HospitalId] = None

    @classmethod
    def from_arrival(cls, arrival: PatientArrival) -> 'Patient':
        return cls(
            patient_id=arrival.patient_id,
            edad=arrival.edad,
            sexo=arrival.sexo,
            patologia=arrival.patologia,
            hospital_id=arrival.hospital_id,
            hora_llegada=arrival.hora_llegada,
            factor_demanda=arrival.factor_demanda
        )


@dataclass
class HospitalResources:
    """Recursos de un hospital en SimPy"""
    env: simpy.Environment
    hospital_id: HospitalId

    # Recursos
    ventanillas: simpy.Resource = None
    boxes_triaje: simpy.Resource = None
    consultas: simpy.Resource = None

    # Estado actual
    medicos_por_consulta: Dict[int, int] = field(default_factory=dict)
    cola_ventanilla: List[Patient] = field(default_factory=list)
    cola_triaje: List[Patient] = field(default_factory=list)
    cola_consulta: List[Patient] = field(default_factory=list)

    # Estadísticas
    pacientes_atendidos: int = 0
    pacientes_derivados_enviados: int = 0
    pacientes_derivados_recibidos: int = 0
    tiempos_espera_triaje: List[float] = field(default_factory=list)
    tiempos_espera_consulta: List[float] = field(default_factory=list)
    tiempos_totales: List[float] = field(default_factory=list)

    def __post_init__(self):
        config = HOSPITAL_CONFIGS[self.hospital_id]
        self.ventanillas = simpy.Resource(self.env, capacity=config.num_ventanillas)
        self.boxes_triaje = simpy.Resource(self.env, capacity=config.num_boxes)
        # PriorityResource para consultas (prioridad por nivel de triaje)
        self.consultas = simpy.PriorityResource(self.env, capacity=config.num_consultas)

        # Inicializar médicos (1 por consulta por defecto)
        for i in range(1, config.num_consultas + 1):
            self.medicos_por_consulta[i] = 1

    def get_stats(self) -> HospitalStats:
        """Genera estadísticas actuales"""
        config = HOSPITAL_CONFIGS[self.hospital_id]

        # Calcular saturación
        vent_ocupacion = self.ventanillas.count / self.ventanillas.capacity if self.ventanillas.capacity > 0 else 0
        box_ocupacion = self.boxes_triaje.count / self.boxes_triaje.capacity if self.boxes_triaje.capacity > 0 else 0
        cons_ocupacion = self.consultas.count / self.consultas.capacity if self.consultas.capacity > 0 else 0

        saturacion_global = (vent_ocupacion * 0.1 + box_ocupacion * 0.3 + cons_ocupacion * 0.6)

        # Tiempos medios
        tiempo_medio_triaje = sum(self.tiempos_espera_triaje[-20:]) / max(1, len(self.tiempos_espera_triaje[-20:]))
        tiempo_medio_consulta = sum(self.tiempos_espera_consulta[-20:]) / max(1, len(self.tiempos_espera_consulta[-20:]))
        tiempo_medio_total = sum(self.tiempos_totales[-20:]) / max(1, len(self.tiempos_totales[-20:]))

        return HospitalStats(
            hospital_id=self.hospital_id,
            ventanillas_ocupadas=self.ventanillas.count,
            ventanillas_totales=self.ventanillas.capacity,
            cola_ventanilla=len(self.cola_ventanilla),
            boxes_ocupados=self.boxes_triaje.count,
            boxes_totales=self.boxes_triaje.capacity,
            cola_triaje=len(self.cola_triaje),
            consultas_ocupadas=self.consultas.count,
            consultas_totales=self.consultas.capacity,
            cola_consulta=len(self.cola_consulta),
            saturacion_global=round(saturacion_global, 3),
            tiempo_medio_espera_triaje=round(tiempo_medio_triaje, 1),
            tiempo_medio_espera_consulta=round(tiempo_medio_consulta, 1),
            tiempo_medio_total=round(tiempo_medio_total, 1),
            pacientes_atendidos_hora=self.pacientes_atendidos,
            pacientes_llegados_hora=len(self.tiempos_totales),
            pacientes_derivados_enviados=self.pacientes_derivados_enviados,
            pacientes_derivados_recibidos=self.pacientes_derivados_recibidos,
            emergencia_activa=saturacion_global > 0.9
        )


class FlowEngine:
    """Motor de flujo de pacientes usando SimPy"""

    # Tiempos base en minutos
    TIEMPO_VENTANILLA = 2.0
    TIEMPO_TRIAJE = 5.0

    # Tiempos de consulta por nivel de triaje (según requisitos)
    TIEMPOS_CONSULTA = {
        TriageLevel.ROJO: 30.0,     # Más grave
        TriageLevel.NARANJA: 25.0,
        TriageLevel.AMARILLO: 15.0,
        TriageLevel.VERDE: 10.0,
        TriageLevel.AZUL: 5.0       # Más leve
    }

    def __init__(
        self,
        env: simpy.Environment,
        hospital_id: HospitalId,
        on_triage: Callable = None,
        on_consultation: Callable = None,
        on_stats: Callable = None
    ):
        self.env = env
        self.hospital_id = hospital_id
        self.resources = HospitalResources(env, hospital_id)
        self.config = HOSPITAL_CONFIGS[hospital_id]

        # Callbacks
        self.on_triage = on_triage
        self.on_consultation = on_consultation
        self.on_stats = on_stats

    def _determine_triage(self, patient: Patient) -> TriageLevel:
        """Determina el nivel de triaje"""
        # Usar la patología para determinar gravedad
        from .patient_generator import PATOLOGIAS

        probs = PATOLOGIAS.get(patient.patologia, {"amarillo": 0.4, "verde": 0.4, "azul": 0.2})

        r = random.random()
        cumulative = 0
        for nivel_str, prob in probs.items():
            cumulative += prob
            if r <= cumulative:
                return TriageLevel(nivel_str)

        return TriageLevel.VERDE

    def _get_consulta_time(self, nivel: TriageLevel, consulta_id: int) -> float:
        """Calcula tiempo de consulta según nivel y número de médicos"""
        tiempo_base = self.TIEMPOS_CONSULTA.get(nivel, 15.0)
        num_medicos = self.resources.medicos_por_consulta.get(consulta_id, 1)

        # Cada médico adicional reduce el tiempo (hasta x4)
        factor_velocidad = min(num_medicos, 4)
        tiempo_real = tiempo_base / factor_velocidad

        # Añadir variabilidad (±20%)
        return tiempo_real * random.uniform(0.8, 1.2)

    def process_patient(self, patient: Patient):
        """Proceso completo de un paciente"""
        inicio = self.env.now

        # === 1. VENTANILLA ===
        self.resources.cola_ventanilla.append(patient)
        with self.resources.ventanillas.request() as req:
            yield req
            self.resources.cola_ventanilla.remove(patient)

            # Tiempo en ventanilla
            tiempo = self.TIEMPO_VENTANILLA * random.uniform(0.8, 1.2)
            yield self.env.timeout(tiempo)
            patient.tiempo_ventanilla = tiempo

        # === 2. ESPERA TRIAJE ===
        inicio_espera_triaje = self.env.now
        self.resources.cola_triaje.append(patient)

        with self.resources.boxes_triaje.request() as req:
            yield req
            self.resources.cola_triaje.remove(patient)
            patient.tiempo_espera_triaje = self.env.now - inicio_espera_triaje
            self.resources.tiempos_espera_triaje.append(patient.tiempo_espera_triaje)

            # === 3. TRIAJE ===
            box_id = random.randint(1, self.config.num_boxes)
            tiempo_triaje = self.TIEMPO_TRIAJE * random.uniform(0.8, 1.2)
            yield self.env.timeout(tiempo_triaje)
            patient.tiempo_triaje = tiempo_triaje

            # Determinar nivel
            patient.nivel_triaje = self._determine_triage(patient)

            # Callback de triaje
            if self.on_triage:
                triage_event = TriageResult(
                    patient_id=patient.patient_id,
                    hospital_id=self.hospital_id,
                    nivel_triaje=patient.nivel_triaje,
                    box_id=box_id,
                    tiempo_triaje_minutos=tiempo_triaje,
                    enfermeras_atendieron=2,
                    requiere_derivacion=(
                        patient.nivel_triaje in [TriageLevel.ROJO, TriageLevel.NARANJA]
                        and self.hospital_id != HospitalId.CHUAC
                    )
                )
                self.on_triage(triage_event)

        # === 4. VERIFICAR DERIVACIÓN ===
        # Pacientes graves en hospitales pequeños se derivan a CHUAC
        if (patient.nivel_triaje in [TriageLevel.ROJO, TriageLevel.NARANJA]
            and self.hospital_id != HospitalId.CHUAC):
            patient.derivado = True
            patient.derivado_a = HospitalId.CHUAC
            self.resources.pacientes_derivados_enviados += 1
            patient.tiempo_total = self.env.now - inicio
            return  # El coordinador manejará la derivación

        # === 5. ESPERA CONSULTA (priorizada) ===
        inicio_espera_consulta = self.env.now
        # Prioridad según nivel (ROJO=0, AZUL=4)
        prioridad = list(TriageLevel).index(patient.nivel_triaje)
        self.resources.cola_consulta.append(patient)

        with self.resources.consultas.request(priority=prioridad) as req:
            yield req
            self.resources.cola_consulta.remove(patient)
            patient.tiempo_espera_consulta = self.env.now - inicio_espera_consulta
            self.resources.tiempos_espera_consulta.append(patient.tiempo_espera_consulta)

            # === 6. CONSULTA ===
            consulta_id = random.randint(1, self.config.num_consultas)
            num_medicos = self.resources.medicos_por_consulta.get(consulta_id, 1)
            tiempo_consulta = self._get_consulta_time(patient.nivel_triaje, consulta_id)

            # Evento inicio consulta
            if self.on_consultation:
                self.on_consultation(ConsultationEvent(
                    patient_id=patient.patient_id,
                    hospital_id=self.hospital_id,
                    consulta_id=consulta_id,
                    event_type=ConsultationEventType.INICIO,
                    nivel_triaje=patient.nivel_triaje,
                    medicos_atendiendo=num_medicos
                ))

            yield self.env.timeout(tiempo_consulta)
            patient.tiempo_consulta = tiempo_consulta

            # === 7. DESTINO ===
            # Alta 85%, Observación 15%
            patient.destino = PatientDestination.OBSERVACION if random.random() < 0.15 else PatientDestination.ALTA

            # Evento fin consulta
            if self.on_consultation:
                self.on_consultation(ConsultationEvent(
                    patient_id=patient.patient_id,
                    hospital_id=self.hospital_id,
                    consulta_id=consulta_id,
                    event_type=ConsultationEventType.FIN,
                    nivel_triaje=patient.nivel_triaje,
                    medicos_atendiendo=num_medicos,
                    tiempo_consulta_minutos=tiempo_consulta,
                    destino=patient.destino
                ))

        # Estadísticas finales
        patient.tiempo_total = self.env.now - inicio
        self.resources.tiempos_totales.append(patient.tiempo_total)
        self.resources.pacientes_atendidos += 1

    def scale_consulta(self, consulta_id: int, num_medicos: int) -> bool:
        """
        Escala el número de médicos en una consulta (solo CHUAC).

        Returns:
            True si el escalado fue exitoso
        """
        if self.hospital_id != HospitalId.CHUAC:
            logger.warning(f"Solo CHUAC permite escalado de médicos")
            return False

        if num_medicos < 1 or num_medicos > 4:
            logger.warning(f"Número de médicos debe estar entre 1 y 4")
            return False

        if consulta_id < 1 or consulta_id > self.config.num_consultas:
            logger.warning(f"Consulta {consulta_id} no existe")
            return False

        self.resources.medicos_por_consulta[consulta_id] = num_medicos
        logger.info(f"Consulta {consulta_id} escalada a {num_medicos} médicos")
        return True

    def get_stats(self) -> HospitalStats:
        """Obtiene estadísticas actuales"""
        return self.resources.get_stats()
