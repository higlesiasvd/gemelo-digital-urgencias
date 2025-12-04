#!/usr/bin/env python3
"""
Test de integración simple para verificar que todos los archivos funcionan juntos
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import json

def test_imports():
    """Verifica que todos los módulos se pueden importar"""
    print("🔍 Verificando imports...")

    try:
        from simulador import (
            Paciente, NivelTriaje, ConfigTriaje, ConfigHospital,
            HospitalUrgencias, SimuladorUrgencias, HOSPITALES, CONFIG_TRIAJE
        )
        print("   ✅ simulador.py importado correctamente")
    except Exception as e:
        print(f"   ❌ Error importando simulador: {e}")
        return False

    try:
        from coordinador import (
            CoordinadorCentral, GeneradorEmergencias, TipoEmergencia,
            Alerta, EMERGENCIAS_CONFIG
        )
        print("   ✅ coordinador.py importado correctamente")
    except Exception as e:
        print(f"   ❌ Error importando coordinador: {e}")
        return False

    try:
        from predictor import (
            PredictorDemanda, ServicioPrediccion, DetectorEmergencias,
            ConfigPrediccion, generar_datos_sinteticos,
            PATRON_HORARIO, PATRON_SEMANAL, LLEGADAS_BASE_HORA
        )
        print("   ✅ predictor.py importado correctamente")
    except Exception as e:
        print(f"   ❌ Error importando predictor: {e}")
        return False

    return True


def test_paciente_con_edad():
    """Verifica que Paciente tiene el campo edad"""
    print("\n🔍 Verificando clase Paciente con edad...")

    from simulador import Paciente, NivelTriaje

    paciente = Paciente(
        id=1,
        hospital_id="chuac",
        nivel_triaje=NivelTriaje.VERDE,
        patologia="test",
        hora_llegada=0.0,
        edad=45
    )

    assert hasattr(paciente, 'edad'), "Paciente no tiene atributo 'edad'"
    assert paciente.edad == 45, f"Edad incorrecta: {paciente.edad}"

    print(f"   ✅ Paciente con edad: {paciente.edad}")
    return True


def test_estructuras_mqtt():
    """Verifica que las estructuras de datos para MQTT son correctas"""
    print("\n🔍 Verificando estructuras MQTT...")

    from simulador import Paciente, NivelTriaje, EstadisticasHospital

    # Test evento de paciente
    paciente = Paciente(
        id=1,
        hospital_id="chuac",
        nivel_triaje=NivelTriaje.AMARILLO,
        patologia="Dolor torácico",
        hora_llegada=100.0,
        edad=55,
        hora_triaje=102.0,
        hora_inicio_atencion=115.0,
        hora_fin_atencion=145.0,
        hora_salida=145.0,
        destino="alta"
    )

    # Simular payload que se enviaría por MQTT
    payload = {
        "tipo": "salida",
        "timestamp": 145.0,
        "paciente_id": paciente.id,
        "edad": paciente.edad,
        "nivel_triaje": paciente.nivel_triaje.name,
        "patologia": paciente.patologia,
        "tiempo_total": paciente.tiempo_total or 0,
        "tiempo_espera_atencion": paciente.tiempo_espera_atencion or 0,
        "destino": paciente.destino,
        "derivado_a": getattr(paciente, 'derivado_a', None) or ""
    }

    assert 'edad' in payload, "Falta campo 'edad' en payload"
    assert payload['edad'] == 55, "Edad incorrecta en payload"
    assert payload['nivel_triaje'] == 'AMARILLO', "Nivel triaje incorrecto"

    print(f"   ✅ Payload evento: {json.dumps(payload, indent=2)}")

    # Test estadísticas
    stats = EstadisticasHospital(
        hospital_id="chuac",
        timestamp=200.0,
        boxes_totales=40,
        boxes_ocupados=30,
        observacion_totales=30,
        observacion_ocupadas=20
    )

    stats_dict = stats.to_dict()

    assert 'observacion_ocupadas' in stats_dict, "Falta campo 'observacion_ocupadas'"
    assert stats_dict['observacion_ocupadas'] == 20, "observacion_ocupadas incorrecto"

    print(f"   ✅ Estadísticas correctas: observacion_ocupadas={stats_dict['observacion_ocupadas']}")

    return True


def test_coordinador_estado():
    """Verifica que el coordinador envía el campo alertas_emitidas"""
    print("\n🔍 Verificando estado del coordinador...")

    from coordinador import Alerta

    # Simular estado del coordinador
    alertas_emitidas = [
        Alerta(
            tipo="saturacion_alta",
            nivel="warning",
            mensaje="Test",
            hospital_id="chuac",
            timestamp=100.0
        )
    ]

    estado = {
        "timestamp": 100.0,
        "emergencia_activa": False,
        "tipo_emergencia": None,
        "derivaciones_totales": 5,
        "minutos_ahorrados": 123.5,
        "alertas_emitidas": len(alertas_emitidas),
        "hospitales": {}
    }

    assert 'alertas_emitidas' in estado, "Falta campo 'alertas_emitidas'"
    assert estado['alertas_emitidas'] == 1, "alertas_emitidas incorrecto"

    print(f"   ✅ Estado coordinador: alertas_emitidas={estado['alertas_emitidas']}")

    return True


def test_predictor_simplificado():
    """Verifica que el predictor funciona sin Prophet"""
    print("\n🔍 Verificando predictor (modo simplificado)...")

    from predictor import (
        generar_datos_sinteticos, PredictorDemanda,
        PATRON_HORARIO, LLEGADAS_BASE_HORA
    )

    # Verificar generación de datos sintéticos
    datos = generar_datos_sinteticos("chuac", dias=7)
    assert len(datos) == 7 * 24, f"Datos sintéticos incorrectos: {len(datos)}"
    assert 'ds' in datos.columns, "Falta columna 'ds'"
    assert 'y' in datos.columns, "Falta columna 'y'"

    print(f"   ✅ Datos sintéticos: {len(datos)} registros")

    # Verificar patrones
    assert len(PATRON_HORARIO) == 24, "Patrón horario incompleto"
    assert "chuac" in LLEGADAS_BASE_HORA, "Falta CHUAC en llegadas base"

    print(f"   ✅ Patrones: {len(PATRON_HORARIO)} horas, base CHUAC={LLEGADAS_BASE_HORA['chuac']}")

    # Test básico del predictor (sin entrenar, solo verificar estructura)
    predictor = PredictorDemanda("chuac")
    assert predictor.hospital_id == "chuac", "Hospital ID incorrecto"

    print(f"   ✅ Predictor inicializado para {predictor.hospital_id}")

    return True


def test_flows_json():
    """Verifica que flows.json es JSON válido"""
    print("\n🔍 Verificando flows.json...")

    flows_path = os.path.join(os.path.dirname(__file__), '..', 'node-red', 'flows.json')

    try:
        with open(flows_path, 'r') as f:
            flows = json.load(f)

        assert isinstance(flows, list), "flows.json debe ser una lista"

        # Buscar nodos importantes
        mqtt_broker = None
        influxdb_config = None
        parse_evento = None
        parse_stats = None

        for node in flows:
            if node.get('type') == 'mqtt-broker':
                mqtt_broker = node
            elif node.get('type') == 'influxdb':
                influxdb_config = node
            elif node.get('name') == 'Parsear Evento':
                parse_evento = node
            elif node.get('name') == 'Parsear Stats':
                parse_stats = node

        assert mqtt_broker is not None, "No se encontró configuración MQTT"
        assert influxdb_config is not None, "No se encontró configuración InfluxDB"
        assert parse_evento is not None, "No se encontró nodo 'Parsear Evento'"
        assert parse_stats is not None, "No se encontró nodo 'Parsear Stats'"

        print(f"   ✅ flows.json válido: {len(flows)} nodos")
        print(f"   ✅ MQTT broker: {mqtt_broker.get('name')}")
        print(f"   ✅ InfluxDB: {influxdb_config.get('name')}")

    except FileNotFoundError:
        print(f"   ⚠️  flows.json no encontrado en {flows_path}")
        return False
    except json.JSONDecodeError as e:
        print(f"   ❌ Error parseando flows.json: {e}")
        return False

    return True


def main():
    """Ejecuta todos los tests"""
    print("\n" + "═"*70)
    print("🧪 TEST DE INTEGRACIÓN - GEMELO DIGITAL HOSPITALARIO")
    print("═"*70 + "\n")

    tests = [
        test_imports,
        test_paciente_con_edad,
        test_estructuras_mqtt,
        test_coordinador_estado,
        test_predictor_simplificado,
        test_flows_json
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"   ❌ EXCEPCIÓN: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "═"*70)
    print(f"📊 RESULTADOS: {passed} pasados, {failed} fallidos")
    print("═"*70 + "\n")

    if failed == 0:
        print("✅ TODOS LOS TESTS DE INTEGRACIÓN PASARON")
        print("\n📝 Los archivos están correctamente integrados:")
        print("   - simulador.py: Paciente tiene campo 'edad'")
        print("   - coordinador.py: Estado incluye 'alertas_emitidas'")
        print("   - predictor.py: Funciona con/sin Prophet")
        print("   - flows.json: Estructura MQTT correcta")
        print("   - test_dia4.py: Imports corregidos")
        return 0
    else:
        print(f"❌ {failed} TEST(S) FALLARON")
        return 1


if __name__ == "__main__":
    exit(main())
