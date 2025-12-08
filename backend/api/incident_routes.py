"""
============================================================================
RUTAS DE INCIDENTES EN LA CIUDAD
============================================================================
Endpoints para generación y gestión de incidentes que envían pacientes
al hospital más cercano.

Endpoints:
- POST /incidents/generate - Generar incidente en ubicación
- GET /incidents/active - Listar incidentes activos
- POST /incidents/clear - Limpiar incidentes
============================================================================
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import logging
import math
import random
import uuid

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import PatientArrival, TriageLevel
from common.kafka_client import KafkaClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/incidents", tags=["Incidentes"])

kafka = KafkaClient(client_id="api-incidents")

# ============================================================================
# CONFIGURACIÓN DE HOSPITALES
# ============================================================================

HOSPITALES = {
    "chuac": {
        "nombre": "CHUAC",
        "lat": 43.34415,
        "lon": -8.38881,
        "capacidad": "alta"
    },
    "modelo": {
        "nombre": "HM Modelo",
        "lat": 43.36666,
        "lon": -8.4186,
        "capacidad": "media"
    },
    "san_rafael": {
        "nombre": "San Rafael",
        "lat": 43.34518,
        "lon": -8.38767,
        "capacidad": "media"
    }
}

# Tipos de incidentes con sus características
TIPOS_INCIDENTE = {
    "accidente_trafico": {
        "nombre": "Accidente de tráfico",
        "icono": "🚗",
        "pacientes_min": 2,
        "pacientes_max": 8,
        "gravedad_dist": {"rojo": 0.1, "naranja": 0.3, "amarillo": 0.4, "verde": 0.2},
        "patologias": ["Traumatismo", "Fractura", "Contusión", "Herida"],
    },
    "incendio": {
        "nombre": "Incendio",
        "icono": "🔥",
        "pacientes_min": 3,
        "pacientes_max": 15,
        "gravedad_dist": {"rojo": 0.2, "naranja": 0.35, "amarillo": 0.3, "verde": 0.15},
        "patologias": ["Quemadura", "Inhalación de humo", "Traumatismo", "Contusión"],
    },
    "evento_deportivo": {
        "nombre": "Incidente en evento deportivo",
        "icono": "⚽",
        "pacientes_min": 5,
        "pacientes_max": 20,
        "gravedad_dist": {"rojo": 0.05, "naranja": 0.15, "amarillo": 0.4, "verde": 0.4},
        "patologias": ["Contusión", "Herida", "Intoxicación etílica", "Ansiedad"],
    },
    "intoxicacion_masiva": {
        "nombre": "Intoxicación masiva",
        "icono": "☠️",
        "pacientes_min": 10,
        "pacientes_max": 40,
        "gravedad_dist": {"rojo": 0.15, "naranja": 0.35, "amarillo": 0.35, "verde": 0.15},
        "patologias": ["Intoxicación alimentaria", "Náuseas", "Vómitos", "Dolor abdominal"],
    },
    "colapso_estructura": {
        "nombre": "Colapso de estructura",
        "icono": "🏚️",
        "pacientes_min": 5,
        "pacientes_max": 25,
        "gravedad_dist": {"rojo": 0.25, "naranja": 0.35, "amarillo": 0.25, "verde": 0.15},
        "patologias": ["Traumatismo grave", "Aplastamiento", "Fractura múltiple", "Contusión"],
    },
    "accidente_laboral": {
        "nombre": "Accidente laboral",
        "icono": "🏭",
        "pacientes_min": 1,
        "pacientes_max": 6,
        "gravedad_dist": {"rojo": 0.15, "naranja": 0.3, "amarillo": 0.35, "verde": 0.2},
        "patologias": ["Traumatismo", "Quemadura", "Corte", "Amputación parcial"],
    },
}

# Estado de incidentes activos
incidentes_activos: List[dict] = []


# ============================================================================
# MODELOS
# ============================================================================

class IncidentLocation(BaseModel):
    lat: float = Field(..., ge=43.3, le=43.4, description="Latitud")
    lon: float = Field(..., ge=-8.5, le=-8.3, description="Longitud")


class GenerateIncidentRequest(BaseModel):
    tipo: Literal[
        "accidente_trafico", 
        "incendio", 
        "evento_deportivo", 
        "intoxicacion_masiva",
        "colapso_estructura",
        "accidente_laboral"
    ]
    ubicacion: IncidentLocation
    gravedad: Literal["leve", "moderado", "grave", "catastrofico"] = "moderado"
    descripcion: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: str
    tipo: str
    nombre: str
    icono: str
    ubicacion: dict
    hospital_destino: str
    hospital_nombre: str
    pacientes_generados: int
    pacientes_detalle: List[dict]
    distancia_km: float
    timestamp: str


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia en km entre dos puntos usando la fórmula de Haversine."""
    R = 6371  # Radio de la Tierra en km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def find_nearest_hospital(lat: float, lon: float) -> tuple:
    """Encuentra el hospital más cercano a una ubicación."""
    min_distance = float('inf')
    nearest = None
    nearest_id = None
    
    for hospital_id, hospital in HOSPITALES.items():
        distance = haversine_distance(lat, lon, hospital["lat"], hospital["lon"])
        if distance < min_distance:
            min_distance = distance
            nearest = hospital
            nearest_id = hospital_id
    
    return nearest_id, nearest, min_distance


