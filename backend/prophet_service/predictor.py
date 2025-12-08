"""
============================================================================
PREDICTOR CON PROPHET
============================================================================
Genera predicciones de demanda usando Facebook Prophet.
============================================================================
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import os

logger = logging.getLogger(__name__)

# Intentar importar Prophet
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    logger.warning("Prophet no disponible, usando predicciones basicas")
    PROPHET_AVAILABLE = False


class ProphetPredictor:
    """Predictor de demanda usando Facebook Prophet"""

    # Tasas base por hospital (pacientes/hora)
    BASE_RATES = {
        "chuac": 20,
        "modelo": 7,
        "san_rafael": 7
    }

    # Perfil horario típico
    HOURLY_PATTERN = {
        0: 0.7, 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.3, 5: 0.4,
        6: 0.6, 7: 0.8, 8: 1.0, 9: 1.2, 10: 1.3, 11: 1.4,
        12: 1.3, 13: 1.2, 14: 1.1, 15: 1.0, 16: 1.1, 17: 1.2,
        18: 1.3, 19: 1.4, 20: 1.3, 21: 1.2, 22: 1.0, 23: 0.8
    }

    # Perfil semanal
    WEEKLY_PATTERN = {
        0: 1.2,  # Lunes
        1: 1.0,
        2: 1.0,
        3: 1.0,
        4: 1.1,  # Viernes
        5: 1.3,  # Sábado
        6: 1.2   # Domingo
    }

    def __init__(self):
        self.models: Dict[str, Prophet] = {}
        self._trained = False

    def _generate_synthetic_history(self, hospital_id: str, days: int = 90) -> pd.DataFrame:
        """Genera datos históricos sintéticos para entrenar Prophet"""
        now = datetime.now()
        dates = []
        values = []

        base_rate = self.BASE_RATES.get(hospital_id, 10)

        for d in range(days):
            date = now - timedelta(days=days-d)
            for h in range(24):
                dt = date.replace(hour=h, minute=0, second=0, microsecond=0)

                # Aplicar patrones
                hour_factor = self.HOURLY_PATTERN.get(h, 1.0)
                week_factor = self.WEEKLY_PATTERN.get(dt.weekday(), 1.0)

                # Añadir ruido
                import random
                noise = random.gauss(1.0, 0.15)

                value = base_rate * hour_factor * week_factor * noise
                value = max(0, value)

                dates.append(dt)
                values.append(value)

        return pd.DataFrame({
            'ds': dates,
            'y': values
        })

    def train(self, hospital_id: str, historical_data: pd.DataFrame = None):
        """
        Entrena el modelo Prophet para un hospital.

        Args:
            hospital_id: ID del hospital
            historical_data: DataFrame con columnas 'ds' (datetime) y 'y' (valor)
        """
        if not PROPHET_AVAILABLE:
            logger.warning("Prophet no disponible, usando modelo básico")
            return

        if historical_data is None:
            historical_data = self._generate_synthetic_history(hospital_id)

        # Crear y entrenar modelo
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=True,
            changepoint_prior_scale=0.05
        )

        # Añadir regressors para eventos especiales
        # model.add_regressor('evento')
        # model.add_regressor('lluvia')

        model.fit(historical_data)
        self.models[hospital_id] = model

        logger.info(f"Modelo Prophet entrenado para {hospital_id}")

    def predict(
        self,
        hospital_id: str,
        hours_ahead: int = 24,
        scenario: Dict = None
    ) -> List[Dict]:
        """
        Genera predicciones de demanda.

        Args:
            hospital_id: ID del hospital
            hours_ahead: Horas hacia adelante
            scenario: Escenario what-if

        Returns:
            Lista de predicciones por hora
        """
        if PROPHET_AVAILABLE and hospital_id in self.models:
            return self._predict_prophet(hospital_id, hours_ahead, scenario)
        else:
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
        """Predicción básica sin Prophet"""
        now = datetime.now()
        base_rate = self.BASE_RATES.get(hospital_id, 10)
        scenario_factor = self._calculate_scenario_factor(scenario)

        predictions = []
        for h in range(hours_ahead):
            future = now + timedelta(hours=h)
            hour = future.hour
            weekday = future.weekday()

            hour_factor = self.HOURLY_PATTERN.get(hour, 1.0)
            week_factor = self.WEEKLY_PATTERN.get(weekday, 1.0)

            expected = base_rate * hour_factor * week_factor * scenario_factor
            margin = expected * 0.3

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
        for hospital_id in self.BASE_RATES.keys():
            self.train(hospital_id)
        self._trained = True


# Instancia global
prophet_predictor = ProphetPredictor()
