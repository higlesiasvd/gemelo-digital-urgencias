"""
============================================================================
RUTAS DE SIMULACION
============================================================================
Endpoints para control de la simulación.

Endpoints:
- POST /simulation/start - Iniciar simulación
- POST /simulation/stop - Detener simulación
- GET /simulation/status - Estado de la simulación
- POST /simulation/load-sample - Cargar muestra de pacientes
============================================================================
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
import logging
import json

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import HospitalId, PatientArrival
from common.kafka_client import KafkaClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/simulation", tags=["Simulacion"])

kafka = KafkaClient(client_id="api-simulation")

# Estado global de simulación (en producción usar Redis o similar)
simulation_state = {
    "running": False,
    "started_at": None,
    "speed": 1.0,
    "patients_generated": 0
}


# ============================================================================
# MODELOS
# ============================================================================

class SimulationConfig(BaseModel):
    speed: float = 1.0
    duration_hours: Optional[float] = None


class SimulationStatus(BaseModel):
    running: bool
    started_at: Optional[str]
    speed: float
    patients_generated: int
    uptime_seconds: Optional[float]


class LoadSampleResponse(BaseModel):
    success: bool
    patients_loaded: int
    message: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/start")
async def start_simulation(config: SimulationConfig = None):
    """
    Inicia la simulación.

    La simulación se ejecuta en el servicio 'simulator' de Docker.
    Este endpoint envía un comando de inicio.
    """
    if simulation_state["running"]:
        raise HTTPException(status_code=400, detail="Simulación ya está en ejecución")

    config = config or SimulationConfig()

    # Enviar comando de inicio a Kafka
    kafka.produce("simulation-control", {
        "command": "start",
        "speed": config.speed,
        "duration_hours": config.duration_hours,
        "timestamp": datetime.now().isoformat()
    }, validate=False)
    kafka.flush()

    simulation_state["running"] = True
    simulation_state["started_at"] = datetime.now().isoformat()
    simulation_state["speed"] = config.speed

    return {
        "success": True,
        "message": "Simulación iniciada",
        "config": config.model_dump()
    }


@router.post("/stop")
async def stop_simulation():
    """Detiene la simulación"""
    if not simulation_state["running"]:
        raise HTTPException(status_code=400, detail="Simulación no está en ejecución")

    # Enviar comando de parada
    kafka.produce("simulation-control", {
        "command": "stop",
        "timestamp": datetime.now().isoformat()
    }, validate=False)
    kafka.flush()

    simulation_state["running"] = False

    return {
        "success": True,
        "message": "Simulación detenida"
    }


@router.get("/status", response_model=SimulationStatus)
async def get_simulation_status():
    """Obtiene el estado actual de la simulación"""
    uptime = None
    if simulation_state["running"] and simulation_state["started_at"]:
        started = datetime.fromisoformat(simulation_state["started_at"])
        uptime = (datetime.now() - started).total_seconds()

    return SimulationStatus(
        running=simulation_state["running"],
        started_at=simulation_state["started_at"],
        speed=simulation_state["speed"],
        patients_generated=simulation_state["patients_generated"],
        uptime_seconds=uptime
    )


class SpeedConfig(BaseModel):
    speed: float


@router.post("/speed")
async def set_simulation_speed(config: SpeedConfig):
    """
    Cambia la velocidad de simulación en tiempo real.
    
    speed=1.0: Tiempo real (2 min ventanilla, 5 min triaje)
    speed=10.0: 10x más rápido
    speed=60.0: 1 hora en 1 minuto
    """
    if config.speed < 0.1 or config.speed > 100:
        raise HTTPException(status_code=400, detail="La velocidad debe estar entre 0.1 y 100")
    
    # Enviar comando de cambio de velocidad a Kafka
    kafka.produce("simulation-control", {
        "command": "set_speed",
        "speed": config.speed,
        "timestamp": datetime.now().isoformat()
    }, validate=False)
    kafka.flush()
    
    simulation_state["speed"] = config.speed
    
    return {
        "success": True,
        "message": f"Velocidad cambiada a {config.speed}x",
        "speed": config.speed
    }


@router.post("/load-sample", response_model=LoadSampleResponse)
async def load_sample(
    sample_type: Literal["normal", "heavy"] = Query(default="normal")
):
    """
    Carga una muestra de pacientes predefinida.

    - normal: 100 pacientes
    - heavy: 2000-5000 pacientes
    """
    sample_file = f"samples/{'sample' if sample_type == 'normal' else 'heavy_sample'}.json"
    sample_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        sample_file
    )

    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail=f"Archivo de muestra no encontrado: {sample_file}")

    try:
        with open(sample_path, 'r') as f:
            patients_data = json.load(f)

        count = 0
        for patient_data in patients_data:
            arrival = PatientArrival(**patient_data)
            kafka.produce("patient-arrivals", arrival)
            count += 1

        kafka.flush()

        simulation_state["patients_generated"] += count

        return LoadSampleResponse(
            success=True,
            patients_loaded=count,
            message=f"Cargados {count} pacientes desde {sample_file}"
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Error en formato JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cargando muestra: {e}")


@router.post("/inject-patient")
async def inject_patient(patient: PatientArrival):
    """Inyecta un paciente individual en la simulación"""
    kafka.produce("patient-arrivals", patient)
    kafka.flush()

    simulation_state["patients_generated"] += 1

    return {
        "success": True,
        "patient_id": patient.patient_id,
        "message": "Paciente inyectado en la simulación"
    }
