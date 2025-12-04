"""Script de prueba del generador de pacientes"""

import sys
sys.path.insert(0, 'src')

from config.hospital_config import CONFIG_TRIAJE
from infrastructure.external_services import WeatherService, HolidaysService, EventsService
from domain.services.generador_pacientes import GeneradorPacientes

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
