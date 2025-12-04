.PHONY: help up down restart logs status clean build ps shell-influx shell-nodered shell-grafana shell-mqtt install build-simulador run-simulador test test-all test-quick

# Variables
COMPOSE_FILE := docker-compose.yml
PROJECT_NAME := gemelo-digital-hospitalario
PYTHON := python3

# Colores para output
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;36m
RED := \033[0;31m
NC := \033[0m

help: ## Muestra esta ayuda
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  🏥 Gemelo Digital Hospitalario - Comandos disponibles$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ═══════════════════════════════════════════════════════════════════
# INFRAESTRUCTURA - Docker Compose
# ═══════════════════════════════════════════════════════════════════

up: ## Inicia todos los servicios
	@echo "$(GREEN)🚀 Iniciando servicios...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✓ Servicios iniciados$(NC)"
	@make urls

down: ## Detiene todos los servicios
	@echo "$(YELLOW)⏹  Deteniendo servicios...$(NC)"
	docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✓ Servicios detenidos$(NC)"

restart: ## Reinicia todos los servicios
	@echo "$(YELLOW)🔄 Reiniciando servicios...$(NC)"
	docker compose -f $(COMPOSE_FILE) restart
	@echo "$(GREEN)✓ Servicios reiniciados$(NC)"

build: ## Reconstruye los contenedores
	@echo "$(GREEN)🔨 Reconstruyendo contenedores...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache

status: ## Muestra el estado de los servicios
	@echo "$(BLUE)📊 Estado de los servicios:$(NC)"
	@docker compose -f $(COMPOSE_FILE) ps

ps: status ## Alias para status

urls: ## Muestra las URLs de acceso
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  🌐 URLs de acceso:$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "  $(YELLOW)Grafana:$(NC)    http://localhost:3001  (admin/admin)"
	@echo "  $(YELLOW)Node-RED:$(NC)   http://localhost:1880"
	@echo "  $(YELLOW)InfluxDB:$(NC)   http://localhost:8086  (admin/adminadmin)"
	@echo "  $(YELLOW)MQTT:$(NC)       localhost:1883"
	@echo "  $(YELLOW)MQTT WS:$(NC)    localhost:9001"
	@echo ""

# ═══════════════════════════════════════════════════════════════════
# LOGS
# ═══════════════════════════════════════════════════════════════════

logs: ## Muestra los logs de todos los servicios
	docker compose -f $(COMPOSE_FILE) logs -f

logs-mqtt: ## Muestra los logs de Mosquitto
	docker compose -f $(COMPOSE_FILE) logs -f mosquitto

logs-influx: ## Muestra los logs de InfluxDB
	docker compose -f $(COMPOSE_FILE) logs -f influxdb

logs-grafana: ## Muestra los logs de Grafana
	docker compose -f $(COMPOSE_FILE) logs -f grafana

logs-nodered: ## Muestra los logs de Node-RED
	docker compose -f $(COMPOSE_FILE) logs -f nodered

logs-simulador: ## Muestra los logs del simulador
	docker compose -f $(COMPOSE_FILE) logs -f simulador

# ═══════════════════════════════════════════════════════════════════
# LIMPIEZA
# ═══════════════════════════════════════════════════════════════════

clean: ## Elimina contenedores, volúmenes y redes
	@echo "$(RED)⚠️  ¡ATENCIÓN! Esto eliminará todos los datos.$(NC)"
	@read -p "¿Estás seguro? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	@echo "$(GREEN)✓ Limpieza completada$(NC)"

clean-all: ## Limpieza profunda incluyendo imágenes
	@echo "$(RED)⚠️  ¡ATENCIÓN! Esto eliminará todos los datos e imágenes.$(NC)"
	@read -p "¿Estás seguro? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans --rmi all
	@echo "$(GREEN)✓ Limpieza profunda completada$(NC)"

# ═══════════════════════════════════════════════════════════════════
# SHELL ACCESS
# ═══════════════════════════════════════════════════════════════════

shell-mqtt: ## Accede al shell de Mosquitto
	docker exec -it urgencias-mqtt sh

shell-influx: ## Accede al shell de InfluxDB
	docker exec -it urgencias-influxdb bash

shell-grafana: ## Accede al shell de Grafana
	docker exec -it urgencias-grafana bash

shell-nodered: ## Accede al shell de Node-RED
	docker exec -it urgencias-nodered bash

shell-simulador: ## Accede al shell del simulador
	docker exec -it urgencias-simulador bash

# ═══════════════════════════════════════════════════════════════════
# SIMULADOR - Construcción y ejecución
# ═══════════════════════════════════════════════════════════════════

build-simulador: ## Construye la imagen del simulador
	@echo "$(GREEN)🔨 Construyendo imagen del simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) build simulador
	@echo "$(GREEN)✓ Imagen construida$(NC)"

rebuild-simulador: ## Reconstruye la imagen del simulador sin caché
	@echo "$(GREEN)🔨 Reconstruyendo imagen del simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache simulador
	@echo "$(GREEN)✓ Imagen reconstruida$(NC)"

run-simulador: ## Ejecuta el simulador (una vez)
	@echo "$(GREEN)🏥 Ejecutando simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm simulador

start-simulador: ## Inicia el simulador en segundo plano
	@echo "$(GREEN)🚀 Iniciando simulador en segundo plano...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d simulador

stop-simulador: ## Detiene el simulador
	@echo "$(YELLOW)⏹  Deteniendo simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) stop simulador

# Ejecuciones específicas del simulador
sim-quick: ## Simulación rápida (1h, 3 hospitales)
	@echo "$(GREEN)⚡ Ejecutando simulación rápida...$(NC)"
	$(PYTHON) src/simulador.py --hospitales chuac hm_modelo san_rafael --duracion 1 --velocidad 120 --rapido

sim-demo: ## Simulación demo (2h, con emergencias)
	@echo "$(GREEN)🎬 Ejecutando simulación demo...$(NC)"
	$(PYTHON) src/simulador.py --hospitales chuac hm_modelo san_rafael --duracion 2 --velocidad 120 --emergencias

sim-full: ## Simulación completa (24h, 3 hospitales, con predicción)
	@echo "$(GREEN)🚀 Ejecutando simulación completa...$(NC)"
	$(PYTHON) src/simulador.py --hospitales chuac hm_modelo san_rafael --duracion 24 --velocidad 60

# ═══════════════════════════════════════════════════════════════════
# DEPENDENCIAS
# ═══════════════════════════════════════════════════════════════════

install: ## Instala dependencias localmente
	@echo "$(GREEN)📦 Instalando dependencias...$(NC)"
	pip install -r requirements.txt
	@echo "$(GREEN)✓ Dependencias instaladas$(NC)"

install-dev: ## Instala dependencias de desarrollo
	@echo "$(GREEN)📦 Instalando dependencias de desarrollo...$(NC)"
	pip install -r requirements.txt
	pip install pytest pytest-cov black flake8
	@echo "$(GREEN)✓ Dependencias de desarrollo instaladas$(NC)"

# ═══════════════════════════════════════════════════════════════════
# TESTING - Tests locales (más rápido)
# ═══════════════════════════════════════════════════════════════════

test-quick: ## Test rápido de integración (~5 seg)
	@echo "$(BLUE)⚡ Ejecutando test rápido...$(NC)"
	@$(PYTHON) tests/test_integracion_simple.py

test-predictor: ## Test del predictor de demanda (~10 seg)
	@echo "$(BLUE)🔮 Ejecutando test del predictor...$(NC)"
	@$(PYTHON) tests/test_predictor_demanda.py

test-sim: ## Test con simulación corta (~10 seg)
	@echo "$(BLUE)🏥 Ejecutando test con simulación...$(NC)"
	@$(PYTHON) tests/test_ejecucion_rapida.py

test-all: ## Ejecuta todos los tests secuencialmente
	@echo "$(BLUE)🧪 Ejecutando todos los tests...$(NC)"
	@echo ""
	@echo "$(YELLOW)1/3 Test de integración...$(NC)"
	@$(PYTHON) tests/test_integracion_simple.py
	@echo ""
	@echo "$(YELLOW)2/3 Test del predictor...$(NC)"
	@$(PYTHON) tests/test_predictor_demanda.py
	@echo ""
	@echo "$(YELLOW)3/3 Test de simulación...$(NC)"
	@$(PYTHON) tests/test_ejecucion_rapida.py
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)✅ TODOS LOS TESTS COMPLETADOS$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"

test: test-all ## Alias para test-all

test-pytest: ## Ejecuta tests con pytest
	@echo "$(BLUE)🧪 Ejecutando tests con pytest...$(NC)"
	PYTHONPATH=src pytest tests/ -v

test-cov: ## Ejecuta tests con cobertura
	@echo "$(BLUE)📊 Ejecutando tests con cobertura...$(NC)"
	PYTHONPATH=src pytest tests/ --cov=src --cov-report=html --cov-report=term

# ═══════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════

test-mqtt: ## Prueba la conexión MQTT
	@echo "$(GREEN)🔌 Probando conexión MQTT...$(NC)"
	@docker exec urgencias-mqtt mosquitto_pub -h localhost -t "test/topic" -m "Test desde Makefile" && echo "$(GREEN)✓ MQTT funcionando$(NC)" || echo "$(RED)✗ Error en MQTT$(NC)"

backup: ## Crea backup de los volúmenes
	@echo "$(GREEN)💾 Creando backup...$(NC)"
	@mkdir -p backups
	@docker run --rm -v gemelo-digital-hospitalario_influxdb_data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/influxdb_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@docker run --rm -v gemelo-digital-hospitalario_grafana_data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/grafana_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@docker run --rm -v gemelo-digital-hospitalario_nodered_data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/nodered_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@echo "$(GREEN)✓ Backup completado en ./backups/$(NC)"

format: ## Formatea el código con black
	@echo "$(BLUE)✨ Formateando código...$(NC)"
	black src/ tests/

lint: ## Ejecuta linter
	@echo "$(BLUE)🔍 Ejecutando linter...$(NC)"
	flake8 src/ tests/ --max-line-length=120

# ═══════════════════════════════════════════════════════════════════
# QUICK START - Comandos comunes
# ═══════════════════════════════════════════════════════════════════

start: up ## Inicia el sistema completo
	@echo "$(GREEN)✓ Sistema iniciado. Ejecuta 'make demo' para ver una simulación.$(NC)"

demo: sim-demo ## Ejecuta una simulación demo

stop: down ## Detiene todo

verify: test-quick ## Verifica que todo funciona

# ═══════════════════════════════════════════════════════════════════
# DESARROLLO
# ═══════════════════════════════════════════════════════════════════

dev-setup: install-dev ## Configura entorno de desarrollo
	@echo "$(GREEN)✓ Entorno de desarrollo configurado$(NC)"
	@echo "$(YELLOW)Ejecuta 'make test-all' para verificar$(NC)"

dev-test: ## Loop de desarrollo con tests
	@echo "$(BLUE)🔄 Modo desarrollo: ejecutando tests en loop...$(NC)"
	@while true; do \
		make test-quick; \
		echo "$(YELLOW)Presiona Ctrl+C para salir, o espera 5 segundos para re-ejecutar...$(NC)"; \
		sleep 5; \
	done
