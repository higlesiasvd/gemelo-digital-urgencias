"""
============================================================================
GENERADOR DE PACIENTES
============================================================================
Genera pacientes con características realistas basadas en:
- Distribución de edad
- Patologías según hora/clima/eventos
- Niveles de triaje según patología
============================================================================
"""

import random
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    PatientArrival, TriageLevel, HospitalId, HOSPITAL_CONFIGS
)
from .demand_factors import DemandFactors


# Patologías y sus probabilidades de triaje
PATOLOGIAS = {
    "dolor_toracico": {"rojo": 0.3, "naranja": 0.4, "amarillo": 0.2, "verde": 0.1},
    "traumatismo": {"rojo": 0.1, "naranja": 0.3, "amarillo": 0.4, "verde": 0.2},
    "dolor_abdominal": {"naranja": 0.2, "amarillo": 0.5, "verde": 0.3},
    "fiebre": {"naranja": 0.1, "amarillo": 0.3, "verde": 0.5, "azul": 0.1},
    "cefalea": {"naranja": 0.15, "amarillo": 0.35, "verde": 0.4, "azul": 0.1},
    "disnea": {"rojo": 0.2, "naranja": 0.4, "amarillo": 0.3, "verde": 0.1},
    "mareo": {"naranja": 0.1, "amarillo": 0.3, "verde": 0.5, "azul": 0.1},
    "herida": {"naranja": 0.1, "amarillo": 0.3, "verde": 0.5, "azul": 0.1},
    "intoxicacion": {"rojo": 0.1, "naranja": 0.3, "amarillo": 0.4, "verde": 0.2},
    "fractura": {"naranja": 0.3, "amarillo": 0.5, "verde": 0.2},
    "quemadura": {"rojo": 0.1, "naranja": 0.3, "amarillo": 0.4, "verde": 0.2},
    "alergia": {"rojo": 0.1, "naranja": 0.2, "amarillo": 0.4, "verde": 0.3},
    "gastroenteritis": {"amarillo": 0.2, "verde": 0.6, "azul": 0.2},
    "lumbalgia": {"amarillo": 0.2, "verde": 0.6, "azul": 0.2},
    "ansiedad": {"amarillo": 0.1, "verde": 0.5, "azul": 0.4},
    "conjuntivitis": {"verde": 0.3, "azul": 0.7},
    "otitis": {"verde": 0.4, "azul": 0.6},
    "faringitis": {"verde": 0.5, "azul": 0.5},
}

# Patologías más comunes según condiciones
PATOLOGIAS_FRIO = ["gripe", "neumonia", "bronquitis", "hipotermia"]
PATOLOGIAS_CALOR = ["golpe_calor", "deshidratacion", "quemadura_solar"]
PATOLOGIAS_LLUVIA = ["traumatismo", "fractura"]  # Accidentes de tráfico
PATOLOGIAS_EVENTOS = ["intoxicacion", "traumatismo", "herida"]
PATOLOGIAS_DEPORTIVAS = ["traumatismo", "fractura", "esguince", "contusion"]

# Distribución de edad por grupo
EDAD_DISTRIBUCION = [
    (0, 5, 0.08),    # Bebés/niños pequeños
    (6, 17, 0.12),   # Niños/adolescentes
    (18, 35, 0.22),  # Adultos jóvenes
    (36, 55, 0.25),  # Adultos
    (56, 70, 0.18),  # Adultos mayores
    (71, 85, 0.12),  # Ancianos
    (86, 100, 0.03)  # Muy ancianos
]


