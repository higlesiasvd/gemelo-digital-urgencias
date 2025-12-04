"""
═══════════════════════════════════════════════════════════════════════════════
PREDICTOR DE DEMANDA - Sistema de Predicción para Urgencias
═══════════════════════════════════════════════════════════════════════════════
Usa Prophet para predecir llegadas de pacientes y detectar anomalías.

Características:
- Predicción de llegadas por hora/día
- Detección de picos anómalos
- Ajuste automático por día de semana y hora
- Integración con InfluxDB para datos históricos

Día 4 del proyecto.
═══════════════════════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import json
import warnings
warnings.filterwarnings('ignore')

# Prophet puede tardar en importar
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("⚠️  Prophet no disponible. Usando predicción simplificada.")


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ConfigPrediccion:
    """Configuración del predictor"""
    horizonte_horas: int = 24  # Predecir próximas 24 horas
    intervalo_minutos: int = 60  # Predicción cada hora
    umbral_anomalia: float = 2.0  # Desviaciones estándar para anomalía
    min_datos_historicos: int = 168  # Mínimo 1 semana de datos (horas)
    actualizar_cada_minutos: int = 60  # Reentrenar modelo cada hora


# ═══════════════════════════════════════════════════════════════════════════════
# PATRONES DE DEMANDA BASE (datos calibrados España)
# ═══════════════════════════════════════════════════════════════════════════════

# Patrón horario típico (factor multiplicador sobre media)
PATRON_HORARIO = {
    0: 0.5, 1: 0.4, 2: 0.3, 3: 0.3, 4: 0.3, 5: 0.4,
    6: 0.6, 7: 0.8, 8: 1.0, 9: 1.3, 10: 1.5, 11: 1.6,
    12: 1.5, 13: 1.3, 14: 1.1, 15: 1.2, 16: 1.4, 17: 1.5,
    18: 1.4, 19: 1.3, 20: 1.2, 21: 1.0, 22: 0.8, 23: 0.6
}

# Patrón semanal (lunes=0, domingo=6)
PATRON_SEMANAL = {
    0: 1.1,  # Lunes - acumulado fin de semana
    1: 1.0,  # Martes
    2: 1.0,  # Miércoles
    3: 1.0,  # Jueves
    4: 1.1,  # Viernes
    5: 0.9,  # Sábado
    6: 0.9   # Domingo
}

# Llegadas base por hora según hospital
LLEGADAS_BASE_HORA = {
    "chuac": 17.5,      # 420/24
    "hm_modelo": 5.0,   # 120/24
    "san_rafael": 3.3   # 80/24
}


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADOR DE DATOS SINTÉTICOS (para entrenar sin histórico real)
# ═══════════════════════════════════════════════════════════════════════════════

def generar_datos_sinteticos(hospital_id: str, dias: int = 30) -> pd.DataFrame:
    """
    Genera datos históricos sintéticos realistas para entrenar el modelo.
    
    Args:
        hospital_id: ID del hospital
        dias: Número de días de histórico a generar
    
    Returns:
        DataFrame con columnas 'ds' (timestamp) y 'y' (llegadas)
    """
    base = LLEGADAS_BASE_HORA.get(hospital_id, 10)
    
    datos = []
    fecha_inicio = datetime.now() - timedelta(days=dias)
    
    for dia in range(dias):
        fecha = fecha_inicio + timedelta(days=dia)
        dia_semana = fecha.weekday()
        
        for hora in range(24):
            timestamp = fecha.replace(hour=hora, minute=0, second=0, microsecond=0)
            
            # Calcular llegadas esperadas
            factor_hora = PATRON_HORARIO[hora]
            factor_dia = PATRON_SEMANAL[dia_semana]
            
            media = base * factor_hora * factor_dia
            
            # Añadir ruido realista (Poisson)
            llegadas = np.random.poisson(media)
            
            # Ocasionalmente añadir picos (simular eventos)
            if np.random.random() < 0.02:  # 2% probabilidad de pico
                llegadas += np.random.randint(5, 15)
            
            datos.append({
                'ds': timestamp,
                'y': llegadas
            })
    
    return pd.DataFrame(datos)


# ═══════════════════════════════════════════════════════════════════════════════
# PREDICTOR CON PROPHET
# ═══════════════════════════════════════════════════════════════════════════════

class PredictorDemanda:
    """
    Predictor de demanda de urgencias usando Prophet.
    """
    
    def __init__(self, hospital_id: str, config: ConfigPrediccion = None):
        self.hospital_id = hospital_id
        self.config = config or ConfigPrediccion()
        self.modelo: Optional[Prophet] = None
        self.ultimo_entrenamiento: Optional[datetime] = None
        self.datos_historicos: Optional[pd.DataFrame] = None
        self.predicciones: Optional[pd.DataFrame] = None
        
        # Estadísticas para detección de anomalías
        self.media_historica: float = 0
        self.std_historica: float = 1
        
        print(f"📈 Predictor inicializado para {hospital_id}")
    
    def cargar_datos_historicos(self, datos: pd.DataFrame = None):
        """
        Carga datos históricos para entrenar el modelo.
        Si no se proporcionan, genera datos sintéticos.
        """
        if datos is not None and len(datos) >= self.config.min_datos_historicos:
            self.datos_historicos = datos.copy()
            print(f"   ✅ Cargados {len(datos)} registros históricos")
        else:
            print(f"   ⚠️  Datos insuficientes, generando sintéticos...")
            self.datos_historicos = generar_datos_sinteticos(self.hospital_id, dias=30)
            print(f"   ✅ Generados {len(self.datos_historicos)} registros sintéticos")
        
        # Calcular estadísticas
        self.media_historica = self.datos_historicos['y'].mean()
        self.std_historica = self.datos_historicos['y'].std()
    
    def entrenar(self) -> bool:
        """
        Entrena el modelo Prophet con los datos históricos.
        
        Returns:
            True si el entrenamiento fue exitoso
        """
        if self.datos_historicos is None or len(self.datos_historicos) == 0:
            print(f"   ❌ No hay datos para entrenar")
            return False
        
        if not PROPHET_AVAILABLE:
            print(f"   ⚠️  Prophet no disponible, usando predicción simplificada")
            self.ultimo_entrenamiento = datetime.now()
            return True
        
        try:
            # Configurar Prophet
            self.modelo = Prophet(
                yearly_seasonality=False,  # No tenemos un año de datos
                weekly_seasonality=True,   # Patrón semanal
                daily_seasonality=True,    # Patrón diario
                seasonality_mode='multiplicative',
                interval_width=0.95,       # Intervalo de confianza 95%
                changepoint_prior_scale=0.05  # Sensibilidad a cambios
            )
            
            # Entrenar
            self.modelo.fit(self.datos_historicos)
            self.ultimo_entrenamiento = datetime.now()
            
            print(f"   ✅ Modelo entrenado correctamente")
            return True
            
        except Exception as e:
            print(f"   ❌ Error entrenando modelo: {e}")
            return False
    
    def predecir(self, horas: int = None) -> pd.DataFrame:
        """
        Genera predicciones para las próximas horas.
        
        Args:
            horas: Número de horas a predecir (default: config.horizonte_horas)
        
        Returns:
            DataFrame con predicciones
        """
        horas = horas or self.config.horizonte_horas
        
        # Crear dataframe de fechas futuras
        ahora = datetime.now().replace(minute=0, second=0, microsecond=0)
        fechas_futuras = pd.DataFrame({
            'ds': [ahora + timedelta(hours=h) for h in range(horas)]
        })
        
        if PROPHET_AVAILABLE and self.modelo is not None:
            # Usar Prophet
            self.predicciones = self.modelo.predict(fechas_futuras)
            self.predicciones['hospital'] = self.hospital_id
        else:
            # Predicción simplificada basada en patrones
            self.predicciones = self._predecir_simplificado(fechas_futuras)
        
        return self.predicciones
    
    def _predecir_simplificado(self, fechas: pd.DataFrame) -> pd.DataFrame:
        """Predicción sin Prophet, basada en patrones conocidos"""
        base = LLEGADAS_BASE_HORA.get(self.hospital_id, 10)
        
        predicciones = []
        for _, row in fechas.iterrows():
            ts = row['ds']
            hora = ts.hour
            dia_semana = ts.weekday()
            
            factor_hora = PATRON_HORARIO[hora]
            factor_dia = PATRON_SEMANAL[dia_semana]
            
            yhat = base * factor_hora * factor_dia
            
            # Intervalos de confianza aproximados
            yhat_lower = max(0, yhat * 0.7)
            yhat_upper = yhat * 1.3
            
            predicciones.append({
                'ds': ts,
                'yhat': yhat,
                'yhat_lower': yhat_lower,
                'yhat_upper': yhat_upper,
                'hospital': self.hospital_id
            })
        
        return pd.DataFrame(predicciones)
    
    def detectar_anomalia(self, llegadas_reales: float, timestamp: datetime = None) -> Tuple[bool, float]:
        """
        Detecta si las llegadas reales son anómalas comparadas con la predicción.
        
        Args:
            llegadas_reales: Número de llegadas observadas
            timestamp: Momento de la observación (default: ahora)
        
        Returns:
            Tuple (es_anomalia, z_score)
        """
        timestamp = timestamp or datetime.now()
        
        # Obtener predicción para ese momento
        if self.predicciones is not None:
            pred = self.predicciones[
                self.predicciones['ds'].dt.hour == timestamp.hour
            ]
            if len(pred) > 0:
                esperado = pred.iloc[0]['yhat']
                std = (pred.iloc[0]['yhat_upper'] - pred.iloc[0]['yhat_lower']) / 4
            else:
                esperado = self.media_historica
                std = self.std_historica
        else:
            esperado = self.media_historica
            std = self.std_historica
        
        # Evitar división por cero
        std = max(std, 0.1)
        
        # Calcular z-score
        z_score = (llegadas_reales - esperado) / std
        es_anomalia = abs(z_score) > self.config.umbral_anomalia
        
        return es_anomalia, z_score
    
    def obtener_prediccion_hora(self, hora: int) -> Dict:
        """
        Obtiene la predicción para una hora específica.
        
        Args:
            hora: Hora del día (0-23)
        
        Returns:
            Dict con predicción y intervalos
        """
        if self.predicciones is None:
            self.predecir()
        
        pred = self.predicciones[
            self.predicciones['ds'].dt.hour == hora
        ]
        
        if len(pred) > 0:
            row = pred.iloc[0]
            return {
                'hora': hora,
                'prediccion': round(row['yhat'], 1),
                'minimo': round(row['yhat_lower'], 1),
                'maximo': round(row['yhat_upper'], 1),
                'hospital': self.hospital_id
            }
        
        return {'hora': hora, 'prediccion': 0, 'minimo': 0, 'maximo': 0}
    
    def to_dict(self) -> Dict:
        """Exporta predicciones como diccionario para MQTT/JSON"""
        if self.predicciones is None:
            return {}
        
        return {
            'hospital': self.hospital_id,
            'generado': datetime.now().isoformat(),
            'horizonte_horas': self.config.horizonte_horas,
            'predicciones': [
                {
                    'timestamp': row['ds'].isoformat(),
                    'hora': row['ds'].hour,
                    'llegadas_esperadas': round(row['yhat'], 1),
                    'minimo': round(row['yhat_lower'], 1),
                    'maximo': round(row['yhat_upper'], 1)
                }
                for _, row in self.predicciones.iterrows()
            ]
        }


# ═══════════════════════════════════════════════════════════════════════════════
# DETECTOR DE EMERGENCIAS AUTOMÁTICO
# ═══════════════════════════════════════════════════════════════════════════════

class DetectorEmergencias:
    """
    Detecta situaciones de emergencia basándose en patrones anómalos.
    """
    
    def __init__(self, predictores: Dict[str, PredictorDemanda]):
        self.predictores = predictores
        self.alertas_activas: List[Dict] = []
        self.historial_anomalias: List[Dict] = []
        
        # Umbrales
        self.umbral_pico_unico = 2.5  # z-score para un solo hospital
        self.umbral_pico_multiple = 2.0  # z-score si múltiples hospitales
        self.ventana_confirmacion = 2  # Horas consecutivas para confirmar
    
    def analizar(self, datos_actuales: Dict[str, float]) -> List[Dict]:
        """
        Analiza datos actuales de todos los hospitales.
        
        Args:
            datos_actuales: Dict {hospital_id: llegadas_ultima_hora}
        
        Returns:
            Lista de alertas detectadas
        """
        alertas = []
        anomalias_detectadas = []
        
        for hospital_id, llegadas in datos_actuales.items():
            if hospital_id not in self.predictores:
                continue
            
            predictor = self.predictores[hospital_id]
            es_anomalia, z_score = predictor.detectar_anomalia(llegadas)
            
            if es_anomalia:
                anomalias_detectadas.append({
                    'hospital': hospital_id,
                    'llegadas': llegadas,
                    'z_score': z_score,
                    'timestamp': datetime.now()
                })
        
        # Analizar anomalías
        if len(anomalias_detectadas) >= 2:
            # Múltiples hospitales con picos = posible evento regional
            alertas.append({
                'tipo': 'evento_regional',
                'nivel': 'critical',
                'mensaje': f"Pico de demanda detectado en {len(anomalias_detectadas)} hospitales",
                'hospitales': [a['hospital'] for a in anomalias_detectadas],
                'timestamp': datetime.now().isoformat()
            })
        elif len(anomalias_detectadas) == 1:
            a = anomalias_detectadas[0]
            if a['z_score'] > self.umbral_pico_unico:
                alertas.append({
                    'tipo': 'pico_demanda',
                    'nivel': 'warning',
                    'mensaje': f"Pico inusual en {a['hospital']}: {a['llegadas']:.0f} llegadas (esperado: ~{a['llegadas']/a['z_score']:.0f})",
                    'hospital': a['hospital'],
                    'z_score': round(a['z_score'], 2),
                    'timestamp': datetime.now().isoformat()
                })
        
        # Guardar historial
        self.historial_anomalias.extend(anomalias_detectadas)
        if len(self.historial_anomalias) > 1000:
            self.historial_anomalias = self.historial_anomalias[-500:]
        
        return alertas
    
    def obtener_resumen(self) -> Dict:
        """Resumen del detector"""
        return {
            'hospitales_monitorizados': len(self.predictores),
            'anomalias_ultimas_24h': sum(
                1 for a in self.historial_anomalias
                if (datetime.now() - a['timestamp']).total_seconds() < 86400
            ),
            'alertas_activas': len(self.alertas_activas)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SERVICIO DE PREDICCIÓN (para integrar con el simulador)
# ═══════════════════════════════════════════════════════════════════════════════

class ServicioPrediccion:
    """
    Servicio que gestiona predicciones para todos los hospitales.
    Puede publicar predicciones por MQTT.
    """
    
    def __init__(self, hospitales: List[str], mqtt_client=None):
        self.hospitales = hospitales
        self.mqtt_client = mqtt_client
        self.predictores: Dict[str, PredictorDemanda] = {}
        self.detector = None
        
        # Inicializar predictores
        for hospital_id in hospitales:
            self.predictores[hospital_id] = PredictorDemanda(hospital_id)
        
        # Inicializar detector
        self.detector = DetectorEmergencias(self.predictores)
        
        print(f"🔮 Servicio de predicción inicializado para {len(hospitales)} hospitales")
    
    def inicializar(self, datos_por_hospital: Dict[str, pd.DataFrame] = None):
        """
        Inicializa todos los predictores con datos históricos.
        
        Args:
            datos_por_hospital: Dict con DataFrames de histórico por hospital
        """
        for hospital_id, predictor in self.predictores.items():
            datos = datos_por_hospital.get(hospital_id) if datos_por_hospital else None
            predictor.cargar_datos_historicos(datos)
            predictor.entrenar()
            predictor.predecir()
        
        print(f"   ✅ Todos los predictores inicializados")
    
    def actualizar_predicciones(self):
        """Actualiza predicciones de todos los hospitales"""
        for predictor in self.predictores.values():
            predictor.predecir()
        
        self._publicar_predicciones()
    
    def analizar_situacion(self, datos_actuales: Dict[str, float]) -> List[Dict]:
        """
        Analiza la situación actual y detecta anomalías.
        
        Args:
            datos_actuales: {hospital_id: llegadas_ultima_hora}
        
        Returns:
            Lista de alertas
        """
        alertas = self.detector.analizar(datos_actuales)
        
        # Publicar alertas por MQTT
        for alerta in alertas:
            self._publicar_alerta(alerta)
        
        return alertas
    
    def _publicar_predicciones(self):
        """Publica predicciones por MQTT"""
        if not self.mqtt_client:
            return
        
        for hospital_id, predictor in self.predictores.items():
            topic = f"urgencias/{hospital_id}/prediccion"
            payload = json.dumps(predictor.to_dict())
            self.mqtt_client.publish(topic, payload)
    
    def _publicar_alerta(self, alerta: Dict):
        """Publica alerta por MQTT"""
        if not self.mqtt_client:
            return
        
        topic = "urgencias/prediccion/alertas"
        self.mqtt_client.publish(topic, json.dumps(alerta))
    
    def obtener_prediccion_proximas_horas(self, horas: int = 6) -> Dict:
        """
        Obtiene predicción resumida para las próximas horas.
        
        Returns:
            Dict con predicciones por hospital
        """
        resultado = {}
        
        for hospital_id, predictor in self.predictores.items():
            if predictor.predicciones is not None:
                proximas = predictor.predicciones.head(horas)
                resultado[hospital_id] = {
                    'predicciones': [
                        {
                            'hora': row['ds'].strftime('%H:%M'),
                            'llegadas': round(row['yhat'], 1)
                        }
                        for _, row in proximas.iterrows()
                    ],
                    'total_esperado': round(proximas['yhat'].sum(), 0)
                }
        
        return resultado


# ═══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE UTILIDAD
# ═══════════════════════════════════════════════════════════════════════════════

def cargar_datos_influxdb(hospital_id: str, influx_client, dias: int = 30) -> pd.DataFrame:
    """
    Carga datos históricos desde InfluxDB.
    
    Args:
        hospital_id: ID del hospital
        influx_client: Cliente de InfluxDB
        dias: Días de histórico
    
    Returns:
        DataFrame con columnas 'ds' y 'y'
    """
    query = f'''
    from(bucket: "hospitales")
      |> range(start: -{dias}d)
      |> filter(fn: (r) => r._measurement == "eventos_{hospital_id}")
      |> filter(fn: (r) => r.tipo_evento == "llegada")
      |> aggregateWindow(every: 1h, fn: count)
    '''
    
    try:
        result = influx_client.query_api().query(query)
        
        datos = []
        for table in result:
            for record in table.records:
                datos.append({
                    'ds': record.get_time(),
                    'y': record.get_value()
                })
        
        return pd.DataFrame(datos)
    
    except Exception as e:
        print(f"Error cargando datos de InfluxDB: {e}")
        return pd.DataFrame()


# ═══════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA PARA PRUEBAS
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "═"*60)
    print("🔮 PRUEBA DEL PREDICTOR DE DEMANDA")
    print("═"*60 + "\n")
    
    # Crear predictor para CHUAC
    predictor = PredictorDemanda("chuac")
    
    # Cargar/generar datos
    predictor.cargar_datos_historicos()
    
    # Entrenar
    predictor.entrenar()
    
    # Predecir próximas 24 horas
    predicciones = predictor.predecir(24)
    
    print("\n📊 Predicciones próximas 6 horas:")
    print("-" * 40)
    for _, row in predicciones.head(6).iterrows():
        print(f"   {row['ds'].strftime('%H:%M')}: {row['yhat']:.1f} llegadas "
              f"(rango: {row['yhat_lower']:.1f} - {row['yhat_upper']:.1f})")
    
    # Probar detección de anomalía
    print("\n🔍 Prueba detección de anomalías:")
    print("-" * 40)
    
    # Valor normal
    es_anomalia, z = predictor.detectar_anomalia(15)
    print(f"   15 llegadas: {'⚠️ ANOMALÍA' if es_anomalia else '✅ Normal'} (z={z:.2f})")
    
    # Valor alto
    es_anomalia, z = predictor.detectar_anomalia(50)
    print(f"   50 llegadas: {'⚠️ ANOMALÍA' if es_anomalia else '✅ Normal'} (z={z:.2f})")
    
    print("\n✅ Predictor funcionando correctamente")
