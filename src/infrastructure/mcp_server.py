"""
Servidor MCP (Model Context Protocol) para consultas de información hospitalaria.
Proporciona herramientas para que un chatbot pueda consultar el estado de los hospitales.
Utiliza Groq con Llama 70B para procesamiento de lenguaje natural.
"""

import json
import asyncio
import os
import httpx
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging
from dataclasses import dataclass, asdict
import random

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== Configuración Groq ==============
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

app = FastAPI(
    title="Hospital MCP Server",
    description="Servidor MCP para consultas de información hospitalaria con IA (Llama 70B)",
    version="2.0.0"
)

# CORS para permitir conexiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Estado Global ==============

@dataclass
class HospitalState:
    id: str
    nombre: str
    boxes_ocupados: int = 0
    boxes_totales: int = 20
    pacientes_en_espera: int = 0
    tiempo_medio_espera: float = 0
    nivel_saturacion: float = 0
    emergencia_activa: bool = False
    ultimo_update: datetime = None
    
    def to_dict(self):
        d = asdict(self)
        d['ultimo_update'] = self.ultimo_update.isoformat() if self.ultimo_update else None
        return d


# Estado de hospitales (se actualiza via MQTT)
hospitales_state: Dict[str, HospitalState] = {
    'chuac': HospitalState(
        id='chuac',
        nombre='CHUAC - Complejo Hospitalario Universitario',
        boxes_totales=35
    ),
    'hm_modelo': HospitalState(
        id='hm_modelo',
        nombre='HM Modelo',
        boxes_totales=18
    ),
    'san_rafael': HospitalState(
        id='san_rafael',
        nombre='Hospital San Rafael',
        boxes_totales=15
    ),
}

# Historial de conversaciones
conversations: Dict[str, List[Dict[str, str]]] = {}

# ============== MQTT Client ==============

mqtt_client = mqtt.Client(client_id="mcp_server", protocol=mqtt.MQTTv311)

def on_mqtt_connect(client, userdata, flags, rc):
    logger.info(f"MCP Server conectado a MQTT con código: {rc}")
    # Suscribirse al topic del coordinador que contiene el estado de todos los hospitales
    client.subscribe("urgencias/coordinador/estado")
    client.subscribe("urgencias/+/emergencia")
    logger.info("Suscrito a urgencias/coordinador/estado y urgencias/+/emergencia")

def on_mqtt_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        
        # Procesar mensaje del coordinador con todos los hospitales
        if msg.topic == "urgencias/coordinador/estado":
            hospitales_data = data.get('hospitales', {})
            emergencia_activa = data.get('emergencia_activa', False)
            
            for hospital_id, hospital_data in hospitales_data.items():
                if hospital_id in hospitales_state:
                    state = hospitales_state[hospital_id]
                    state.boxes_ocupados = hospital_data.get('boxes_ocupados', state.boxes_ocupados)
                    state.boxes_totales = hospital_data.get('boxes_totales', state.boxes_totales)
                    state.pacientes_en_espera = hospital_data.get('en_cola', state.pacientes_en_espera)
                    state.tiempo_medio_espera = hospital_data.get('tiempo_espera', state.tiempo_medio_espera)
                    state.nivel_saturacion = hospital_data.get('saturacion', state.nivel_saturacion) * 100  # Convertir a porcentaje
                    state.emergencia_activa = emergencia_activa
                    state.ultimo_update = datetime.now()
            
            logger.debug(f"Estado actualizado: {list(hospitales_data.keys())}")
        
        # Procesar emergencias
        elif 'emergencia' in msg.topic:
            topic_parts = msg.topic.split('/')
            if len(topic_parts) >= 2:
                hospital_id = topic_parts[1]
                if hospital_id in hospitales_state:
                    hospitales_state[hospital_id].emergencia_activa = data.get('activa', False)
                    
    except Exception as e:
        logger.error(f"Error procesando mensaje MQTT: {e}")

mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_message = on_mqtt_message

# ============== Herramientas MCP ==============

class MCPTool:
    """Definición de una herramienta MCP"""
    def __init__(self, name: str, description: str, parameters: Dict, handler):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler

# Handlers de herramientas

