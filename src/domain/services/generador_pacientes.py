"""
═══════════════════════════════════════════════════════════════════════════════
GENERADOR DE PACIENTES - Servicio de dominio
═══════════════════════════════════════════════════════════════════════════════
Genera pacientes realistas con:
- Correlación edad-patología
- Influencia del clima
- Influencia de eventos y festivos
- Distribución de edad por triaje
- Patrones estacionales
"""

import random
import numpy as np
from datetime import datetime, date
from typing import Optional, Tuple
from dataclasses import dataclass

from config.hospital_config import (
    NivelTriaje,
    CONFIG_TRIAJE,
    PATOLOGIAS,
    Patologia,
    PATRON_HORARIO,
    PATRON_SEMANAL,
    FACTOR_ESTACIONAL,
)
from infrastructure.external_services import (
    WeatherService,
    WeatherData,
    HolidaysService,
    EventsService,
)


@dataclass
class ContextoGeneracion:
    """Contexto para la generación de pacientes"""
    hora: int  # 0-23
    dia_semana: int  # 0-6 (lunes-domingo)
    mes: int  # 1-12
    fecha: date
    clima: Optional[WeatherData] = None
    factor_eventos: float = 1.0
    factor_festivos: float = 1.0


class GeneradorPacientes:
    """
    Generador avanzado de pacientes con datos realistas.

    Características:
    - Edad correlacionada con patología
    - Influencia del clima en patologías respiratorias
    - Eventos masivos aumentan traumas
    - Festivos reducen demanda (excepto algunos)
    - Distribución estacional (más gripe en invierno)
    """

    def __init__(
        self,
        weather_service: Optional[WeatherService] = None,
        holidays_service: Optional[HolidaysService] = None,
        events_service: Optional[EventsService] = None,
        seed: Optional[int] = None,
    ):
        """
        Args:
            weather_service: Servicio de clima (opcional)
            holidays_service: Servicio de festivos (opcional)
            events_service: Servicio de eventos (opcional)
            seed: Semilla para generación aleatoria (opcional)
        """
        self.weather_service = weather_service
        self.holidays_service = holidays_service or HolidaysService()
        self.events_service = events_service or EventsService()

        if seed:
            random.seed(seed)
            np.random.seed(seed)

        print(f"👨‍⚕️ Generador de Pacientes Realista inicializado")
        print(f"   - Clima: {'✅ Habilitado' if weather_service else '❌ Deshabilitado'}")
        print(f"   - Festivos: ✅ Habilitado")
        print(f"   - Eventos: ✅ Habilitado")

    def generar_contexto(self, tiempo_simulado: float) -> ContextoGeneracion:
        """
        Genera el contexto actual para la generación de pacientes.

        Args:
            tiempo_simulado: Tiempo en minutos desde el inicio de la simulación

        Returns:
            ContextoGeneracion con todos los factores contextuales
        """
        # Convertir tiempo simulado a datetime
        ahora = datetime.now()
        hora = int((tiempo_simulado / 60) % 24)
        dia_semana = ahora.weekday()
        mes = ahora.month
        fecha_actual = ahora.date()

        # Obtener clima
        clima = None
        if self.weather_service:
            try:
                clima = self.weather_service.obtener_clima()
            except Exception as e:
                print(f"⚠️ Error obteniendo clima: {e}")

        # Obtener factor de eventos
        factor_eventos = self.events_service.factor_demanda_total(ahora)

        # Obtener factor de festivos
        factor_festivos = self.holidays_service.factor_demanda(fecha_actual)

        return ContextoGeneracion(
            hora=hora,
            dia_semana=dia_semana,
            mes=mes,
            fecha=fecha_actual,
            clima=clima,
            factor_eventos=factor_eventos,
            factor_festivos=factor_festivos,
        )

    def generar_nivel_triaje(self, contexto: Optional[ContextoGeneracion] = None) -> NivelTriaje:
        """
        Genera un nivel de triaje basado en probabilidades reales.
        El contexto puede modificar ligeramente las probabilidades.
        """
        # Probabilidades base
        niveles = list(CONFIG_TRIAJE.keys())
        probabilidades = [CONFIG_TRIAJE[n].probabilidad for n in niveles]

        # Ajustar por eventos (más urgencias en eventos)
        if contexto and contexto.factor_eventos > 1.2:
            # Aumentar levemente casos naranja y amarillo
            probabilidades[1] *= 1.2  # Naranja
            probabilidades[2] *= 1.15  # Amarillo
            probabilidades[3] *= 0.9  # Verde
            probabilidades[4] *= 0.9  # Azul

        # Normalizar
        total = sum(probabilidades)
        probabilidades = [p / total for p in probabilidades]

        # Seleccionar
        return np.random.choice(niveles, p=probabilidades)

    def generar_edad(self, nivel_triaje: NivelTriaje, patologia: Optional[Patologia] = None) -> int:
        """
        Genera edad realista según nivel de triaje y patología.

        Args:
            nivel_triaje: Nivel de triaje del paciente
            patologia: Patología específica (opcional)

        Returns:
            Edad del paciente (0-100)
        """
        config = CONFIG_TRIAJE[nivel_triaje]

        if patologia:
            # Usar rango preferente de la patología
            if patologia.edad_preferente_min < patologia.edad_preferente_max:
                # 70% de probabilidad de estar en rango preferente
                if random.random() < 0.7:
                    media = (patologia.edad_preferente_min + patologia.edad_preferente_max) / 2
                    std = (patologia.edad_preferente_max - patologia.edad_preferente_min) / 4
                    edad = int(np.random.normal(media, std))
                else:
                    # 30% fuera del rango preferente
                    edad = int(np.random.normal(config.edad_media, config.edad_std))
            else:
                edad = int(np.random.normal(config.edad_media, config.edad_std))
        else:
            # Usar distribución del triaje
            edad = int(np.random.normal(config.edad_media, config.edad_std))

        # Limitar a rango válido
        if patologia:
            edad = max(patologia.edad_minima, min(patologia.edad_maxima, edad))
        else:
            edad = max(0, min(100, edad))

        return edad

    def seleccionar_patologia(
        self,
        nivel_triaje: NivelTriaje,
        contexto: Optional[ContextoGeneracion] = None
    ) -> Tuple[str, Patologia]:
        """
        Selecciona una patología realista según el nivel de triaje y el contexto.

        Args:
            nivel_triaje: Nivel de triaje
            contexto: Contexto de generación (clima, eventos, etc.)

        Returns:
            Tupla (nombre_patologia, objeto_patologia)
        """
        patologias_disponibles = PATOLOGIAS[nivel_triaje]

        # Calcular pesos según contexto
        pesos = []
        for patologia in patologias_disponibles:
            peso = 1.0

            if contexto:
                # Factor de clima
                if contexto.clima:
                    if contexto.clima.es_frio():
                        peso *= patologia.factor_clima_frio
                    if contexto.clima.es_calor():
                        peso *= patologia.factor_clima_calor
                    if contexto.clima.esta_lloviendo():
                        peso *= patologia.factor_lluvia

                # Factor estacional
                if patologia.estacionalidad != "ninguna":
                    mes_actual = contexto.mes
                    if patologia.estacionalidad == "invierno" and mes_actual in [12, 1, 2]:
                        peso *= 1.5
                    elif patologia.estacionalidad == "verano" and mes_actual in [6, 7, 8]:
                        peso *= 1.3
                    elif patologia.estacionalidad == "primavera" and mes_actual in [3, 4, 5]:
                        peso *= 1.4
                    elif patologia.estacionalidad == "otoño" and mes_actual in [9, 10, 11]:
                        peso *= 1.2

            pesos.append(peso)

        # Normalizar pesos
        total = sum(pesos)
        probabilidades = [p / total for p in pesos]

        # Seleccionar patología
        patologia_obj = np.random.choice(patologias_disponibles, p=probabilidades)
        return patologia_obj.nombre, patologia_obj

    def calcular_tiempo_entre_llegadas(
        self,
        pacientes_dia_base: int,
        contexto: ContextoGeneracion,
    ) -> float:
        """
        Calcula el tiempo hasta la próxima llegada considerando todos los factores.

        Args:
            pacientes_dia_base: Pacientes base por día del hospital
            contexto: Contexto con todos los factores

        Returns:
            Minutos hasta la próxima llegada
        """
        # Tasa base (pacientes por minuto)
        pacientes_por_minuto = pacientes_dia_base / (24 * 60)

        # Aplicar patrón horario
        factor_hora = PATRON_HORARIO.get(contexto.hora, 1.0)

        # Aplicar patrón semanal
        factor_dia = PATRON_SEMANAL.get(contexto.dia_semana, 1.0)

        # Aplicar factor estacional (por mes)
        factor_mes = FACTOR_ESTACIONAL.get(contexto.mes, 1.0)

        # Aplicar factor de clima
        factor_clima = 1.0
        if contexto.clima:
            factor_clima = contexto.clima.factor_temperatura() * contexto.clima.factor_lluvia()

        # Aplicar factores de contexto
        factor_eventos = contexto.factor_eventos
        factor_festivos = contexto.factor_festivos

        # Calcular tasa total
        tasa_total = (
            pacientes_por_minuto
            * factor_hora
            * factor_dia
            * factor_mes
            * factor_clima
            * factor_eventos
            * factor_festivos
        )

        # Generar tiempo usando distribución exponencial
        if tasa_total > 0:
            tiempo = random.expovariate(tasa_total)
        else:
            tiempo = 60.0  # Fallback

        return tiempo

    def generar_paciente_completo(
        self,
        paciente_id: int,
        hospital_id: str,
        tiempo_simulado: float,
    ) -> dict:
        """
        Genera un paciente completo con todos sus datos.

        Args:
            paciente_id: ID del paciente
            hospital_id: ID del hospital
            tiempo_simulado: Tiempo simulado actual

        Returns:
            Diccionario con todos los datos del paciente
        """
        # Generar contexto
        contexto = self.generar_contexto(tiempo_simulado)

        # Generar nivel de triaje
        nivel_triaje = self.generar_nivel_triaje(contexto)

        # Seleccionar patología
        nombre_patologia, patologia = self.seleccionar_patologia(nivel_triaje, contexto)

        # Generar edad
        edad = self.generar_edad(nivel_triaje, patologia)

        return {
            "id": paciente_id,
            "hospital_id": hospital_id,
            "nivel_triaje": nivel_triaje,
            "patologia": nombre_patologia,
            "edad": edad,
            "hora_llegada": tiempo_simulado,
            # Datos de contexto (para análisis)
            "contexto": {
                "temperatura": round(contexto.clima.temperatura, 1) if contexto.clima else None,
                "esta_lloviendo": contexto.clima.esta_lloviendo() if contexto.clima else False,
                "factor_eventos": round(contexto.factor_eventos, 2),
                "factor_festivos": round(contexto.factor_festivos, 2),
                "es_festivo": self.holidays_service.es_festivo(contexto.fecha),
                "es_fin_de_semana": self.holidays_service.es_fin_de_semana(contexto.fecha),
            },
        }


