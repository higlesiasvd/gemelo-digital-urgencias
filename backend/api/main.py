"""
============================================================================
API REST - ENTRY POINT
============================================================================
FastAPI application principal del Gemelo Digital Hospitalario.
============================================================================
"""

import sys
import os
import logging
from contextlib import asynccontextmanager

# Configurar path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from common.config import settings
from common.models import init_db
from common.kafka_client import create_all_topics
from common.observability import (
    setup_tracing,
    setup_fastapi_instrumentation,
    setup_httpx_instrumentation
)

from .staff_routes import router as staff_router
from .simulation_routes import router as simulation_router
from .prediction_routes import router as prediction_router
from .incident_routes import router as incident_router
from .report_routes import router as report_router
from .auth_routes import router as auth_router
from .training_routes import router as training_router
from .gamification_routes import router as gamification_router

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# LIFECYCLE
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hooks de la aplicación"""
    # Startup
    logger.info("Iniciando API...")

    # Setup distributed tracing (Jaeger)
    try:
        setup_tracing(
            service_name="hospital-api",
            jaeger_endpoint="http://jaeger:4318/v1/traces",
            enabled=True
        )
        logger.info("Tracing configurado (Jaeger)")
    except Exception as e:
        logger.warning(f"Error configurando tracing: {e}")
    
    # Setup HTTPX instrumentation for outgoing HTTP calls
    try:
        setup_httpx_instrumentation()
    except Exception as e:
        logger.warning(f"Error configurando HTTPX instrumentation: {e}")

    # Inicializar base de datos
    try:
        init_db()
        logger.info("Base de datos inicializada")
    except Exception as e:
        logger.warning(f"Error inicializando BD: {e}")

    # Crear topics de Kafka
    try:
        create_all_topics()
        logger.info("Topics de Kafka creados")
    except Exception as e:
        logger.warning(f"Error creando topics: {e}")

    yield

    # Shutdown
    logger.info("API detenida")


# ============================================================================
# APP
# ============================================================================

app = FastAPI(
    title="Gemelo Digital Hospitalario API",
    description="""
    API REST para el sistema de gemelo digital de urgencias hospitalarias.

    ## Funcionalidades

    - **Personal**: Gestión de personal y escalado de consultas
    - **Simulación**: Control de la simulación de urgencias
    - **Predicción**: Predicciones de demanda y escenarios what-if

    ## Hospitales

    - **CHUAC**: Hospital de referencia (escalable)
    - **HM Modelo**: Hospital privado
    - **San Rafael**: Hospital comarcal
    """,
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(staff_router)
app.include_router(simulation_router)
app.include_router(prediction_router)
app.include_router(incident_router)
app.include_router(report_router)
app.include_router(auth_router)
app.include_router(training_router)
app.include_router(gamification_router)

# Setup Prometheus instrumentation (exposes /metrics endpoint)
try:
    setup_fastapi_instrumentation(app, excluded_handlers=["/health", "/metrics", "/docs", "/openapi.json"])
    logger.info("Prometheus instrumentation configurada - /metrics disponible")
except Exception as e:
    logger.warning(f"Error configurando Prometheus: {e}")


# ============================================================================
# ENDPOINTS GENERALES
# ============================================================================

@app.get("/")
async def root():
    """Información de la API"""
    return {
        "service": "Gemelo Digital Hospitalario API",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi.responses import Response
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/hospitals")
async def list_hospitals():
    """Lista los hospitales del sistema"""
    return {
        "hospitales": [
            {
                "id": "chuac",
                "nombre": "CHUAC - Complejo Hospitalario Universitario A Coruña",
                "tipo": "referencia",
                "ventanillas": 2,
                "boxes_triaje": 5,
                "consultas": 10,
                "escalable": True,
                "medicos_max_consulta": 4
            },
            {
                "id": "modelo",
                "nombre": "Hospital HM Modelo",
                "tipo": "privado",
                "ventanillas": 1,
                "boxes_triaje": 1,
                "consultas": 4,
                "escalable": False,
                "medicos_max_consulta": 1
            },
            {
                "id": "san_rafael",
                "nombre": "Hospital San Rafael",
                "tipo": "comarcal",
                "ventanillas": 1,
                "boxes_triaje": 1,
                "consultas": 4,
                "escalable": False,
                "medicos_max_consulta": 1
            }
        ]
    }


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