def get_hospital_status(hospital_id: Optional[str] = None) -> Dict[str, Any]:
    """Obtiene el estado actual de uno o todos los hospitales"""
    if hospital_id:
        if hospital_id not in hospitales_state:
            return {"error": f"Hospital {hospital_id} no encontrado"}
        return hospitales_state[hospital_id].to_dict()
    
    return {
        hospital_id: state.to_dict() 
        for hospital_id, state in hospitales_state.items()
    }

def get_hospital_occupancy(hospital_id: Optional[str] = None) -> Dict[str, Any]:
    """Obtiene la ocupación de boxes de los hospitales"""
    if hospital_id:
        if hospital_id not in hospitales_state:
            return {"error": f"Hospital {hospital_id} no encontrado"}
        state = hospitales_state[hospital_id]
        ocupacion = (state.boxes_ocupados / state.boxes_totales * 100) if state.boxes_totales > 0 else 0
        return {
            "hospital": state.nombre,
            "boxes_ocupados": state.boxes_ocupados,
            "boxes_totales": state.boxes_totales,
            "porcentaje_ocupacion": round(ocupacion, 1),
            "boxes_disponibles": state.boxes_totales - state.boxes_ocupados
        }
    
    result = {}
    for hid, state in hospitales_state.items():
        ocupacion = (state.boxes_ocupados / state.boxes_totales * 100) if state.boxes_totales > 0 else 0
        result[hid] = {
            "hospital": state.nombre,
            "boxes_ocupados": state.boxes_ocupados,
            "boxes_totales": state.boxes_totales,
            "porcentaje_ocupacion": round(ocupacion, 1),
            "boxes_disponibles": state.boxes_totales - state.boxes_ocupados
        }
    return result

def get_waiting_times() -> Dict[str, Any]:
    """Obtiene los tiempos de espera de todos los hospitales"""
    result = {}
    for hid, state in hospitales_state.items():
        result[hid] = {
            "hospital": state.nombre,
            "tiempo_medio_espera_minutos": round(state.tiempo_medio_espera, 1),
            "pacientes_en_espera": state.pacientes_en_espera,
            "nivel_saturacion": round(state.nivel_saturacion * 100, 1)
        }
    return result

def get_best_hospital_for_emergency() -> Dict[str, Any]:
    """Recomienda el mejor hospital para una emergencia basado en saturación y tiempos"""
    scored_hospitals = []
    
    for hid, state in hospitales_state.items():
        # Score: menor saturación y menor tiempo de espera = mejor
        score = (1 - state.nivel_saturacion) * 0.6 + (1 / (1 + state.tiempo_medio_espera/60)) * 0.4
        scored_hospitals.append({
            "hospital_id": hid,
            "nombre": state.nombre,
            "score": score,
            "nivel_saturacion": round(state.nivel_saturacion * 100, 1),
            "tiempo_espera": round(state.tiempo_medio_espera, 1),
            "boxes_disponibles": state.boxes_totales - state.boxes_ocupados
        })
    
    scored_hospitals.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        "recomendacion": scored_hospitals[0] if scored_hospitals else None,
        "alternativas": scored_hospitals[1:],
        "analisis": f"El hospital más recomendado es {scored_hospitals[0]['nombre']} con un {scored_hospitals[0]['nivel_saturacion']}% de saturación y {scored_hospitals[0]['tiempo_espera']} min de espera."
    }

def get_system_summary() -> Dict[str, Any]:
    """Obtiene un resumen general del sistema de urgencias"""
    total_boxes = sum(s.boxes_totales for s in hospitales_state.values())
    total_ocupados = sum(s.boxes_ocupados for s in hospitales_state.values())
    total_espera = sum(s.pacientes_en_espera for s in hospitales_state.values())
    avg_tiempo = sum(s.tiempo_medio_espera for s in hospitales_state.values()) / len(hospitales_state) if hospitales_state else 0
    emergencias = sum(1 for s in hospitales_state.values() if s.emergencia_activa)
    
    saturacion_global = (total_ocupados / total_boxes * 100) if total_boxes > 0 else 0
    
    # Determinar estado del sistema
    if saturacion_global > 85:
        estado = "CRÍTICO"
        color = "red"
    elif saturacion_global > 70:
        estado = "ALERTA"
        color = "orange"
    elif saturacion_global > 50:
        estado = "ATENCIÓN"
        color = "yellow"
    else:
        estado = "NORMAL"
        color = "green"
    
    return {
        "estado_general": estado,
        "color_estado": color,
        "ocupacion_global": round(saturacion_global, 1),
        "boxes_ocupados": total_ocupados,
        "boxes_totales": total_boxes,
        "boxes_disponibles": total_boxes - total_ocupados,
        "pacientes_en_espera_total": total_espera,
        "tiempo_medio_espera_global": round(avg_tiempo, 1),
        "emergencias_activas": emergencias,
        "hospitales_activos": len(hospitales_state),
        "timestamp": datetime.now().isoformat()
    }

