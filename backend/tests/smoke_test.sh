#!/bin/bash
# ============================================================================
# SMOKE TEST - Gemelo Digital Hospitalario
# ============================================================================
# Verifica que todos los servicios están funcionando correctamente
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "  SMOKE TEST - Gemelo Digital Hospitalario"
echo "============================================"
echo ""

PASS=0
FAIL=0

check_service() {
    local name=$1
    local url=$2
    local expected=$3

    printf "Checking %-20s ... " "$name"

    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null); then
        if [ "$response" = "$expected" ]; then
            echo -e "${GREEN}OK${NC} (HTTP $response)"
            ((PASS++))
            return 0
        else
            echo -e "${RED}FAIL${NC} (Expected $expected, got $response)"
            ((FAIL++))
            return 1
        fi
    else
        echo -e "${RED}FAIL${NC} (Connection error)"
        ((FAIL++))
        return 1
    fi
}

check_kafka() {
    printf "Checking %-20s ... " "Kafka"

    if docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --list &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((FAIL++))
        return 1
    fi
}

check_postgres() {
    printf "Checking %-20s ... " "PostgreSQL"

    if docker exec urgencias-postgres pg_isready -U urgencias &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((FAIL++))
        return 1
    fi
}

check_container() {
    local name=$1
    printf "Checking %-20s ... " "$name container"

    if docker ps --format '{{.Names}}' | grep -q "^$name$"; then
        echo -e "${GREEN}RUNNING${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}NOT RUNNING${NC}"
        ((FAIL++))
        return 1
    fi
}

echo "1. Checking Infrastructure Services"
echo "------------------------------------"
check_postgres
check_kafka
check_service "InfluxDB" "http://localhost:8086/health" "200"
check_service "Kafka UI" "http://localhost:8090" "200"
check_service "Grafana" "http://localhost:3001/api/health" "200"

echo ""
echo "2. Checking Application Services"
echo "---------------------------------"
check_service "API" "http://localhost:8000/health" "200"
check_service "Prophet" "http://localhost:8001/health" "200"
check_service "Chatbot MCP" "http://localhost:8080/health" "200"
check_service "Node-RED" "http://localhost:1880" "200"

echo ""
echo "3. Checking Background Services"
echo "--------------------------------"
check_container "urgencias-simulador"
check_container "urgencias-coordinator"

echo ""
echo "4. API Endpoints Test"
echo "----------------------"
check_service "GET /staff" "http://localhost:8000/staff" "200"
check_service "GET /hospitals" "http://localhost:8000/hospitals" "200"

echo ""
echo "============================================"
echo "  RESULTS: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "============================================"

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
