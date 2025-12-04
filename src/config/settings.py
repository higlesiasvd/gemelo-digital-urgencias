"""
═══════════════════════════════════════════════════════════════════════════════
SETTINGS - Configuración Centralizada del Sistema
═══════════════════════════════════════════════════════════════════════════════
Gestiona toda la configuración del proyecto desde un único punto.
Soporta variables de entorno y configuración por defecto.
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional
from functools import lru_cache


@dataclass
class MQTTConfig:
    """Configuración MQTT"""
    broker: str = field(default_factory=lambda: os.getenv("MQTT_BROKER", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("MQTT_PORT", "1883")))
    keepalive: int = 60
    qos: int = 1


@dataclass
class InfluxDBConfig:
    """Configuración InfluxDB"""
    url: str = field(default_factory=lambda: os.getenv("INFLUX_URL", "http://localhost:8086"))
    token: str = field(default_factory=lambda: os.getenv("INFLUX_TOKEN", "admin_token"))
    org: str = field(default_factory=lambda: os.getenv("INFLUX_ORG", "hospitales"))
    bucket: str = field(default_factory=lambda: os.getenv("INFLUX_BUCKET", "hospitales"))


@dataclass
class WeatherAPIConfig:
    """Configuración API del clima"""
    # OpenWeatherMap API - Gratis hasta 1000 llamadas/día
    api_key: str = field(default_factory=lambda: os.getenv("WEATHER_API_KEY", ""))
    location: str = "A Coruña,ES"
    latitude: float = 43.3623
    longitude: float = -8.4115
    cache_minutes: int = 60  # Cachear datos por 1 hora
    enabled: bool = field(default_factory=lambda: bool(os.getenv("WEATHER_API_KEY", "")))


@dataclass
class SimulationConfig:
    """Configuración de la simulación"""
    velocidad: float = field(default_factory=lambda: float(os.getenv("VELOCIDAD", "60")))
    duracion_horas: float = field(default_factory=lambda: float(os.getenv("DURACION", "24")))
    hospitales: List[str] = field(default_factory=lambda: os.getenv("HOSPITALES", "chuac").split())
    emergencias_aleatorias: bool = field(default_factory=lambda: os.getenv("EMERGENCIAS", "false").lower() == "true")
    prediccion_activa: bool = field(default_factory=lambda: os.getenv("PREDICCION", "true").lower() == "true")
    tiempo_real: bool = field(default_factory=lambda: os.getenv("TIEMPO_REAL", "true").lower() == "true")

    # Nuevos parámetros para datos realistas
    usar_clima_real: bool = field(default_factory=lambda: os.getenv("USAR_CLIMA", "false").lower() == "true")
    usar_festivos_reales: bool = True
    factor_estacionalidad: float = 1.0  # Factor de estacionalidad (invierno: gripe, verano: accidentes)


@dataclass
class CoordinadorConfig:
    """Configuración del coordinador central"""
    umbral_saturacion_warning: float = 0.70
    umbral_saturacion_critical: float = 0.85
    umbral_derivacion: float = 0.80
    tiempo_traslado_minutos: float = 15.0  # Tiempo estimado de traslado entre hospitales


@dataclass
class PrediccionConfig:
    """Configuración del servicio de predicción"""
    horizonte_horas: int = 24
    intervalo_minutos: int = 60
    umbral_anomalia: float = 2.0
    min_datos_historicos: int = 168  # 1 semana
    actualizar_cada_minutos: int = 60


@dataclass
class Settings:
    """Configuración global del sistema"""
    mqtt: MQTTConfig = field(default_factory=MQTTConfig)
    influxdb: InfluxDBConfig = field(default_factory=InfluxDBConfig)
    weather: WeatherAPIConfig = field(default_factory=WeatherAPIConfig)
    simulation: SimulationConfig = field(default_factory=SimulationConfig)
    coordinador: CoordinadorConfig = field(default_factory=CoordinadorConfig)
    prediccion: PrediccionConfig = field(default_factory=PrediccionConfig)

    # Configuración general
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    seed: Optional[int] = field(default_factory=lambda: int(os.getenv("RANDOM_SEED")) if os.getenv("RANDOM_SEED") else None)


@lru_cache()
def get_settings() -> Settings:
    """
    Obtiene la configuración singleton del sistema.
    Usa cache para evitar recrear la configuración múltiples veces.
    """
    return Settings()


# Exportar instancia global
settings = get_settings()
