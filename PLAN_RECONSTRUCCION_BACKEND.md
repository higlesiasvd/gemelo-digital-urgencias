# Plan de Reconstruccion del Backend - Gemelo Digital Hospitalario

## Resumen Ejecutivo

Reconstruccion completa del backend eliminando MQTT y arquitecturas DDD complejas,
utilizando exclusivamente **Kafka** como bus de eventos y **Node-RED** como plataforma de
orquestacion visual.

---

## 1. ARCHIVOS A PRESERVAR

### 1.1 Docker Compose (modificar, no eliminar)
- `/docker-compose.yml` - Se modificara para quitar MQTT y ajustar servicios

### 1.2 APIs Externas (copiar a nueva estructura)
- `src/infrastructure/external_services/weather_service.py` - Open-Meteo API
- `src/infrastructure/external_services/football_service.py` - TheSportsDB API
- `src/infrastructure/external_services/events_service.py` - Eventos locales
- `src/infrastructure/external_services/holidays_service.py` - Festivos

### 1.3 Chatbot MCP (adaptar a Kafka)
- `src/infrastructure/mcp_server.py` - Se adaptara para usar Kafka en lugar de MQTT

---

## 2. NUEVA ESTRUCTURA DE ARCHIVOS

```
backend/
  simulator/
    __init__.py
    main.py                    # Entry point del simulador
    patient_generator.py       # Generador de pacientes
    hospital_simulation.py     # Simulacion por hospital
    flow_engine.py             # Motor de flujo de pacientes
    demand_factors.py          # Factores de demanda externa

  coordinator/
    __init__.py
    main.py                    # Entry point del coordinador
    saturation_monitor.py      # Monitor de saturacion
    diversion_manager.py       # Gestor de derivaciones
    scaling_controller.py      # Controlador de escalado CHUAC

  prophet_service/
    __init__.py
    main.py                    # Entry point del servicio Prophet
    predictor.py               # Predicciones con Prophet
    whatif_scenarios.py        # Escenarios what-if

  api/
    __init__.py
    main.py                    # FastAPI entry point
    staff_routes.py            # Endpoints de personal
    simulation_routes.py       # Endpoints de simulacion
    prediction_routes.py       # Endpoints de prediccion

  chatbot/
    __init__.py
    mcp_server.py              # Chatbot con Groq Llama-3 70B
    tools.py                   # Herramientas MCP

  common/
    __init__.py
    schemas.py                 # Esquemas Pydantic centralizados
    kafka_client.py            # Cliente Kafka reutilizable
    config.py                  # Configuracion centralizada
    models.py                  # Modelos de base de datos

  external_apis/
    __init__.py
    weather_service.py         # Preservado
    football_service.py        # Preservado
    events_service.py          # Preservado
    holidays_service.py        # Preservado

  postgres/
    init.sql                   # Script de inicializacion
    migrations/
      001_initial_schema.sql

  nodered/
    flows.json                 # Flujos con Kafka
    settings.js
    Dockerfile

  samples/
    sample.json                # 100 pacientes
    heavy_sample.json          # 2000-5000 pacientes

  tests/
    __init__.py
    smoke_test.sh              # Test de integracion
    test_simulator.py
    test_coordinator.py
    test_prophet.py

docker-compose.yml             # Actualizado sin MQTT
Makefile
README.md
```

---

## 3. KAFKA TOPICS

### Topics definidos:
| Topic | Productor | Consumidor | Descripcion |
|-------|-----------|------------|-------------|
| `patient-arrivals` | Simulator | Coordinator, Node-RED | Llegada de pacientes |
| `triage-results` | Simulator | Coordinator, Node-RED | Resultados de triaje |
| `consultation-events` | Simulator | Coordinator, Node-RED | Eventos de consulta |
| `diversion-alerts` | Coordinator | Simulator, Node-RED, Chatbot | Alertas de derivacion |
| `staff-state` | API | Coordinator, Chatbot | Estado del personal |
| `staff-load` | Simulator | Coordinator, Node-RED | Carga del personal |
| `doctor-assigned` | API | Coordinator, Simulator | Medico asignado |
| `doctor-unassigned` | API | Coordinator, Simulator | Medico desasignado |
| `capacity-change` | API/Coordinator | Simulator, Node-RED | Cambio de capacidad |
| `hospital-stats` | Simulator | Chatbot, Node-RED | Estadisticas hospital |
| `system-context` | Simulator | Chatbot, Node-RED | Contexto externo |

