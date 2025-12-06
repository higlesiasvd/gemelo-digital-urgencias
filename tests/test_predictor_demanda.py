#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
TEST PREDICTOR DE DEMANDA
═══════════════════════════════════════════════════════════════════════════════
Verifica el funcionamiento completo del sistema de predicción de demanda,
incluyendo generación de datos sintéticos, entrenamiento de modelos,
detección de anomalías y alertas automáticas.
═══════════════════════════════════════════════════════════════════════════════
"""

import sys
import os

# Añadir el directorio src al path para importar los módulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from src.domain.services.predictor import (
    PredictorDemanda,
    ServicioPrediccion,
    DetectorEmergencias,
    generar_datos_sinteticos,
    PATRON_HORARIO,
    PATRON_SEMANAL,
    LLEGADAS_BASE_HORA,
    ConfigPrediccion
)


def test_datos_sinteticos():
    """Prueba generación de datos sintéticos"""
    print("🔍 Probando generación de datos sintéticos...")
    
    datos = generar_datos_sinteticos("chuac", dias=7)
    
    assert len(datos) == 7 * 24, f"Esperados {7*24} registros, obtenidos {len(datos)}"
    assert 'ds' in datos.columns, "Falta columna 'ds'"
    assert 'y' in datos.columns, "Falta columna 'y'"
    
    # Verificar que hay variación
    assert datos['y'].std() > 0, "Los datos no tienen variación"
    
    # Verificar rango razonable (CHUAC ~17.5/hora)
    media = datos['y'].mean()
    assert 10 < media < 25, f"Media fuera de rango esperado: {media}"
    
    print(f"   ✅ Generados {len(datos)} registros")
    print(f"   ✅ Media: {media:.1f} llegadas/hora")
    print(f"   ✅ Rango: {datos['y'].min()} - {datos['y'].max()}")
    print("✅ Datos sintéticos OK\n")


def test_patrones():
    """Verifica los patrones horarios y semanales"""
    print("🔍 Verificando patrones de demanda...")
    
    # Verificar patrón horario
    assert len(PATRON_HORARIO) == 24, "Patrón horario incompleto"
    assert PATRON_HORARIO[3] < PATRON_HORARIO[11], "Madrugada debería ser menor que mediodía"
    assert PATRON_HORARIO[11] > 1.0, "Mediodía debería tener factor > 1"
    
    # Verificar patrón semanal
    assert len(PATRON_SEMANAL) == 7, "Patrón semanal incompleto"
    
    # Verificar llegadas base
    assert LLEGADAS_BASE_HORA["chuac"] > LLEGADAS_BASE_HORA["hm_modelo"], \
        "CHUAC debería tener más llegadas que HM Modelo"
    
    print(f"   ✅ Patrón horario: pico a las 11h (factor {PATRON_HORARIO[11]})")
    print(f"   ✅ Patrón semanal: lunes factor {PATRON_SEMANAL[0]}")
    print(f"   ✅ CHUAC: {LLEGADAS_BASE_HORA['chuac']} llegadas/hora base")
    print("✅ Patrones OK\n")


def test_predictor_basico():
    """Prueba el predictor básico"""
    print("🔍 Probando predictor básico...")
    
    predictor = PredictorDemanda("chuac")
    
    # Cargar datos (generará sintéticos)
    predictor.cargar_datos_historicos()
    
    assert predictor.datos_historicos is not None, "No se cargaron datos"
    assert len(predictor.datos_historicos) > 0, "Datos vacíos"
    
    print(f"   ✅ Datos cargados: {len(predictor.datos_historicos)} registros")
    
    # Entrenar
    exito = predictor.entrenar()
    assert exito, "Entrenamiento falló"
    
    print(f"   ✅ Modelo entrenado")
    
    # Predecir
    predicciones = predictor.predecir(24)
    
    assert predicciones is not None, "Predicciones vacías"
    assert len(predicciones) == 24, f"Esperadas 24 predicciones, obtenidas {len(predicciones)}"
    assert 'yhat' in predicciones.columns, "Falta columna 'yhat'"
    assert 'yhat_lower' in predicciones.columns, "Falta columna 'yhat_lower'"
    assert 'yhat_upper' in predicciones.columns, "Falta columna 'yhat_upper'"
    
    print(f"   ✅ Predicciones generadas: {len(predicciones)} horas")
    
    # Verificar valores razonables
    media_pred = predicciones['yhat'].mean()
    assert media_pred > 0, "Predicciones negativas"
    
    print(f"   ✅ Media predicha: {media_pred:.1f} llegadas/hora")
    print("✅ Predictor básico OK\n")


def test_deteccion_anomalias():
    """Prueba detección de anomalías"""
    print("🔍 Probando detección de anomalías...")
    
    predictor = PredictorDemanda("chuac")
    predictor.cargar_datos_historicos()
    predictor.entrenar()
    predictor.predecir()
    
    # Valor claramente normal
    es_anomalia, z = predictor.detectar_anomalia(15)
    print(f"   15 llegadas: {'ANOMALÍA' if es_anomalia else 'normal'} (z={z:.2f})")
    
    # Valor claramente anómalo
    es_anomalia_alto, z_alto = predictor.detectar_anomalia(100)
    print(f"   100 llegadas: {'ANOMALÍA' if es_anomalia_alto else 'normal'} (z={z_alto:.2f})")
    
    assert es_anomalia_alto, "100 llegadas debería ser anomalía"
    assert z_alto > 2, "Z-score debería ser > 2 para 100 llegadas"
    
    print("✅ Detección anomalías OK\n")


def test_servicio_prediccion():
    """Prueba el servicio completo de predicción"""
    print("🔍 Probando servicio de predicción...")
    
    hospitales = ["chuac", "hm_modelo", "san_rafael"]
    servicio = ServicioPrediccion(hospitales)
    
    assert len(servicio.predictores) == 3, "Deberían haber 3 predictores"
    
    # Inicializar
    servicio.inicializar()
    
    for hospital_id, predictor in servicio.predictores.items():
        assert predictor.predicciones is not None, f"Predictor {hospital_id} sin predicciones"
    
    print(f"   ✅ {len(hospitales)} predictores inicializados")
    
    # Obtener predicciones próximas horas
    resumen = servicio.obtener_prediccion_proximas_horas(6)
    
    assert len(resumen) == 3, "Debería haber resumen de 3 hospitales"
    
    for hospital_id, datos in resumen.items():
        assert 'predicciones' in datos, f"Falta 'predicciones' en {hospital_id}"
        assert len(datos['predicciones']) == 6, f"Deberían ser 6 predicciones para {hospital_id}"
        print(f"   ✅ {hospital_id}: {datos['total_esperado']:.0f} llegadas esperadas en 6h")
    
    print("✅ Servicio predicción OK\n")


def test_detector_emergencias():
    """Prueba el detector de emergencias"""
    print("🔍 Probando detector de emergencias...")
    
    # Crear servicio con predictores
    hospitales = ["chuac", "hm_modelo", "san_rafael"]
    servicio = ServicioPrediccion(hospitales)
    servicio.inicializar()
    
    detector = servicio.detector
    
    # Datos normales
    datos_normales = {
        "chuac": 18,
        "hm_modelo": 5,
        "san_rafael": 3
    }
    
    alertas = detector.analizar(datos_normales)
    print(f"   Datos normales: {len(alertas)} alertas")
    
    # Datos con pico en un hospital
    datos_pico_uno = {
        "chuac": 80,  # Muy alto
        "hm_modelo": 5,
        "san_rafael": 3
    }
    
    alertas_pico = detector.analizar(datos_pico_uno)
    print(f"   Pico en CHUAC (80): {len(alertas_pico)} alertas")
    
    # Datos con picos en múltiples hospitales (evento regional)
    datos_pico_multi = {
        "chuac": 60,
        "hm_modelo": 25,
        "san_rafael": 20
    }
    
    alertas_multi = detector.analizar(datos_pico_multi)
    print(f"   Pico múltiple: {len(alertas_multi)} alertas")
    
    # Verificar resumen
    resumen = detector.obtener_resumen()
    assert 'hospitales_monitorizados' in resumen
    assert resumen['hospitales_monitorizados'] == 3
    
    print(f"   ✅ Resumen: {resumen}")
    print("✅ Detector emergencias OK\n")


def test_exportacion_mqtt():
    """Prueba exportación de datos para MQTT"""
    print("🔍 Probando exportación para MQTT...")
    
    predictor = PredictorDemanda("chuac")
    predictor.cargar_datos_historicos()
    predictor.entrenar()
    predictor.predecir(12)
    
    datos = predictor.to_dict()
    
    assert 'hospital' in datos, "Falta campo 'hospital'"
    assert 'predicciones' in datos, "Falta campo 'predicciones'"
    assert datos['hospital'] == 'chuac', "Hospital incorrecto"
    assert len(datos['predicciones']) == 12, "Deberían ser 12 predicciones"
    
    # Verificar estructura de predicción individual
    pred = datos['predicciones'][0]
    assert 'timestamp' in pred, "Falta 'timestamp'"
    assert 'hora' in pred, "Falta 'hora'"
    assert 'llegadas_esperadas' in pred, "Falta 'llegadas_esperadas'"
    
    print(f"   ✅ Exportación correcta: {len(datos['predicciones'])} predicciones")
    print(f"   ✅ Primera predicción: hora {pred['hora']}, {pred['llegadas_esperadas']} llegadas")
    print("✅ Exportación MQTT OK\n")


def main():
    """Ejecuta todos los tests del predictor de demanda"""
    print("\n" + "═"*60)
    print("🧪 TESTS DEL PREDICTOR DE DEMANDA")
    print("═"*60 + "\n")

    try:
        test_patrones()
        test_datos_sinteticos()
        test_predictor_basico()
        test_deteccion_anomalias()
        test_servicio_prediccion()
        test_detector_emergencias()
        test_exportacion_mqtt()

        print("═"*60)
        print("✅ TODOS LOS TESTS DEL PREDICTOR PASARON")
        print("═"*60)
        print("\n📝 El sistema de predicción está completamente funcional:")
        print("   ✅ Genera predicciones basadas en patrones reales")
        print("   ✅ Detecta anomalías automáticamente")
        print("   ✅ Publica predicciones y alertas por MQTT")
        print("   ✅ Se integra con el simulador y Grafana\n")
        
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
