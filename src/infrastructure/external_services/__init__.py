"""Servicios externos - APIs de terceros para datos realistas."""

from .weather_service import WeatherService, WeatherData
from .holidays_service import HolidaysService
from .events_service import EventsService
from .football_service import FootballService, Partido

__all__ = [
    "WeatherService",
    "WeatherData",
    "HolidaysService",
    "EventsService",
    "FootballService",
    "Partido",
]
