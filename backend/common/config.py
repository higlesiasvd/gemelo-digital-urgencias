"""
============================================================================
CONFIGURACION CENTRALIZADA
============================================================================
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Settings:
    """Configuracion global del sistema"""

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    KAFKA_GROUP_ID: str = os.getenv("KAFKA_GROUP_ID", "gemelo-digital")

    # PostgreSQL
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "urgencias_db")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "urgencias")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "urgencias_pass")

    # InfluxDB
    INFLUX_URL: str = os.getenv("INFLUX_URL", "http://influxdb:8086")
    INFLUX_TOKEN: str = os.getenv("INFLUX_TOKEN", "mi-token-secreto-urgencias-dt")
    INFLUX_ORG: str = os.getenv("INFLUX_ORG", "urgencias")
    INFLUX_BUCKET: str = os.getenv("INFLUX_BUCKET", "hospitales")

    # Groq (Chatbot)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Simulador
    SIMULATION_SPEED: float = float(os.getenv("SIMULATION_SPEED", "1.0"))
    SIMULATION_DURATION: int = int(os.getenv("SIMULATION_DURATION", "0"))  # 0 = infinito

    # APIs externas
    FOOTBALL_API_KEY: str = os.getenv("FOOTBALL_API_KEY", "")

    @property
    def postgres_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def postgres_async_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


# Instancia global
settings = Settings()