---

## 4. MODELADO DEL PERSONAL

### CHUAC (Hospital de Referencia)
| Area | Unidades | Personal Base | Escalable |
|------|----------|---------------|-----------|
| Ventanillas | 2 | 1 celador cada una | No |
| Boxes Triaje | 5 | 2 enfermeras por box | No |
| Consultas | 10 | 2 enfermeras + 1-4 medicos | Si (medicos) |

**Reglas de escalado CHUAC:**
- Consultas pueden escalar de 1 a 4 medicos
- Medicos extra SOLO de `lista_sergas`
- Cada medico extra: velocidad consulta x1.25 (hasta x4 con 4 medicos)

### HM Modelo
| Area | Unidades | Personal | Escalable |
|------|----------|----------|-----------|
| Ventanilla | 1 | 1 celador | No |
| Box Triaje | 1 | 2 enfermeras | No |
| Consultas | 4 | 2 enfermeras + 1 medico | No |

### San Rafael
| Area | Unidades | Personal | Escalable |
|------|----------|----------|-----------|
| Ventanilla | 1 | 1 celador | No |
| Box Triaje | 1 | 2 enfermeras | No |
| Consultas | 4 | 2 enfermeras + 1 medico | No |

---

## 5. BASE DE DATOS POSTGRESQL

