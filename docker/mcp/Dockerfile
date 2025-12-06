FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements-mcp.txt .
RUN pip install --no-cache-dir -r requirements-mcp.txt

# Copiar código
COPY src/mcp_server.py .

# Variables de entorno para Groq
ENV GROQ_API_KEY=""

# Puerto del servidor MCP
EXPOSE 8080

# Iniciar servidor
CMD ["python", "mcp_server.py"]
