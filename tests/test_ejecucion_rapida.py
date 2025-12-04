#!/usr/bin/env python3
"""
Test de ejecución rápida para verificar que el simulador funciona end-to-end
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from simulador import SimuladorUrgencias

def test_simulacion_rapida():
    """Ejecuta una simulación corta para verificar que todo funciona"""
    print("\n" + "═"*70)
    print("🚀 TEST DE EJECUCIÓN RÁPIDA")
    print("═"*70 + "\n")

    print("Iniciando simulación de 1 hora (sin MQTT, sin predicción)...")

    # Crear simulador sin MQTT y sin predicción para test rápido
    simulador = SimuladorUrgencias(
        hospitales_ids=["chuac", "hm_modelo"],
        mqtt_broker="localhost",
        mqtt_port=1883,
        velocidad=60.0,
        emergencias_aleatorias=False,
        prediccion_activa=False  # Desactivar predicción para test rápido
    )

    try:
        # Ejecutar 1 hora simulada lo más rápido posible
        simulador.ejecutar(duracion_horas=1.0, tiempo_real=False)

        print("\n" + "═"*70)
        print("✅ SIMULACIÓN COMPLETADA EXITOSAMENTE")
        print("═"*70)

        # Verificar que se generaron pacientes
        total_pacientes = sum(
            len(h.pacientes_completados)
            for h in simulador.hospitales.values()
        )

        print(f"\n📊 Pacientes procesados: {total_pacientes}")

        for h_id, hospital in simulador.hospitales.items():
            completados = len(hospital.pacientes_completados)
            activos = len(hospital.pacientes_activos)
            print(f"   {h_id.upper()}: {completados} completados, {activos} en proceso")

        assert total_pacientes > 0, "No se generaron pacientes"

        print("\n✅ TEST DE EJECUCIÓN EXITOSO")
        return True

    except Exception as e:
        print(f"\n❌ ERROR EN LA SIMULACIÓN: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        simulador.detener()


if __name__ == "__main__":
    success = test_simulacion_rapida()
    exit(0 if success else 1)
