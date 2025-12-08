# ═══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - CHATBOT MCP
# ═══════════════════════════════════════════════════════════════════════════════
# Chatbot con Groq Llama-3.3-70B y Kafka para contexto en tiempo real
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY backend/ ./backend/

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092
ENV GROQ_API_KEY=""

# Puerto del servidor MCP
EXPOSE 8080

# Iniciar servidor
CMD ["python", "-m", "backend.chatbot.mcp_server"]
