"""Configuración centralizada del proyecto."""

from .settings import Settings, get_settings
from .hospital_config import HOSPITALES, CONFIG_TRIAJE, PATOLOGIAS

__all__ = [
    "Settings",
    "get_settings",
    "HOSPITALES",
    "CONFIG_TRIAJE",
    "PATOLOGIAS",
]
