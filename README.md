# 🏥 Gemelo Digital Hospitalario - HealthVerse Coruña

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/docker-required-blue.svg" alt="Docker">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%2070B-purple.svg" alt="AI">
</p>

<p align="center">
  <strong>Sistema de simulación y visualización en tiempo real del servicio de urgencias hospitalarias de A Coruña, España</strong>
</p>

---

## 📋 Índice

1. [Descripción General](#-descripción-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#-tecnologías-utilizadas)
4. [Hospitales Simulados](#-hospitales-simulados)
5. [Flujo de Pacientes](#-flujo-de-pacientes)
6. [Características Principales](#-características-principales)
7. [Instalación y Configuración](#-instalación-y-configuración)
8. [Guía de Uso](#-guía-de-uso)
9. [API REST](#-api-rest)
10. [Topics de Kafka](#-topics-de-kafka)
11. [Frontend - Módulos](#-frontend---módulos)
12. [Sistema de IA (Chatbot)](#-sistema-de-ia-chatbot)
13. [Predicción de Demanda](#-predicción-de-demanda)
14. [Sistema de Incidentes](#-sistema-de-incidentes)
15. [Makefile - Comandos Rápidos](#-makefile---comandos-rápidos)
16. [Variables de Entorno](#-variables-de-entorno)
17. [Estructura del Proyecto](#-estructura-del-proyecto)
18. [Contribución](#-contribución)
19. [Licencia](#-licencia)

---

## 🎯 Descripción General

**HealthVerse Coruña** es un **gemelo digital** que simula el funcionamiento del servicio de urgencias de tres hospitales de A Coruña en tiempo real. El sistema permite:

- 🏃 Simular el flujo de pacientes desde su llegada hasta el alta
- 📊 Visualizar estadísticas en tiempo real con gráficos 3D interactivos
- 🤖 Consultar información mediante un chatbot con IA (Llama 70B)
- 🔮 Predecir demanda futura y ejecutar escenarios "what-if"
- 🚨 Simular incidentes urbanos que afectan a los hospitales
- 👨‍⚕️ Gestionar personal y escalar recursos dinámicamente
- 🗺️ Visualizar hospitales e incidentes en un mapa interactivo

### Objetivos del Proyecto

1. **Simulación realista**: Modelar el comportamiento de urgencias usando SimPy
2. **Visualización en tiempo real**: Dashboard 3D con Mantine y Framer Motion
3. **Predicción inteligente**: Uso de Prophet para forecasting de demanda
4. **Interactividad**: Chatbot con acceso a 12+ fuentes de datos en tiempo real
5. **Escalabilidad**: Arquitectura basada en microservicios y Kafka

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Dashboard│ │Hospitales│ │  Mapa  │ │Predictor│ │ Chatbot │            │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │
│       │           │           │           │           │                  │
│       └───────────┴───────────┼───────────┴───────────┘                  │
│                               │                                          │
│                         WebSocket + REST                                 │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────┐
│                          BACKEND                                          │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────┐           │
│  │  API     │  │  Chatbot   │  │ Prophet   │  │  Coordinator │           │
│  │ (FastAPI)│  │ (MCP+Groq) │  │ (ML)      │  │ (Derivaciones)│          │
│  └────┬─────┘  └──────┬─────┘  └─────┬─────┘  └──────┬───────┘           │
│       │               │              │               │                    │
│       └───────────────┴──────────────┴───────────────┘                    │
│                               │                                           │
│                          ┌────┴────┐                                      │
│                          │  KAFKA  │                                      │
│                          │ (12 topics)                                    │
│                          └────┬────┘                                      │
│                               │                                           │
│  ┌───────────────────────────────────────────────────────────────┐       │
│  │                      SIMULADOR (SimPy)                         │       │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │       │
│  │  │  CHUAC   │    │  Modelo  │    │San Rafael│                 │       │
│  │  │(referencia)   │(privado) │    │(comarcal)│                 │       │
│  │  └──────────┘    └──────────┘    └──────────┘                 │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────┐
│                        PERSISTENCIA                                       │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐   │
│  │ PostgreSQL │    │  InfluxDB  │    │  Grafana   │    │  Node-RED  │   │
│  │  (Staff)   │    │ (Métricas) │    │(Dashboards)│    │(Integración)│  │
│  └────────────┘    └────────────┘    └────────────┘    └────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tecnologías Utilizadas

### Backend
| Tecnología | Uso |
|------------|-----|
| **Python 3.11** | Lenguaje principal del backend |
| **FastAPI** | API REST de alto rendimiento |
| **SimPy** | Motor de simulación de eventos discretos |
| **Kafka** | Bus de mensajes para eventos en tiempo real |
| **PostgreSQL** | Base de datos para personal y configuración |
| **InfluxDB** | Base de datos de series temporales |
| **Prophet** | Predicción de demanda (Facebook) |
| **Groq + Llama 70B** | IA para el chatbot inteligente |

### Frontend
| Tecnología | Uso |
|------------|-----|
| **React 18** | Framework de UI |
| **TypeScript** | Tipado estático |
| **Vite** | Build tool ultra-rápido |
| **Mantine v7** | Librería de componentes UI |
| **Framer Motion** | Animaciones fluidas |
| **TanStack Query** | Gestión de estado del servidor |
| **Zustand** | Estado global ligero |
| **Recharts** | Gráficos y visualizaciones |
| **Leaflet** | Mapas interactivos |

### Infraestructura
| Tecnología | Uso |
|------------|-----|
| **Docker Compose** | Orquestación de contenedores |
| **Nginx** | Servidor web para frontend |
| **Node-RED** | Procesamiento visual de flujos |
| **Grafana** | Dashboards adicionales de métricas |
| **Kafka UI** | Monitorización de topics |

---

## 🏥 Hospitales Simulados

El sistema simula **3 hospitales** con capacidades diferentes:

### CHUAC (Hospital de Referencia)
| Recurso | Cantidad | Características |
|---------|----------|-----------------|
| Ventanillas | 2 | 1 celador cada una |
| Boxes de Triaje | 5 | 2 enfermeras cada uno |
| Consultas | 10 | **1-4 médicos** (escalable) |

- ✅ Hospital principal y de referencia
- ✅ Recibe derivaciones de hospitales pequeños
- ✅ **Escalado dinámico**: Cada consulta puede tener de 1 a 4 médicos
- ✅ Sistema SERGAS para lista de médicos de guardia

### HM Modelo (Hospital Privado)
| Recurso | Cantidad | Características |
|---------|----------|-----------------|
| Ventanillas | 1 | 1 celador |
| Boxes de Triaje | 1 | 2 enfermeras |
| Consultas | 4 | 1 médico fijo |

- ❌ No escalable
- ⚠️ Deriva pacientes graves (ROJO/NARANJA) a CHUAC

### San Rafael (Hospital Comarcal)
| Recurso | Cantidad | Características |
|---------|----------|-----------------|
| Ventanillas | 1 | 1 celador |
| Boxes de Triaje | 1 | 2 enfermeras |
| Consultas | 4 | 1 médico fijo |

- ❌ No escalable
- ⚠️ Deriva pacientes graves (ROJO/NARANJA) a CHUAC

---

## 🔄 Flujo de Pacientes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE URGENCIAS                           │
└─────────────────────────────────────────────────────────────────────┘

   LLEGADA          VENTANILLA          TRIAJE           CONSULTA         SALIDA
      │                 │                  │                 │               │
      ▼                 ▼                  ▼                 ▼               ▼
  ┌───────┐        ┌─────────┐        ┌─────────┐       ┌─────────┐    ┌─────────┐
  │Paciente│  ───▶ │Registro │  ───▶  │Evaluación│ ───▶ │Atención │───▶│  ALTA   │
  │ llega  │       │ (~2min) │        │ (~5min)  │      │(5-30min)│    │  (85%)  │
  └───────┘        └─────────┘        └────┬────┘       └─────────┘    └─────────┘
                                           │                                 │
                                           │                            ┌─────────┐
                                           │                            │OBSERVAR │
                                           ▼                            │  (15%)  │
                                    ┌──────────────┐                    └─────────┘
                                    │Clasificación │
                                    │  Manchester  │
                                    └──────┬───────┘
                                           │
               ┌───────────────────────────┼───────────────────────────┐
               │           │               │               │           │
               ▼           ▼               ▼               ▼           ▼
           ┌──────┐   ┌────────┐     ┌─────────┐    ┌───────┐   ┌──────┐
           │🔴ROJO│   │🟠NARANJA│    │🟡AMARILLO│   │🟢VERDE│   │🔵AZUL│
           │ 0min │   │ 10min  │     │  60min  │    │120min │   │240min│
           └──────┘   └────────┘     └─────────┘    └───────┘   └──────┘
```

### Tiempos de Consulta por Nivel de Triaje

| Nivel | Color | Urgencia | Tiempo Máx. Espera | Tiempo Consulta |
|-------|-------|----------|-------------------|-----------------|
| 1 | 🔴 Rojo | Emergencia | 0 minutos | 30-45 min |
| 2 | 🟠 Naranja | Muy urgente | 10 minutos | 25-30 min |
| 3 | 🟡 Amarillo | Urgente | 60 minutos | 15-20 min |
| 4 | 🟢 Verde | Normal | 120 minutos | 10-15 min |
| 5 | 🔵 Azul | No urgente | 240 minutos | 5-10 min |

### Derivaciones

Los pacientes con triaje **ROJO** o **NARANJA** en hospitales pequeños (Modelo, San Rafael) son **derivados automáticamente** al CHUAC, que es el hospital de referencia.

---

## ✨ Características Principales

### 📊 Dashboard en Tiempo Real
- Vista 3D de los tres hospitales con cubos animados
- Indicadores de saturación por colores (verde → rojo)
- Contadores de pacientes en cola, siendo atendidos y atendidos
- Animaciones fluidas con Framer Motion
- Cambio entre vista "Flujo" y vista "3D"

### 🗺️ Mapa Interactivo
- Ubicación geográfica de los hospitales en A Coruña
- Marcadores con color según nivel de saturación
- Visualización de incidentes activos en la ciudad
- Información contextual (clima, temperatura)

### 🚨 Sistema de Incidentes
- Generación de incidentes urbanos (accidentes, intoxicaciones, etc.)
- Inyección de pacientes adicionales a los hospitales afectados
- Visualización en tiempo real en el mapa
- Control desde el frontend para crear incidentes personalizados

### 🔮 Predictor de Demanda
- Predicciones con Prophet (Facebook)
- Escenarios "What-If" configurables
- Gráficos de demanda proyectada
- Factores de influencia (clima, eventos, festivos)

### 👨‍⚕️ Gestión de Personal
- Lista de médicos SERGAS disponibles
- Asignación dinámica a consultas del CHUAC
- Escalado de 1-4 médicos por consulta
- Visualización de velocidad de atención (1x-4x)

### 🤖 Chatbot Inteligente
- Powered by **Groq Llama 3.3 70B**
- Acceso a 12+ fuentes de datos en tiempo real
- Respuestas contextualizadas sobre el estado del sistema
- Widget flotante disponible en toda la aplicación

### 📈 Factores Externos
- **Clima**: Integración con Open-Meteo API (A Coruña)
- **Eventos deportivos**: Partidos del Deportivo usando TheSportsDB
- **Festivos**: Calendario de festivos locales
- Factor de demanda calculado dinámicamente

---

## 🚀 Instalación y Configuración

### Prerequisitos

- **Docker Desktop** (v20.10+)
- **Docker Compose** (v2.0+)
- **Make** (opcional pero recomendado)
- **Node.js** (v18+ para desarrollo local del frontend)

### Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/gemelo-digital-hospitalario.git
cd gemelo-digital-hospitalario

# 2. Iniciar todo el sistema
make start

# 3. Ver las URLs de acceso
make urls
```

### URLs del Sistema

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Frontend UI** | http://localhost:3003 | - |
| **API REST** | http://localhost:8000 | - |
| **API Docs (Swagger)** | http://localhost:8000/docs | - |
| **Prophet API** | http://localhost:8001 | - |
| **Chatbot MCP** | http://localhost:8080 | - |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Node-RED** | http://localhost:1880 | - |
| **Kafka UI** | http://localhost:8085 | - |
| **InfluxDB** | http://localhost:8086 | admin / adminadmin |

---

## 📖 Guía de Uso

### Dashboard Principal

1. Acceder a http://localhost:3003
2. Vista por defecto: Dashboard con 3 hospitales en vista 3D
3. Alternar entre vista "Flujo" y "3D" con el selector
4. Hacer clic en áreas para ver pacientes específicos

### Control de Simulación

La simulación se controla desde la página `/simulacion`:
- Ajustar velocidad (1x - 50x)
- Ver estadísticas en tiempo real
- Pausar/reanudar simulación

### Crear Incidentes

Desde la página `/mapa`:
1. Usar el botón "Crear Incidente"
2. Seleccionar tipo, gravedad y ubicación
3. Observar pacientes adicionales llegando a hospitales

### Escalar Personal (Solo CHUAC)

Desde la página `/personal`:
1. Ver lista de médicos SERGAS disponibles
2. Asignar médicos a consultas específicas (1-4)
3. Ver cambio de velocidad de atención

### Usar el Chatbot

El chatbot está disponible como widget flotante (esquina inferior derecha):
- "¿Cuál es el estado del CHUAC?"
- "¿Cuántos pacientes están esperando?"
- "¿Qué hospital tiene menos saturación?"

---

## 🔌 API REST

### Base URL
```
http://localhost:8000
```

### Endpoints Principales

#### Hospitales
```http
GET /hospitals
```
Lista la configuración de todos los hospitales.

#### Personal
```http
GET /staff
GET /staff/{hospital_id}
POST /staff/{hospital_id}/consulta/{consulta_id}/assign
DELETE /staff/{hospital_id}/consulta/{consulta_id}/unassign/{medico_id}
```

#### Simulación
```http
GET /simulation/status
POST /simulation/speed
POST /simulation/control
```

#### Predicciones
```http
POST /prediction/demand
POST /prediction/whatif
```

#### Incidentes
```http
GET /incidents/active
POST /incidents/create
DELETE /incidents/{incident_id}
```

### Ejemplo: Cambiar Velocidad de Simulación

```bash
curl -X POST http://localhost:8000/simulation/speed \
  -H "Content-Type: application/json" \
  -d '{"speed": 20.0}'
```

### Ejemplo: Asignar Médico a Consulta

```bash
curl -X POST http://localhost:8000/staff/chuac/consulta/5/assign \
  -H "Content-Type: application/json" \
  -d '{"medico_id": "sergas-001"}'
```

---

## 📬 Topics de Kafka

El sistema usa **12 topics de Kafka** para comunicación entre microservicios:

| Topic | Productor | Descripción |
|-------|-----------|-------------|
| `patient-arrivals` | Simulador | Llegadas de pacientes normales |
| `incident-patients` | API | Pacientes de incidentes |
| `triage-results` | Simulador | Resultados de triaje |
| `consultation-events` | Simulador | Inicio/fin de consultas |
| `diversion-alerts` | Coordinator | Alertas de derivación |
| `staff-state` | API | Estado del personal |
| `staff-load` | Simulador | Carga de trabajo |
| `doctor-assigned` | API | Asignación de médicos |
| `doctor-unassigned` | API | Desasignación de médicos |
| `capacity-change` | API | Cambios de capacidad |
| `hospital-stats` | Simulador | Estadísticas de hospitales |
| `system-context` | Simulador | Contexto externo (clima, eventos) |

---

## 🖥 Frontend - Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard** | `/` | Vista 3D de hospitales con estadísticas |
| **Hospitales** | `/hospitales` | Lista y detalle de hospitales |
| **CHUAC** | `/hospitales/chuac` | Detalle del CHUAC |
| **Personal** | `/personal` | Gestión de médicos y asignaciones |
| **Derivaciones** | `/derivaciones` | Historial de derivaciones |
| **Simulación** | `/simulacion` | Control de la simulación |
| **Predictor** | `/demanda/predictor` | Predicciones y what-if |
| **Mapa** | `/mapa` | Mapa interactivo de A Coruña |
| **Configuración** | `/configuracion` | Ajustes del sistema |

---

## 🤖 Sistema de IA (Chatbot)

### Arquitectura MCP

El chatbot usa el protocolo **Model Context Protocol (MCP)** para:
1. Consumir datos de Kafka en tiempo real
2. Consultar PostgreSQL para información de personal
3. Contextualizar respuestas con estado actual del sistema

### Herramientas MCP Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `get_hospital_status` | Estado de hospitales |
| `get_waiting_times` | Tiempos de espera |
| `get_best_hospital` | Recomendar hospital |
| `get_system_summary` | Resumen del sistema |
| `get_staff_info` | Información de personal |
| `get_recent_patients` | Pacientes recientes |
| `get_active_incidents` | Incidentes activos |
| `get_capacity_status` | Estado de capacidad |
| `get_complete_snapshot` | Snapshot completo |

### Configuración de Groq

```env
GROQ_API_KEY=tu_api_key_aqui
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## 🔮 Predicción de Demanda

### Prophet Service

El servicio de predicción usa **Facebook Prophet** para:
- Forecasting de demanda por hora
- Análisis de tendencias y estacionalidad
- Escenarios what-if configurables

### Factores de Demanda

| Factor | Rango | Descripción |
|--------|-------|-------------|
| **Clima** | 0.8 - 1.4 | Lluvia, frío, calor extremo |
| **Eventos** | 1.0 - 1.5 | Partidos de fútbol, conciertos |
| **Festivos** | 1.0 - 1.3 | Días festivos locales |
| **Hora del día** | 0.5 - 1.5 | Picos diurnos, mínimos nocturnos |

### Endpoints de Predicción

```http
POST /prediction/demand
Content-Type: application/json

{
  "hospital_id": "chuac",
  "horizon_hours": 24
}
```

---

## 🚨 Sistema de Incidentes

### Tipos de Incidentes

| Tipo | Pacientes | Gravedad Típica |
|------|-----------|-----------------|
| Accidente de tráfico | 2-6 | Alta |
| Intoxicación masiva | 5-15 | Media-Alta |
| Evento deportivo | 3-8 | Media |
| Incendio | 1-4 | Alta |
| Pelea masiva | 2-5 | Media |

### Crear Incidente via API

```bash
curl -X POST http://localhost:8000/incidents/create \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "accidente_trafico",
    "gravedad": "alta",
    "ubicacion": {"lat": 43.37, "lng": -8.40},
    "num_afectados": 4
  }'
```

---

## 🛠 Makefile - Comandos Rápidos

```bash
# ═══════════════════════════════════════════════════════════════
# COMANDOS PRINCIPALES
# ═══════════════════════════════════════════════════════════════

make start          # Inicia todo el sistema
make stop           # Detiene todo
make restart        # Reinicia servicios
make urls           # Muestra URLs de acceso
make status         # Estado de contenedores

# ═══════════════════════════════════════════════════════════════
# FRONTEND
# ═══════════════════════════════════════════════════════════════

make ui             # Inicia solo el frontend
make ui-dev         # Desarrollo local (npm run dev)
make ui-build       # Reconstruye el frontend

# ═══════════════════════════════════════════════════════════════
# LOGS
# ═══════════════════════════════════════════════════════════════

make logs           # Ver todos los logs
make logs-simulator # Logs del simulador
make logs-api       # Logs de la API
make logs-chatbot   # Logs del chatbot

# ═══════════════════════════════════════════════════════════════
# KAFKA
# ═══════════════════════════════════════════════════════════════

make kafka-topics   # Lista topics
make kafka-create   # Crea todos los topics

# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════

make db-shell       # Shell PostgreSQL
make db-reset       # Reinicia la base de datos

# ═══════════════════════════════════════════════════════════════
# TESTING
# ═══════════════════════════════════════════════════════════════

make smoke-test     # Smoke tests del sistema
make test-api       # Test endpoints API

# ═══════════════════════════════════════════════════════════════
# LIMPIEZA
# ═══════════════════════════════════════════════════════════════

make clean          # Elimina todo (incluye volúmenes)
```

---

## 🔧 Variables de Entorno

### Backend

```env
# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=urgencias_db
POSTGRES_USER=urgencias
POSTGRES_PASSWORD=urgencias_pass

# InfluxDB
INFLUX_URL=http://influxdb:8086
INFLUX_TOKEN=mi-token-secreto-urgencias-dt
INFLUX_ORG=urgencias
INFLUX_BUCKET=urgencias

# Simulación
SIMULATION_SPEED=10.0
SIMULATION_DURATION=0  # 0 = infinito

# IA
GROQ_API_KEY=tu_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# APIs Externas (opcionales)
FOOTBALL_API_KEY=tu_api_key
```

### Frontend

```env
VITE_INFLUXDB_URL=http://localhost:8086
VITE_INFLUXDB_TOKEN=mi-token-secreto-urgencias-dt
VITE_INFLUXDB_ORG=urgencias
VITE_INFLUXDB_BUCKET=urgencias
VITE_MCP_URL=http://localhost:8080
VITE_STAFF_API_URL=http://localhost:8000
```

---

## 📁 Estructura del Proyecto

```
gemelo-digital-hospitalario/
├── backend/
│   ├── api/                    # API REST (FastAPI)
│   │   ├── main.py            # Entry point
│   │   ├── staff_routes.py    # Rutas de personal
│   │   ├── simulation_routes.py
│   │   ├── prediction_routes.py
│   │   └── incident_routes.py
│   │
│   ├── chatbot/               # Chatbot MCP + Groq
│   │   ├── mcp_server.py      # Servidor principal
│   │   └── db_connector.py    # Conexión PostgreSQL
│   │
│   ├── common/                # Código compartido
│   │   ├── schemas.py         # Esquemas Pydantic (Kafka)
│   │   ├── kafka_client.py    # Cliente Kafka
│   │   ├── config.py          # Configuración
│   │   └── models.py          # Modelos SQLAlchemy
│   │
│   ├── coordinator/           # Coordinador de derivaciones
│   │   ├── main.py
│   │   ├── saturation_monitor.py
│   │   ├── diversion_manager.py
│   │   └── scaling_controller.py
│   │
│   ├── external_apis/         # APIs externas
│   │   ├── weather_service.py # Open-Meteo
│   │   └── football_service.py # TheSportsDB
│   │
│   ├── nodered/               # Node-RED flows
│   │   └── flows.json
│   │
│   ├── postgres/              # Inicialización BD
│   │   └── init.sql
│   │
│   ├── prophet_service/       # Predicciones ML
│   │   └── main.py
│   │
│   └── simulator/             # Motor de simulación
│       ├── main.py            # Entry point
│       ├── hospital_simulation.py
│       ├── flow_engine.py     # Lógica SimPy
│       ├── patient_generator.py
│       └── demand_factors.py
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Entry point
│   │   ├── components/        # Componentes globales
│   │   │   ├── Layout/
│   │   │   └── FloatingChat/
│   │   ├── features/          # Módulos de features
│   │   │   ├── dashboard/
│   │   │   ├── hospitals/
│   │   │   ├── staff/
│   │   │   ├── simulation/
│   │   │   ├── demand/
│   │   │   ├── map/
│   │   │   ├── twin/          # Vista 3D
│   │   │   └── mcp/           # Chatbot
│   │   ├── shared/
│   │   │   ├── api/           # Cliente API
│   │   │   ├── hooks/         # Hooks customizados
│   │   │   ├── store/         # Zustand
│   │   │   ├── theme/         # Estilos globales
│   │   │   └── types/         # TypeScript types
│   │   └── utils/
│   └── package.json
│
├── docker/                    # Dockerfiles
│   ├── api/
│   ├── coordinator/
│   ├── grafana/
│   ├── mcp/
│   ├── prophet/
│   └── simulador/
│
├── docker-compose.yml         # Orquestación
├── Makefile                   # Comandos rápidos
├── requirements.txt           # Dependencias Python
└── README.md                  # Este archivo
```


---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Contacto

- **Autor**: Hugo Iglesias

- **Proyecto**: https://github.com/higlesiasvd/gemelo-digital-hospitalario

---

<p align="center">
  <strong>HealthVerse Coruña</strong> | Gemelo Digital Hospitalario | 2025
</p>
