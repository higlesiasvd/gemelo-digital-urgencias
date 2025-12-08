# ═══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - PROPHET SERVICE
# ═══════════════════════════════════════════════════════════════════════════════
# Servicio de predicción de demanda con Facebook Prophet
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prophet
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements-prophet.txt .
RUN pip install --no-cache-dir -r requirements-prophet.txt

# Copiar código fuente
COPY backend/ ./backend/

# Añadir raíz al PYTHONPATH
ENV PYTHONPATH=/app

# Variables de entorno por defecto
ENV PYTHONUNBUFFERED=1
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Puerto
EXPOSE 8001

# Ejecutar el servicio Prophet
CMD ["uvicorn", "backend.prophet_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
