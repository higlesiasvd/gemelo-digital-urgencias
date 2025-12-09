"""
============================================================================
FACTORES DE DEMANDA
============================================================================
Calcula factores que afectan la tasa de llegada de pacientes basándose en:
- Hora del día
- Día de la semana
- Clima
- Eventos
- Festivos
============================================================================
"""

from datetime import datetime
from typing import Optional
import sys
import os

# Añadir el directorio padre al path para imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from external_apis.weather_service import WeatherService, WeatherData
from external_apis.events_service import EventsService
from external_apis.football_service import FootballService


class DemandFactors:
    """Calcula factores de demanda externos"""

    def __init__(self):
        self.weather_service = WeatherService()
        self.events_service = EventsService()
        self.football_service = FootballService()

        self._cached_weather: Optional[WeatherData] = None
        self._last_weather_update: Optional[datetime] = None

    def get_hour_factor(self, hora: int) -> float:
        """
        Factor por hora del día.
        Más urgencias por la mañana y noche.
        """
        # Perfil típico de urgencias
        hourly_factors = {
            0: 0.7, 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.3, 5: 0.4,
            6: 0.6, 7: 0.8, 8: 1.0, 9: 1.2, 10: 1.3, 11: 1.4,
            12: 1.3, 13: 1.2, 14: 1.1, 15: 1.0, 16: 1.1, 17: 1.2,
            18: 1.3, 19: 1.4, 20: 1.3, 21: 1.2, 22: 1.0, 23: 0.8
        }
        return hourly_factors.get(hora, 1.0)

    def get_weekday_factor(self, weekday: int) -> float:
        """
        Factor por día de la semana.
        0=Lunes, 6=Domingo
        """
        weekday_factors = {
            0: 1.2,  # Lunes - resaca del finde
            1: 1.0,
            2: 1.0,
            3: 1.0,
            4: 1.1,  # Viernes - más accidentes
            5: 1.3,  # Sábado - ocio nocturno
            6: 1.2   # Domingo - deportes, resaca
        }
        return weekday_factors.get(weekday, 1.0)

    def get_weather_factor(self) -> tuple[float, WeatherData]:
        """
        Factor por condiciones meteorológicas.
        Retorna (factor, datos_clima)
        """
        try:
            weather = self.weather_service.obtener_clima()
            factor = weather.factor_temperatura() * weather.factor_lluvia()
            return factor, weather
        except Exception as e:
            print(f"Error obteniendo clima: {e}")
            return 1.0, None

    def get_event_factor(self, fecha_hora: datetime) -> tuple[float, Optional[str]]:
        """
        Factor por eventos activos.
        Retorna (factor, nombre_evento)
        """
        try:
            eventos = self.events_service.obtener_eventos_activos(fecha_hora)
            if eventos:
                # Tomar el evento con mayor impacto
                evento = max(eventos, key=lambda e: e.factor_demanda)
                return evento.factor_demanda, evento.nombre
            return 1.0, None
        except Exception as e:
            print(f"Error obteniendo eventos: {e}")
            return 1.0, None

    def get_football_factor(self) -> tuple[float, Optional[str]]:
        """
        Factor por partidos de fútbol.
        Retorna (factor, info_partido)
        """
        try:
            partidos = self.football_service.obtener_proximos_partidos(dias=1)
            if partidos:
                # Ver si hay partido hoy
                hoy = datetime.now().date()
                for partido in partidos:
                    if partido.fecha.date() == hoy:
                        info = f"{partido.equipo_local} vs {partido.equipo_visitante}"
                        return partido.factor_demanda, info
            return 1.0, None
        except Exception as e:
            print(f"Error obteniendo partidos: {e}")
            return 1.0, None

    def calculate_total_factor(self, fecha_hora: datetime = None) -> dict:
        """
        Calcula el factor total de demanda.

        Returns:
            Dict con todos los factores y el factor total
        """
        if fecha_hora is None:
            fecha_hora = datetime.now()

        # Factores temporales
        factor_hora = self.get_hour_factor(fecha_hora.hour)
        factor_dia = self.get_weekday_factor(fecha_hora.weekday())

        # Factores externos
        factor_clima, weather_data = self.get_weather_factor()
        factor_evento, evento_nombre = self.get_event_factor(fecha_hora)
        factor_futbol, partido_info = self.get_football_factor()

        # Factor total (multiplicativo)
        factor_total = (
            factor_hora *
            factor_dia *
            factor_clima *
            factor_evento *
            factor_futbol
        )

        # Limitar entre 0.5 y 3.0 (acorde a SystemContext schema)
        factor_total = max(0.5, min(3.0, factor_total))

        return {
            "factor_hora": round(factor_hora, 2),
            "factor_dia": round(factor_dia, 2),
            "factor_clima": round(factor_clima, 2),
            "factor_evento": round(factor_evento, 2),
            "factor_futbol": round(factor_futbol, 2),
            "factor_total": round(factor_total, 2),
            "clima": weather_data.to_dict() if weather_data else None,
            "evento_activo": evento_nombre,
            "partido_activo": partido_info,
            "timestamp": fecha_hora.isoformat()
        }


# Instancia global
demand_factors = DemandFactors()
