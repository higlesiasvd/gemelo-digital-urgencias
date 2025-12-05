"""
═══════════════════════════════════════════════════════════════════════════════
CONFIGURACIÓN DE BASE DE DATOS POSTGRESQL
═══════════════════════════════════════════════════════════════════════════════
Configuración de conexión y sesiones de SQLAlchemy para PostgreSQL.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from .models import Base


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE CONEXIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# Variables de entorno con valores por defecto
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "urgencias_db")
POSTGRES_USER = os.getenv("POSTGRES_USER", "urgencias")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "urgencias_pass")

# Construir URL de conexión
DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# URL alternativa para desarrollo local
DATABASE_URL_LOCAL = os.getenv(
    "DATABASE_URL",
    "postgresql://urgencias:urgencias_pass@localhost:5432/urgencias_db"
)


# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE Y SESSION FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

def get_database_url() -> str:
    """Obtiene la URL de la base de datos según el entorno"""
    # Si estamos en Docker, usar la URL de Docker
    if os.getenv("DOCKER_CONTAINER"):
        return DATABASE_URL
    # Si hay una variable de entorno específica, usarla
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    # Por defecto, intentar Docker
    return DATABASE_URL


def create_db_engine(echo: bool = False):
    """
    Crea el engine de SQLAlchemy con configuración optimizada.
    
    Args:
        echo: Si True, loguea todas las queries SQL
    """
    return create_engine(
        get_database_url(),
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Verifica conexiones antes de usarlas
        pool_recycle=3600,   # Recicla conexiones cada hora
        echo=echo,
    )


# Engine global
engine = None
SessionLocal = None


def init_database(echo: bool = False) -> None:
    """
    Inicializa la conexión a la base de datos y crea las tablas.
    
    Args:
        echo: Si True, loguea todas las queries SQL
    """
    global engine, SessionLocal
    
    engine = create_db_engine(echo)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Crear todas las tablas
    Base.metadata.create_all(bind=engine)
    print(f"✅ Base de datos inicializada: {get_database_url().split('@')[1]}")


def get_engine():
    """Obtiene el engine actual o lo inicializa"""
    global engine
    if engine is None:
        init_database()
    return engine


def get_session_factory():
    """Obtiene el SessionLocal actual o lo inicializa"""
    global SessionLocal
    if SessionLocal is None:
        init_database()
    return SessionLocal


# ═══════════════════════════════════════════════════════════════════════════════
# GESTIÓN DE SESIONES
# ═══════════════════════════════════════════════════════════════════════════════

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager para obtener una sesión de base de datos.
    Asegura que la sesión se cierre correctamente.
    
    Usage:
        with get_db_session() as session:
            session.query(...)
    """
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency para FastAPI que proporciona una sesión de BD.
    
    Usage en FastAPI:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            ...
    """
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════════════════════════════════════════

def check_database_connection() -> bool:
    """Verifica si la conexión a la base de datos está funcionando"""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"❌ Error de conexión a PostgreSQL: {e}")
        return False


def drop_all_tables() -> None:
    """Elimina todas las tablas (¡CUIDADO! Solo para desarrollo/testing)"""
    engine = get_engine()
    Base.metadata.drop_all(bind=engine)
    print("⚠️  Todas las tablas han sido eliminadas")


def recreate_all_tables() -> None:
    """Recrea todas las tablas (¡CUIDADO! Pierde todos los datos)"""
    engine = get_engine()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("🔄 Todas las tablas han sido recreadas")
