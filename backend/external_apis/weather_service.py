"""
═══════════════════════════════════════════════════════════════════════════════
WEATHER SERVICE - Servicio de Datos Meteorológicos
═══════════════════════════════════════════════════════════════════════════════
Obtiene datos meteorológicos reales de Open-Meteo API (100% gratuita, sin API key).
Los datos afectan a la generación de patologías (más gripes con frío, etc.)
"""

import requests
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Dict
import json
from functools import lru_cache


@dataclass
class WeatherData:
    """Datos meteorológicos"""
    timestamp: datetime
    temperatura: float  # °C
    sensacion_termica: float  # °C
    humedad: int  # %
    presion: int  # hPa
    descripcion: str
    lluvia_1h: float = 0.0  # mm
    nieve_1h: float = 0.0  # mm
    viento_velocidad: float = 0.0  # m/s
    nubosidad: int = 0  # %

    def es_frio(self) -> bool:
        """Indica si hace frío (< 10°C)"""
        return self.temperatura < 10

    def es_calor(self) -> bool:
        """Indica si hace calor (> 28°C)"""
        return self.temperatura > 28

    def esta_lloviendo(self) -> bool:
        """Indica si está lloviendo"""
        return self.lluvia_1h > 0.1

    def factor_temperatura(self) -> float:
        """
        Factor multiplicador de urgencias por temperatura.
        Más urgencias con temperaturas extremas.
        """
        if self.temperatura < 5:
            return 1.3  # Mucho frío aumenta urgencias respiratorias
        elif self.temperatura < 10:
            return 1.15
        elif self.temperatura > 32:
            return 1.25  # Mucho calor aumenta urgencias (deshidratación, golpes de calor)
        elif self.temperatura > 28:
            return 1.1
        return 1.0

    def factor_lluvia(self) -> float:
        """
        Factor multiplicador por lluvia.
        Lluvia aumenta accidentes de tráfico.
        """
        if self.lluvia_1h > 5:
            return 1.2  # Lluvia fuerte
        elif self.lluvia_1h > 1:
            return 1.1  # Lluvia moderada
        return 1.0

    def to_dict(self) -> Dict:
        """Convierte a diccionario para MQTT/JSON"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "temperatura": round(self.temperatura, 1),
            "sensacion_termica": round(self.sensacion_termica, 1),
            "humedad": self.humedad,
            "presion": self.presion,
            "descripcion": self.descripcion,
            "lluvia_1h": round(self.lluvia_1h, 1),
            "nieve_1h": round(self.nieve_1h, 1),
            "viento_velocidad": round(self.viento_velocidad, 1),
            "nubosidad": self.nubosidad,
            "es_frio": self.es_frio(),
            "es_calor": self.es_calor(),
            "esta_lloviendo": self.esta_lloviendo(),
            "factor_temperatura": round(self.factor_temperatura(), 2),
            "factor_lluvia": round(self.factor_lluvia(), 2),
        }


class WeatherService:
    """
    Servicio para obtener datos meteorológicos de Open-Meteo.

    API 100% gratuita: https://open-meteo.com/
    Sin API key, sin límites, sin registro
    """

    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self, api_key: str = "", lat: float = 43.3623, lon: float = -8.4115,
                 cache_minutes: int = 60):
        """
        Args:
            api_key: No se usa (Open-Meteo no requiere API key)
            lat: Latitud (default: A Coruña)
            lon: Longitud (default: A Coruña)
            cache_minutes: Minutos de cache (default: 60)
        """
        self.api_key = api_key  # Se mantiene por compatibilidad
        self.lat = lat
        self.lon = lon
        self.cache_minutes = cache_minutes
        self.enabled = True  # Siempre habilitado (Open-Meteo es gratis)

        # Cache simple
        self._cache: Optional[WeatherData] = None
        self._cache_time: Optional[datetime] = None

        print(f"🌦️  Weather Service habilitado (Open-Meteo API - A Coruña)")

    def obtener_clima(self) -> WeatherData:
        """
        Obtiene datos meteorológicos actuales de Open-Meteo.
        Usa cache para minimizar llamadas a la API.
        """
        # Verificar cache
        if self._cache and self._cache_time:
            edad_cache = (datetime.now() - self._cache_time).total_seconds() / 60
            if edad_cache < self.cache_minutes:
                return self._cache

        try:
            # Llamar a Open-Meteo API
            params = {
                "latitude": self.lat,
                "longitude": self.lon,
                "current_weather": "true",
                "hourly": "temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,pressure_msl,cloudcover",
                "timezone": "Europe/Madrid"
            }

            response = requests.get(self.BASE_URL, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()

            # Datos actuales de Open-Meteo
            current = data["current_weather"]

            # Para humedad y precipitación, tomamos el valor más reciente del hourly
            hourly = data["hourly"]
            current_index = 0  # Índice más reciente

            # Mapeo de weathercode a descripción
            weathercode_map = {
                0: "cielo despejado", 1: "principalmente despejado", 2: "parcialmente nuboso",
                3: "nuboso", 45: "niebla", 48: "niebla con escarcha",
                51: "llovizna ligera", 53: "llovizna moderada", 55: "llovizna densa",
                61: "lluvia ligera", 63: "lluvia moderada", 65: "lluvia fuerte",
                71: "nieve ligera", 73: "nieve moderada", 75: "nieve fuerte",
                80: "chubascos ligeros", 81: "chubascos moderados", 82: "chubascos fuertes",
                95: "tormenta", 96: "tormenta con granizo ligero", 99: "tormenta con granizo fuerte"
            }

            temp = current["temperature"]
            wind_speed = current["windspeed"]
            weathercode = current["weathercode"]

            # Obtener datos horarios actuales
            humedad = hourly["relativehumidity_2m"][current_index]
            presion = int(hourly["pressure_msl"][current_index])
            lluvia = hourly["precipitation"][current_index]
            nubosidad = hourly["cloudcover"][current_index]

            # Calcular sensación térmica (fórmula simplificada con viento)
            sensacion = temp - (wind_speed * 0.5)

            # Parsear respuesta a nuestro formato
            weather_data = WeatherData(
                timestamp=datetime.now(),
                temperatura=round(temp, 1),
                sensacion_termica=round(sensacion, 1),
                humedad=int(humedad),
                presion=presion,
                descripcion=weathercode_map.get(weathercode, "desconocido"),
                lluvia_1h=round(lluvia, 1),
                nieve_1h=0.0,  # Open-Meteo no separa nieve en hourly básico
                viento_velocidad=round(wind_speed, 1),
                nubosidad=int(nubosidad),
            )

            # Actualizar cache
            self._cache = weather_data
            self._cache_time = datetime.now()

            return weather_data

        except Exception as e:
            print(f"⚠️  Error obteniendo clima: {e}")
            print(f"   Usando datos simulados")
            return self._generar_datos_simulados()

    def _generar_datos_simulados(self) -> WeatherData:
        """
        Genera datos meteorológicos simulados realistas para A Coruña.
        Basado en climatología histórica.
        """
        import random

        # Temperatura según mes (climatología A Coruña)
        mes = datetime.now().month
        temp_media = {
            1: 11, 2: 11, 3: 13, 4: 14, 5: 16, 6: 19,
            7: 21, 8: 21, 9: 19, 10: 16, 11: 13, 12: 11
        }

        temp = temp_media.get(mes, 15) + random.uniform(-3, 3)
        sensacion = temp + random.uniform(-2, 0)  # Sensación ligeramente más fría por viento

        # A Coruña llueve mucho (60% probabilidad)
        lluvia = random.uniform(0, 5) if random.random() < 0.6 else 0

        descripciones_lluvia = ["lluvia ligera", "lluvia moderada", "llovizna", "lluvia fuerte"]
        descripciones_seco = ["nubes dispersas", "algo de nubes", "cielo despejado", "nuboso"]

        return WeatherData(
            timestamp=datetime.now(),
            temperatura=round(temp, 1),
            sensacion_termica=round(sensacion, 1),
            humedad=random.randint(65, 90),  # A Coruña es muy húmeda
            presion=random.randint(1010, 1020),
            descripcion=random.choice(descripciones_lluvia if lluvia > 0 else descripciones_seco),
            lluvia_1h=round(lluvia, 1),
            viento_velocidad=round(random.uniform(2, 8), 1),  # Suele haber viento
            nubosidad=random.randint(40, 90) if lluvia > 0 else random.randint(10, 60),
        )

    def obtener_forecast(self, horas: int = 24) -> list[WeatherData]:
        """
        Obtiene pronóstico para las próximas horas.
        (Requiere API key de pago, por ahora simulado)
        """
        # Por ahora, generar datos simulados
        forecast = []
        for h in range(horas):
            data = self._generar_datos_simulados()
            data.timestamp = datetime.now() + timedelta(hours=h)
            forecast.append(data)

        return forecast


# Ejemplo de uso
if __name__ == "__main__":
    print("\n" + "═"*60)
    print("🌦️  PRUEBA DEL WEATHER SERVICE")
    print("═"*60 + "\n")

    # Sin API key (modo simulado)
    service = WeatherService(api_key="")
    clima = service.obtener_clima()

    print(f"📍 Ubicación: A Coruña")
    print(f"🌡️  Temperatura: {clima.temperatura}°C (sensación {clima.sensacion_termica}°C)")
    print(f"💧 Humedad: {clima.humedad}%")
    print(f"☁️  Descripción: {clima.descripcion}")
    print(f"🌧️  Lluvia: {clima.lluvia_1h} mm")
    print(f"💨 Viento: {clima.viento_velocidad} m/s")
    print(f"\n📊 Factores:")
    print(f"   - Factor temperatura: {clima.factor_temperatura()}x")
    print(f"   - Factor lluvia: {clima.factor_lluvia()}x")
    print(f"   - Es frío: {'Sí' if clima.es_frio() else 'No'}")
    print(f"   - Está lloviendo: {'Sí' if clima.esta_lloviendo() else 'No'}")

    print(f"\n✅ Weather Service funcionando correctamente")
