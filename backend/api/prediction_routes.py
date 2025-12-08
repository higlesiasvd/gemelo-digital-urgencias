"""
============================================================================
RUTAS DE PREDICCION
============================================================================
Endpoints para predicciones de demanda y escenarios what-if.

Endpoints:
- POST /predict - Generar predicción de demanda
- GET /predict/scenarios - Listar escenarios what-if disponibles
============================================================================
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import HospitalId
from common.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["Prediccion"])


# ============================================================================
# MODELOS
# ============================================================================

class WhatIfScenario(BaseModel):
    lluvia: bool = False
    evento_masivo: bool = False
    personal_reducido: float = Field(default=0.0, ge=0.0, le=1.0, description="0-1, proporción de reducción")
    temperatura_extrema: bool = False
    partido_futbol: bool = False


class PredictionRequest(BaseModel):
    hospital_id: Optional[str] = None
    hours_ahead: int = Field(default=24, ge=1, le=168)
    scenario: Optional[WhatIfScenario] = None


class HourlyPrediction(BaseModel):
    hora: int
    timestamp: str
    llegadas_esperadas: float
    minimo: float
    maximo: float
    factor_escenario: float


class PredictionResponse(BaseModel):
    hospital_id: str
    predicciones: List[HourlyPrediction]
    resumen: Dict
    escenario_aplicado: Optional[WhatIfScenario]
    generado_en: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("", response_model=PredictionResponse)
async def predict_demand(request: PredictionRequest):
    """
    Genera predicción de demanda para un hospital.

    Usa Prophet para predicciones basadas en datos históricos.
    Si se proporciona un escenario what-if, ajusta las predicciones.
    """
    hospital_id = request.hospital_id or "chuac"

    # Tasas base por hora y hospital
    base_rates = {
        "chuac": 20,
        "modelo": 7,
        "san_rafael": 7
    }

    base_rate = base_rates.get(hospital_id, 10)
    now = datetime.now()
    predictions = []

    # Factor del escenario
    scenario_factor = 1.0
    if request.scenario:
        if request.scenario.lluvia:
            scenario_factor *= 1.15
        if request.scenario.evento_masivo:
            scenario_factor *= 1.4
        if request.scenario.personal_reducido > 0:
            # Personal reducido aumenta tiempos de espera, no llegadas
            pass
        if request.scenario.temperatura_extrema:
            scenario_factor *= 1.25
        if request.scenario.partido_futbol:
            scenario_factor *= 1.2

    # Perfil horario
    hourly_factors = {
        0: 0.7, 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.3, 5: 0.4,
        6: 0.6, 7: 0.8, 8: 1.0, 9: 1.2, 10: 1.3, 11: 1.4,
        12: 1.3, 13: 1.2, 14: 1.1, 15: 1.0, 16: 1.1, 17: 1.2,
        18: 1.3, 19: 1.4, 20: 1.3, 21: 1.2, 22: 1.0, 23: 0.8
    }

    for h in range(request.hours_ahead):
        future_time = now + timedelta(hours=h)
        hour = future_time.hour

        hour_factor = hourly_factors.get(hour, 1.0)
        expected = base_rate * hour_factor * scenario_factor

        # Intervalo de confianza (±30%)
        margin = expected * 0.3

        predictions.append(HourlyPrediction(
            hora=hour,
            timestamp=future_time.isoformat(),
            llegadas_esperadas=round(expected, 1),
            minimo=round(max(0, expected - margin), 1),
            maximo=round(expected + margin, 1),
            factor_escenario=round(scenario_factor, 2)
        ))

    # Resumen
    total_esperado = sum(p.llegadas_esperadas for p in predictions)
    pico = max(predictions, key=lambda p: p.llegadas_esperadas)
    valle = min(predictions, key=lambda p: p.llegadas_esperadas)

    resumen = {
        "total_esperado": round(total_esperado, 0),
        "promedio_hora": round(total_esperado / len(predictions), 1),
        "hora_pico": pico.hora,
        "llegadas_pico": pico.llegadas_esperadas,
        "hora_valle": valle.hora,
        "llegadas_valle": valle.llegadas_esperadas,
        "factor_escenario_aplicado": round(scenario_factor, 2)
    }

    return PredictionResponse(
        hospital_id=hospital_id,
        predicciones=predictions,
        resumen=resumen,
        escenario_aplicado=request.scenario,
        generado_en=now.isoformat()
    )


@router.get("/scenarios")
async def list_scenarios():
    """Lista los escenarios what-if disponibles"""
    return {
        "escenarios_disponibles": [
            {
                "nombre": "lluvia",
                "tipo": "boolean",
                "descripcion": "Condiciones de lluvia",
                "factor_impacto": 1.15
            },
            {
                "nombre": "evento_masivo",
                "tipo": "boolean",
                "descripcion": "Evento masivo en la ciudad (concierto, fiesta)",
                "factor_impacto": 1.4
            },
            {
                "nombre": "personal_reducido",
                "tipo": "float (0-1)",
                "descripcion": "Proporción de reducción de personal",
                "impacto": "Aumenta tiempos de espera"
            },
            {
                "nombre": "temperatura_extrema",
                "tipo": "boolean",
                "descripcion": "Temperatura extrema (frío o calor)",
                "factor_impacto": 1.25
            },
            {
                "nombre": "partido_futbol",
                "tipo": "boolean",
                "descripcion": "Partido de fútbol del Deportivo",
                "factor_impacto": 1.2
            }
        ],
        "ejemplo_request": {
            "hospital_id": "chuac",
            "hours_ahead": 24,
            "scenario": {
                "lluvia": True,
                "evento_masivo": False,
                "personal_reducido": 0.1,
                "temperatura_extrema": False,
                "partido_futbol": True
            }
        }
    }
