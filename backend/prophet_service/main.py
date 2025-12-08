"""
============================================================================
PROPHET SERVICE - ENTRY POINT
============================================================================
Servicio de predicciones con Prophet.
Expone endpoint REST y publica predicciones periódicas a Kafka.
============================================================================
"""

import asyncio
import signal
import sys
import os
import logging
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uvicorn

from common.kafka_client import KafkaClient
from common.config import settings

from .predictor import ProphetPredictor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# MODELOS
# ============================================================================

class WhatIfScenario(BaseModel):
    lluvia: bool = False
    evento_masivo: bool = False
    personal_reducido: float = Field(default=0.0, ge=0.0, le=1.0)
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
# APP
# ============================================================================

app = FastAPI(
    title="Prophet Service",
    description="Servicio de predicciones de demanda hospitalaria",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Componentes
predictor = ProphetPredictor()
kafka = KafkaClient(client_id="prophet-service")


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {"service": "Prophet Service", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Genera predicciones de demanda"""
    hospital_id = request.hospital_id or "chuac"

    scenario_dict = None
    if request.scenario:
        scenario_dict = request.scenario.model_dump()

    predictions = predictor.predict(
        hospital_id=hospital_id,
        hours_ahead=request.hours_ahead,
        scenario=scenario_dict
    )

    # Calcular resumen
    llegadas = [p["llegadas_esperadas"] for p in predictions]
    total = sum(llegadas)
    pico_idx = llegadas.index(max(llegadas))
    valle_idx = llegadas.index(min(llegadas))

    resumen = {
        "total_esperado": round(total, 0),
        "promedio_hora": round(total / len(predictions), 1),
        "hora_pico": predictions[pico_idx]["hora"],
        "llegadas_pico": predictions[pico_idx]["llegadas_esperadas"],
        "hora_valle": predictions[valle_idx]["hora"],
        "llegadas_valle": predictions[valle_idx]["llegadas_esperadas"],
        "factor_escenario_aplicado": predictions[0]["factor_escenario"]
    }

    return PredictionResponse(
        hospital_id=hospital_id,
        predicciones=[HourlyPrediction(**p) for p in predictions],
        resumen=resumen,
        escenario_aplicado=request.scenario,
        generado_en=datetime.now().isoformat()
    )


@app.post("/train")
async def train_models():
    """Entrena los modelos Prophet"""
    try:
        predictor.train_all()
        return {"success": True, "message": "Modelos entrenados"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# BACKGROUND TASK
# ============================================================================

async def publish_predictions_periodically():
    """Publica predicciones cada hora a Kafka"""
    while True:
        try:
            for hospital_id in ["chuac", "modelo", "san_rafael"]:
                predictions = predictor.predict(hospital_id, hours_ahead=24)

                kafka.produce(f"predictions-{hospital_id}", {
                    "hospital_id": hospital_id,
                    "predicciones": predictions,
                    "timestamp": datetime.now().isoformat()
                }, validate=False)

            kafka.flush()
            logger.info("Predicciones publicadas a Kafka")

        except Exception as e:
            logger.error(f"Error publicando predicciones: {e}")

        await asyncio.sleep(3600)  # Cada hora


# ============================================================================
# MAIN
# ============================================================================

async def run_prophet_service():
    """Ejecuta el servicio Prophet"""
    # Entrenar modelos al iniciar
    logger.info("Entrenando modelos Prophet...")
    predictor.train_all()

    # Iniciar tarea en background
    asyncio.create_task(publish_predictions_periodically())

    # Iniciar servidor
    config = uvicorn.Config(app, host="0.0.0.0", port=8001, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(run_prophet_service())
