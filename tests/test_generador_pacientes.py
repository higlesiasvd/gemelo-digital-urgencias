"""
Tests unitarios para el generador de pacientes
"""

import unittest
import sys
sys.path.insert(0, 'src')

from domain.services.generador_pacientes import GeneradorPacientes, ContextoGeneracion
from infrastructure.external_services import WeatherService, HolidaysService, EventsService
from config.hospital_config import NivelTriaje, CONFIG_TRIAJE
from datetime import datetime


class TestGeneradorPacientes(unittest.TestCase):
    """Tests del generador de pacientes"""

    def setUp(self):
        weather = WeatherService(api_key="")
        holidays = HolidaysService()
        events = EventsService()

        self.generador = GeneradorPacientes(
            weather_service=weather,
            holidays_service=holidays,
            events_service=events,
            seed=42
        )

    def test_generar_contexto(self):
        """Test generación de contexto"""
        contexto = self.generador.generar_contexto(tiempo_simulado=0)

        self.assertIsInstance(contexto, ContextoGeneracion)
        self.assertIsNotNone(contexto.hora)
        self.assertIsNotNone(contexto.dia_semana)
        self.assertIsNotNone(contexto.mes)

    def test_generar_nivel_triaje(self):
        """Test generación de nivel de triaje"""
        nivel = self.generador.generar_nivel_triaje()

        self.assertIn(nivel, NivelTriaje)

    def test_generar_edad_realista(self):
        """Test edad generada es realista"""
        # Generar 100 pacientes
        edades = []
        for _ in range(100):
            nivel = NivelTriaje.ROJO  # Casos críticos
            edad = self.generador.generar_edad(nivel)
            edades.append(edad)

        # Casos críticos suelen ser mayores
        edad_media = sum(edades) / len(edades)
        self.assertGreater(edad_media, 40)  # Media > 40 años

        # Todas las edades válidas
        for edad in edades:
            self.assertGreaterEqual(edad, 0)
            self.assertLessEqual(edad, 100)

    def test_seleccionar_patologia(self):
        """Test selección de patología"""
        nivel = NivelTriaje.VERDE
        nombre, patologia = self.generador.seleccionar_patologia(nivel)

        self.assertIsNotNone(nombre)
        self.assertIsNotNone(patologia)
        self.assertIsInstance(nombre, str)

    def test_calcular_tiempo_entre_llegadas(self):
        """Test cálculo tiempo entre llegadas"""
        contexto = self.generador.generar_contexto(0)
        tiempo = self.generador.calcular_tiempo_entre_llegadas(420, contexto)

        self.assertGreater(tiempo, 0)
        self.assertLess(tiempo, 1000)  # Razonable

    def test_generar_paciente_completo(self):
        """Test generación paciente completo"""
        paciente = self.generador.generar_paciente_completo(
            paciente_id=1,
            hospital_id="chuac",
            tiempo_simulado=0
        )

        # Verificar campos obligatorios
        self.assertEqual(paciente['id'], 1)
        self.assertEqual(paciente['hospital_id'], 'chuac')
        self.assertIn(paciente['nivel_triaje'], NivelTriaje)
        self.assertIsNotNone(paciente['patologia'])
        self.assertGreaterEqual(paciente['edad'], 0)
        self.assertLessEqual(paciente['edad'], 100)

        # Verificar contexto
        self.assertIn('contexto', paciente)
        self.assertIn('factor_eventos', paciente['contexto'])
        self.assertIn('factor_festivos', paciente['contexto'])

    def test_correlacion_edad_patologia(self):
        """Test correlación edad-patología"""
        # Generar muchos casos de IAM (típico en mayores)
        edades_iam = []

        for _ in range(50):
            paciente = self.generador.generar_paciente_completo(1, "chuac", 0)
            if paciente['patologia'] == "IAM":
                edades_iam.append(paciente['edad'])

        # Si hay casos de IAM, la edad media debería ser alta
        if edades_iam:
            edad_media = sum(edades_iam) / len(edades_iam)
            self.assertGreater(edad_media, 45)  # IAM típicamente >45 años

    def test_reproducibilidad_con_seed(self):
        """Test reproducibilidad con seed"""
        gen1 = GeneradorPacientes(
            weather_service=WeatherService(api_key=""),
            seed=42
        )
        gen2 = GeneradorPacientes(
            weather_service=WeatherService(api_key=""),
            seed=42
        )

        p1 = gen1.generar_paciente_completo(1, "chuac", 0)
        p2 = gen2.generar_paciente_completo(1, "chuac", 0)

        # Con mismo seed, deberían ser iguales
        self.assertEqual(p1['edad'], p2['edad'])
        self.assertEqual(p1['nivel_triaje'], p2['nivel_triaje'])


class TestContextoGeneracion(unittest.TestCase):
    """Tests del contexto de generación"""

    def test_crear_contexto(self):
        """Test crear contexto"""
        from datetime import date

        contexto = ContextoGeneracion(
            hora=10,
            dia_semana=0,
            mes=12,
            fecha=date.today(),
            factor_eventos=1.2,
            factor_festivos=0.9
        )

        self.assertEqual(contexto.hora, 10)
        self.assertEqual(contexto.dia_semana, 0)
        self.assertEqual(contexto.mes, 12)
        self.assertEqual(contexto.factor_eventos, 1.2)
        self.assertEqual(contexto.factor_festivos, 0.9)


if __name__ == "__main__":
    unittest.main(verbosity=2)