# Ejemplo de uso
if __name__ == "__main__":
    print("\n" + "═"*60)
    print("👨‍⚕️ PRUEBA DEL GENERADOR DE PACIENTES")
    print("═"*60 + "\n")

    # Crear servicios
    weather = WeatherService(api_key="")  # Modo simulado
    holidays = HolidaysService()
    events = EventsService()

    # Crear generador
    generador = GeneradorPacientes(
        weather_service=weather,
        holidays_service=holidays,
        events_service=events,
        seed=42,
    )

    # Generar contexto actual
    contexto = generador.generar_contexto(tiempo_simulado=0)
    print(f"📊 Contexto actual:")
    print(f"   - Hora: {contexto.hora}:00")
    print(f"   - Día: {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][contexto.dia_semana]}")
    print(f"   - Mes: {contexto.mes}")
    if contexto.clima:
        print(f"   - Temperatura: {contexto.clima.temperatura}°C")
        print(f"   - Lluvia: {'Sí' if contexto.clima.esta_lloviendo() else 'No'}")
    print(f"   - Factor eventos: {contexto.factor_eventos:.2f}x")
    print(f"   - Factor festivos: {contexto.factor_festivos:.2f}x")

    # Generar varios pacientes de ejemplo
    print(f"\n👥 Generando 5 pacientes de ejemplo:\n")

    for i in range(5):
        paciente = generador.generar_paciente_completo(
            paciente_id=i + 1,
            hospital_id="chuac",
            tiempo_simulado=i * 10,  # Cada 10 minutos
        )

        print(f"Paciente {paciente['id']}:")
        print(f"   - Edad: {paciente['edad']} años")
        print(f"   - Triaje: {paciente['nivel_triaje'].name} ({CONFIG_TRIAJE[paciente['nivel_triaje']].nombre})")
        print(f"   - Patología: {paciente['patologia']}")
        if paciente['contexto']['es_festivo']:
            print(f"   - ⚠️ Es festivo")
        print()

    print(f"✅ Generador funcionando correctamente")
