.PHONY: help start stop restart build clean urls logs test demo

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
	@echo "$(GREEN)  🏥 Gemelo Digital Urgencias - Comandos Principales$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)🚀 Inicio Rápido:$(NC)"
	@echo "  make start          - Inicia todo el sistema"
	@echo "  make demo           - Ejecuta simulación demo"
	@echo "  make urls           - Muestra URLs de acceso"
	@echo "  make stop           - Detiene todo"
	@echo ""
	@echo "$(YELLOW)🖥️  Frontend:$(NC)"
	@echo "  make ui             - Inicia solo el frontend"
	@echo "  make ui-dev         - Desarrollo local del frontend"
	@echo "  make ui-build       - Reconstruye el frontend"
	@echo ""
	@echo "$(YELLOW)🔧 Docker:$(NC)"
	@echo "  make restart        - Reinicia servicios"
	@echo "  make build          - Reconstruye imágenes"
	@echo "  make logs           - Ver logs (Ctrl+C para salir)"
	@echo "  make status         - Estado de contenedores"
	@echo "  make clean          - Limpia todo (¡cuidado!)"
	@echo ""
	@echo "$(YELLOW)🧪 Testing:$(NC)"
	@echo "  make test           - Tests rápidos"
	@echo "  make test-all       - Todos los tests"
	@echo ""
	@echo "$(YELLOW)📦 Python:$(NC)"
	@echo "  make install        - Instala dependencias"
	@echo "  make sim-quick      - Simulación rápida local"
	@echo ""

# ═══════════════════════════════════════════════════════════════════
# COMANDOS PRINCIPALES
# ═══════════════════════════════════════════════════════════════════

start: ## Inicia todo el sistema
	@echo "$(GREEN)🚀 Iniciando sistema completo...$(NC)"
	@$(COMPOSE) up -d
	@sleep 3
	@make urls
	@echo ""
	@echo "$(GREEN)✓ Sistema listo! Ejecuta 'make demo' para ver una simulación$(NC)"

stop: ## Detiene todos los servicios
	@echo "$(YELLOW)⏹  Deteniendo servicios...$(NC)"
	@$(COMPOSE) down
	@echo "$(GREEN)✓ Sistema detenido$(NC)"

restart: ## Reinicia todos los servicios
	@echo "$(YELLOW)🔄 Reiniciando...$(NC)"
	@$(COMPOSE) restart
	@echo "$(GREEN)✓ Reiniciado$(NC)"

build: ## Reconstruye todas las imágenes
	@echo "$(GREEN)🔨 Reconstruyendo imágenes...$(NC)"
	@$(COMPOSE) build --no-cache

status: ## Muestra estado de servicios
	@echo "$(BLUE)📊 Estado:$(NC)"
	@$(COMPOSE) ps

urls: ## Muestra URLs de acceso
	@echo ""
	@echo "$(GREEN)════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  🌐 Accesos al Sistema$(NC)"
	@echo "$(GREEN)════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "  $(BLUE)🎨 UI Moderna:$(NC)    http://localhost:3002"
	@echo "  $(YELLOW)📊 Grafana:$(NC)      http://localhost:3001  (admin/admin)"
	@echo "  $(YELLOW)🔴 Node-RED:$(NC)     http://localhost:1880"
	@echo "  $(YELLOW)💾 InfluxDB:$(NC)     http://localhost:8086  (admin/adminadmin)"
	@echo ""

logs: ## Ver logs de todos los servicios
	@$(COMPOSE) logs -f

clean: ## Elimina todo (volúmenes incluidos)
	@echo "$(RED)⚠️  CUIDADO: Esto eliminará TODOS los datos$(NC)"
	@read -p "¿Continuar? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)✓ Limpieza completada$(NC)"

# ═══════════════════════════════════════════════════════════════════
# FRONTEND UI
# ═══════════════════════════════════════════════════════════════════

ui: ## Inicia solo el frontend
	@echo "$(GREEN)🎨 Iniciando frontend UI...$(NC)"
	@$(COMPOSE) up -d frontend
	@echo ""
	@echo "$(GREEN)✓ Frontend disponible en: http://localhost:3002$(NC)"

