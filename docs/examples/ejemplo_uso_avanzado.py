"""
═══════════════════════════════════════════════════════════════════════════════
EJEMPLO DE USO AVANZADO - Generador de Pacientes Realista
═══════════════════════════════════════════════════════════════════════════════
Demuestra cómo usar el nuevo generador de pacientes con datos realistas.
"""

import sys
sys.path.insert(0, 'src')

from infrastructure.external_services import WeatherService, HolidaysService, EventsService
from domain.services.generador_pacientes import GeneradorPacientes
from config.hospital_config import CONFIG_TRIAJE
from datetime import datetime


def ejemplo_basico():
    """Ejemplo básico de generación de pacientes"""
    print("\n" + "═"*70)
    print("EJEMPLO 1: Generación Básica de Pacientes")
    print("═"*70 + "\n")

    # Crear servicios (modo simulado - sin API keys)
    weather = WeatherService(api_key="")
    holidays = HolidaysService()
    events = EventsService()

    # Crear generador
    generador = GeneradorPacientes(
        weather_service=weather,
        holidays_service=holidays,
        events_service=events,
        seed=42  # Para reproducibilidad
    )

    # Generar 10 pacientes
    print("Generando 10 pacientes de ejemplo:\n")

    for i in range(10):
        paciente = generador.generar_paciente_completo(
            paciente_id=i + 1,
            hospital_id="chuac",
            tiempo_simulado=i * 15  # Cada 15 minutos
        )

        config = CONFIG_TRIAJE[paciente['nivel_triaje']]

        print(f"Paciente #{paciente['id']:02d}")
        print(f"  👤 Edad: {paciente['edad']} años")
        print(f"  🚨 Triaje: {paciente['nivel_triaje'].name} - {config.nombre}")
        print(f"  🏥 Patología: {paciente['patologia']}")

        ctx = paciente['contexto']
        if ctx['temperatura']:
            emoji_temp = "🌡️" if ctx['temperatura'] > 20 else "❄️"
            print(f"  {emoji_temp} Temperatura: {ctx['temperatura']}°C")

        if ctx['esta_lloviendo']:
            print(f"  🌧️ Lloviendo")

        if ctx['es_festivo']:
            print(f"  🎉 ¡Es festivo!")

        if ctx['factor_eventos'] > 1.1:
            print(f"  🎪 Evento activo (factor {ctx['factor_eventos']:.1f}x)")

        print()


def ejemplo_correlaciones():
    """Ejemplo mostrando correlaciones edad-patología"""
    print("\n" + "═"*70)
    print("EJEMPLO 2: Correlaciones Edad-Patología")
    print("═"*70 + "\n")

    weather = WeatherService(api_key="")
    holidays = HolidaysService()
    events = EventsService()

    generador = GeneradorPacientes(
        weather_service=weather,
        holidays_service=holidays,
        events_service=events,
        seed=42
    )

    # Generar muchos pacientes para ver distribución
    print("Generando 100 pacientes para análisis estadístico...\n")

    patologias_edades = {}

    for i in range(100):
        paciente = generador.generar_paciente_completo(
            paciente_id=i + 1,
            hospital_id="chuac",
            tiempo_simulado=i * 5
        )

        pat = paciente['patologia']
        edad = paciente['edad']

        if pat not in patologias_edades:
            patologias_edades[pat] = []

        patologias_edades[pat].append(edad)

    # Mostrar estadísticas
    print("📊 Estadísticas de Edad por Patología (top 10):\n")

    patologias_ordenadas = sorted(
        patologias_edades.items(),
        key=lambda x: len(x[1]),
        reverse=True
    )[:10]

    for patologia, edades in patologias_ordenadas:
        edad_media = sum(edades) / len(edades)
        edad_min = min(edades)
        edad_max = max(edades)

        print(f"{patologia}")
        print(f"  • Casos: {len(edades)}")
        print(f"  • Edad media: {edad_media:.1f} años")
        print(f"  • Rango: {edad_min}-{edad_max} años")
        print()


def ejemplo_clima_influencia():
    """Ejemplo mostrando cómo el clima afecta las patologías"""
    print("\n" + "═"*70)
    print("EJEMPLO 3: Influencia del Clima en Patologías")
    print("═"*70 + "\n")

    weather = WeatherService(api_key="")
    generador = GeneradorPacientes(weather_service=weather, seed=42)

    # Obtener clima actual
    clima = weather.obtener_clima()

    print(f"🌦️ Condiciones actuales:")
    print(f"  • Temperatura: {clima.temperatura}°C")
    print(f"  • Sensación térmica: {clima.sensacion_termica}°C")
    print(f"  • Descripción: {clima.descripcion}")
    print(f"  • Humedad: {clima.humedad}%")
    print(f"  • Lluvia (1h): {clima.lluvia_1h} mm")
    print(f"\n📈 Factores de impacto:")
    print(f"  • Factor temperatura: {clima.factor_temperatura():.2f}x")
    print(f"  • Factor lluvia: {clima.factor_lluvia():.2f}x")
    print(f"  • Es frío: {'Sí' if clima.es_frio() else 'No'}")
    print(f"  • Está lloviendo: {'Sí' if clima.esta_lloviendo() else 'No'}")

    # Generar pacientes y contar patologías respiratorias
    print(f"\n🏥 Generando 50 pacientes con este clima...\n")

    patologias_respiratorias = [
        "Faringitis", "Disnea severa", "Crisis asmática",
        "Parada respiratoria"
    ]

    conteo = {"respiratorias": 0, "otras": 0}
    ejemplos = []

    for i in range(50):
        paciente = generador.generar_paciente_completo(
            paciente_id=i + 1,
            hospital_id="chuac",
            tiempo_simulado=i * 3
        )

        if paciente['patologia'] in patologias_respiratorias:
            conteo["respiratorias"] += 1
            if len(ejemplos) < 3:
                ejemplos.append(paciente)
        else:
            conteo["otras"] += 1

    print(f"📊 Resultados:")
    print(f"  • Patologías respiratorias: {conteo['respiratorias']} ({conteo['respiratorias']/50*100:.1f}%)")
    print(f"  • Otras patologías: {conteo['otras']} ({conteo['otras']/50*100:.1f}%)")

    if clima.es_frio():
        print(f"\n❄️ Con frío se espera más patologías respiratorias (factor ~1.3-1.5x)")

    if ejemplos:
        print(f"\n💡 Ejemplos de casos respiratorios:")
        for p in ejemplos:
            print(f"  • {p['patologia']} - Paciente de {p['edad']} años")


