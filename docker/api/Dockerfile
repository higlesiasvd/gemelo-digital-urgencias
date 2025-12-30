# ═══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - API DE GESTIÓN DE PERSONAL
# ═══════════════════════════════════════════════════════════════════════════════
# Servicio FastAPI para gestión de personal sanitario con PostgreSQL y Kafka
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema incluyendo Pandoc y LaTeX
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    wget \
    pandoc \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    texlive-plain-generic \
    texlive-latex-recommended \
    texlive-xetex \
    texlive-lang-spanish \
    lmodern \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY backend/ ./backend/

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Puerto
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
