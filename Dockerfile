# ═══════════════════════════════════════════════════════════════
# Gemelo Digital Hospitalario - Simulador de Urgencias
# ═══════════════════════════════════════════════════════════════
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prophet
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY src/ ./src/
COPY config/ ./config/

# Variables de entorno por defecto
ENV PYTHONUNBUFFERED=1
ENV MQTT_BROKER=mosquitto
ENV MQTT_PORT=1883

# Ejecutar el simulador
CMD ["python", "src/simulador.py"]