class PatientGenerator:
    """Genera pacientes para la simulación"""

    def __init__(self):
        self.demand_factors = DemandFactors()

    def _generate_age(self) -> int:
        """Genera una edad según distribución realista"""
        r = random.random()
        cumulative = 0
        for min_age, max_age, prob in EDAD_DISTRIBUCION:
            cumulative += prob
            if r <= cumulative:
                return random.randint(min_age, max_age)
        return random.randint(30, 50)

    def _generate_sex(self) -> str:
        """Genera sexo (ligera mayoría mujeres en urgencias)"""
        return "F" if random.random() < 0.52 else "M"

    def _select_patologia(self, context: dict = None) -> str:
        """Selecciona una patología basada en el contexto"""
        patologias_base = list(PATOLOGIAS.keys())

        # Modificar probabilidades según contexto
        if context:
            clima = context.get("clima", {})
            if clima:
                if clima.get("es_frio"):
                    patologias_base.extend(PATOLOGIAS_FRIO * 3)
                if clima.get("es_calor"):
                    patologias_base.extend(PATOLOGIAS_CALOR * 3)
                if clima.get("esta_lloviendo"):
                    patologias_base.extend(PATOLOGIAS_LLUVIA * 2)

            if context.get("evento_activo"):
                patologias_base.extend(PATOLOGIAS_EVENTOS * 2)

            if context.get("partido_activo"):
                patologias_base.extend(PATOLOGIAS_DEPORTIVAS * 2)

        return random.choice(patologias_base)

    def _determine_triage_level(self, patologia: str, edad: int) -> TriageLevel:
        """Determina el nivel de triaje basado en patología y edad"""
        probs = PATOLOGIAS.get(patologia, {"amarillo": 0.4, "verde": 0.4, "azul": 0.2})

        # Ajustar por edad (extremos más graves)
        if edad < 5 or edad > 75:
            # Aumentar probabilidad de niveles más graves
            if "naranja" in probs:
                probs["naranja"] = probs.get("naranja", 0) * 1.3
            if "amarillo" in probs:
                probs["amarillo"] = probs.get("amarillo", 0) * 1.2

        # Normalizar probabilidades
        total = sum(probs.values())
        probs = {k: v/total for k, v in probs.items()}

        # Seleccionar nivel
        r = random.random()
        cumulative = 0
        for nivel, prob in probs.items():
            cumulative += prob
            if r <= cumulative:
                return TriageLevel(nivel)

        return TriageLevel.VERDE

    def generate_patient(
        self,
        hospital_id: HospitalId,
        factor_demanda: float = 1.0,
        context: dict = None
    ) -> PatientArrival:
        """
        Genera un paciente para un hospital específico.

        Args:
            hospital_id: ID del hospital
            factor_demanda: Factor de demanda actual
            context: Contexto externo (clima, eventos, etc.)

        Returns:
            PatientArrival event
        """
        edad = self._generate_age()
        sexo = self._generate_sex()
        patologia = self._select_patologia(context)

        return PatientArrival(
            patient_id=str(uuid4()),
            edad=edad,
            sexo=sexo,
            patologia=patologia,
            hospital_id=hospital_id,
            hora_llegada=datetime.now(),
            factor_demanda=factor_demanda
        )

    def generate_batch(
        self,
        hospital_id: HospitalId,
        count: int,
        factor_demanda: float = 1.0,
        context: dict = None
    ) -> List[PatientArrival]:
        """Genera un lote de pacientes"""
        return [
            self.generate_patient(hospital_id, factor_demanda, context)
            for _ in range(count)
        ]

    def get_arrival_rate(self, hospital_id: HospitalId, factor_total: float = 1.0) -> float:
        """
        Calcula la tasa de llegadas por hora para un hospital.

        Tasas base REALISTAS (basadas en estadísticas hospitalarias españolas):
        - CHUAC: ~180 pacientes/día = 7.5/hora promedio
          (Hospital de referencia regional, ~65,000 urgencias/año)
        - Modelo: ~60 pacientes/día = 2.5/hora
          (Hospital privado mediano)
        - San Rafael: ~50 pacientes/día = 2/hora
          (Hospital comarcal pequeño)

        Returns:
            Pacientes por hora
        """
        base_rates = {
            HospitalId.CHUAC: 15,         # ~360 pacientes/día (equilibrado con 10 consultas)
            HospitalId.MODELO: 6,         # ~144 pacientes/día
            HospitalId.SAN_RAFAEL: 5      # ~120 pacientes/día
        }

        base_rate = base_rates.get(hospital_id, 3.0)
        adjusted_rate = base_rate * factor_total

        # Añadir variabilidad (±20%)
        variability = random.uniform(0.8, 1.2)

        return adjusted_rate * variability


# Instancia global
patient_generator = PatientGenerator()
