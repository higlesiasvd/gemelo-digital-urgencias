"""
============================================================================
SERVIDOR MCP - CHATBOT CON GROQ LLAMA-3 70B
============================================================================
Proporciona herramientas MCP para consultar el estado de los hospitales.
Usa Kafka (no MQTT) para recibir actualizaciones en tiempo real.
============================================================================
"""

import json
import asyncio
import os
import httpx
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging
from dataclasses import dataclass, asdict
from threading import Thread

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from common.kafka_client import KafkaClient
from common.schemas import HospitalId, HospitalStats
from common.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURACION GROQ
# ============================================================================

GROQ_API_KEY = settings.GROQ_API_KEY
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = settings.GROQ_MODEL

# ============================================================================
# APP
# ============================================================================

app = FastAPI(
    title="Hospital MCP Server",
    description="Servidor MCP para consultas hospitalarias con IA (Llama 70B)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ESTADO GLOBAL
# ============================================================================

@dataclass
class HospitalState:
    """Estado de un hospital"""
    id: str
    nombre: str
    boxes_ocupados: int = 0
    boxes_totales: int = 5
    ocupacion_boxes: float = 0.0
    consultas_ocupadas: int = 0
    consultas_totales: int = 10
    ocupacion_consultas: float = 0.0
    cola_triaje: int = 0
    cola_consulta: int = 0
    tiempo_medio_espera: float = 0.0
    tiempo_medio_total: float = 0.0
    nivel_saturacion: float = 0.0
    emergencia_activa: bool = False
    pacientes_atendidos_hora: int = 0
    pacientes_derivados: int = 0
    ultimo_update: datetime = None

    def to_dict(self):
        d = asdict(self)
        d['ultimo_update'] = self.ultimo_update.isoformat() if self.ultimo_update else None
        return d


# Estado de hospitales
hospitales_state: Dict[str, HospitalState] = {
    'chuac': HospitalState(
        id='chuac',
        nombre='CHUAC - Complejo Hospitalario Universitario',
        boxes_totales=5,
        consultas_totales=10
    ),
    'modelo': HospitalState(
        id='modelo',
        nombre='Hospital HM Modelo',
        boxes_totales=1,
        consultas_totales=4
    ),
    'san_rafael': HospitalState(
        id='san_rafael',
        nombre='Hospital San Rafael',
        boxes_totales=1,
        consultas_totales=4
    ),
}

# Contexto externo
contexto_state = {
    "temperatura": None,
    "condicion_climatica": None,
    "factor_eventos": 1.0,
    "es_festivo": False
}


# ============================================================================
# KAFKA CONSUMER (en background)
# ============================================================================

kafka_client = KafkaClient(client_id="chatbot", group_id="chatbot-group")


def process_kafka_message(topic: str, data: dict):
    """Procesa mensajes de Kafka"""
    try:
        if topic == "hospital-stats":
            hospital_id = data.get("hospital_id")
            if hospital_id and hospital_id in hospitales_state:
                state = hospitales_state[hospital_id]
                state.boxes_ocupados = data.get('boxes_ocupados', state.boxes_ocupados)
                state.boxes_totales = data.get('boxes_totales', state.boxes_totales)
                state.ocupacion_boxes = data.get('saturacion_global', state.ocupacion_boxes)
                state.consultas_ocupadas = data.get('consultas_ocupadas', state.consultas_ocupadas)
                state.consultas_totales = data.get('consultas_totales', state.consultas_totales)
                state.cola_triaje = data.get('cola_triaje', state.cola_triaje)
                state.cola_consulta = data.get('cola_consulta', state.cola_consulta)
                state.tiempo_medio_espera = data.get('tiempo_medio_espera_triaje', state.tiempo_medio_espera)
                state.tiempo_medio_total = data.get('tiempo_medio_total', state.tiempo_medio_total)
                state.nivel_saturacion = data.get('saturacion_global', state.nivel_saturacion)
                state.emergencia_activa = data.get('emergencia_activa', state.emergencia_activa)
                state.pacientes_atendidos_hora = data.get('pacientes_atendidos_hora', state.pacientes_atendidos_hora)
                state.pacientes_derivados = data.get('pacientes_derivados_enviados', state.pacientes_derivados)
                state.ultimo_update = datetime.now()

        elif topic == "system-context":
            contexto_state["temperatura"] = data.get('temperatura')
            contexto_state["condicion_climatica"] = data.get('condicion')
            contexto_state["factor_eventos"] = data.get('factor_evento', 1.0)
            contexto_state["es_festivo"] = data.get('es_festivo', False)

    except Exception as e:
        logger.error(f"Error procesando mensaje Kafka: {e}")


def kafka_consumer_loop():
    """Loop de consumo de Kafka en background"""
    kafka_client.subscribe(["hospital-stats", "system-context", "diversion-alerts"])
    logger.info("Kafka consumer loop iniciado, esperando mensajes...")

    while True:
        try:
            msg = kafka_client.consume_one(timeout=1.0)
            if msg:
                logger.info(f"Kafka mensaje recibido: topic={msg['topic']}, hospital_id={msg['value'].get('hospital_id', 'N/A')}")
                process_kafka_message(msg['topic'], msg['value'])
        except Exception as e:
            logger.error(f"Error en consumer Kafka: {e}")


# Iniciar consumer en thread separado
consumer_thread = Thread(target=kafka_consumer_loop, daemon=True)


# ============================================================================
# HERRAMIENTAS MCP
# ============================================================================

def get_hospital_status(hospital_id: Optional[str] = None) -> Dict[str, Any]:
    """Obtiene el estado de uno o todos los hospitales"""
    if hospital_id:
        if hospital_id not in hospitales_state:
            return {"error": f"Hospital {hospital_id} no encontrado"}
        return hospitales_state[hospital_id].to_dict()

    return {
        hospital_id: state.to_dict()
        for hospital_id, state in hospitales_state.items()
    }


def get_waiting_times() -> Dict[str, Any]:
    """Obtiene tiempos de espera de todos los hospitales"""
    result = {}
    for hid, state in hospitales_state.items():
        result[hid] = {
            "hospital": state.nombre,
            "tiempo_medio_espera_minutos": round(state.tiempo_medio_espera, 1),
            "tiempo_total_estimado": round(state.tiempo_medio_total, 1),
            "cola_triaje": state.cola_triaje,
            "cola_consulta": state.cola_consulta,
            "nivel_saturacion": round(state.nivel_saturacion * 100, 1)
        }
    return result


def get_best_hospital() -> Dict[str, Any]:
    """Recomienda el mejor hospital para emergencia"""
    scored = []
    for hid, state in hospitales_state.items():
        score = (1 - state.nivel_saturacion) * 0.5 + (1 / (1 + state.tiempo_medio_espera/60)) * 0.3
        if hid == 'chuac':
            score += 0.2

        scored.append({
            "hospital_id": hid,
            "nombre": state.nombre,
            "score": round(score, 3),
            "saturacion": round(state.nivel_saturacion * 100, 1),
            "tiempo_espera": round(state.tiempo_medio_espera, 1),
            "es_referencia": hid == 'chuac'
        })

    scored.sort(key=lambda x: x['score'], reverse=True)

    return {
        "recomendacion": scored[0] if scored else None,
        "alternativas": scored[1:],
        "nota": "CHUAC es el hospital de referencia para casos graves (ROJO/NARANJA)"
    }


def get_system_summary() -> Dict[str, Any]:
    """Obtiene resumen general del sistema incluyendo stats por hospital"""
    total_boxes = sum(s.boxes_totales for s in hospitales_state.values())
    total_boxes_ocupados = sum(s.boxes_ocupados for s in hospitales_state.values())
    total_cola = sum(s.cola_triaje + s.cola_consulta for s in hospitales_state.values())
    avg_saturacion = sum(s.nivel_saturacion for s in hospitales_state.values()) / len(hospitales_state)

    if avg_saturacion > 0.85:
        estado = "CRITICO"
    elif avg_saturacion > 0.70:
        estado = "ALERTA"
    elif avg_saturacion > 0.50:
        estado = "ATENCION"
    else:
        estado = "NORMAL"

    # Añadir datos por hospital para el frontend
    hospitales_data = {}
    for hospital_id, state in hospitales_state.items():
        hospitales_data[hospital_id] = state.to_dict()

    return {
        "estado_general": estado,
        "saturacion_global": round(avg_saturacion * 100, 1),
        "boxes_ocupados": total_boxes_ocupados,
        "boxes_totales": total_boxes,
        "pacientes_en_espera": total_cola,
        "hospitales_activos": len(hospitales_state),
        "hospitales": hospitales_data,  # Stats por hospital
        "contexto": contexto_state,
        "timestamp": datetime.now().isoformat()
    }


TOOLS = {
    "get_hospital_status": get_hospital_status,
    "get_waiting_times": get_waiting_times,
    "get_best_hospital": get_best_hospital,
    "get_system_summary": get_system_summary,
}


# ============================================================================
# ENDPOINTS
# ============================================================================

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None


@app.get("/")
async def root():
    return {"status": "ok", "service": "Hospital MCP Server", "version": "2.0.0"}


@app.get("/tools")
async def list_tools():
    """Lista herramientas MCP disponibles"""
    return {
        "tools": [
            {"name": "get_hospital_status", "description": "Estado de hospitales"},
            {"name": "get_waiting_times", "description": "Tiempos de espera"},
            {"name": "get_best_hospital", "description": "Recomendar hospital"},
            {"name": "get_system_summary", "description": "Resumen del sistema"},
        ]
    }


@app.post("/tools/{tool_name}")
async def call_tool(tool_name: str, params: Dict[str, Any] = {}):
    """Ejecuta una herramienta MCP"""
    if tool_name not in TOOLS:
        raise HTTPException(status_code=404, detail=f"Herramienta {tool_name} no encontrada")

    try:
        result = TOOLS[tool_name](**params)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def get_status():
    """Estado general del sistema"""
    return get_system_summary()


@app.get("/hospitals")
async def get_hospitals():
    """Estado de todos los hospitales"""
    return get_hospital_status()


async def call_groq_llm(messages: List[Dict[str, str]], context: str) -> Optional[str]:
    """Llama a Groq API con Llama 70B"""
    if not GROQ_API_KEY:
        return None

    system_prompt = f"""Eres un asistente experto del Sistema de Urgencias Hospitalarias de A Coruña, España.
Tu rol es ayudar al personal médico a entender el estado del sistema.

DATOS EN TIEMPO REAL:
{context}

INSTRUCCIONES:
1. Responde SIEMPRE en español
2. Sé conciso pero informativo
3. Usa emojis para hacer la información visual
4. Si hay situaciones críticas, destácalas
5. Ofrece recomendaciones cuando sea apropiado
6. No inventes datos, usa solo la información proporcionada

HOSPITALES:
- CHUAC: Hospital de REFERENCIA para casos graves
- HM Modelo: Hospital privado
- San Rafael: Hospital más pequeño

FLUJO: Ventanilla → Triaje → Consulta → Alta/Observación"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        *messages
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1024
                }
            )

            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                logger.error(f"Error Groq: {response.status_code}")
                return None

    except Exception as e:
        logger.error(f"Error llamando a Groq: {e}")
        return None


def format_context() -> str:
    """Formatea el contexto para el LLM"""
    summary = get_system_summary()
    times = get_waiting_times()

    context = f"""
=== ESTADO GENERAL ===
Estado: {summary['estado_general']}
Saturación global: {summary['saturacion_global']}%
Boxes ocupados: {summary['boxes_ocupados']}/{summary['boxes_totales']}
Pacientes en espera: {summary['pacientes_en_espera']}

=== POR HOSPITAL ===
"""
    for hid, info in times.items():
        context += f"""
{info['hospital']}:
- Saturación: {info['nivel_saturacion']}%
- Tiempo espera: {info['tiempo_medio_espera_minutos']} min
- Cola triaje: {info['cola_triaje']}
- Cola consulta: {info['cola_consulta']}
"""
    return context


@app.post("/chat")
async def chat(message: ChatMessage):
    """Endpoint principal del chatbot"""
    try:
        context = format_context()
        messages = [{"role": "user", "content": message.message}]

        llm_response = await call_groq_llm(messages, context)

        if llm_response:
            return {
                "response": llm_response,
                "ai_powered": True,
                "raw_data": get_system_summary()
            }
        else:
            # Fallback
            summary = get_system_summary()
            fallback = f"Estado del sistema: {summary['estado_general']}. Saturación: {summary['saturacion_global']}%"
            return {
                "response": fallback,
                "ai_powered": False,
                "raw_data": summary
            }

    except Exception as e:
        logger.error(f"Error en chat: {e}")
        return {"response": f"Error: {str(e)}", "ai_powered": False}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket para actualizaciones en tiempo real"""
    await websocket.accept()
    logger.info("WebSocket conectado")

    try:
        while True:
            state = get_system_summary()
            await websocket.send_json({"type": "status_update", "data": state})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info("WebSocket desconectado")


@app.on_event("startup")
async def startup():
    """Iniciar consumer Kafka"""
    consumer_thread.start()
    logger.info("MCP Server iniciado con Kafka consumer")


@app.on_event("shutdown")
async def shutdown():
    """Cerrar conexiones"""
    kafka_client.close()
    logger.info("MCP Server cerrado")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
