# ═══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - COORDINATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Servicio de coordinación: monitoreo de saturación, derivaciones y escalado
# ═══════════════════════════════════════════════════════════════════════════════

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

# Ejecutar el coordinador
CMD ["python", "-m", "backend.coordinator.main"]
