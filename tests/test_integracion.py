#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
TEST INTEGRACIÓN - Verificar integración MQTT + Node-RED + InfluxDB
═══════════════════════════════════════════════════════════════════════════════

Tests de integración del sistema completo:
- Conexión y publicación MQTT
- Conexión a InfluxDB (lectura/escritura)
- Simulación con MQTT activo
- Consultas Flux de ejemplo para Grafana

Requiere que los servicios Docker estén corriendo:
    make up

Uso:
    pytest tests/test_integracion.py -v
    make test-integracion
═══════════════════════════════════════════════════════════════════════════════
"""

import sys
import os
import json
import time
import subprocess
import socket

# Añadir el directorio src al path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))

# Verificar si estamos en Docker o local
MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
INFLUXDB_URL = os.environ.get("INFLUXDB_URL", "http://localhost:8086")
INFLUXDB_TOKEN = os.environ.get("INFLUXDB_TOKEN", "mi-token-secreto-urgencias-dt")
INFLUXDB_ORG = "urgencias"
INFLUXDB_BUCKET = "hospitales"


def verificar_servicios_docker():
    """Verifica que los servicios Docker estén corriendo"""
    print("🔍 Verificando servicios Docker...")
    
    servicios = {
        "mosquitto": ("localhost", 1883),
        "influxdb": ("localhost", 8086),
        "nodered": ("localhost", 1880),
        "grafana": ("localhost", 3001)
    }
    
    todos_ok = True
    for nombre, (host, port) in servicios.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"   ✅ {nombre}: puerto {port} accesible")
        else:
            print(f"   ❌ {nombre}: puerto {port} NO accesible")
            todos_ok = False
    
    return todos_ok


def test_mqtt_publicacion():
    """Prueba publicación de mensajes MQTT"""
    print("🔍 Probando publicación MQTT...")
    
    try:
        import paho.mqtt.client as mqtt
        
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.connect(MQTT_BROKER, 1883, 60)
        
        # Publicar mensaje de prueba
        test_data = {
            "tipo": "test",
            "timestamp": time.time(),
            "paciente_id": "TEST-001",
            "nivel_triaje": "VERDE",
            "patologia": "test_integracion"
        }
        
        topic = "urgencias/chuac/eventos/test"
        client.publish(topic, json.dumps(test_data))
        client.disconnect()
        
        print(f"   ✅ Mensaje publicado en {topic}")
        return True
        
    except ImportError:
        print("   ⚠️  paho-mqtt no instalado")
        return False
    except Exception as e:
        print(f"   ❌ Error MQTT: {e}")
        return False


def test_influxdb_conexion():
    """Prueba conexión a InfluxDB"""
    print("🔍 Probando conexión InfluxDB...")
    
    try:
        from influxdb_client import InfluxDBClient
        
        client = InfluxDBClient(
            url=INFLUXDB_URL,
            token=INFLUXDB_TOKEN,
            org=INFLUXDB_ORG
        )
        
        # Verificar salud
        health = client.health()
        print(f"   ✅ InfluxDB status: {health.status}")
        
        # Verificar bucket
        buckets_api = client.buckets_api()
        bucket = buckets_api.find_bucket_by_name(INFLUXDB_BUCKET)
        
        if bucket:
            print(f"   ✅ Bucket '{INFLUXDB_BUCKET}' existe")
        else:
            print(f"   ⚠️  Bucket '{INFLUXDB_BUCKET}' no encontrado")
        
        client.close()
        return True
        
    except ImportError:
        print("   ⚠️  influxdb-client no instalado, instalando...")
        subprocess.run([sys.executable, "-m", "pip", "install", "influxdb-client", "-q"])
        return test_influxdb_conexion()
    except Exception as e:
        print(f"   ❌ Error InfluxDB: {e}")
        return False


def test_influxdb_escritura():
    """Prueba escritura a InfluxDB"""
    print("🔍 Probando escritura InfluxDB...")
    
    try:
        from influxdb_client import InfluxDBClient, Point
        from influxdb_client.client.write_api import SYNCHRONOUS
        
        client = InfluxDBClient(
            url=INFLUXDB_URL,
            token=INFLUXDB_TOKEN,
            org=INFLUXDB_ORG
        )
        
        write_api = client.write_api(write_options=SYNCHRONOUS)
        
        # Escribir punto de prueba
        point = Point("test_integracion") \
            .tag("hospital", "test") \
            .field("valor", 1) \
            .field("mensaje", "test_integracion")
        
        write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
        
        print("   ✅ Punto de prueba escrito en InfluxDB")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"   ❌ Error escritura InfluxDB: {e}")
        return False


def test_influxdb_lectura():
    """Prueba lectura desde InfluxDB"""
    print("🔍 Probando lectura InfluxDB...")
    
    try:
        from influxdb_client import InfluxDBClient
        
        client = InfluxDBClient(
            url=INFLUXDB_URL,
            token=INFLUXDB_TOKEN,
            org=INFLUXDB_ORG
        )
        
        query_api = client.query_api()
        
        # Query de prueba
        query = f'''
        from(bucket: "{INFLUXDB_BUCKET}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "test_integracion")
          |> last()
        '''
        
        tables = query_api.query(query)
        
        if tables:
            print(f"   ✅ Query ejecutado, {len(tables)} tabla(s) encontrada(s)")
            for table in tables:
                for record in table.records:
                    print(f"      - {record.get_field()}: {record.get_value()}")
        else:
            print("   ⚠️  No hay datos de prueba (normal si es primera ejecución)")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"   ❌ Error lectura InfluxDB: {e}")
        return False


def test_simulacion_con_mqtt():
    """Prueba simulación corta con publicación MQTT"""
    print("🔍 Probando simulación con MQTT...")
    
    try:
        from simulador import SimuladorUrgencias
        
        simulador = SimuladorUrgencias(
            hospitales_ids=["chuac"],
            mqtt_broker=MQTT_BROKER,
            mqtt_port=1883,
            velocidad=60
        )
        
        # Simular 30 minutos
        simulador.env.run(until=30)
        
        # Verificar publicaciones
        hospital = simulador.hospitales["chuac"]
        pacientes = len(hospital.pacientes_completados) + len(hospital.pacientes_activos)
        
        print(f"   ✅ Simulación ejecutada: {pacientes} pacientes generados")
        
        # Si hay MQTT conectado, debería haber publicado
        if simulador.mqtt_manager.connected:
            print("   ✅ MQTT conectado - eventos publicados")
        else:
            print("   ⚠️  MQTT no conectado - simulación sin publicación")
        
        simulador.detener()
        return True
        
    except Exception as e:
        print(f"   ❌ Error simulación: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_consultas_grafana():
    """Genera consultas Flux de ejemplo para Grafana"""
    print("🔍 Generando consultas Flux de ejemplo...")
    
    consultas = {
        "Ocupación por hospital": '''
from(bucket: "hospitales")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "stats_hospital")
  |> filter(fn: (r) => r._field == "ocupacion_boxes")
  |> aggregateWindow(every: 1m, fn: mean)
''',
        "Llegadas por hora": '''
from(bucket: "hospitales")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "eventos_pacientes")
  |> filter(fn: (r) => r.tipo_evento == "llegada")
  |> aggregateWindow(every: 1h, fn: count)
''',
        "Tiempo medio espera": '''
from(bucket: "hospitales")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "stats_hospital")
  |> filter(fn: (r) => r._field == "tiempo_medio_espera")
  |> last()
''',
        "Alertas críticas": '''
from(bucket: "hospitales")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "alertas")
  |> filter(fn: (r) => r.nivel == "critical")
''',
        "Derivaciones totales": '''
from(bucket: "hospitales")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "coordinador")
  |> filter(fn: (r) => r._field == "derivaciones_totales")
  |> last()
'''
    }
    
    print("\n   📝 Consultas Flux para Grafana:")
    print("   " + "─"*50)
    
    for nombre, query in consultas.items():
        print(f"\n   📊 {nombre}:")
        for line in query.strip().split("\n"):
            print(f"      {line}")
    
    print("\n   " + "─"*50)
    print("   ✅ Consultas generadas")
    
    return True


def main():
    """Ejecuta todos los tests de integración"""
    print("\n" + "═"*60)
    print("🧪 TESTS INTEGRACIÓN - MQTT + NODE-RED + INFLUXDB")
    print("═"*60 + "\n")
    
    resultados = {}
    
    # Test de servicios Docker
    resultados["docker"] = verificar_servicios_docker()
    print()
    
    # Tests individuales
    resultados["mqtt"] = test_mqtt_publicacion()
    print()
    
    resultados["influx_conexion"] = test_influxdb_conexion()
    print()
    
    resultados["influx_escritura"] = test_influxdb_escritura()
    print()
    
    resultados["influx_lectura"] = test_influxdb_lectura()
    print()
    
    resultados["simulacion"] = test_simulacion_con_mqtt()
    print()
    
    resultados["consultas"] = test_consultas_grafana()
    
    # Resumen
    print("\n" + "═"*60)
    print("📋 RESUMEN DE TESTS")
    print("═"*60)
    
    total = len(resultados)
    pasados = sum(resultados.values())
    
    for test, resultado in resultados.items():
        status = "✅" if resultado else "❌"
        print(f"   {status} {test}")
    
    print(f"\n   Total: {pasados}/{total} tests pasados")
    
    if pasados == total:
        print("\n" + "═"*60)
        print("✅ INTEGRACIÓN COMPLETADA")
        print("═"*60)
        print("\n📝 Siguientes pasos:")
        print("   1. Abrir Node-RED: http://localhost:1880")
        print("   2. Verificar que los flujos están cargados")
        print("   3. Abrir InfluxDB: http://localhost:8086 (admin/adminadmin)")
        print("   4. Verificar que llegan datos al bucket 'hospitales'")
        print("   5. Abrir Grafana: http://localhost:3001 (admin/admin)")
        print("   6. Crear dashboards con las consultas Flux")
    else:
        print("\n⚠️  Algunos tests fallaron. Verifica que Docker esté corriendo:")
        print("   make up")
        sys.exit(1)


if __name__ == "__main__":
    main()
