# ═══════════════════════════════════════════════════════════════
# Gemelo Digital Hospitalario - Simulador de Urgencias
# ═══════════════════════════════════════════════════════════════
# Simula 3 hospitales de A Coruña (CHUAC, HM Modelo, San Rafael)
# con coordinación central, derivaciones y gestión de emergencias.
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

# Copiar código fuente (simulador + coordinador + tests)
COPY src/ ./src/
COPY config/ ./config/

# Variables de entorno por defecto
ENV PYTHONUNBUFFERED=1
ENV MQTT_BROKER=mosquitto
ENV MQTT_PORT=1883
ENV HOSPITALES="chuac hm_modelo san_rafael"
ENV DURACION=24
ENV VELOCIDAD=60
ENV EMERGENCIAS=false

# Ejecutar el simulador
CMD ["python", "src/simulador.py"]
