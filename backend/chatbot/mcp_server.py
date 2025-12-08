"""
============================================================================
SERVIDOR MCP - CHATBOT CON GROQ LLAMA-3 70B
============================================================================
Proporciona herramientas MCP para consultar el estado de los hospitales.
Consume TODOS los topics de Kafka y datos de PostgreSQL.
============================================================================
"""

import json
import asyncio
import os
import httpx
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging
from dataclasses import dataclass, asdict, field
from threading import Thread

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from common.kafka_client import KafkaClient
from common.schemas import HospitalId, HospitalStats, KAFKA_TOPICS
from common.config import settings
from .db_connector import db_connector

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
    version="3.0.0"
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
    ventanillas_ocupadas: int = 0
    ventanillas_totales: int = 2
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
    # Listas de pacientes por área (para visualización en dashboard)
    pacientes_ventanilla: List[Dict] = None
    pacientes_triaje: List[Dict] = None
    pacientes_consulta: List[Dict] = None

    def __post_init__(self):
        if self.pacientes_ventanilla is None:
            self.pacientes_ventanilla = []
        if self.pacientes_triaje is None:
            self.pacientes_triaje = []
        if self.pacientes_consulta is None:
            self.pacientes_consulta = []

    def to_dict(self):
        d = asdict(self)
        d['ultimo_update'] = self.ultimo_update.isoformat() if self.ultimo_update else None
        return d


# Estado de hospitales
hospitales_state: Dict[str, HospitalState] = {
    'chuac': HospitalState(
        id='chuac',
        nombre='CHUAC - Complejo Hospitalario Universitario',
        ventanillas_totales=2,
        boxes_totales=5,
        consultas_totales=10
    ),
    'modelo': HospitalState(
        id='modelo',
        nombre='Hospital HM Modelo',
        ventanillas_totales=1,
        boxes_totales=1,
        consultas_totales=4
    ),
    'san_rafael': HospitalState(
        id='san_rafael',
        nombre='Hospital San Rafael',
        ventanillas_totales=1,
        boxes_totales=1,
        consultas_totales=4
    ),
}

# Contexto externo
contexto_state = {
    "temperatura": None,
    "condicion_climatica": None,
    "factor_eventos": 1.0,
    "es_festivo": False,
    "evento_activo": None,
    "factor_clima": 1.0
}

# Derivaciones activas (lista con las últimas 50)
derivaciones_state: List[Dict] = []

# ============================================================================
# NUEVOS ESTADOS PARA DATOS EXPANDIDOS
# ============================================================================

# Llegadas de pacientes recientes (últimos 50)
patient_arrivals_state: List[Dict] = []

# Resultados de triaje recientes (últimos 50)
triage_results_state: List[Dict] = []

# Eventos de consulta recientes (últimos 50)
consultation_events_state: List[Dict] = []

# Cambios de capacidad recientes (últimos 20)
capacity_changes_state: List[Dict] = []

# Eventos de personal (últimos 30)
staff_events_state: List[Dict] = []

# Carga de personal por hospital
staff_load_state: Dict[str, Dict] = {
    'chuac': {'ventanilla': {}, 'triaje': {}, 'consultas': {}},
    'modelo': {'ventanilla': {}, 'triaje': {}, 'consultas': {}},
    'san_rafael': {'ventanilla': {}, 'triaje': {}, 'consultas': {}},
}

# Asignaciones de médicos
doctor_assignments_state: List[Dict] = []

# Incidentes activos
active_incidents_state: List[Dict] = []

# Estadísticas de triaje por niveles
triage_stats: Dict[str, int] = {
    'rojo': 0,
    'naranja': 0,
    'amarillo': 0,
    'verde': 0,
    'azul': 0
}


# ============================================================================
# KAFKA CONSUMER (en background)
# ============================================================================

kafka_client = KafkaClient(client_id="chatbot", group_id="chatbot-group")

