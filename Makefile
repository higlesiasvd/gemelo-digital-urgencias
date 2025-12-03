.PHONY: help up down restart logs status clean build ps shell-influx shell-nodered shell-grafana shell-mqtt install build-simulador run-simulador test-simulador test-coordinador

# Variables
COMPOSE_FILE := docker-compose.yml
PROJECT_NAME := gemelo-digital-hospitalario

# Colores para output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

help: ## Muestra esta ayuda
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Gemelo Digital Hospitalario - Comandos disponibles$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

up: ## Inicia todos los servicios
	@echo "$(GREEN)Iniciando servicios...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✓ Servicios iniciados$(NC)"
	@make urls

down: ## Detiene todos los servicios
	@echo "$(YELLOW)Deteniendo servicios...$(NC)"
	docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✓ Servicios detenidos$(NC)"

restart: ## Reinicia todos los servicios
	@echo "$(YELLOW)Reiniciando servicios...$(NC)"
	docker compose -f $(COMPOSE_FILE) restart
	@echo "$(GREEN)✓ Servicios reiniciados$(NC)"

build: ## Reconstruye los contenedores
	@echo "$(GREEN)Reconstruyendo contenedores...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache

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

status: ## Muestra el estado de los servicios
	@echo "$(GREEN)Estado de los servicios:$(NC)"
	docker compose -f $(COMPOSE_FILE) ps

ps: status ## Alias para status

clean: ## Elimina contenedores, volúmenes y redes
	@echo "$(RED)¡ATENCIÓN! Esto eliminará todos los datos.$(NC)"
	@read -p "¿Estás seguro? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	@echo "$(GREEN)✓ Limpieza completada$(NC)"

clean-all: ## Limpieza profunda incluyendo imágenes
	@echo "$(RED)¡ATENCIÓN! Esto eliminará todos los datos e imágenes.$(NC)"
	@read -p "¿Estás seguro? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans --rmi all
	@echo "$(GREEN)✓ Limpieza profunda completada$(NC)"

shell-mqtt: ## Accede al shell de Mosquitto
	docker exec -it urgencias-mqtt sh

shell-influx: ## Accede al shell de InfluxDB
	docker exec -it urgencias-influxdb bash

shell-grafana: ## Accede al shell de Grafana
	docker exec -it urgencias-grafana bash

shell-nodered: ## Accede al shell de Node-RED
	docker exec -it urgencias-nodered bash

urls: ## Muestra las URLs de acceso
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  URLs de acceso:$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "  $(YELLOW)Grafana:$(NC)    http://localhost:3001  (admin/admin)"
	@echo "  $(YELLOW)Node-RED:$(NC)   http://localhost:1880"
	@echo "  $(YELLOW)InfluxDB:$(NC)   http://localhost:8086  (admin/adminadmin)"
	@echo "  $(YELLOW)MQTT:$(NC)       localhost:1883"
	@echo "  $(YELLOW)MQTT WS:$(NC)    localhost:9001"
	@echo ""

test-mqtt: ## Prueba la conexión MQTT
	@echo "$(GREEN)Probando conexión MQTT...$(NC)"
	@docker exec urgencias-mqtt mosquitto_pub -h localhost -t "test/topic" -m "Hola desde Makefile" && echo "$(GREEN)✓ MQTT funcionando$(NC)" || echo "$(RED)✗ Error en MQTT$(NC)"

backup: ## Crea backup de los volúmenes
	@echo "$(GREEN)Creando backup...$(NC)"
	@mkdir -p backups
	@docker run --rm -v gemelo-digital-hospitalario_influxdb_data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/influxdb_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@docker run --rm -v gemelo-digital-hospitalario_grafana_data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/grafana_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@docker run --rm -v gemelo-digital-hospitalario_nodered_data:/data -v $(PWD)/backups:/backup alpine tar czf /backup/nodered_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
	@echo "$(GREEN)✓ Backup completado en ./backups/$(NC)"

# ═══════════════════════════════════════════════════════════════════
# SIMULADOR - Construcción y ejecución
# ═══════════════════════════════════════════════════════════════════

build-simulador: ## Construye la imagen del simulador
	@echo "$(GREEN)Construyendo imagen del simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) build simulador
	@echo "$(GREEN)✓ Imagen construida$(NC)"

rebuild-simulador: ## Reconstruye la imagen del simulador sin caché
	@echo "$(GREEN)Reconstruyendo imagen del simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache simulador
	@echo "$(GREEN)✓ Imagen reconstruida$(NC)"

run-simulador: ## Ejecuta el simulador (una vez)
	@echo "$(GREEN)Ejecutando simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm simulador

start-simulador: ## Inicia el simulador en segundo plano
	@echo "$(GREEN)Iniciando simulador en segundo plano...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d simulador

stop-simulador: ## Detiene el simulador
	@echo "$(YELLOW)Deteniendo simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) stop simulador

logs-simulador: ## Muestra los logs del simulador
	docker compose -f $(COMPOSE_FILE) logs -f simulador

shell-simulador: ## Accede al shell del simulador
	docker exec -it urgencias-simulador bash

# ═══════════════════════════════════════════════════════════════════
# DEPENDENCIAS - Instalación dentro del contenedor
# ═══════════════════════════════════════════════════════════════════

install: build-simulador ## Instala todas las dependencias (construye el contenedor)
	@echo "$(GREEN)✓ Dependencias instaladas en el contenedor$(NC)"

install-dev: ## Instala dependencias de desarrollo localmente
	@echo "$(GREEN)Instalando dependencias localmente...$(NC)"
	pip install -r requirements.txt
	@echo "$(GREEN)✓ Dependencias instaladas$(NC)"

update-deps: ## Actualiza requirements.txt y reconstruye
	@echo "$(GREEN)Actualizando dependencias...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache simulador
	@echo "$(GREEN)✓ Dependencias actualizadas$(NC)"

# ═══════════════════════════════════════════════════════════════════
# TESTING
# ═══════════════════════════════════════════════════════════════════

test: ## Ejecuta todos los tests dentro del contenedor
	@echo "$(GREEN)Ejecutando todos los tests...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm simulador pytest tests/ -v

test-simulador: ## Ejecuta tests del simulador
	@echo "$(GREEN)Ejecutando tests del simulador...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm simulador python tests/test_simulacion.py

test-coordinador: ## Ejecuta tests del coordinador
	@echo "$(GREEN)Ejecutando tests del coordinador...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm simulador python tests/test_coordinador.py

test-integracion: ## Ejecuta tests de integración (requiere servicios activos)
	@echo "$(GREEN)Ejecutando tests de integración...$(NC)"
	@echo "$(YELLOW)Nota: Requiere que los servicios estén corriendo (make up)$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm simulador python tests/test_integracion.py

test-local: ## Ejecuta los tests localmente
	@echo "$(GREEN)Ejecutando tests localmente...$(NC)"
	PYTHONPATH=src pytest tests/ -v

test-local-simulador: ## Ejecuta tests del simulador localmente
	@echo "$(GREEN)Ejecutando tests del simulador localmente...$(NC)"
	python tests/test_simulacion.py

test-local-coordinador: ## Ejecuta tests del coordinador localmente
	@echo "$(GREEN)Ejecutando tests del coordinador localmente...$(NC)"
	python tests/test_coordinador.py

test-local-integracion: ## Ejecuta tests de integración localmente
	@echo "$(GREEN)Ejecutando tests de integración localmente...$(NC)"
	python tests/test_integracion.py