def get_hospital_comparison() -> Dict[str, Any]:
    """Compara los hospitales entre sí"""
    comparacion = []
    
    for hid, state in hospitales_state.items():
        ocupacion = (state.boxes_ocupados / state.boxes_totales * 100) if state.boxes_totales > 0 else 0
        comparacion.append({
            "hospital_id": hid,
            "nombre": state.nombre,
            "ocupacion": round(ocupacion, 1),
            "tiempo_espera": round(state.tiempo_medio_espera, 1),
            "pacientes_espera": state.pacientes_en_espera,
            "emergencia": state.emergencia_activa
        })
    
    # Ordenar por ocupación
    comparacion.sort(key=lambda x: x['ocupacion'], reverse=True)
    
    return {
        "hospitales": comparacion,
        "mas_saturado": comparacion[0] if comparacion else None,
        "menos_saturado": comparacion[-1] if comparacion else None
    }

# Registro de herramientas
TOOLS: Dict[str, MCPTool] = {
    "get_hospital_status": MCPTool(
        name="get_hospital_status",
        description="Obtiene el estado actual de uno o todos los hospitales, incluyendo boxes ocupados, pacientes en espera y nivel de saturación",
        parameters={
            "type": "object",
            "properties": {
                "hospital_id": {
                    "type": "string",
                    "description": "ID del hospital (chuac, hm_modelo, san_rafael). Si no se especifica, devuelve todos.",
                    "enum": ["chuac", "hm_modelo", "san_rafael"]
                }
            }
        },
        handler=get_hospital_status
    ),
    "get_hospital_occupancy": MCPTool(
        name="get_hospital_occupancy",
        description="Obtiene información detallada sobre la ocupación de boxes en los hospitales",
        parameters={
            "type": "object",
            "properties": {
                "hospital_id": {
                    "type": "string",
                    "description": "ID del hospital. Si no se especifica, devuelve todos.",
                    "enum": ["chuac", "hm_modelo", "san_rafael"]
                }
            }
        },
        handler=get_hospital_occupancy
    ),
    "get_waiting_times": MCPTool(
        name="get_waiting_times",
        description="Obtiene los tiempos de espera actuales de todos los hospitales",
        parameters={"type": "object", "properties": {}},
        handler=get_waiting_times
    ),
    "get_best_hospital_for_emergency": MCPTool(
        name="get_best_hospital_for_emergency",
        description="Recomienda el mejor hospital para atender una emergencia basándose en saturación y tiempos de espera",
        parameters={"type": "object", "properties": {}},
        handler=get_best_hospital_for_emergency
    ),
    "get_system_summary": MCPTool(
        name="get_system_summary",
        description="Obtiene un resumen general del estado del sistema de urgencias",
        parameters={"type": "object", "properties": {}},
        handler=get_system_summary
    ),
    "get_hospital_comparison": MCPTool(
        name="get_hospital_comparison",
        description="Compara todos los hospitales entre sí, mostrando cuál está más y menos saturado",
        parameters={"type": "object", "properties": {}},
        handler=get_hospital_comparison
    ),
}