# Lista de TODOS los topics a consumir
ALL_KAFKA_TOPICS = [
    "hospital-stats",
    "system-context",
    "diversion-alerts",
    "patient-arrivals",
    "incident-patients",
    "triage-results",
    "consultation-events",
    "staff-state",
    "staff-load",
    "doctor-assigned",
    "doctor-unassigned",
    "capacity-change",
]


def process_kafka_message(topic: str, data: dict):
    """Procesa mensajes de Kafka de TODOS los topics"""
    global derivaciones_state, patient_arrivals_state, triage_results_state
    global consultation_events_state, capacity_changes_state, staff_events_state
    global doctor_assignments_state, triage_stats

    try:
        timestamp = datetime.now().isoformat()

        # ================================================================
        # HOSPITAL STATS
        # ================================================================
        if topic == "hospital-stats":
            hospital_id = data.get("hospital_id")
            if hospital_id and hospital_id in hospitales_state:
                state = hospitales_state[hospital_id]
                # Ventanillas
                state.ventanillas_ocupadas = data.get('ventanillas_ocupadas', state.ventanillas_ocupadas)
                state.ventanillas_totales = data.get('ventanillas_totales', state.ventanillas_totales)
                # Boxes
                state.boxes_ocupados = data.get('boxes_ocupados', state.boxes_ocupados)
                state.boxes_totales = data.get('boxes_totales', state.boxes_totales)
                state.ocupacion_boxes = data.get('ocupacion_boxes', state.ocupacion_boxes)
                # Consultas
                state.consultas_ocupadas = data.get('consultas_ocupadas', state.consultas_ocupadas)
                state.consultas_totales = data.get('consultas_totales', state.consultas_totales)
                state.ocupacion_consultas = data.get('ocupacion_consultas', state.ocupacion_consultas)
                # Colas
                state.cola_triaje = data.get('cola_triaje', state.cola_triaje)
                state.cola_consulta = data.get('cola_consulta', state.cola_consulta)
                # Tiempos
                state.tiempo_medio_espera = data.get('tiempo_medio_espera_triaje', state.tiempo_medio_espera)
                state.tiempo_medio_total = data.get('tiempo_medio_total', state.tiempo_medio_total)
                # Saturación
                state.nivel_saturacion = data.get('saturacion_global', state.nivel_saturacion)
                state.emergencia_activa = data.get('emergencia_activa', state.emergencia_activa)
                # Estadísticas
                state.pacientes_atendidos_hora = data.get('pacientes_atendidos_hora', state.pacientes_atendidos_hora)
                state.pacientes_derivados = data.get('pacientes_derivados_enviados', state.pacientes_derivados)
                # Listas de pacientes por área
                if 'pacientes_ventanilla' in data:
                    state.pacientes_ventanilla = data.get('pacientes_ventanilla', [])
                if 'pacientes_triaje' in data:
                    state.pacientes_triaje = data.get('pacientes_triaje', [])
                if 'pacientes_consulta' in data:
                    state.pacientes_consulta = data.get('pacientes_consulta', [])
                state.ultimo_update = datetime.now()

        # ================================================================
        # SYSTEM CONTEXT
        # ================================================================
        elif topic == "system-context":
            contexto_state["temperatura"] = data.get('temperatura')
            contexto_state["condicion_climatica"] = data.get('condicion')
            contexto_state["factor_eventos"] = data.get('factor_evento', 1.0)
            contexto_state["es_festivo"] = data.get('es_festivo', False)
            contexto_state["evento_activo"] = data.get('evento_activo')
            contexto_state["factor_clima"] = data.get('factor_clima', 1.0)

        # ================================================================
        # DIVERSION ALERTS
        # ================================================================
        elif topic == "diversion-alerts":
            nivel_triaje = data.get('nivel_triaje', 'verde')
            if nivel_triaje in ['rojo', 'naranja']:
                nivel_urgencia = 'alta'
            elif nivel_triaje in ['amarillo']:
                nivel_urgencia = 'media'
            else:
                nivel_urgencia = 'baja'

            derivacion = {
                "id": len(derivaciones_state) + 1,
                "alert_id": data.get('alert_id'),
                "patient_id": data.get('patient_id'),
                "hospital_origen": data.get('hospital_origen'),
                "hospital_destino": data.get('hospital_destino'),
                "motivo": data.get('motivo', 'gravedad'),
                "nivel_triaje": nivel_triaje,
                "nivel_urgencia": nivel_urgencia,
                "tiempo_estimado": data.get('tiempo_estimado_traslado', 10),
                "timestamp": data.get('timestamp', timestamp)
            }
            derivaciones_state = [derivacion] + derivaciones_state[:49]
            logger.info(f"Derivación registrada: {derivacion['hospital_origen']} -> {derivacion['hospital_destino']}")

        # ================================================================
        # PATIENT ARRIVALS
        # ================================================================
        elif topic in ["patient-arrivals", "incident-patients"]:
            arrival = {
                "patient_id": data.get('patient_id'),
                "hospital_id": data.get('hospital_id'),
                "edad": data.get('edad'),
                "sexo": data.get('sexo'),
                "patologia": data.get('patologia'),
                "es_incidente": topic == "incident-patients",
                "timestamp": data.get('timestamp', timestamp)
            }
            patient_arrivals_state = [arrival] + patient_arrivals_state[:49]

        # ================================================================
        # TRIAGE RESULTS
        # ================================================================
        elif topic == "triage-results":
            result = {
                "patient_id": data.get('patient_id'),
                "hospital_id": data.get('hospital_id'),
                "nivel_triaje": data.get('nivel_triaje'),
                "box_id": data.get('box_id'),
                "tiempo_triaje": data.get('tiempo_triaje_minutos'),
                "requiere_derivacion": data.get('requiere_derivacion', False),
                "timestamp": data.get('timestamp', timestamp)
            }
            triage_results_state = [result] + triage_results_state[:49]
            
            # Actualizar estadísticas de triaje
            nivel = data.get('nivel_triaje', 'verde')
            if nivel in triage_stats:
                triage_stats[nivel] += 1

        # ================================================================
        # CONSULTATION EVENTS
        # ================================================================
        elif topic == "consultation-events":
            event = {
                "patient_id": data.get('patient_id'),
                "hospital_id": data.get('hospital_id'),
                "consulta_id": data.get('consulta_id'),
                "event_type": data.get('event_type'),
                "nivel_triaje": data.get('nivel_triaje'),
                "medicos_atendiendo": data.get('medicos_atendiendo'),
                "tiempo_consulta": data.get('tiempo_consulta_minutos'),
                "destino": data.get('destino'),
                "timestamp": data.get('timestamp', timestamp)
            }
            consultation_events_state = [event] + consultation_events_state[:49]

        # ================================================================
        # STAFF STATE
        # ================================================================
        elif topic == "staff-state":
            event = {
                "staff_id": data.get('staff_id'),
                "nombre": data.get('nombre'),
                "rol": data.get('rol'),
                "hospital_id": data.get('hospital_id'),
                "estado": data.get('estado'),
                "asignacion": data.get('asignacion_actual'),
                "timestamp": data.get('timestamp', timestamp)
            }
            staff_events_state = [event] + staff_events_state[:29]

        # ================================================================
        # STAFF LOAD
        # ================================================================
        elif topic == "staff-load":
            hospital_id = data.get('hospital_id')
            area = data.get('area')
            if hospital_id in staff_load_state and area:
                staff_load_state[hospital_id][area] = {
                    "personal_ocupado": data.get('personal_ocupado'),
                    "personal_total": data.get('personal_total'),
                    "ratio_carga": data.get('ratio_carga'),
                    "pacientes_en_espera": data.get('pacientes_en_espera'),
                    "timestamp": timestamp
                }

        # ================================================================
        # DOCTOR ASSIGNED/UNASSIGNED
        # ================================================================
        elif topic in ["doctor-assigned", "doctor-unassigned"]:
            assignment = {
                "medico_id": data.get('medico_id'),
                "medico_nombre": data.get('medico_nombre'),
                "hospital_id": data.get('hospital_id'),
                "consulta_id": data.get('consulta_id'),
                "action": "assigned" if topic == "doctor-assigned" else "unassigned",
                "medicos_consulta": data.get('medicos_totales_consulta') or data.get('medicos_restantes_consulta'),
                "velocidad_factor": data.get('velocidad_factor'),
                "timestamp": data.get('timestamp', timestamp)
            }
            doctor_assignments_state = [assignment] + doctor_assignments_state[:19]

        # ================================================================
        # CAPACITY CHANGE
        # ================================================================
        elif topic == "capacity-change":
            change = {
                "hospital_id": data.get('hospital_id'),
                "consulta_id": data.get('consulta_id'),
                "medicos_previos": data.get('medicos_previos'),
                "medicos_nuevos": data.get('medicos_nuevos'),
                "velocidad_previa": data.get('velocidad_previa'),
                "velocidad_nueva": data.get('velocidad_nueva'),
                "motivo": data.get('motivo'),
                "timestamp": data.get('timestamp', timestamp)
            }
            capacity_changes_state = [change] + capacity_changes_state[:19]

    except Exception as e:
        logger.error(f"Error procesando mensaje Kafka [{topic}]: {e}")


