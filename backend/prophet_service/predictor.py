"""
============================================================================
PREDICTOR CON PROPHET
============================================================================
Genera predicciones de demanda usando Facebook Prophet.
Cada hospital tiene características únicas que afectan las predicciones.
============================================================================
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import random
import os

logger = logging.getLogger(__name__)

# Intentar importar Prophet
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
    logger.info("✅ Prophet importado correctamente")
except ImportError:
    logger.warning("⚠️ Prophet no disponible, usando predicciones básicas")
    PROPHET_AVAILABLE = False


class ProphetPredictor:
    """Predictor de demanda usando Facebook Prophet"""

    # Configuración por hospital (diferenciada)
    HOSPITAL_CONFIG = {
        "chuac": {
            "base_rate": 20,           # Hospital grande universitario
            "variability": 0.20,       # Alta variabilidad
            "weekend_factor": 1.3,     # Muy alto los fines de semana
            "night_factor": 0.5,       # Baja actividad nocturna
            "peak_hour": 11,           # Pico a las 11:00
            "color": "blue"
        },
        "modelo": {
            "base_rate": 8,            # Hospital privado mediano
            "variability": 0.10,       # Baja variabilidad (más predecible)
            "weekend_factor": 0.9,     # Menos fines de semana (es privado)
            "night_factor": 0.3,       # Muy baja actividad nocturna
            "peak_hour": 10,           # Pico a las 10:00
            "color": "orange"
        },
        "san_rafael": {
            "base_rate": 5,            # Hospital comarcal pequeño
            "variability": 0.25,       # Alta variabilidad (menos recursos)
            "weekend_factor": 1.1,     # Ligeramente más los fines de semana
            "night_factor": 0.6,       # Actividad nocturna moderada
            "peak_hour": 12,           # Pico a las 12:00 (zona rural)
            "color": "green"
        }
    }

    def __init__(self):
        self.models: Dict[str, Prophet] = {}
        self._trained = False

    def _generate_synthetic_history(self, hospital_id: str, days: int = 90) -> pd.DataFrame:
        """Genera datos históricos sintéticos ÚNICOS por hospital para entrenar Prophet"""
        now = datetime.now()
        dates = []
        values = []

        config = self.HOSPITAL_CONFIG.get(hospital_id, self.HOSPITAL_CONFIG["chuac"])
        base_rate = config["base_rate"]
        variability = config["variability"]
        weekend_factor = config["weekend_factor"]
        night_factor = config["night_factor"]
        peak_hour = config["peak_hour"]

        # Seed único por hospital para reproducibilidad diferenciada
        random.seed(hash(hospital_id) % 2**32)

        for d in range(days):
            date = now - timedelta(days=days-d)
            for h in range(24):
                dt = date.replace(hour=h, minute=0, second=0, microsecond=0)

                # Factor horario personalizado por hospital
                hour_factor = self._get_hourly_factor(h, peak_hour, night_factor)

                # Factor semanal
                is_weekend = dt.weekday() >= 5
                week_factor = weekend_factor if is_weekend else 1.0

                # Factor estacional (más en invierno)
                month = dt.month
                if month in [12, 1, 2]:
                    seasonal_factor = 1.2  # Invierno
                elif month in [6, 7, 8]:
                    seasonal_factor = 0.85  # Verano
                else:
                    seasonal_factor = 1.0

                # Ruido único
                noise = random.gauss(1.0, variability)

                value = base_rate * hour_factor * week_factor * seasonal_factor * noise
                value = max(0.5, value)  # Mínimo de 0.5

                dates.append(dt)
                values.append(value)

        # Reset seed
        random.seed()

        return pd.DataFrame({
            'ds': dates,
            'y': values
        })

    def _get_hourly_factor(self, hour: int, peak_hour: int, night_factor: float) -> float:
        """Calcula el factor horario con pico personalizado"""
        # Distancia al pico (circular)
        distance = min(abs(hour - peak_hour), 24 - abs(hour - peak_hour))
        
        # Factor base según distancia al pico
        if distance == 0:
            return 1.4
        elif distance <= 2:
            return 1.2
        elif distance <= 4:
            return 1.0
        elif hour < 6 or hour >= 23:
            return night_factor
        else:
            return 0.8

    def train(self, hospital_id: str, historical_data: pd.DataFrame = None):
        """
        Entrena el modelo Prophet para un hospital.
        """
        if not PROPHET_AVAILABLE:
            logger.warning(f"Prophet no disponible para {hospital_id}")
            return

        logger.info(f"🔄 Entrenando Prophet para {hospital_id}...")
        
        if historical_data is None:
            historical_data = self._generate_synthetic_history(hospital_id)

        # Crear y entrenar modelo
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,  # No tenemos un año de datos
            changepoint_prior_scale=0.05,
            seasonality_mode='multiplicative'
        )

        # Suprimir output de Prophet
        import sys
        from io import StringIO
        old_stdout = sys.stdout
        sys.stdout = StringIO()
        
        try:
            model.fit(historical_data)
        finally:
            sys.stdout = old_stdout

        self.models[hospital_id] = model
        logger.info(f"✅ Modelo Prophet entrenado para {hospital_id}")

    def predict(
        self,
        hospital_id: str,
        hours_ahead: int = 24,
        scenario: Dict = None
    ) -> List[Dict]:
        """Genera predicciones de demanda."""
        
        # Si no hay modelo entrenado, entrenar ahora
        if hospital_id not in self.models and PROPHET_AVAILABLE:
            self.train(hospital_id)
        
        if PROPHET_AVAILABLE and hospital_id in self.models:
            logger.debug(f"Usando Prophet para {hospital_id}")
            return self._predict_prophet(hospital_id, hours_ahead, scenario)
        else:
            logger.debug(f"Usando predicción básica para {hospital_id}")
            return self._predict_basic(hospital_id, hours_ahead, scenario)

    def _predict_prophet(
        self,
        hospital_id: str,
        hours_ahead: int,
        scenario: Dict = None
    ) -> List[Dict]:
        """Predicción usando Prophet"""
        model = self.models[hospital_id]

        # Crear dataframe futuro
        future = model.make_future_dataframe(periods=hours_ahead, freq='H')

        # Predicción
        forecast = model.predict(future)

        # Tomar solo las predicciones futuras
        forecast = forecast.tail(hours_ahead)

        # Aplicar escenario
        scenario_factor = self._calculate_scenario_factor(scenario)

        predictions = []
        for _, row in forecast.iterrows():
            predictions.append({
                "hora": row['ds'].hour,
                "timestamp": row['ds'].isoformat(),
                "llegadas_esperadas": round(max(0, row['yhat'] * scenario_factor), 1),
                "minimo": round(max(0, row['yhat_lower'] * scenario_factor), 1),
                "maximo": round(row['yhat_upper'] * scenario_factor, 1),
                "factor_escenario": round(scenario_factor, 2)
            })

        return predictions

    def _predict_basic(
        self,
        hospital_id: str,
        hours_ahead: int,
        scenario: Dict = None
    ) -> List[Dict]:
        """Predicción básica sin Prophet (fallback)"""
        now = datetime.now()
        config = self.HOSPITAL_CONFIG.get(hospital_id, self.HOSPITAL_CONFIG["chuac"])
        base_rate = config["base_rate"]
        peak_hour = config["peak_hour"]
        night_factor = config["night_factor"]
        weekend_factor = config["weekend_factor"]
        variability = config["variability"]
        
        scenario_factor = self._calculate_scenario_factor(scenario)

        predictions = []
        for h in range(hours_ahead):
            future = now + timedelta(hours=h)
            hour = future.hour
            is_weekend = future.weekday() >= 5

            hour_factor = self._get_hourly_factor(hour, peak_hour, night_factor)
            week_factor = weekend_factor if is_weekend else 1.0

            expected = base_rate * hour_factor * week_factor * scenario_factor
            margin = expected * variability * 2

            predictions.append({
                "hora": hour,
                "timestamp": future.isoformat(),
                "llegadas_esperadas": round(expected, 1),
                "minimo": round(max(0, expected - margin), 1),
                "maximo": round(expected + margin, 1),
                "factor_escenario": round(scenario_factor, 2)
            })

        return predictions

    def _calculate_scenario_factor(self, scenario: Dict = None) -> float:
        """Calcula el factor multiplicador del escenario"""
        if not scenario:
            return 1.0

        factor = 1.0

        if scenario.get("lluvia"):
            factor *= 1.15
        if scenario.get("evento_masivo"):
            factor *= 1.4
        if scenario.get("temperatura_extrema"):
            factor *= 1.25
        if scenario.get("partido_futbol"):
            factor *= 1.2

        return factor

    def train_all(self):
        """Entrena modelos para todos los hospitales"""
        logger.info("🏥 Iniciando entrenamiento de todos los hospitales...")
        for hospital_id in self.HOSPITAL_CONFIG.keys():
            self.train(hospital_id)
        self._trained = True
        logger.info("✅ Todos los modelos entrenados")


# Instancia global
prophet_predictor = ProphetPredictor()
