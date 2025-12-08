# ═══════════════════════════════════════════════════════════════
# Gemelo Digital Hospitalario - Simulador de Urgencias
# ═══════════════════════════════════════════════════════════════
# Simula 3 hospitales de A Coruña (CHUAC, HM Modelo, San Rafael)
# con coordinación central y derivaciones.
# Arquitectura limpia con SimPy y Kafka.
# ═══════════════════════════════════════════════════════════════
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY backend/ ./backend/

# Añadir raíz al PYTHONPATH
ENV PYTHONPATH=/app

# Variables de entorno por defecto
ENV PYTHONUNBUFFERED=1
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092
ENV INFLUX_URL=http://influxdb:8086
ENV SIMULATION_SPEED=1.0
ENV SIMULATION_DURATION=0

# Ejecutar el simulador
CMD ["python", "-m", "backend.simulator.main"]