def get_triage_level(gravedad_dist: dict) -> str:
    """Selecciona un nivel de triaje basado en la distribución de probabilidad."""
    rand = random.random()
    cumulative = 0
    
    for nivel, prob in gravedad_dist.items():
        cumulative += prob
        if rand <= cumulative:
            return nivel
    
    return "verde"


def get_num_patients(gravedad: str, tipo_config: dict) -> int:
    """Calcula el número de pacientes basado en la gravedad."""
    base_min = tipo_config["pacientes_min"]
    base_max = tipo_config["pacientes_max"]
    
    multipliers = {
        "leve": (0.3, 0.5),
        "moderado": (0.5, 0.7),
        "grave": (0.7, 0.9),
        "catastrofico": (0.9, 1.0)
    }
    
    mult_min, mult_max = multipliers.get(gravedad, (0.5, 0.7))
    min_patients = max(1, int(base_min + (base_max - base_min) * mult_min))
    max_patients = max(min_patients, int(base_min + (base_max - base_min) * mult_max))
    
    return random.randint(min_patients, max_patients)


def generate_patient_name() -> str:
    """Genera un nombre de paciente aleatorio."""
    nombres = ["María", "José", "Manuel", "Carmen", "Antonio", "Ana", "Francisco", "Laura", 
               "David", "Lucía", "Carlos", "Paula", "Miguel", "Elena", "Ramón", "Isabel"]
    apellidos = ["García", "Fernández", "González", "López", "Martínez", "Rodríguez", 
                 "Sánchez", "Pérez", "Gómez", "Ruiz", "Díaz", "Torres", "Vázquez", "Castro"]
    return f"{random.choice(nombres)} {random.choice(apellidos)}"


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/generate", response_model=IncidentResponse)
async def generate_incident(request: GenerateIncidentRequest):
    """
    Genera un incidente en una ubicación y envía pacientes al hospital más cercano.
    
    Los pacientes se inyectan automáticamente en la simulación vía Kafka.
    """
    tipo_config = TIPOS_INCIDENTE.get(request.tipo)
    if not tipo_config:
        raise HTTPException(status_code=400, detail=f"Tipo de incidente no válido: {request.tipo}")
    
    # Encontrar hospital más cercano
    hospital_id, hospital, distancia = find_nearest_hospital(
        request.ubicacion.lat, 
        request.ubicacion.lon
    )
    
    # Generar pacientes
    num_pacientes = get_num_patients(request.gravedad, tipo_config)
    pacientes_detalle = []
    
    incident_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    for i in range(num_pacientes):
        triage_nivel = get_triage_level(tipo_config["gravedad_dist"])
        patologia = random.choice(tipo_config["patologias"])
        patient_id = f"INC-{incident_id}-{i+1:02d}"
        nombre = generate_patient_name()
        edad = random.randint(18, 85)
        
        # Mapear nivel texto a enum
        nivel_map = {
            "rojo": TriageLevel.ROJO,
            "naranja": TriageLevel.NARANJA,
            "amarillo": TriageLevel.AMARILLO,
            "verde": TriageLevel.VERDE,
            "azul": TriageLevel.AZUL,
        }
        
        # Crear llegada de paciente
        # El schema PatientArrival requiere: sexo, patologia, hospital_id (enum)
        from common.schemas import HospitalId
        
        # Mapear hospital_id string a enum
        hospital_enum_map = {
            "chuac": HospitalId.CHUAC,
            "modelo": HospitalId.MODELO,
            "san_rafael": HospitalId.SAN_RAFAEL,
        }
        
        arrival = PatientArrival(
            patient_id=patient_id,
            hospital_id=hospital_enum_map.get(hospital_id, HospitalId.CHUAC),
            edad=edad,
            sexo=random.choice(["M", "F"]),
            patologia=patologia,
        )
        
        # Enviar a Kafka
        try:
            kafka.produce("patient-arrivals", arrival)
        except Exception as e:
            logger.error(f"Error enviando paciente a Kafka: {e}")
        
        pacientes_detalle.append({
            "patient_id": patient_id,
            "nombre": nombre,
            "edad": edad,
            "nivel_triaje": triage_nivel,
            "patologia": patologia
        })
    
    # Flush Kafka
    kafka.flush()
    
    # Crear registro de incidente
    incidente = {
        "incident_id": incident_id,
        "tipo": request.tipo,
        "nombre": tipo_config["nombre"],
        "icono": tipo_config["icono"],
        "ubicacion": {
            "lat": request.ubicacion.lat,
            "lon": request.ubicacion.lon
        },
        "hospital_destino": hospital_id,
        "hospital_nombre": hospital["nombre"],
        "pacientes_generados": num_pacientes,
        "pacientes_detalle": pacientes_detalle,
        "distancia_km": round(distancia, 2),
        "gravedad": request.gravedad,
        "descripcion": request.descripcion,
        "timestamp": now.isoformat()
    }
    
    incidentes_activos.append(incidente)
    
    # Mantener solo los últimos 20 incidentes
    if len(incidentes_activos) > 20:
        incidentes_activos.pop(0)
    
    logger.info(f"🚨 Incidente generado: {tipo_config['nombre']} - {num_pacientes} pacientes → {hospital['nombre']}")
    
    return IncidentResponse(**incidente)