ui-build: ## Reconstruye el frontend
	@echo "$(GREEN)🔨 Reconstruyendo frontend...$(NC)"
	@$(COMPOSE) build --no-cache frontend
	@$(COMPOSE) up -d frontend
	@echo "$(GREEN)✓ Frontend reconstruido$(NC)"

ui-dev: ## Desarrollo local del frontend
	@echo "$(BLUE)🚀 Iniciando desarrollo local...$(NC)"
	@cd frontend && npm install && npm run dev

ui-logs: ## Ver logs del frontend
	@$(COMPOSE) logs -f frontend

# ═══════════════════════════════════════════════════════════════════
# SIMULACIÓN
# ═══════════════════════════════════════════════════════════════════

demo: ## Simulación demo (recomendado para empezar)
	@echo "$(GREEN)🎬 Ejecutando simulación demo...$(NC)"
	@$(PYTHON) src/simulador.py --hospitales chuac hm_modelo san_rafael --duracion 2 --velocidad 120 --emergencias

sim-quick: ## Simulación rápida (1h)
	@echo "$(GREEN)⚡ Simulación rápida...$(NC)"
	@$(PYTHON) src/simulador.py --hospitales chuac hm_modelo san_rafael --duracion 1 --velocidad 120 --rapido

sim-full: ## Simulación completa (24h)
	@echo "$(GREEN)🚀 Simulación completa...$(NC)"
	@$(PYTHON) src/simulador.py --hospitales chuac hm_modelo san_rafael --duracion 24 --velocidad 60

# ═══════════════════════════════════════════════════════════════════
# TESTING
# ═══════════════════════════════════════════════════════════════════

test: test-quick ## Test rápido

test-quick: ## Test de integración (~5 seg)
	@echo "$(BLUE)⚡ Test rápido...$(NC)"
	@$(PYTHON) tests/test_integracion_simple.py

test-all: ## Todos los tests
	@echo "$(BLUE)🧪 Ejecutando todos los tests...$(NC)"
	@$(PYTHON) tests/test_integracion_simple.py
	@$(PYTHON) tests/test_predictor_demanda.py
	@$(PYTHON) tests/test_ejecucion_rapida.py
	@echo "$(GREEN)✅ Tests completados$(NC)"

# ═══════════════════════════════════════════════════════════════════
# PYTHON
# ═══════════════════════════════════════════════════════════════════

install: ## Instala dependencias Python
	@echo "$(GREEN)📦 Instalando dependencias...$(NC)"
	@pip install -r requirements.txt
	@echo "$(GREEN)✓ Instalado$(NC)"

# ═══════════════════════════════════════════════════════════════════
# LOGS ESPECÍFICOS
# ═══════════════════════════════════════════════════════════════════

logs-ui: ui-logs ## Alias para ui-logs
logs-simulador: ## Ver logs del simulador
	@$(COMPOSE) logs -f simulador
logs-grafana: ## Ver logs de Grafana
	@$(COMPOSE) logs -f grafana
logs-influx: ## Ver logs de InfluxDB
	@$(COMPOSE) logs -f influxdb
logs-nodered: ## Ver logs de Node-RED
	@$(COMPOSE) logs -f nodered

# ═══════════════════════════════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════════════════════════════

shell-ui: ## Shell del contenedor frontend
	@docker exec -it urgencias-frontend sh

shell-simulador: ## Shell del simulador
	@docker exec -it urgencias-simulador bash

backup: ## Backup de volúmenes
	@echo "$(GREEN)💾 Creando backup...$(NC)"
	@mkdir -p backups
	@docker run --rm \
		-v gemelo-digital-hospitalario_influxdb_data:/data \
		-v $(PWD)/backups:/backup \
		alpine tar czf /backup/influxdb_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@echo "$(GREEN)✓ Backup en ./backups/$(NC)"

# Alias útiles
ps: status
down: stop
up: start