### Tabla: staff
```sql
CREATE TABLE staff (
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('celador', 'enfermeria', 'medico')),
    hospital_id VARCHAR(20) NOT NULL,
    asignacion_actual VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'available' CHECK (estado IN ('available', 'busy', 'off-shift')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: consultas
```sql
CREATE TABLE consultas (
    consulta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id VARCHAR(20) NOT NULL,
    numero_consulta INT NOT NULL,
    enfermeras_asignadas INT DEFAULT 2,
    medicos_asignados INT DEFAULT 1 CHECK (medicos_asignados BETWEEN 1 AND 4),
    activa BOOLEAN DEFAULT true,
    UNIQUE(hospital_id, numero_consulta)
);
```

### Tabla: lista_sergas
```sql
CREATE TABLE lista_sergas (
    medico_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    especialidad VARCHAR(50),
    disponible BOOLEAN DEFAULT true,
    asignado_a_hospital VARCHAR(20),
    asignado_a_consulta INT,
    fecha_asignacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. INFLUXDB - SERIES TEMPORALES

### Measurements:
| Measurement | Tags | Fields |
|-------------|------|--------|
| `tiempos_espera` | hospital | ventanilla, triaje, consulta, total |
| `tiempos_triaje` | hospital, nivel | duracion |
| `tiempos_consulta` | hospital, nivel | duracion, medicos |
| `carga_personal` | hospital, rol | ocupados, total, ratio |
| `saturacion_hospital` | hospital | boxes, consultas, global |
| `eventos_pacientes` | hospital, tipo | count |
| `derivaciones` | origen, destino | count, motivo |

---

## 7. ENDPOINTS API REST

### Gestion de Personal (CHUAC)
```
POST /staff/assign
Body: { medico_id: UUID, hospital_id: "chuac", consulta_id: int }
Response: { success: bool, medico: {...}, kafka_event_id: string }

POST /staff/unassign
Body: { medico_id: UUID }
Response: { success: bool, medico: {...}, kafka_event_id: string }
```

### Escalado de Consultas (CHUAC)
```
POST /chuac/consultas/{id}/scale
Query: ?to=1|2|3|4
Response: {
  consulta_id: int,
  medicos_previos: int,
  medicos_nuevos: int,
  velocidad_factor: float
}
```

### Simulacion
```
POST /simulation/start
POST /simulation/stop
GET /simulation/status
POST /simulation/load-sample?type=normal|heavy
```

### Prediccion
```
POST /predict
Body: {
  hospital_id: string,
  hours_ahead: int,
  scenario: { lluvia: bool, evento: bool, personal_reducido: float }
}
```

---

## 8. FLUJO DE SIMULACION

```
1. LLEGADA
   - Factor base segun hospital (CHUAC > Modelo > San Rafael)
   - Multiplicadores: clima, eventos, festivos, hora del dia

2. VENTANILLA (2 min)
   - 1 celador por ventanilla
   - Cola FIFO

3. SALA ESPERA TRIAJE
   - Sin limite de capacidad

4. TRIAJE (5 min base)
   - Clasificacion Manchester (ROJO, NARANJA, AMARILLO, VERDE, AZUL)
   - 2 enfermeras por box

5. SALA ESPERA PRIORIZADA
   - Ordenada por nivel triaje + tiempo espera

6. CONSULTA
   - Tiempo base segun nivel triaje:
     - ROJO: 45 min, NARANJA: 30 min, AMARILLO: 20 min, VERDE: 15 min, AZUL: 10 min
   - Tiempo real = Tiempo base / num_medicos

7. ALTA/OBSERVACION
   - Alta: 85%
   - Observacion: 15%
```

### Reglas de Derivacion:
- Paciente ROJO/NARANJA en Modelo/San Rafael -> Derivar a CHUAC
- CHUAC saturacion > 90% -> Derivar VERDE/AZUL a otros hospitales
- Emit `diversion-alerts` en Kafka

---

## 9. NODE-RED DASHBOARD

### Flujos Kafka:
- Consumer para cada topic
- Parseo y almacenamiento en InfluxDB
- Dashboard visual con:
  - Lista pacientes por estado
  - Panel de triaje (colores Manchester)
  - Tiempos de espera en tiempo real
  - Estado de consultas y personal
  - Alertas de derivacion
  - Disponibilidad medicos CHUAC
  - Estado del coordinador

---

## 10. DOCKER COMPOSE ACTUALIZADO

### Servicios:
1. **postgres** - Base de datos relacional
2. **zookeeper** - Coordinador Kafka
3. **kafka** - Message broker
4. **kafka-ui** - Interfaz web Kafka
5. **influxdb** - Series temporales
6. **grafana** - Dashboards
7. **node-red** - Orquestacion visual
8. **simulator** - Servicio de simulacion
9. **coordinator** - Servicio de coordinacion
10. **prophet** - Servicio de prediccion
11. **api** - API REST
12. **chatbot** - MCP Server con Groq

**ELIMINADOS:** mosquitto (MQTT)

---

## 11. PASOS DE IMPLEMENTACION

### Fase 1: Limpieza (Eliminar archivos)
1. Eliminar directorio `src/` completo excepto APIs externas
2. Eliminar `docker/mosquitto/`
3. Crear nueva estructura `backend/`

### Fase 2: Esquemas y Configuracion
1. Crear `backend/common/schemas.py` con todos los esquemas Pydantic
2. Crear `backend/common/kafka_client.py`
3. Crear `backend/common/config.py`
4. Crear `backend/postgres/init.sql`

### Fase 3: Servicios Core
1. Implementar `backend/simulator/`
2. Implementar `backend/coordinator/`
3. Implementar `backend/api/`

### Fase 4: Servicios Auxiliares
1. Implementar `backend/prophet_service/`
2. Adaptar `backend/chatbot/` (MCP con Kafka)
3. Copiar `backend/external_apis/`

### Fase 5: Integracion
1. Crear `backend/nodered/flows.json` con Kafka
2. Actualizar `docker-compose.yml`
3. Crear `samples/sample.json` y `heavy_sample.json`

### Fase 6: Tests
1. Crear `tests/smoke_test.sh`
2. Crear tests unitarios

---

## 12. ESTIMACION DE ARCHIVOS A CREAR

| Directorio | Archivos | Lineas aprox |
|------------|----------|--------------|
| backend/simulator | 5 | ~800 |
| backend/coordinator | 4 | ~400 |
| backend/prophet_service | 3 | ~300 |
| backend/api | 4 | ~500 |
| backend/chatbot | 2 | ~400 |
| backend/common | 4 | ~600 |
| backend/external_apis | 4 | ~600 (preservados) |
| backend/postgres | 2 | ~100 |
| backend/nodered | 2 | ~800 (flows.json) |
| backend/samples | 2 | ~1000 |
| backend/tests | 4 | ~300 |
| raiz | 3 | ~300 |
| **TOTAL** | **~39** | **~6100** |

---

## CONFIRMACION REQUERIDA

Antes de proceder, confirmar:

1. Se eliminaran TODOS los archivos en `src/` excepto los listados para preservar
2. Se eliminara `docker/mosquitto/` completamente
3. MQTT sera eliminado del sistema
4. La nueva estructura estara en `backend/` (no en `src/`)
5. El chatbot MCP usara Kafka para recibir actualizaciones (no MQTT)

Proceder con la implementacion?
