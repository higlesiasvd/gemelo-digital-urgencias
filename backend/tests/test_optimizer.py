"""
Test unitario del optimizador de personal SERGAS
"""

import sys
import os

# Añadir path del backend
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_path)

# Importar directamente el módulo (sin pasar por api/__init__.py)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "staff_optimizer", 
    os.path.join(backend_path, "api", "staff_optimizer.py")
)
staff_optimizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(staff_optimizer)

# Extraer lo que necesitamos
optimizar_distribucion = staff_optimizer.optimizar_distribucion
ConsultaEstado = staff_optimizer.ConsultaEstado
MedicoSergas = staff_optimizer.MedicoSergas
PULP_AVAILABLE = staff_optimizer.PULP_AVAILABLE


def test_pulp_available():
    """Verifica que PuLP está instalado"""
    assert PULP_AVAILABLE, "PuLP no está disponible"


def test_optimizacion_basica():
    """Test básico del algoritmo de optimización"""
    
    # Crear 3 consultas de prueba
    consultas = [
        ConsultaEstado(numero=1, medicos_base=1, medicos_sergas=0, cola_actual=5, tiempo_medio_espera=15.0),
        ConsultaEstado(numero=2, medicos_base=1, medicos_sergas=0, cola_actual=3, tiempo_medio_espera=9.0),
        ConsultaEstado(numero=3, medicos_base=1, medicos_sergas=0, cola_actual=0, tiempo_medio_espera=0.0),
    ]
    
    # Crear 2 médicos disponibles
    medicos = [
        MedicoSergas(medico_id="1", nombre="Dr. Test 1", especialidad="Urgencias", asignado_a_consulta=None),
        MedicoSergas(medico_id="2", nombre="Dr. Test 2", especialidad="Urgencias", asignado_a_consulta=None),
    ]
    
    # Ejecutar optimización
    resultado = optimizar_distribucion(consultas, medicos)
    
    # Verificar resultado
    assert resultado.exito, f"Optimización falló: {resultado.mensaje}"
    assert len(resultado.recomendaciones) > 0, "No se generaron recomendaciones"
    
    # La consulta 1 debería recibir médico (tiene más cola)
    consultas_asignadas = [r.consulta_destino for r in resultado.recomendaciones]
    assert 1 in consultas_asignadas, "Consulta 1 (mayor cola) debería recibir médico"
    
    # La consulta 3 no debería recibir médico (sin cola)
    assert 3 not in consultas_asignadas, "Consulta 3 (sin cola) no debería recibir médico"
    
    print(f"✓ Recomendaciones generadas: {len(resultado.recomendaciones)}")
    print(f"✓ Mejora estimada: {resultado.mejora_estimada}%")
    for r in resultado.recomendaciones:
        print(f"  - {r.medico_nombre} → Consulta {r.consulta_destino} ({r.impacto_estimado})")


def test_sin_medicos_disponibles():
    """Test cuando no hay médicos disponibles"""
    
    consultas = [
        ConsultaEstado(numero=1, medicos_base=1, medicos_sergas=0, cola_actual=5, tiempo_medio_espera=15.0),
    ]
    
    # Sin médicos disponibles
    medicos = []
    
    resultado = optimizar_distribucion(consultas, medicos)
    
    assert resultado.exito, "Debería ser exitoso aunque sin cambios"
    assert len(resultado.recomendaciones) == 0, "No debería haber recomendaciones"
    
    print("✓ Test sin médicos: OK")


def test_sin_colas():
    """Test cuando no hay colas en ninguna consulta"""
    
    consultas = [
        ConsultaEstado(numero=1, medicos_base=1, medicos_sergas=0, cola_actual=0, tiempo_medio_espera=0.0),
        ConsultaEstado(numero=2, medicos_base=1, medicos_sergas=0, cola_actual=0, tiempo_medio_espera=0.0),
    ]
    
    medicos = [
        MedicoSergas(medico_id="1", nombre="Dr. Test", especialidad="Urgencias", asignado_a_consulta=None),
    ]
    
    resultado = optimizar_distribucion(consultas, medicos)
    
    assert resultado.exito, "Debería ser exitoso"
    assert len(resultado.recomendaciones) == 0, "No debería recomendar asignaciones sin colas"
    
    print("✓ Test sin colas: OK")


def test_limite_medicos_consulta():
    """Test del límite de 4 médicos por consulta"""
    
    # Consulta ya con 3 médicos SERGAS (total 4)
    consultas = [
        ConsultaEstado(numero=1, medicos_base=1, medicos_sergas=3, cola_actual=10, tiempo_medio_espera=25.0),
    ]
    
    medicos = [
        MedicoSergas(medico_id="1", nombre="Dr. Test", especialidad="Urgencias", asignado_a_consulta=None),
    ]
    
    resultado = optimizar_distribucion(consultas, medicos)
    
    assert resultado.exito, "Debería ser exitoso"
    # No debería asignar más médicos a consulta 1 (ya tiene 4)
    consultas_asignadas = [r.consulta_destino for r in resultado.recomendaciones]
    assert 1 not in consultas_asignadas, "No debería asignar a consulta con 4 médicos"
    
    print("✓ Test límite médicos: OK")


if __name__ == "__main__":
    print("=" * 60)
    print("TESTS DEL OPTIMIZADOR DE PERSONAL SERGAS")
    print("=" * 60)
    
    try:
        test_pulp_available()
        print("✓ PuLP disponible")
        
        test_optimizacion_basica()
        print("✓ Optimización básica")
        
        test_sin_medicos_disponibles()
        
        test_sin_colas()
        
        test_limite_medicos_consulta()
        
        print("=" * 60)
        print("TODOS LOS TESTS PASARON ✓")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"✗ TEST FALLÓ: {e}")
        exit(1)
    except Exception as e:
        print(f"✗ ERROR: {e}")
        exit(1)