# ============== API Endpoints ==============

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ToolCall(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = {}

@app.get("/")
async def root():
    return {"status": "ok", "service": "Hospital MCP Server"}

@app.get("/tools")
async def list_tools():
    """Lista todas las herramientas MCP disponibles"""
    return {
        "tools": [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
            for tool in TOOLS.values()
        ]
    }

@app.post("/tools/{tool_name}")
async def call_tool(tool_name: str, params: Dict[str, Any] = {}):
    """Ejecuta una herramienta MCP"""
    if tool_name not in TOOLS:
        raise HTTPException(status_code=404, detail=f"Herramienta {tool_name} no encontrada")
    
    tool = TOOLS[tool_name]
    try:
        result = tool.handler(**params)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def get_status():
    """Obtiene el estado general del sistema"""
    return get_system_summary()

@app.get("/hospitals")
async def get_hospitals():
    """Obtiene el estado de todos los hospitales"""
    return get_hospital_status()

@app.get("/hospitals/{hospital_id}")
async def get_hospital(hospital_id: str):
    """Obtiene el estado de un hospital específico"""
    if hospital_id not in hospitales_state:
        raise HTTPException(status_code=404, detail=f"Hospital {hospital_id} no encontrado")
    return hospitales_state[hospital_id].to_dict()

# ============== Chat Endpoint con Groq Llama 70B ==============

def process_natural_language_fallback(message: str) -> Dict[str, Any]:
    """Fallback: Procesa el mensaje sin IA"""
    message_lower = message.lower()
    results = []
    
    if any(word in message_lower for word in ['resumen', 'general', 'sistema', 'cómo está', 'estado']):
        results.append({"tool": "get_system_summary", "data": get_system_summary()})
    
    if any(word in message_lower for word in ['ocupación', 'ocupados', 'boxes', 'camas', 'disponibles']):
        results.append({"tool": "get_hospital_occupancy", "data": get_hospital_occupancy()})
    
    if any(word in message_lower for word in ['espera', 'tiempo', 'cuánto tarda']):
        results.append({"tool": "get_waiting_times", "data": get_waiting_times()})
    
    if any(word in message_lower for word in ['mejor', 'recomiend', 'emergencia']):
        results.append({"tool": "get_best_hospital_for_emergency", "data": get_best_hospital_for_emergency()})
    
    if not results:
        results.append({"tool": "get_system_summary", "data": get_system_summary()})
    
    return {"results": results}


def generate_response_fallback(tool_results: Dict[str, Any]) -> str:
    """Fallback: Genera respuesta básica sin IA"""
    results = tool_results.get("results", [])
    if not results:
        return "Lo siento, no pude obtener información."
    
    data = results[0]["data"]
    if "estado_general" in data:
        return (
            f"📊 **Estado del Sistema**\n\n"
            f"• Estado: **{data['estado_general']}**\n"
            f"• Ocupación: **{data['ocupacion_global']}%**\n"
            f"• Boxes disponibles: **{data['boxes_disponibles']}**\n"
            f"• Pacientes en espera: **{data['pacientes_en_espera_total']}**"
        )
    return "Información del sistema disponible."


async def call_groq_llm(messages: List[Dict[str, str]], tools_context: str) -> str:
    """Llama a Groq API con Llama 70B para generar respuestas inteligentes"""
    
    system_prompt = f"""Eres un asistente experto del Sistema de Urgencias Hospitalarias de A Coruña, España.
Tu rol es ayudar al personal médico y administrativo a entender el estado del sistema.

DATOS EN TIEMPO REAL DEL SISTEMA:
{tools_context}

INSTRUCCIONES:
1. Responde SIEMPRE en español
2. Sé conciso pero informativo
3. Usa emojis para hacer la información más visual (🏥 🚨 ⏱️ 📊 ✅ ⚠️ 🔴 🟡 🟢)
4. Si hay situaciones críticas, destácalas primero
5. Ofrece recomendaciones cuando sea apropiado
6. Usa formato Markdown para estructurar la respuesta (negritas, listas, etc.)
7. No inventes datos, usa solo la información proporcionada
8. Si te preguntan algo que no puedes responder con los datos, indícalo claramente

HOSPITALES DEL SISTEMA:
- CHUAC: Complejo Hospitalario Universitario (el más grande, 35 boxes)
- HM Modelo: Hospital privado de referencia (18 boxes)
- San Rafael: Hospital más pequeño (15 boxes)

Responde de forma natural y profesional, como un asistente experto en gestión hospitalaria."""

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
                    "max_tokens": 1024,
                    "top_p": 0.9
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.error(f"Error Groq API: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Error llamando a Groq: {e}")
        return None


def get_all_hospital_data() -> Dict[str, Any]:
    """Obtiene todos los datos de hospitales para el contexto de IA"""
    return {
        "resumen_sistema": get_system_summary(),
        "ocupacion_hospitales": get_hospital_occupancy(),
        "tiempos_espera": get_waiting_times(),
        "comparacion": get_hospital_comparison(),
        "recomendacion_emergencia": get_best_hospital_for_emergency()
    }


def format_context_for_llm(data: Dict[str, Any]) -> str:
    """Formatea los datos para el contexto del LLM"""
    resumen = data["resumen_sistema"]
    ocupacion = data["ocupacion_hospitales"]
    tiempos = data["tiempos_espera"]
    comparacion = data["comparacion"]
    recomendacion = data["recomendacion_emergencia"]
    
    context = f"""
=== ESTADO GENERAL DEL SISTEMA ===
- Estado: {resumen['estado_general']} ({resumen['color_estado']})
- Ocupación global: {resumen['ocupacion_global']}%
- Boxes totales: {resumen['boxes_totales']} | Ocupados: {resumen['boxes_ocupados']} | Disponibles: {resumen['boxes_disponibles']}
- Pacientes en espera total: {resumen['pacientes_en_espera_total']}
- Tiempo medio de espera global: {resumen['tiempo_medio_espera_global']} minutos
- Emergencias activas: {resumen['emergencias_activas']}
- Última actualización: {resumen['timestamp']}

=== DETALLE POR HOSPITAL ===
"""
    
    for hid, info in ocupacion.items():
        tiempo_info = tiempos.get(hid, {})
        context += f"""
**{info['hospital']}** (ID: {hid})
- Ocupación: {info['porcentaje_ocupacion']}%
- Boxes: {info['boxes_ocupados']}/{info['boxes_totales']} (disponibles: {info['boxes_disponibles']})
- Pacientes en espera: {tiempo_info.get('pacientes_en_espera', 'N/A')}
- Tiempo medio de espera: {tiempo_info.get('tiempo_medio_espera_minutos', 'N/A')} min
"""
    
    context += f"""
=== ANÁLISIS ===
- Hospital más saturado: {comparacion['mas_saturado']['nombre']} ({comparacion['mas_saturado']['ocupacion']}%)
- Hospital menos saturado: {comparacion['menos_saturado']['nombre']} ({comparacion['menos_saturado']['ocupacion']}%)

=== RECOMENDACIÓN PARA EMERGENCIAS ===
{recomendacion['analisis']}
"""
    
    return context


@app.post("/chat")
async def chat(message: ChatMessage):
    """Endpoint principal del chatbot con IA Llama 70B"""
    try:
        # Obtener todos los datos actuales
        all_data = get_all_hospital_data()
        tools_context = format_context_for_llm(all_data)
        
        # Preparar mensajes para el LLM
        messages = [{"role": "user", "content": message.message}]
        
        # Intentar usar Groq LLM
        llm_response = await call_groq_llm(messages, tools_context)
        
        if llm_response:
            # Respuesta exitosa con IA
            return {
                "response": llm_response,
                "tools_used": ["groq_llama_70b", "get_system_summary", "get_hospital_occupancy", "get_waiting_times"],
                "raw_data": all_data,
                "ai_powered": True
            }
        else:
            # Fallback a respuesta básica si falla Groq
            logger.warning("Fallback a respuesta sin IA")
            tool_results = process_natural_language_fallback(message.message)
            response = generate_response_fallback(tool_results)
            
            return {
                "response": response,
                "tools_used": [r["tool"] for r in tool_results.get("results", [])],
                "raw_data": tool_results,
                "ai_powered": False
            }
            
    except Exception as e:
        logger.error(f"Error en chat: {e}")
        return {
            "response": f"Lo siento, ocurrió un error: {str(e)}",
            "tools_used": [],
            "raw_data": {},
            "ai_powered": False
        }

# ============== WebSocket para actualizaciones en tiempo real ==============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket conectado")
    
    try:
        while True:
            # Enviar estado cada 2 segundos
            state = get_system_summary()
            await websocket.send_json({"type": "status_update", "data": state})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info("WebSocket desconectado")

# ============== Startup/Shutdown ==============

@app.on_event("startup")
async def startup_event():
    """Conectar a MQTT al iniciar"""
    try:
        mqtt_client.connect("mosquitto", 1883, 60)
        mqtt_client.loop_start()
        logger.info("MCP Server iniciado y conectado a MQTT")
    except Exception as e:
        logger.warning(f"No se pudo conectar a MQTT: {e}. Usando datos simulados.")

@app.on_event("shutdown")
async def shutdown_event():
    """Desconectar MQTT al cerrar"""
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    logger.info("MCP Server cerrado")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