def kafka_consumer_loop():
    """Loop de consumo de Kafka en background - TODOS los topics"""
    kafka_client.subscribe(ALL_KAFKA_TOPICS)
    logger.info(f"Kafka consumer iniciado, suscrito a {len(ALL_KAFKA_TOPICS)} topics: {ALL_KAFKA_TOPICS}")

    while True:
        try:
            msg = kafka_client.consume_one(timeout=1.0)
            if msg:
                logger.debug(f"Kafka mensaje: topic={msg['topic']}")
                process_kafka_message(msg['topic'], msg['value'])
        except Exception as e:
            logger.error(f"Error en consumer Kafka: {e}")


# Iniciar consumer en thread separado
consumer_thread = Thread(target=kafka_consumer_loop, daemon=True)


# ============================================================================
# HERRAMIENTAS MCP (EXPANDIDAS)
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


def get_staff_info(hospital_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Obtiene información detallada del personal desde PostgreSQL.
    Incluye staff base, lista SERGAS y estado de consultas.
    """
    try:
        if hospital_id:
            staff = db_connector.get_staff_by_hospital(hospital_id)
            consultas = db_connector.get_consulta_by_hospital(hospital_id)
            return {
                "hospital_id": hospital_id,
                "staff": staff,
                "consultas": consultas,
                "total_staff": len(staff)
            }
        else:
            return {
                "staff_summary": db_connector.get_staff_summary(),
                "sergas": db_connector.get_sergas_summary(),
                "consultas": db_connector.get_consultas_status()
            }
    except Exception as e:
        logger.error(f"Error obteniendo staff info: {e}")
        return {"error": str(e)}


def get_recent_patients(limit: int = 20) -> Dict[str, Any]:
    """
    Obtiene información sobre llegadas de pacientes recientes
    y resultados de triaje.
    """
    arrivals = patient_arrivals_state[:limit]
    triages = triage_results_state[:limit]
    
    # Distribución de triaje
    total_triajes = sum(triage_stats.values())
    distribucion = {}
    if total_triajes > 0:
        for nivel, count in triage_stats.items():
            distribucion[nivel] = {
                "count": count,
                "porcentaje": round(count / total_triajes * 100, 1)
            }
    
    return {
        "llegadas_recientes": arrivals,
        "triajes_recientes": triages,
        "distribucion_triaje": distribucion,
        "total_triajes_sesion": total_triajes
    }


def get_active_incidents() -> Dict[str, Any]:
    """
    Obtiene información sobre incidentes activos en la ciudad
    que pueden afectar los hospitales.
    """
    # Filtrar pacientes de incidentes
    incident_patients = [p for p in patient_arrivals_state if p.get('es_incidente')]
    
    return {
        "incidentes_activos": active_incidents_state,
        "pacientes_de_incidentes": incident_patients[:10],
        "total_pacientes_incidentes": len(incident_patients),
        "impacto": "alto" if len(incident_patients) > 5 else "bajo"
    }


def get_capacity_status() -> Dict[str, Any]:
    """
    Obtiene el estado detallado de capacidad incluyendo
    asignaciones de médicos y cambios recientes.
    """
    # Médicos SERGAS
    sergas = db_connector.get_sergas_list()
    
    return {
        "carga_personal": staff_load_state,
        "asignaciones_recientes": doctor_assignments_state[:10],
        "cambios_capacidad": capacity_changes_state[:10],
        "sergas_disponibles": sergas.get('total_disponibles', 0),
        "sergas_asignados": sergas.get('total_asignados', 0)
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

    # Obtener datos de PostgreSQL
    try:
        staff_summary = db_connector.get_staff_summary()
        sergas_summary = db_connector.get_sergas_summary()
    except:
        staff_summary = {}
        sergas_summary = {}

    return {
        "estado_general": estado,
        "saturacion_global": round(avg_saturacion * 100, 1),
        "boxes_ocupados": total_boxes_ocupados,
        "boxes_totales": total_boxes,
        "pacientes_en_espera": total_cola,
        "hospitales_activos": len(hospitales_state),
        "hospitales": hospitales_data,
        "contexto": contexto_state,
        "derivaciones": derivaciones_state[:10],
        "staff_summary": staff_summary,
        "sergas_summary": sergas_summary,
        "triage_stats": triage_stats,
        "timestamp": datetime.now().isoformat()
    }


def get_complete_snapshot() -> Dict[str, Any]:
    """
    Obtiene un snapshot COMPLETO de todos los datos del sistema.
    Incluye Kafka + PostgreSQL + Estado en memoria.
    """
    return {
        "hospitales": get_hospital_status(),
        "tiempos_espera": get_waiting_times(),
        "staff": get_staff_info(),
        "pacientes_recientes": get_recent_patients(10),
        "incidentes": get_active_incidents(),
        "capacidad": get_capacity_status(),
        "contexto": contexto_state,
        "derivaciones": derivaciones_state[:20],
        "eventos_consulta": consultation_events_state[:10],
        "database": db_connector.get_complete_database_snapshot(),
        "timestamp": datetime.now().isoformat()
    }


# Diccionario de herramientas MCP
TOOLS = {
    "get_hospital_status": get_hospital_status,
    "get_waiting_times": get_waiting_times,
    "get_best_hospital": get_best_hospital,
    "get_system_summary": get_system_summary,
    # Nuevas herramientas
    "get_staff_info": get_staff_info,
    "get_recent_patients": get_recent_patients,
    "get_active_incidents": get_active_incidents,
    "get_capacity_status": get_capacity_status,
    "get_complete_snapshot": get_complete_snapshot,
}


# ============================================================================
# ENDPOINTS
# ============================================================================

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None


@app.get("/")
async def root():
    return {"status": "ok", "service": "Hospital MCP Server", "version": "3.0.0"}


@app.get("/tools")
async def list_tools():
    """Lista herramientas MCP disponibles"""
    return {
        "tools": [
            {"name": "get_hospital_status", "description": "Estado de hospitales"},
            {"name": "get_waiting_times", "description": "Tiempos de espera"},
            {"name": "get_best_hospital", "description": "Recomendar hospital"},
            {"name": "get_system_summary", "description": "Resumen del sistema"},
            {"name": "get_staff_info", "description": "Información detallada del personal"},
            {"name": "get_recent_patients", "description": "Pacientes recientes y triaje"},
            {"name": "get_active_incidents", "description": "Incidentes activos en la ciudad"},
            {"name": "get_capacity_status", "description": "Estado de capacidad y médicos"},
            {"name": "get_complete_snapshot", "description": "Snapshot completo del sistema"},
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

DATOS EN TIEMPO REAL (Kafka + PostgreSQL):
{context}

INSTRUCCIONES:
1. Responde SIEMPRE en español
2. Sé conciso pero informativo
3. Usa emojis para hacer la información visual
4. Si hay situaciones críticas, destácalas con ⚠️ o 🚨
5. Ofrece recomendaciones cuando sea apropiado
6. No inventes datos, usa solo la información proporcionada
7. Menciona las fuentes de datos (tiempo real vs base de datos)

HOSPITALES:
- CHUAC: Hospital de REFERENCIA para casos graves (escalable)
- HM Modelo: Hospital privado (capacidad fija)
- San Rafael: Hospital comarcal más pequeño (capacidad fija)

FLUJO DE PACIENTES: Ventanilla → Triaje → Consulta → Alta/Observación

DATOS DISPONIBLES:
- Estado en tiempo real de cada hospital (Kafka)
- Personal base y SERGAS disponible (PostgreSQL)
- Llegadas y triajes recientes
- Derivaciones entre hospitales
- Incidentes activos en la ciudad
- Contexto climático y eventos"""

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
    """Formatea el contexto COMPLETO para el LLM"""
    summary = get_system_summary()
    times = get_waiting_times()
    
    # Obtener datos de personal
    try:
        staff_info = db_connector.get_staff_summary()
        sergas_info = db_connector.get_sergas_summary()
    except:
        staff_info = {}
        sergas_info = {}

    context = f"""
=== ESTADO GENERAL ===
Estado: {summary['estado_general']}
Saturación global: {summary['saturacion_global']}%
Boxes ocupados: {summary['boxes_ocupados']}/{summary['boxes_totales']}
Pacientes en espera: {summary['pacientes_en_espera']}

=== CONTEXTO EXTERNO ===
Temperatura: {contexto_state.get('temperatura', '--')}°C
Clima: {contexto_state.get('condicion_climatica', 'Desconocido')}
Factor eventos: x{contexto_state.get('factor_eventos', 1.0)}
Festivo: {'Sí' if contexto_state.get('es_festivo') else 'No'}

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

    # Añadir información de personal
    if staff_info and 'totales' in staff_info:
        context += f"""
=== PERSONAL (PostgreSQL) ===
Total: {staff_info['totales'].get('total', 0)} trabajadores
- Celadores: {staff_info['totales'].get('celadores', 0)}
- Enfermeras: {staff_info['totales'].get('enfermeras', 0)}
- Médicos base: {staff_info['totales'].get('medicos', 0)}
"""

    if sergas_info:
        context += f"""
=== LISTA SERGAS ===
Médicos disponibles: {sergas_info.get('disponibles', 0)}
Médicos asignados: {sergas_info.get('asignados', 0)}
"""

    # Triaje stats
    total_triajes = sum(triage_stats.values())
    if total_triajes > 0:
        context += f"""
=== DISTRIBUCIÓN TRIAJE (sesión) ===
🔴 Rojo (crítico): {triage_stats['rojo']}
🟠 Naranja (muy urgente): {triage_stats['naranja']}
🟡 Amarillo (urgente): {triage_stats['amarillo']}
🟢 Verde (normal): {triage_stats['verde']}
🔵 Azul (no urgente): {triage_stats['azul']}
"""

    # Derivaciones recientes
    if derivaciones_state:
        context += f"""
=== DERIVACIONES RECIENTES ===
Total: {len(derivaciones_state)} derivaciones
Última: {derivaciones_state[0].get('hospital_origen', '?')} → {derivaciones_state[0].get('hospital_destino', '?')} ({derivaciones_state[0].get('motivo', '?')})
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
    logger.info(f"MCP Server v3.0 iniciado con {len(ALL_KAFKA_TOPICS)} topics Kafka + PostgreSQL")


@app.on_event("shutdown")
async def shutdown():
    """Cerrar conexiones"""
    kafka_client.close()
    db_connector.close()
    logger.info("MCP Server cerrado")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
