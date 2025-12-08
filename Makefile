.PHONY: help start stop restart build clean urls logs test demo smoke-test

# Variables
COMPOSE := docker compose
PYTHON := python3

# Colores
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;36m
RED := \033[0;31m
NC := \033[0m

# ═══════════════════════════════════════════════════════════════════
# AYUDA
# ═══════════════════════════════════════════════════════════════════

help: ## Muestra esta ayuda
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Gemelo Digital Urgencias - Comandos Principales$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Inicio Rapido:$(NC)"
	@echo "  make start          - Inicia todo el sistema"
	@echo "  make urls           - Muestra URLs de acceso"
	@echo "  make stop           - Detiene todo"
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@echo "  make ui             - Inicia solo el frontend"
	@echo "  make ui-dev         - Desarrollo local del frontend"
	@echo "  make ui-build       - Reconstruye el frontend"
	@echo ""
	@echo "$(YELLOW)Docker:$(NC)"
	@echo "  make restart        - Reinicia servicios"
	@echo "  make build          - Reconstruye imagenes"
	@echo "  make logs           - Ver logs (Ctrl+C para salir)"
	@echo "  make status         - Estado de contenedores"
	@echo "  make clean          - Limpia todo"
	@echo ""
	@echo "$(YELLOW)Testing:$(NC)"
	@echo "  make smoke-test     - Smoke tests del sistema"
	@echo "  make test-api       - Test endpoints API"
	@echo ""
	@echo "$(YELLOW)Kafka:$(NC)"
	@echo "  make kafka-topics   - Lista topics de Kafka"
	@echo "  make kafka-create   - Crea topics necesarios"
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@echo "  make db-shell       - Shell PostgreSQL"
	@echo ""

# ═══════════════════════════════════════════════════════════════════
# COMANDOS PRINCIPALES
# ═══════════════════════════════════════════════════════════════════

start: ## Inicia todo el sistema
	@echo "$(GREEN)Iniciando sistema completo...$(NC)"
	@$(COMPOSE) up -d
	@sleep 5
	@make urls
	@echo ""
	@echo "$(GREEN)Sistema listo!$(NC)"

stop: ## Detiene todos los servicios
	@echo "$(YELLOW)Deteniendo servicios...$(NC)"
	@$(COMPOSE) down
	@echo "$(GREEN)Sistema detenido$(NC)"

restart: ## Reinicia todos los servicios
	@echo "$(YELLOW)Reiniciando...$(NC)"
	@$(COMPOSE) restart
	@echo "$(GREEN)Reiniciado$(NC)"

build: ## Reconstruye todas las imagenes
	@echo "$(GREEN)Reconstruyendo imagenes...$(NC)"
	@$(COMPOSE) build --no-cache

status: ## Muestra estado de servicios
	@echo "$(BLUE)Estado:$(NC)"
	@$(COMPOSE) ps

urls: ## Muestra URLs de acceso
	@echo ""
	@echo "$(GREEN)════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Accesos al Sistema$(NC)"
	@echo "$(GREEN)════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "  $(BLUE)UI Frontend:$(NC)     http://localhost:3003"
	@echo "  $(BLUE)API REST:$(NC)        http://localhost:8000"
	@echo "  $(BLUE)Prophet API:$(NC)     http://localhost:8001"
	@echo "  $(BLUE)Chatbot MCP:$(NC)     http://localhost:8080"
	@echo "  $(YELLOW)Grafana:$(NC)         http://localhost:3001  (admin/admin)"
	@echo "  $(YELLOW)Node-RED:$(NC)        http://localhost:1880"
	@echo "  $(YELLOW)Kafka UI:$(NC)        http://localhost:8090"
	@echo "  $(YELLOW)InfluxDB:$(NC)        http://localhost:8086  (admin/adminadmin)"
	@echo ""

logs: ## Ver logs de todos los servicios
	@$(COMPOSE) logs -f

clean: ## Elimina todo (volumenes incluidos)
	@echo "$(RED)CUIDADO: Esto eliminara TODOS los datos$(NC)"
	@read -p "Continuar? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)Limpieza completada$(NC)"

# ═══════════════════════════════════════════════════════════════════
# FRONTEND UI
# ═══════════════════════════════════════════════════════════════════

ui: ## Inicia solo el frontend
	@echo "$(GREEN)Iniciando frontend UI...$(NC)"
	@$(COMPOSE) up -d frontend
	@echo ""
	@echo "$(GREEN)Frontend disponible en: http://localhost:3003$(NC)"

ui-build: ## Reconstruye el frontend
	@echo "$(GREEN)Reconstruyendo frontend...$(NC)"
	@$(COMPOSE) build --no-cache frontend
	@$(COMPOSE) up -d frontend
	@echo "$(GREEN)Frontend reconstruido$(NC)"

ui-dev: ## Desarrollo local del frontend
	@echo "$(BLUE)Iniciando desarrollo local...$(NC)"
	@cd frontend && npm install && npm run dev

ui-logs: ## Ver logs del frontend
	@$(COMPOSE) logs -f frontend

# ═══════════════════════════════════════════════════════════════════
# TESTING
# ═══════════════════════════════════════════════════════════════════

smoke-test: ## Smoke tests del sistema
	@echo "$(BLUE)Ejecutando smoke tests...$(NC)"
	@./backend/tests/smoke_test.sh

test-api: ## Test endpoints de la API
	@echo "$(BLUE)Testing API endpoints...$(NC)"
	@curl -s http://localhost:8000/health | python3 -m json.tool || echo "API no disponible"
	@curl -s http://localhost:8000/staff | python3 -m json.tool || echo "Staff endpoint no disponible"
	@curl -s http://localhost:8000/hospitals | python3 -m json.tool || echo "Hospitals endpoint no disponible"

# ═══════════════════════════════════════════════════════════════════
# KAFKA
# ═══════════════════════════════════════════════════════════════════

kafka-topics: ## Lista topics de Kafka
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --list

kafka-create: ## Crea todos los topics necesarios
	@echo "$(GREEN)Creando topics de Kafka...$(NC)"
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic patient-arrivals --partitions 3 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic triage-results --partitions 3 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic consultation-events --partitions 3 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic diversion-alerts --partitions 1 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic staff-state --partitions 3 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic staff-load --partitions 3 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic hospital-stats --partitions 3 --replication-factor 1
	@docker exec urgencias-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic system-context --partitions 1 --replication-factor 1
	@echo "$(GREEN)Topics creados$(NC)"

kafka-consume: ## Consume mensajes de un topic (uso: make kafka-consume TOPIC=patient-arrivals)
	@docker exec urgencias-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic $(TOPIC) --from-beginning

# ═══════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════

db-shell: ## Abre shell de PostgreSQL
	@docker exec -it urgencias-postgres psql -U urgencias -d urgencias_db

db-reset: ## Reinicia la base de datos (elimina datos)
	@$(COMPOSE) down -v postgres
	@$(COMPOSE) up -d postgres
	@echo "$(GREEN)Base de datos reiniciada$(NC)"

# ═══════════════════════════════════════════════════════════════════
# LOGS ESPECIFICOS
# ═══════════════════════════════════════════════════════════════════

logs-ui: ui-logs
logs-simulator: ## Ver logs del simulador
	@$(COMPOSE) logs -f simulator
logs-api: ## Ver logs de la API
	@$(COMPOSE) logs -f api
logs-coordinator: ## Ver logs del coordinador
	@$(COMPOSE) logs -f coordinator
logs-prophet: ## Ver logs de Prophet
	@$(COMPOSE) logs -f prophet
logs-chatbot: ## Ver logs del chatbot
	@$(COMPOSE) logs -f chatbot
logs-grafana: ## Ver logs de Grafana
	@$(COMPOSE) logs -f grafana
logs-influx: ## Ver logs de InfluxDB
	@$(COMPOSE) logs -f influxdb
logs-nodered: ## Ver logs de Node-RED
	@$(COMPOSE) logs -f nodered
logs-kafka: ## Ver logs de Kafka
	@$(COMPOSE) logs -f kafka

# ═══════════════════════════════════════════════════════════════════
# DESARROLLO
# ═══════════════════════════════════════════════════════════════════

dev: ## Inicia servicios de infraestructura para desarrollo local
	@echo "$(GREEN)Iniciando infraestructura para desarrollo...$(NC)"
	@$(COMPOSE) up -d postgres kafka zookeeper influxdb grafana kafka-ui nodered
	@echo "$(GREEN)Infraestructura lista$(NC)"

dev-down: ## Detiene servicios de desarrollo
	@$(COMPOSE) down

install: ## Instala dependencias Python
	@echo "$(GREEN)Instalando dependencias...$(NC)"
	@pip install -r requirements.txt
	@echo "$(GREEN)Instalado$(NC)"

# ═══════════════════════════════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════════════════════════════

shell-api: ## Shell del contenedor API
	@docker exec -it urgencias-api bash

shell-simulator: ## Shell del simulador
	@docker exec -it urgencias-simulador bash

backup: ## Backup de volumenes
	@echo "$(GREEN)Creando backup...$(NC)"
	@mkdir -p backups
	@docker run --rm \
		-v gemelo-digital-hospitalario_influxdb_data:/data \
		-v $(PWD)/backups:/backup \
		alpine tar czf /backup/influxdb_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@echo "$(GREEN)Backup en ./backups/$(NC)"

# Alias utiles
ps: status
down: stop
up: start
