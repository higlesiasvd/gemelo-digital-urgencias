"""
═══════════════════════════════════════════════════════════════════════════════
GEMELO DIGITAL HOSPITALARIO - API REST
═══════════════════════════════════════════════════════════════════════════════
Aplicación principal con arquitectura DDD y CQRS
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.routers import (
    hospital_router,
    personal_router,
    turno_router,
    disponibilidad_router,
    refuerzo_router,
    lista_sergas_router,
)
from src.infrastructure.persistence.database import init_db

# Crear aplicación FastAPI
app = FastAPI(
    title="Gemelo Digital Hospitalario",
    description="API para gestión hospitalaria con arquitectura DDD",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["Sistema"])
def health_check():
    """Health check del sistema"""
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/api/status", tags=["Sistema"])
def api_status():
    """Estado de la API"""
    return {
        "status": "running",
        "version": "2.0.0",
        "architecture": "DDD + CQRS",
        "endpoints": {
            "hospitales": "/api/v1/hospitales",
            "personal": "/api/v1/personal",
            "turnos": "/api/v1/turnos",
            "disponibilidad": "/api/v1/disponibilidad",
            "refuerzos": "/api/v1/refuerzos",
            "lista_sergas": "/api/v1/lista-sergas",
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# REGISTRAR ROUTERS
# ═══════════════════════════════════════════════════════════════════════════════

app.include_router(hospital_router, prefix="/api/v1")
app.include_router(personal_router, prefix="/api/v1")
app.include_router(turno_router, prefix="/api/v1")
app.include_router(disponibilidad_router, prefix="/api/v1")
app.include_router(refuerzo_router, prefix="/api/v1")
app.include_router(lista_sergas_router, prefix="/api/v1")


# ═══════════════════════════════════════════════════════════════════════════════
# EVENTOS DE INICIO
# ═══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    """Inicialización al arrancar la aplicación"""
    print("═" * 60)
    print("  GEMELO DIGITAL HOSPITALARIO v2.0.0")
    print("  Arquitectura: DDD + CQRS")
    print("═" * 60)

    # Inicializar base de datos
    try:
        init_db()
        print("✓ Base de datos inicializada")
    except Exception as e:
        print(f"✗ Error inicializando BD: {e}")

    print("✓ API iniciada correctamente")
    print("═" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Limpieza al cerrar la aplicación"""
    print("Cerrando Gemelo Digital Hospitalario...")


# ═══════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
