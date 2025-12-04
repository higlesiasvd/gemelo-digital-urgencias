#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Script para iniciar la UI moderna de React + Mantine
# ═══════════════════════════════════════════════════════════════

set -e

echo "🏥 Iniciando Gemelo Digital Urgencias - UI Moderna"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está ejecutándose"
    echo "   Por favor, inicia Docker Desktop y vuelve a intentarlo"
    exit 1
fi

echo "📦 Construyendo imagen del frontend..."
docker-compose build frontend

echo ""
echo "🚀 Iniciando frontend UI..."
docker-compose up -d frontend

echo ""
echo "✅ Frontend iniciado correctamente!"
echo ""
echo "🌐 Accede a la UI moderna en:"
echo "   http://localhost:3002"
echo ""
echo "📊 También disponible Grafana en:"
echo "   http://localhost:3001 (admin/admin)"
echo ""
echo "💡 Comandos útiles:"
echo "   docker-compose logs -f frontend   # Ver logs"
echo "   docker-compose restart frontend   # Reiniciar"
echo "   docker-compose stop frontend      # Detener"
echo ""
