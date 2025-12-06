"""
Tests unitarios para servicios externos
"""

import unittest
import sys
import os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.external_services import (
    WeatherService,
    HolidaysService,
    EventsService,
)
from src.infrastructure.external_services.football_service import FootballService
from datetime import date, datetime


class TestWeatherService(unittest.TestCase):
    """Tests del servicio de clima"""

    def setUp(self):
        self.service = WeatherService(api_key="")  # Modo simulado

    def test_obtener_clima_simulado(self):
        """Test clima simulado funciona"""
        clima = self.service.obtener_clima()

        self.assertIsNotNone(clima)
        self.assertIsNotNone(clima.temperatura)
        self.assertIsNotNone(clima.humedad)
        self.assertGreater(clima.temperatura, -20)
        self.assertLess(clima.temperatura, 50)

    def test_factores_temperatura(self):
        """Test cálculo de factores"""
        clima = self.service.obtener_clima()

        factor_temp = clima.factor_temperatura()
        factor_lluvia = clima.factor_lluvia()

        self.assertGreater(factor_temp, 0.5)
        self.assertLess(factor_temp, 2.0)
        self.assertGreater(factor_lluvia, 0.5)
        self.assertLess(factor_lluvia, 2.0)

    def test_es_frio(self):
        """Test detección de frío"""
        clima = self.service._generar_datos_simulados()

        if clima.temperatura < 10:
            self.assertTrue(clima.es_frio())
        else:
            self.assertFalse(clima.es_frio())


class TestHolidaysService(unittest.TestCase):
    """Tests del servicio de festivos"""

    def setUp(self):
        self.service = HolidaysService()

    def test_festivos_conocidos(self):
        """Test festivos conocidos existen"""
        # Año nuevo siempre es festivo
        ano_nuevo = date(2025, 1, 1)
        self.assertTrue(self.service.es_festivo(ano_nuevo))

        # Navidad siempre es festivo
        navidad = date(2025, 12, 25)
        self.assertTrue(self.service.es_festivo(navidad))

    def test_dia_normal_no_festivo(self):
        """Test día normal no es festivo"""
        # 15 de marzo no es festivo
        dia_normal = date(2025, 3, 15)
        self.assertFalse(self.service.es_festivo(dia_normal))

    def test_fin_de_semana(self):
        """Test detección fin de semana"""
        # Sábado
        sabado = date(2025, 1, 4)
        self.assertTrue(self.service.es_fin_de_semana(sabado))

        # Lunes
        lunes = date(2025, 1, 6)
        self.assertFalse(self.service.es_fin_de_semana(lunes))

    def test_factor_demanda(self):
        """Test factor demanda es razonable"""
        hoy = date.today()
        factor = self.service.factor_demanda(hoy)

        self.assertGreater(factor, 0.5)
        self.assertLess(factor, 1.5)

    def test_obtener_festivos_ano(self):
        """Test obtener festivos del año"""
        festivos = self.service.obtener_festivos_año(2025)

        self.assertGreater(len(festivos), 10)  # Al menos 10 festivos
        self.assertLess(len(festivos), 30)     # No más de 30


class TestEventsService(unittest.TestCase):
    """Tests del servicio de eventos"""

    def setUp(self):
        self.service = EventsService()

    def test_eventos_generados(self):
        """Test eventos se generan"""
        eventos = self.service.obtener_proximos_eventos(365)

        self.assertGreater(len(eventos), 0)

    def test_san_juan_existe(self):
        """Test San Juan existe en el calendario"""
        eventos_jun = self.service.obtener_eventos_fecha(date(2025, 6, 23))

        # Debería haber al menos el evento de San Juan
        san_juan = [e for e in eventos_jun if "San Juan" in e.nombre]
        self.assertGreater(len(san_juan), 0)

    def test_factor_demanda(self):
        """Test factor demanda es razonable"""
        ahora = datetime.now()
        factor = self.service.factor_demanda_total(ahora)

        self.assertGreater(factor, 0.5)
        self.assertLess(factor, 3.0)


class TestFootballService(unittest.TestCase):
    """Tests del servicio de fútbol"""

    def setUp(self):
        self.service = FootballService()  # Modo simulado

    def test_obtener_partidos(self):
        """Test obtiene partidos"""
        partidos = self.service.obtener_proximos_partidos(30)

        self.assertIsNotNone(partidos)
        self.assertGreater(len(partidos), 0)

    def test_partidos_tienen_datos(self):
        """Test partidos tienen todos los datos"""
        partidos = self.service.obtener_proximos_partidos(30)

        for partido in partidos:
            self.assertIsNotNone(partido.fecha)
            self.assertIsNotNone(partido.equipo_local)
            self.assertIsNotNone(partido.equipo_visitante)
            self.assertIsNotNone(partido.estadio)

    def test_factor_demanda_casa(self):
        """Test factor demanda en partidos de casa"""
        partidos = self.service.obtener_proximos_partidos(30)

        partidos_casa = [p for p in partidos if p.es_en_casa]

        if partidos_casa:
            for partido in partidos_casa:
                self.assertGreater(partido.factor_demanda, 1.0)


class TestIntegracion(unittest.TestCase):
    """Tests de integración entre servicios"""

    def test_todos_servicios_funcionan(self):
        """Test todos los servicios se pueden instanciar"""
        weather = WeatherService(api_key="")
        holidays = HolidaysService()
        events = EventsService()
        football = FootballService()

        self.assertIsNotNone(weather)
        self.assertIsNotNone(holidays)
        self.assertIsNotNone(events)
        self.assertIsNotNone(football)

    def test_datos_coherentes(self):
        """Test datos son coherentes entre servicios"""
        weather = WeatherService(api_key="")
        holidays = HolidaysService()

        clima = weather.obtener_clima()
        hoy = date.today()

        # Temperatura razonable
        self.assertGreater(clima.temperatura, -20)
        self.assertLess(clima.temperatura, 50)

        # Factor festivo razonable
        factor_festivo = holidays.factor_demanda(hoy)
        self.assertGreater(factor_festivo, 0.5)
        self.assertLess(factor_festivo, 1.5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
