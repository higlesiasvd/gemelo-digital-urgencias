#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
TEST RÁPIDO - Verificar que la simulación funciona
═══════════════════════════════════════════════════════════════════════════════

Ejecuta una simulación corta sin MQTT para verificar que todo está OK.

Uso:
    python src/test_simulacion.py
"""

import sys
import os

# Añadir el directorio src al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simulador import (
    SimuladorUrgencias, HospitalUrgencias, HOSPITALES, 
    NivelTriaje, CONFIG_TRIAJE, PATOLOGIAS
)
import simpy


def test_configuracion():
    """Verifica que la configuración está correcta"""
    print("🔍 Verificando configuración...")
    
    # Verificar hospitales
    assert len(HOSPITALES) == 3, "Deberían haber 3 hospitales"
    for hospital_id, config in HOSPITALES.items():
        assert config.num_boxes > 0, f"{hospital_id} sin boxes"
        assert config.num_camas_observacion > 0, f"{hospital_id} sin observación"
        print(f"   ✅ {hospital_id}: {config.num_boxes} boxes, {config.num_camas_observacion} obs")
    
    # Verificar niveles de triaje
    assert len(CONFIG_TRIAJE) == 5, "Deberían haber 5 niveles de triaje"
    prob_total = sum(c.probabilidad for c in CONFIG_TRIAJE.values())
    assert 0.99 < prob_total < 1.01, f"Probabilidades no suman 1: {prob_total}"
    print(f"   ✅ Triaje: 5 niveles, probabilidades OK")
    
    # Verificar patologías
    for nivel in NivelTriaje:
        assert nivel in PATOLOGIAS, f"Faltan patologías para nivel {nivel}"
        assert len(PATOLOGIAS[nivel]) > 0, f"Sin patologías para nivel {nivel}"
    print(f"   ✅ Patologías definidas para todos los niveles")
    
    print("✅ Configuración OK\n")


def test_hospital_basico():
    """Prueba un hospital sin MQTT"""
    print("🔍 Probando hospital básico (sin MQTT)...")
    
    env = simpy.Environment()
    config = HOSPITALES["chuac"]
    hospital = HospitalUrgencias(env, config, mqtt_client=None)
    
    # Iniciar procesos
    env.process(hospital.proceso_llegada_pacientes())
    env.process(hospital.proceso_actualizacion_estadisticas())
    
    # Simular 2 horas (120 minutos)
    print(f"   Simulando 2 horas en {config.nombre}...")
    env.run(until=120)
    
    # Verificar resultados
    pacientes_total = len(hospital.pacientes_activos) + len(hospital.pacientes_completados)
    print(f"   📊 Pacientes generados: {pacientes_total}")
    print(f"   📊 Pacientes completados: {len(hospital.pacientes_completados)}")
    print(f"   📊 Pacientes activos: {len(hospital.pacientes_activos)}")
    print(f"   📊 En cola espera: {len(hospital.cola_espera_atencion)}")
    print(f"   📊 Boxes ocupados: {hospital.boxes.count}/{config.num_boxes}")
    print(f"   📊 Observación ocupada: {hospital.observacion.count}/{config.num_camas_observacion}")
    
    # Estadísticas de pacientes completados
    if hospital.pacientes_completados:
        tiempos = [p.tiempo_total for p in hospital.pacientes_completados if p.tiempo_total]
        if tiempos:
            print(f"   📊 Tiempo medio total: {sum(tiempos)/len(tiempos):.1f} min")
        
        # Distribución por nivel
        por_nivel = {}
        for p in hospital.pacientes_completados:
            nivel = p.nivel_triaje.name
            por_nivel[nivel] = por_nivel.get(nivel, 0) + 1
        print(f"   📊 Por nivel: {por_nivel}")
    
    assert pacientes_total > 0, "No se generaron pacientes"
    print("✅ Hospital básico OK\n")


def test_simulacion_rapida():
    """Prueba la simulación completa en modo rápido"""
    print("🔍 Probando simulación rápida (1 hora, sin MQTT)...")
    
    # Crear simulador sin MQTT (broker inexistente)
    simulador = SimuladorUrgencias(
        hospitales_ids=["chuac"],
        mqtt_broker="inexistente",
        mqtt_port=9999,
        velocidad=60
    )
    
    # Ejecutar simulación rápida
    simulador.env.run(until=60)  # 1 hora simulada
    
    hospital = simulador.hospitales["chuac"]
    print(f"   📊 Pacientes: {len(hospital.pacientes_completados)} completados")
    
    simulador.detener()
    print("✅ Simulación rápida OK\n")


def test_distribucion_llegadas():
    """Verifica que la distribución de llegadas es razonable"""
    print("🔍 Verificando distribución de llegadas...")
    
    env = simpy.Environment()
    config = HOSPITALES["chuac"]
    hospital = HospitalUrgencias(env, config, mqtt_client=None)
    
    # Recoger tiempos entre llegadas
    tiempos = []
    for _ in range(1000):
        tiempos.append(hospital.calcular_tiempo_entre_llegadas())
    
    media = sum(tiempos) / len(tiempos)
    esperado = (24 * 60) / config.pacientes_dia_base  # minutos entre llegadas
    
    print(f"   📊 Tiempo medio entre llegadas: {media:.2f} min")
    print(f"   📊 Esperado (aprox): {esperado:.2f} min")
    print(f"   📊 Pacientes/hora estimados: {60/media:.1f}")
    
    # Tolerancia del 50% por la variación horaria
    assert esperado * 0.3 < media < esperado * 2.0, "Distribución de llegadas fuera de rango"
    print("✅ Distribución de llegadas OK\n")


def main():
    """Ejecuta todos los tests"""
    print("\n" + "═"*60)
    print("🧪 TESTS DEL SIMULADOR DE URGENCIAS")
    print("═"*60 + "\n")
    
    try:
        test_configuracion()
        test_hospital_basico()
        test_simulacion_rapida()
        test_distribucion_llegadas()
        
        print("═"*60)
        print("✅ TODOS LOS TESTS PASARON CORRECTAMENTE")
        print("═"*60)
        print("\n📝 Siguiente paso: Levantar Docker y ejecutar simulación completa")
        print("   docker-compose up -d")
        print("   python src/simulador.py --hospitales chuac\n")
        
    except AssertionError as e:
        print(f"\n❌ TEST FALLIDO: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