@router.get("/active")
async def get_active_incidents():
    """Retorna la lista de incidentes activos."""
    return {
        "total": len(incidentes_activos),
        "incidentes": incidentes_activos
    }


@router.get("/types")
async def get_incident_types():
    """Retorna los tipos de incidentes disponibles."""
    return {
        "tipos": [
            {
                "id": tipo_id,
                "nombre": config["nombre"],
                "icono": config["icono"],
                "pacientes_rango": f"{config['pacientes_min']}-{config['pacientes_max']}",
                "patologias": config["patologias"]
            }
            for tipo_id, config in TIPOS_INCIDENTE.items()
        ]
    }


@router.post("/clear")
async def clear_incidents():
    """Limpia todos los incidentes activos."""
    global incidentes_activos
    count = len(incidentes_activos)
    incidentes_activos = []
    return {
        "success": True,
        "cleared": count,
        "message": f"Se eliminaron {count} incidentes"
    }


@router.get("/hospitals")
async def get_hospitals_for_incidents():
    """Retorna la lista de hospitales con sus ubicaciones."""
    return {
        "hospitales": [
            {
                "id": h_id,
                "nombre": h["nombre"],
                "lat": h["lat"],
                "lon": h["lon"],
                "capacidad": h["capacidad"]
            }
            for h_id, h in HOSPITALES.items()
        ]
    }