def ejemplo_festivos_eventos():
    """Ejemplo mostrando festivos y eventos"""
    print("\n" + "═"*70)
    print("EJEMPLO 4: Festivos y Eventos Especiales")
    print("═"*70 + "\n")

    from datetime import date, timedelta

    holidays = HolidaysService()
    events = EventsService()

    # Mostrar próximos festivos
    print("📅 Próximos festivos (30 días):\n")

    for festivo in holidays.obtener_proximos_festivos(30):
        puente = " [PUENTE]" if holidays.es_puente(festivo.fecha) else ""
        print(f"  {festivo.fecha.strftime('%d/%m/%Y')} - {festivo.nombre}{puente}")
        print(f"    Factor demanda: {festivo.factor_demanda:.2f}x")

    # Mostrar próximos eventos
    print(f"\n🎉 Próximos eventos (30 días):\n")

    for evento in events.obtener_proximos_eventos(30):
        print(f"  {evento.fecha.strftime('%d/%m/%Y')} - {evento.nombre}")
        print(f"    Ubicación: {evento.ubicacion}")
        print(f"    Asistentes esperados: {evento.asistentes_esperados:,}")
        print(f"    Factor demanda: {evento.factor_demanda:.2f}x")
        print()


def ejemplo_san_juan():
    """Ejemplo especial: Noche de San Juan en A Coruña"""
    print("\n" + "═"*70)
    print("EJEMPLO 5: Simulación Noche de San Juan 🔥")
    print("═"*70 + "\n")

    from datetime import date
    import random

    # Simular noche de San Juan (23 de junio)
    print("📍 Contexto: Noche de San Juan, 23 de junio, 23:00h")
    print("   🏖️ Playas de A Coruña llenas de hogueras")
    print("   🎉 100,000 personas esperadas")
    print("   🍺 Muchas celebraciones\n")

    weather = WeatherService(api_key="")
    holidays = HolidaysService()
    events = EventsService()

    generador = GeneradorPacientes(
        weather_service=weather,
        holidays_service=holidays,
        events_service=events,
        seed=None  # Aleatorio
    )

    # El factor de San Juan es 1.8x demanda + 1.6x traumas + 1.8x alcohol
    print("📊 Generando 20 pacientes durante San Juan:\n")

    conteo_tipos = {}
    edades = []

    for i in range(20):
        paciente = generador.generar_paciente_completo(
            paciente_id=i + 1,
            hospital_id="chuac",
            tiempo_simulado=i * 3
        )

        pat = paciente['patologia']
        if pat not in conteo_tipos:
            conteo_tipos[pat] = 0
        conteo_tipos[pat] += 1

        edades.append(paciente['edad'])

        # Mostrar algunos casos interesantes
        if i < 5:
            print(f"Paciente #{i+1}: {pat} - {paciente['edad']} años - "
                  f"Triaje {paciente['nivel_triaje'].name}")

    print(f"\n📈 Resumen:")
    print(f"  • Edad media: {sum(edades)/len(edades):.1f} años")
    print(f"  • Edad más joven: {min(edades)} años")
    print(f"  • Edad más mayor: {max(edades)} años")
    print(f"\n🏥 Patologías más frecuentes:")

    for pat, count in sorted(conteo_tipos.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  • {pat}: {count} casos")

    print(f"\n💡 Nota: En San Juan se esperan más:")
    print(f"  • Quemaduras (hogueras)")
    print(f"  • Intoxicaciones etílicas")
    print(f"  • Traumas menores")
    print(f"  • Pacientes jóvenes (20-35 años)")


def main():
    """Ejecutar todos los ejemplos"""
    print("\n" + "═"*70)
    print("🏥 EJEMPLOS DE USO AVANZADO - GENERADOR DE PACIENTES REALISTA")
    print("═"*70)

    ejemplo_basico()
    input("\nPresiona ENTER para continuar...")

    ejemplo_correlaciones()
    input("\nPresiona ENTER para continuar...")

    ejemplo_clima_influencia()
    input("\nPresiona ENTER para continuar...")

    ejemplo_festivos_eventos()
    input("\nPresiona ENTER para continuar...")

    ejemplo_san_juan()

    print("\n" + "═"*70)
    print("✅ Ejemplos completados")
    print("═"*70 + "\n")


if __name__ == "__main__":
    main()
