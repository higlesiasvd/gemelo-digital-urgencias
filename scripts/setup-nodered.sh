#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Script para configurar Node-RED con los flujos de Urgencias
# ═══════════════════════════════════════════════════════════════════════════════

echo "🔧 Configurando Node-RED..."

# Esperar a que Node-RED esté disponible
echo "   Esperando a que Node-RED inicie..."
for i in {1..30}; do
    if curl -s http://localhost:1880 > /dev/null; then
        echo "   ✅ Node-RED disponible"
        break
    fi
    sleep 2
done

# Importar flujos
echo "   Importando flujos de Urgencias..."

# Verificar si ya existen flujos
EXISTING=$(curl -s http://localhost:1880/flows | jq length 2>/dev/null || echo "0")

if [ "$EXISTING" -gt "5" ]; then
    echo "   ⚠️  Ya hay flujos configurados ($EXISTING nodos)"
    read -p "   ¿Desea reemplazarlos? (s/N): " confirm
    if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
        echo "   Cancelado"
        exit 0
    fi
fi

# Cargar flujos desde archivo
FLOWS=$(cat node-red/flows.json)

# Enviar a Node-RED
RESULT=$(curl -s -X POST http://localhost:1880/flows \
    -H "Content-Type: application/json" \
    -H "Node-RED-Deployment-Type: full" \
    -d "$FLOWS")

if [ $? -eq 0 ]; then
    echo "   ✅ Flujos importados correctamente"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "🌐 Node-RED: http://localhost:1880"
    echo ""
    echo "📊 Los flujos incluyen:"
    echo "   - Recepción de eventos de pacientes (MQTT)"
    echo "   - Estadísticas de hospitales"
    echo "   - Estado del coordinador"
    echo "   - Alertas del sistema"
    echo "   - Escritura a InfluxDB"
    echo "═══════════════════════════════════════════════════════════════"
else
    echo "   ❌ Error al importar flujos"
    echo "   Puede importarlos manualmente en http://localhost:1880"
    exit 1
fi
