"""
API de Partidos de Fútbol - TheSportsDB (100% GRATIS)
Obtiene partidos reales del Deportivo de La Coruña - Temporada 2025/2026.
"""

import requests
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from dataclasses import dataclass
import os


@dataclass
class Partido:
    fecha: datetime
    equipo_local: str
    equipo_visitante: str
    competicion: str
    estadio: str
    asistentes_estimados: int = 15000

    @property
    def es_en_casa(self) -> bool:
        return "Deportivo" in self.equipo_local or "Coruna" in self.equipo_local

    @property
    def factor_demanda(self) -> float:
        if self.es_en_casa:
            base = 1.15
            if "Celta" in self.equipo_visitante or "Racing" in self.equipo_visitante:
                return base * 1.3
            return base
        return 1.0

    def to_dict(self) -> Dict:
        return {
            "fecha": self.fecha.isoformat(),
            "local": self.equipo_local,
            "visitante": self.equipo_visitante,
            "competicion": self.competicion,
            "estadio": self.estadio,
            "en_casa": self.es_en_casa,
            "asistentes": self.asistentes_estimados,
            "factor_demanda": self.factor_demanda,
        }


class FootballService:
    BASE_URL = "https://www.thesportsdb.com/api/v1/json"
    DEPORTIVO_TEAM_ID = "133604"
    TEMPORADA = "2025-2026"  # Temporada actual
    _cache: Dict = {}
    _cache_time: Optional[datetime] = None
    CACHE_DURATION = 3600

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("SPORTSDB_API_KEY", "3")
        self.enabled = True
        print(f"⚽ Football Service habilitado (TheSportsDB - Temporada {self.TEMPORADA})")

    def obtener_proximos_partidos(self, dias: int = 30) -> List[Partido]:
        cache_key = f"partidos_{dias}"
        if self._cache.get(cache_key) and self._cache_time:
            if (datetime.now() - self._cache_time).seconds < self.CACHE_DURATION:
                return self._cache[cache_key]

        try:
            url = f"{self.BASE_URL}/{self.api_key}/eventsnext.php"
            params = {"id": self.DEPORTIVO_TEAM_ID}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            partidos = []

            if data.get("events"):
                for event in data["events"]:
                    try:
                        fecha_str = event.get("dateEvent", "")
                        hora_str = event.get("strTime", "20:00:00")
                        if fecha_str:
                            fecha = datetime.strptime(f"{fecha_str} {hora_str[:5]}", "%Y-%m-%d %H:%M")
                            if fecha > datetime.now() + timedelta(days=dias):
                                continue
                            es_casa = str(event.get("idHomeTeam")) == self.DEPORTIVO_TEAM_ID
                            visitante = event.get("strAwayTeam", "")
                            partido = Partido(
                                fecha=fecha,
                                equipo_local=event.get("strHomeTeam", ""),
                                equipo_visitante=visitante,
                                competicion=event.get("strLeague", "Segunda Division"),
                                estadio=event.get("strVenue", "Riazor") if es_casa else event.get("strVenue", ""),
                                asistentes_estimados=self._estimar_asistentes(visitante) if es_casa else 0
                            )
                            partidos.append(partido)
                    except Exception as e:
                        print(f"Error parseando partido: {e}")
                        continue

            if partidos:
                self._cache[cache_key] = partidos
                self._cache_time = datetime.now()
                return sorted(partidos, key=lambda p: p.fecha)[:6]
            else:
                print("No hay partidos proximos en API, usando simulados")
                return self._generar_partidos_simulados(dias)

        except Exception as e:
            print(f"Error obteniendo partidos: {e}")
            return self._generar_partidos_simulados(dias)

    def _estimar_asistentes(self, visitante: str) -> int:
        if "Celta" in visitante or "Racing" in visitante:
            return 25000
        elif "Oviedo" in visitante or "Sporting" in visitante:
            return 22000
        elif "Zaragoza" in visitante or "Valladolid" in visitante:
            return 18000
        else:
            return 15000

    def _generar_partidos_simulados(self, dias: int) -> List[Partido]:
        """Genera partidos simulados de la temporada 2025-2026"""
        import random
        rivales = [
            "Racing de Santander", "Real Oviedo", "Sporting de Gijon",
            "SD Eibar", "Real Zaragoza", "CD Tenerife",
            "Levante UD", "CD Mirandes", "Granada CF",
            "Real Valladolid", "SD Huesca", "Albacete Balompie",
            "Racing de Ferrol", "FC Cartagena", "Burgos CF"
        ]
        partidos = []
        fecha_actual = datetime.now()

        # Ajustar al año de la temporada 2025-2026
        if fecha_actual.month < 7:  # Si estamos antes de julio, usar 2025
            year_base = 2025
        else:  # Si estamos después de julio, usar 2026
            year_base = 2026

        for i in range(min(dias // 7, 6)):
            dias_hasta = random.randint(7, 14) * (i + 1)
            fecha = datetime(year_base, fecha_actual.month, fecha_actual.day) + timedelta(days=dias_hasta)
            es_casa = random.random() < 0.5
            rival = random.choice(rivales)

            if es_casa:
                local = "RC Deportivo de La Coruna"
                visitante = rival
                estadio = "Riazor"
                if "Oviedo" in rival or "Sporting" in rival or "Racing" in rival:
                    asistentes = random.randint(22000, 30000)
                else:
                    asistentes = random.randint(12000, 20000)
            else:
                local = rival
                visitante = "RC Deportivo de La Coruna"
                estadio = f"Estadio {rival.split()[0]}"
                asistentes = 0

            partidos.append(Partido(
                fecha=fecha,
                equipo_local=local,
                equipo_visitante=visitante,
                competicion=f"Segunda Division - LaLiga Hypermotion {self.TEMPORADA}",
                estadio=estadio,
                asistentes_estimados=asistentes
            ))

        return sorted(partidos, key=lambda p: p.fecha)
