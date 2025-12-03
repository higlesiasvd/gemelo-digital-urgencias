#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
TEST COORDINADOR - Verificar coordinación multi-hospital y emergencias
═══════════════════════════════════════════════════════════════════════════════

Pruebas del sistema de coordinación entre hospitales:
- Derivaciones automáticas entre hospitales
- Gestión de emergencias (accidentes, brotes, eventos masivos)
- Alertas y comunicación entre hospitales

Uso:
    pytest tests/test_coordinador.py -v
    make test-coordinador
═══════════════════════════════════════════════════════════════════════════════
"""

import sys
import os

# Añadir el directorio src al path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))

from simulador import SimuladorUrgencias, HospitalUrgencias, HOSPITALES
from coordinador import CoordinadorCentral, TipoEmergencia, EMERGENCIAS_CONFIG
import simpy


def test_tres_hospitales():
    """Prueba simulación con 3 hospitales"""
    print("🔍 Probando 3 hospitales...")
    
    simulador = SimuladorUrgencias(
        hospitales_ids=["chuac", "hm_modelo", "san_rafael"],
        mqtt_broker="inexistente",
        mqtt_port=9999,
        velocidad=60
    )
    
    assert len(simulador.hospitales) == 3, "Deberían haber 3 hospitales"
    assert simulador.coordinador is not None, "Debería existir coordinador"
    
    print("   ✅ 3 hospitales creados")
    print("   ✅ Coordinador central activo")
    
    # Simular 2 horas
    simulador.env.run(until=120)
    
    total_pacientes = sum(
        len(h.pacientes_completados) + len(h.pacientes_activos)
        for h in simulador.hospitales.values()
    )
    
    print(f"   ✅ Pacientes generados: {total_pacientes}")
    
    simulador.detener()
    print("✅ 3 hospitales OK\n")


def test_coordinador_derivaciones():
    """Prueba la lógica de derivaciones"""
    print("🔍 Probando lógica de derivaciones...")
    
    env = simpy.Environment()
    hospitales = {}
    
    for h_id in ["chuac", "hm_modelo"]:
        config = HOSPITALES[h_id]
        hospital = HospitalUrgencias(env, config, mqtt_client=None)
        hospitales[h_id] = hospital
    
    coordinador = CoordinadorCentral(env, hospitales, mqtt_client=None)
    
    # Simular saturación del CHUAC
    hospitales["chuac"].stats.nivel_saturacion = 0.85
    hospitales["hm_modelo"].stats.nivel_saturacion = 0.30
    
    # Nivel 2 debería derivarse
    destino = coordinador.decidir_hospital_destino("chuac", 2)
    assert destino == "hm_modelo", f"Debería derivar a hm_modelo, no a {destino}"
    print("   ✅ Derivación nivel 2: chuac → hm_modelo")
    
    # Nivel 1 (crítico) NO debería derivarse
    destino_critico = coordinador.decidir_hospital_destino("chuac", 1)
    assert destino_critico is None, "Nivel 1 no debería derivarse"
    print("   ✅ Nivel 1 (crítico) NO se deriva")
    
    # Si no hay saturación, no derivar
    hospitales["chuac"].stats.nivel_saturacion = 0.50
    destino_bajo = coordinador.decidir_hospital_destino("chuac", 3)
    assert destino_bajo is None, "Sin saturación no debería derivar"
    print("   ✅ Sin saturación no deriva")
    
    print("✅ Derivaciones OK\n")


def test_emergencias():
    """Prueba activación de emergencias"""
    print("🔍 Probando sistema de emergencias...")
    
    env = simpy.Environment()
    hospitales = {}
    
    for h_id in ["chuac", "hm_modelo", "san_rafael"]:
        config = HOSPITALES[h_id]
        hospital = HospitalUrgencias(env, config, mqtt_client=None)
        hospitales[h_id] = hospital
    
    coordinador = CoordinadorCentral(env, hospitales, mqtt_client=None)
    
    # Verificar configuración de emergencias
    assert len(EMERGENCIAS_CONFIG) == 3, "Deberían haber 3 tipos de emergencia"
    print("   ✅ 3 tipos de emergencia configurados")
    
    # Activar emergencia
    coordinador.activar_emergencia(TipoEmergencia.ACCIDENTE_MULTIPLE)
    
    assert coordinador.emergencia_activa, "Emergencia debería estar activa"
    assert coordinador.tipo_emergencia == TipoEmergencia.ACCIDENTE_MULTIPLE
    print("   ✅ Emergencia activada correctamente")
    
    # Verificar que todos los hospitales tienen emergencia activa
    for h in hospitales.values():
        assert h.emergencia_activa, f"{h.config.id} debería tener emergencia activa"
    print("   ✅ Emergencia propagada a todos los hospitales")
    
    # Verificar alertas emitidas
    alertas = [a for a in coordinador.alertas_emitidas if a.tipo == "emergencia_activada"]
    assert len(alertas) >= 1, "Debería haber alerta de emergencia"
    print(f"   ✅ Alertas emitidas: {len(coordinador.alertas_emitidas)}")
    
    print("✅ Emergencias OK\n")


def test_simulacion_completa_corta():
    """Prueba simulación completa de 4 horas con 3 hospitales"""
    print("🔍 Probando simulación completa (4 horas simuladas)...")
    
    simulador = SimuladorUrgencias(
        hospitales_ids=["chuac", "hm_modelo", "san_rafael"],
        mqtt_broker="inexistente",
        mqtt_port=9999,
        velocidad=60,
        emergencias_aleatorias=False
    )
    
    # Simular 4 horas
    simulador.env.run(until=240)
    
    # Estadísticas
    stats = {}
    for h_id, hospital in simulador.hospitales.items():
        completados = len(hospital.pacientes_completados)
        activos = len(hospital.pacientes_activos)
        stats[h_id] = {"completados": completados, "activos": activos}
        print(f"   📊 {h_id.upper()}: {completados} completados, {activos} activos")
    
    # Verificar coordinador
    if simulador.coordinador:
        resumen = simulador.coordinador.obtener_resumen()
        print(f"   📊 Derivaciones: {resumen['derivaciones_totales']}")
        print(f"   📊 Minutos ahorrados: {resumen['minutos_ahorrados']:.0f}")
    
    total = sum(s["completados"] + s["activos"] for s in stats.values())
    assert total > 0, "Debería haber pacientes"
    
    simulador.detener()
    print("✅ Simulación completa OK\n")


def main():
    """Ejecuta todos los tests del coordinador"""
    print("\n" + "═"*60)
    print("🧪 TESTS COORDINADOR Y 3 HOSPITALES")
    print("═"*60 + "\n")
    
    try:
        test_tres_hospitales()
        test_coordinador_derivaciones()
        test_emergencias()
        test_simulacion_completa_corta()
        
        print("═"*60)
        print("✅ TODOS LOS TESTS DEL COORDINADOR PASARON")
        print("═"*60)
        print("\n📝 Para ejecutar con los 3 hospitales:")
        print("   make run-simulador")
        print("   (con HOSPITALES='chuac hm_modelo san_rafael' en docker-compose)\n")
        
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
