"""
============================================================================
RUTAS DE PREDICCION EXTENDIDAS
============================================================================
Endpoints para predicciones de demanda, métricas hospitalarias y what-if.

Endpoints:
- POST /predict - Generar predicción de demanda
- POST /predict/extended - Predicción con todas las métricas
- GET /predict/scenarios - Listar escenarios what-if disponibles
============================================================================
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal
from datetime import datetime, timedelta
import logging
import math

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import HospitalId
from common.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["Prediccion"])


# ============================================================================
# CONFIGURACIÓN POR HOSPITAL
# ============================================================================

HOSPITAL_CONFIG = {
    "chuac": {
        "nombre": "CHUAC",
        "base_rate": 20,
        "boxes_totales": 12,
        "consultas_totales": 8,
        "personal_base": {"medicos": 8, "enfermeras": 16, "celadores": 6},
        "tiempo_base_triaje": 8,
        "tiempo_base_consulta": 25,
    },
    "modelo": {
        "nombre": "HM Modelo",
        "base_rate": 7,
        "boxes_totales": 5,
        "consultas_totales": 4,
        "personal_base": {"medicos": 3, "enfermeras": 6, "celadores": 2},
        "tiempo_base_triaje": 6,
        "tiempo_base_consulta": 20,
    },
    "san_rafael": {
        "nombre": "San Rafael",
        "base_rate": 7,
        "boxes_totales": 5,
        "consultas_totales": 4,
        "personal_base": {"medicos": 3, "enfermeras": 6, "celadores": 2},
        "tiempo_base_triaje": 6,
        "tiempo_base_consulta": 20,
    }
}

# ============================================================================
# MODELOS
# ============================================================================

class WhatIfScenario(BaseModel):
    lluvia: bool = False
    evento_masivo: bool = False
    personal_reducido: float = Field(default=0.0, ge=0.0, le=1.0, description="0-1, proporción de reducción")
    temperatura_extrema: bool = False
    partido_futbol: bool = False
    incidente_grave: bool = False
    epidemia: bool = False


class PredictionRequest(BaseModel):
    hospital_id: Optional[str] = None
    hours_ahead: int = Field(default=24, ge=1, le=168)
    scenario: Optional[WhatIfScenario] = None


class ExtendedPredictionRequest(BaseModel):
    hospital_id: Optional[str] = None
    hours_ahead: int = Field(default=24, ge=1, le=168)
    scenario: Optional[WhatIfScenario] = None
    metricas: List[str] = Field(
        default=["llegadas", "saturacion", "tiempo_espera", "derivaciones", "personal"],
        description="Métricas a incluir en la predicción"
    )


class HourlyPrediction(BaseModel):
    hora: int
    timestamp: str
    llegadas_esperadas: float
    minimo: float
    maximo: float
    factor_escenario: float


class ExtendedHourlyPrediction(BaseModel):
    hora: int
    timestamp: str
    # Métricas de demanda
    llegadas_esperadas: float
    llegadas_min: float
    llegadas_max: float
    # Saturación
    saturacion_estimada: float
    boxes_ocupados_estimados: float
    # Tiempos de espera
    tiempo_espera_triaje: float
    tiempo_espera_consulta: float
    tiempo_total_estimado: float
    # Derivaciones
    derivaciones_estimadas: float
    probabilidad_derivacion: float
    # Personal
    personal_necesario: Dict
    personal_deficit: Dict
    # Factores
    factor_escenario: float
    nivel_alerta: str


class PredictionResponse(BaseModel):
    hospital_id: str
    predicciones: List[HourlyPrediction]
    resumen: Dict
    escenario_aplicado: Optional[WhatIfScenario]
    generado_en: str


class ExtendedPredictionResponse(BaseModel):
    hospital_id: str
    hospital_nombre: str
    predicciones: List[ExtendedHourlyPrediction]
    resumen: Dict
    graficos: Dict
    alertas: List[Dict]
    escenario_aplicado: Optional[WhatIfScenario]
    generado_en: str


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def get_hourly_factor(hour: int) -> float:
    """Factor de demanda según hora del día"""
    hourly_factors = {
        0: 0.7, 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.3, 5: 0.4,
        6: 0.6, 7: 0.8, 8: 1.0, 9: 1.2, 10: 1.3, 11: 1.4,
        12: 1.3, 13: 1.2, 14: 1.1, 15: 1.0, 16: 1.1, 17: 1.2,
        18: 1.3, 19: 1.4, 20: 1.3, 21: 1.2, 22: 1.0, 23: 0.8
    }
    return hourly_factors.get(hour, 1.0)


def calculate_scenario_factor(scenario: WhatIfScenario = None) -> Dict:
    """Calcula los factores de impacto del escenario"""
    factors = {
        "demanda": 1.0,
        "tiempo_espera": 1.0,
        "personal": 1.0
    }
    
    if not scenario:
        return factors
    
    if scenario.lluvia:
        factors["demanda"] *= 1.15
        factors["tiempo_espera"] *= 1.1
    
    if scenario.evento_masivo:
        factors["demanda"] *= 1.4
        factors["tiempo_espera"] *= 1.3
    
    if scenario.personal_reducido > 0:
        factors["personal"] *= (1 - scenario.personal_reducido)
        factors["tiempo_espera"] *= (1 + scenario.personal_reducido * 0.8)
    
    if scenario.temperatura_extrema:
        factors["demanda"] *= 1.25
        factors["tiempo_espera"] *= 1.15
    
    if scenario.partido_futbol:
        factors["demanda"] *= 1.2
        factors["tiempo_espera"] *= 1.1
    
    if scenario.incidente_grave:
        factors["demanda"] *= 1.6
        factors["tiempo_espera"] *= 1.5
    
    if scenario.epidemia:
        factors["demanda"] *= 2.0
        factors["tiempo_espera"] *= 1.8
    
    return factors


def calculate_saturation(llegadas_hora: float, config: Dict, prev_queue: float = 0) -> tuple:
    """Calcula saturación y cola acumulada"""
    capacidad_hora = config["boxes_totales"] * 2  # 2 pacientes/hora por box aprox
    cola_nueva = max(0, llegadas_hora - capacidad_hora + prev_queue * 0.7)
    saturacion = min(1.0, (llegadas_hora + prev_queue * 0.5) / (capacidad_hora * 1.5))
    boxes_ocupados = min(config["boxes_totales"], llegadas_hora * 0.6 + prev_queue * 0.3)
    return saturacion, boxes_ocupados, cola_nueva


def calculate_wait_times(saturacion: float, config: Dict, factor_tiempo: float) -> Dict:
    """Calcula tiempos de espera basados en saturación"""
    base_triaje = config["tiempo_base_triaje"]
    base_consulta = config["tiempo_base_consulta"]
    
    # El tiempo aumenta exponencialmente con la saturación
    factor_saturacion = 1 + (saturacion ** 2) * 3
    
    tiempo_triaje = base_triaje * factor_saturacion * factor_tiempo
    tiempo_consulta = base_consulta * factor_saturacion * factor_tiempo
    
    return {
        "triaje": round(tiempo_triaje, 1),
        "consulta": round(tiempo_consulta, 1),
        "total": round(tiempo_triaje + tiempo_consulta + 15, 1)  # +15 min admin
    }


def calculate_derivations(saturacion: float, llegadas: float) -> Dict:
    """Estima derivaciones basadas en saturación"""
    if saturacion < 0.7:
        prob = 0.02
    elif saturacion < 0.85:
        prob = 0.05 + (saturacion - 0.7) * 0.3
    else:
        prob = 0.15 + (saturacion - 0.85) * 1.5
    
    prob = min(0.4, prob)  # Máximo 40%
    derivaciones = llegadas * prob
    
    return {
        "cantidad": round(derivaciones, 1),
        "probabilidad": round(prob * 100, 1)
    }


def calculate_staff_needs(llegadas: float, saturacion: float, config: Dict, factor_personal: float) -> Dict:
    """Calcula necesidades de personal"""
    base = config["personal_base"]
    
    # Necesidades basadas en carga
    factor_carga = 1 + saturacion * 0.5
    
    necesario = {
        "medicos": math.ceil(base["medicos"] * factor_carga),
        "enfermeras": math.ceil(base["enfermeras"] * factor_carga),
        "celadores": math.ceil(base["celadores"] * factor_carga)
    }
    
    disponible = {
        "medicos": math.floor(base["medicos"] * factor_personal),
        "enfermeras": math.floor(base["enfermeras"] * factor_personal),
        "celadores": math.floor(base["celadores"] * factor_personal)
    }
    
    deficit = {
        k: max(0, necesario[k] - disponible[k]) for k in necesario
    }
    
    return necesario, deficit


def get_alert_level(saturacion: float, tiempo_total: float, derivaciones: float) -> str:
    """Determina el nivel de alerta"""
    if saturacion > 0.9 or tiempo_total > 180 or derivaciones > 5:
        return "CRITICO"
    elif saturacion > 0.75 or tiempo_total > 120 or derivaciones > 2:
        return "ALERTA"
    elif saturacion > 0.5 or tiempo_total > 60:
        return "ATENCION"
    return "NORMAL"


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("", response_model=PredictionResponse)
async def predict_demand(request: PredictionRequest):
    """
    Genera predicción de demanda básica para un hospital.
    """
    hospital_id = request.hospital_id or "chuac"
    config = HOSPITAL_CONFIG.get(hospital_id, HOSPITAL_CONFIG["chuac"])
    
    now = datetime.now()
    predictions = []
    factors = calculate_scenario_factor(request.scenario)
    
    for h in range(request.hours_ahead):
        future_time = now + timedelta(hours=h)
        hour = future_time.hour
        
        hour_factor = get_hourly_factor(hour)
        expected = config["base_rate"] * hour_factor * factors["demanda"]
        margin = expected * 0.3
        
        predictions.append(HourlyPrediction(
            hora=hour,
            timestamp=future_time.isoformat(),
            llegadas_esperadas=round(expected, 1),
            minimo=round(max(0, expected - margin), 1),
            maximo=round(expected + margin, 1),
            factor_escenario=round(factors["demanda"], 2)
        ))
    
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
        "factor_escenario_aplicado": round(factors["demanda"], 2)
    }
    
    return PredictionResponse(
        hospital_id=hospital_id,
        predicciones=predictions,
        resumen=resumen,
        escenario_aplicado=request.scenario,
        generado_en=now.isoformat()
    )


@router.post("/extended", response_model=ExtendedPredictionResponse)
async def predict_extended(request: ExtendedPredictionRequest):
    """
    Genera predicción extendida con múltiples métricas.
    
    Métricas disponibles:
    - llegadas: Llegadas de pacientes por hora
    - saturacion: Nivel de saturación y boxes ocupados
    - tiempo_espera: Tiempos de espera en triaje y consulta
    - derivaciones: Derivaciones estimadas
    - personal: Necesidades de personal
    """
    hospital_id = request.hospital_id or "chuac"
    config = HOSPITAL_CONFIG.get(hospital_id, HOSPITAL_CONFIG["chuac"])
    
    now = datetime.now()
    predictions = []
    alertas = []
    factors = calculate_scenario_factor(request.scenario)
    
    # Variables acumulativas
    cola_acumulada = 0
    
    # Datos para gráficos
    graf_llegadas = []
    graf_saturacion = []
    graf_tiempos = []
    graf_derivaciones = []
    
    for h in range(request.hours_ahead):
        future_time = now + timedelta(hours=h)
        hour = future_time.hour
        
        # Cálculo de llegadas
        hour_factor = get_hourly_factor(hour)
        llegadas = config["base_rate"] * hour_factor * factors["demanda"]
        llegadas_min = max(0, llegadas * 0.7)
        llegadas_max = llegadas * 1.3
        
        # Cálculo de saturación
        saturacion, boxes_ocupados, cola_acumulada = calculate_saturation(
            llegadas, config, cola_acumulada
        )
        
        # Cálculo de tiempos
        tiempos = calculate_wait_times(saturacion, config, factors["tiempo_espera"])
        
        # Cálculo de derivaciones
        derivs = calculate_derivations(saturacion, llegadas)
        
        # Cálculo de personal
        personal_necesario, personal_deficit = calculate_staff_needs(
            llegadas, saturacion, config, factors["personal"]
        )
        
        # Nivel de alerta
        nivel_alerta = get_alert_level(saturacion, tiempos["total"], derivs["cantidad"])
        
        # Agregar alerta si es crítico
        if nivel_alerta == "CRITICO" and h < 12:
            alertas.append({
                "hora": hour,
                "timestamp": future_time.isoformat(),
                "tipo": "SATURACION_CRITICA",
                "mensaje": f"Saturación crítica esperada a las {hour}:00 ({round(saturacion*100)}%)",
                "recomendacion": "Considerar activar protocolo de derivación"
            })
        
        predictions.append(ExtendedHourlyPrediction(
            hora=hour,
            timestamp=future_time.isoformat(),
            llegadas_esperadas=round(llegadas, 1),
            llegadas_min=round(llegadas_min, 1),
            llegadas_max=round(llegadas_max, 1),
            saturacion_estimada=round(saturacion, 3),
            boxes_ocupados_estimados=round(boxes_ocupados, 1),
            tiempo_espera_triaje=tiempos["triaje"],
            tiempo_espera_consulta=tiempos["consulta"],
            tiempo_total_estimado=tiempos["total"],
            derivaciones_estimadas=derivs["cantidad"],
            probabilidad_derivacion=derivs["probabilidad"],
            personal_necesario=personal_necesario,
            personal_deficit=personal_deficit,
            factor_escenario=round(factors["demanda"], 2),
            nivel_alerta=nivel_alerta
        ))
        
        # Datos para gráficos
        graf_llegadas.append({"x": hour, "y": round(llegadas, 1), "min": round(llegadas_min, 1), "max": round(llegadas_max, 1)})
        graf_saturacion.append({"x": hour, "y": round(saturacion * 100, 1)})
        graf_tiempos.append({"x": hour, "triaje": tiempos["triaje"], "consulta": tiempos["consulta"], "total": tiempos["total"]})
        graf_derivaciones.append({"x": hour, "y": derivs["cantidad"]})
    
    # Resumen extendido
    total_llegadas = sum(p.llegadas_esperadas for p in predictions)
    avg_saturacion = sum(p.saturacion_estimada for p in predictions) / len(predictions)
    total_derivaciones = sum(p.derivaciones_estimadas for p in predictions)
    max_tiempo = max(p.tiempo_total_estimado for p in predictions)
    horas_criticas = sum(1 for p in predictions if p.nivel_alerta == "CRITICO")
    
    resumen = {
        "total_llegadas": round(total_llegadas, 0),
        "promedio_hora": round(total_llegadas / len(predictions), 1),
        "saturacion_promedio": round(avg_saturacion * 100, 1),
        "saturacion_maxima": round(max(p.saturacion_estimada for p in predictions) * 100, 1),
        "tiempo_espera_maximo": round(max_tiempo, 0),
        "derivaciones_totales": round(total_derivaciones, 0),
        "horas_criticas": horas_criticas,
        "factor_demanda": round(factors["demanda"], 2),
        "factor_tiempo": round(factors["tiempo_espera"], 2)
    }
    
    # Datos para gráficos (primeras 24h o todas si menos)
    graficos = {
        "llegadas": graf_llegadas[:24],
        "saturacion": graf_saturacion[:24],
        "tiempos": graf_tiempos[:24],
        "derivaciones": graf_derivaciones[:24]
    }
    
    return ExtendedPredictionResponse(
        hospital_id=hospital_id,
        hospital_nombre=config["nombre"],
        predicciones=predictions,
        resumen=resumen,
        graficos=graficos,
        alertas=alertas[:5],  # Máximo 5 alertas
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
                "impacto_demanda": "+15%",
                "impacto_tiempos": "+10%"
            },
            {
                "nombre": "evento_masivo",
                "tipo": "boolean",
                "descripcion": "Evento masivo en la ciudad (concierto, fiesta)",
                "impacto_demanda": "+40%",
                "impacto_tiempos": "+30%"
            },
            {
                "nombre": "personal_reducido",
                "tipo": "float (0-1)",
                "descripcion": "Proporción de reducción de personal (0.2 = 20% menos)",
                "impacto_demanda": "0%",
                "impacto_tiempos": "Variable"
            },
            {
                "nombre": "temperatura_extrema",
                "tipo": "boolean",
                "descripcion": "Temperatura extrema (frío o calor)",
                "impacto_demanda": "+25%",
                "impacto_tiempos": "+15%"
            },
            {
                "nombre": "partido_futbol",
                "tipo": "boolean",
                "descripcion": "Partido de fútbol del Deportivo",
                "impacto_demanda": "+20%",
                "impacto_tiempos": "+10%"
            },
            {
                "nombre": "incidente_grave",
                "tipo": "boolean",
                "descripcion": "Incidente grave (accidente múltiple, incendio)",
                "impacto_demanda": "+60%",
                "impacto_tiempos": "+50%"
            },
            {
                "nombre": "epidemia",
                "tipo": "boolean",
                "descripcion": "Brote epidémico",
                "impacto_demanda": "+100%",
                "impacto_tiempos": "+80%"
            }
        ],
        "metricas_disponibles": [
            "llegadas",
            "saturacion", 
            "tiempo_espera",
            "derivaciones",
            "personal"
        ],
        "ejemplo_request": {
            "hospital_id": "chuac",
            "hours_ahead": 48,
            "scenario": {
                "lluvia": True,
                "partido_futbol": True,
                "personal_reducido": 0.1
            },
            "metricas": ["llegadas", "saturacion", "tiempo_espera"]
        }
    }


@router.get("/compare")
async def compare_hospitals(
    hours_ahead: int = Query(default=24, ge=1, le=72),
    scenario_lluvia: bool = False,
    scenario_evento: bool = False
):
    """Compara predicciones entre todos los hospitales"""
    scenario = WhatIfScenario(
        lluvia=scenario_lluvia,
        evento_masivo=scenario_evento
    )
    
    comparacion = {}
    
    for hospital_id, config in HOSPITAL_CONFIG.items():
        factors = calculate_scenario_factor(scenario)
        now = datetime.now()
        
        total_llegadas = 0
        max_saturacion = 0
        cola = 0
        
        for h in range(hours_ahead):
            future_time = now + timedelta(hours=h)
            hour = future_time.hour
            
            llegadas = config["base_rate"] * get_hourly_factor(hour) * factors["demanda"]
            total_llegadas += llegadas
            
            saturacion, _, cola = calculate_saturation(llegadas, config, cola)
            max_saturacion = max(max_saturacion, saturacion)
        
        comparacion[hospital_id] = {
            "nombre": config["nombre"],
            "llegadas_totales": round(total_llegadas, 0),
            "promedio_hora": round(total_llegadas / hours_ahead, 1),
            "saturacion_maxima": round(max_saturacion * 100, 1),
            "capacidad_boxes": config["boxes_totales"],
            "recomendacion": "DERIVAR" if max_saturacion > 0.9 else "RECIBIR" if max_saturacion < 0.7 else "MONITORIZAR"
        }
    
    return {
        "periodo_horas": hours_ahead,
        "escenario": scenario.model_dump(),
        "hospitales": comparacion,
        "generado_en": datetime.now().isoformat()
    }
