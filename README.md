# 🏥 Gemelo Digital de Urgencias Hospitalarias

> Sistema de simulación y predicción para servicios de urgencias hospitalarias usando eventos discretos (SimPy), con coordinación inteligente entre hospitales y visualización en tiempo real.

[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![SimPy](https://img.shields.io/badge/SimPy-4.1+-green.svg)](https://simpy.readthedocs.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📑 Índice

- [Características](#-características)
- [Quick Start](#-quick-start)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Testing](#-testing)
- [Visualización](#-visualización)
- [Configuración](#-configuración)
- [Documentación Técnica](#-documentación-técnica)
- [Contribución](#-contribución)

---

## ✨ Características

### 🎯 Simulación Realista

- **Modelo de eventos discretos** con SimPy para simulación precisa
- **Sistema Manchester de triaje** (5 niveles de urgencia)
- **Flujo completo del paciente**: Llegada → Triaje → Atención → Observación → Alta/Ingreso
- **Patrones temporales realistas**: Variación por hora del día y día de la semana
- **Múltiples hospitales**: CHUAC, HM Modelo, San Rafael (A Coruña)

### 🤝 Coordinación Inteligente

- **Detección automática de saturación** con umbrales configurables
- **Derivación inteligente** de pacientes entre hospitales
- **Optimización de tiempos de espera** mediante balanceo de carga
- **Gestión de emergencias masivas**: Accidentes múltiples, brotes víricos, eventos masivos
- **Sistema de alertas** multinivel (info, warning, critical)

### 🔮 Predicción y Análisis

- **Predicción de demanda** usando Prophet o modelos simplificados
- **Detección automática de anomalías** (picos de demanda inusuales)
- **Alertas predictivas** para preparación proactiva
- **Análisis de patrones** históricos y tendencias

### 📊 Visualización en Tiempo Real

- **Grafana** para dashboards interactivos y análisis avanzado
- **React UI** moderna con Mantine para una experiencia de usuario superior
- **InfluxDB** para almacenamiento de series temporales
- **Node-RED** para procesamiento de eventos MQTT
- **MQTT WebSocket** para actualizaciones en tiempo real en la UI
- **Métricas en tiempo real**: Ocupación, tiempos de espera, flujo de pacientes

---

## 🚀 Quick Start

### Opción 1: Verificación Rápida (sin Docker)

\`\`\`bash

# 1. Clonar repositorio

git clone `<repo-url>`
cd gemelo-digital-hospitalario

# 2. Instalar dependencias

make install

# 3. Ejecutar test rápido (5 segundos)

make test-quick

# 4. Ejecutar simulación demo (30 segundos)

make sim-quick
\`\`\`

### Opción 2: Sistema Completo con Docker

\`\`\`bash

# 1. Iniciar infraestructura

make start

# 2. Ejecutar simulación con visualización

make demo

# 3. Acceder a las interfaces

# UI Moderna (React + Mantine) - RECOMENDADO
open http://localhost:3002

# Grafana (Dashboards avanzados)
open http://localhost:3001  # usuario: admin, password: admin
\`\`\`

---

## 🏗️ Arquitectura

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        SIMULADOR (SimPy)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Hospital   │  │   Hospital   │  │   Hospital   │         │
│  │    CHUAC     │  │  HM Modelo   │  │ San Rafael   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                     │
│                  ┌─────────▼─────────┐                          │
│                  │   Coordinador                                               │◄──────┐                  │
│                  │     Central                                                      │        │                  │
│                  └─────────┬─────────┘       │                  │
│                            │                 │                  │
│                  ┌─────────▼─────────┐       │                  │
│                  │    Predictor      │───────┘                  │
│                  │    de Demanda     │                          │
│                  └─────────┬─────────┘                          │
└─────────────────────────────┼──────────────────────────────────┘
                              │ MQTT
                 ┌────────────▼────────────┐
                 │      Node-RED           │
                 │  (Procesamiento)        │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │      InfluxDB           │
                 │  (Almacenamiento)       │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │       Grafana           │
                 │   (Visualización)       │
                 └─────────────────────────┘
\`\`\`

### Componentes Principales

| Componente            | Tecnología      | Puerto | Descripción                                      |
| --------------------- | ---------------- | ------ | ------------------------------------------------- |
| **Simulador**   | Python + SimPy   | -      | Motor de simulación de eventos discretos         |
| **Coordinador** | Python           | -      | Gestión de derivaciones y emergencias            |
| **Predictor**   | Python + Prophet | -      | Predicción de demanda y detección de anomalías |
| **Frontend UI** | React + Mantine  | 3002   | Interfaz de usuario moderna y responsive         |
| **Mosquitto**   | MQTT Broker      | 1883   | Mensajería en tiempo real                        |
| **Node-RED**    | Node.js          | 1880   | Procesamiento de flujos de datos                  |
| **InfluxDB**    | Time Series DB   | 8086   | Almacenamiento de métricas                       |
| **Grafana**     | Dashboards       | 3001   | Visualización y análisis                        |

---

## 📦 Instalación

### Requisitos Previos

- Python 3.9+
- Docker y Docker Compose (para visualización)
- Make (opcional, para comandos simplificados)

### Instalación Local

\`\`\`bash

# Clonar repositorio

git clone `<repo-url>`
cd gemelo-digital-hospitalario

# Instalar dependencias básicas

pip install -r requirements.txt

# O usar make

make install
\`\`\`

### Instalación con Docker

\`\`\`bash

# Construir e iniciar todos los servicios

make start

# O manualmente

docker compose up -d
\`\`\`

---

## 🎮 Uso

### Comandos Make Principales

\`\`\`bash
make help          # Ver todos los comandos disponibles
make test          # Ejecutar todos los tests
make test-quick    # Test rápido (~5 seg)
make sim-quick     # Simulación rápida (1 hora)
make demo          # Simulación demo con emergencias
make start         # Iniciar sistema completo
make stop          # Detener todo
make urls          # Ver URLs de acceso
\`\`\`

### Simulaciones Predefinidas

#### 1. Simulación Rápida

\`\`\`bash
make sim-quick

# 1 hora simulada, 3 hospitales, velocidad 120x

\`\`\`

#### 2. Simulación Demo

\`\`\`bash
make demo

# 2 horas con emergencias aleatorias

\`\`\`

#### 3. Simulación Completa

\`\`\`bash
make sim-full

# 24 horas, predicción activada, tiempo real escalado

\`\`\`

### Ejecución Manual del Simulador

\`\`\`bash

# Sintaxis básica

python src/simulador.py [opciones]

# Ejemplos

python src/simulador.py --hospitales chuac hm_modelo --duracion 24

python src/simulador.py \\
  --hospitales chuac hm_modelo san_rafael \\
  --duracion 12 \\
  --velocidad 120 \\
  --emergencias \\
  --mqtt-broker localhost
\`\`\`

#### Opciones Disponibles

| Opción              | Descripción                                        | Default   |
| -------------------- | --------------------------------------------------- | --------- |
| \`--hospitales\`     | Hospitales a simular (chuac, hm_modelo, san_rafael) | chuac     |
| \`--duracion\`       | Horas simuladas                                     | 24        |
| \`--velocidad\`      | Factor de velocidad (60 = 1h sim/min real)          | 60        |
| \`--mqtt-broker\`    | Dirección del broker MQTT                          | localhost |
| \`--mqtt-port\`      | Puerto MQTT                                         | 1883      |
| \`--rapido\`         | Ejecutar sin sincronización tiempo real            | False     |
| \`--emergencias\`    | Activar generador de emergencias aleatorias         | False     |
| \`--sin-prediccion\` | Desactivar predicción de demanda                   | False     |

---

## 🧪 Testing

### Tests Disponibles

\`\`\`bash

# Test rápido de integración (~5 seg)

make test-quick

# Test del predictor de demanda (~10 seg)

make test-predictor

# Test con simulación corta (~10 seg)

make test-sim

# Ejecutar todos los tests (~30 seg)

make test-all
\`\`\`

### Tests Individuales

\`\`\`bash

# Test de integración simple

python tests/test_integracion_simple.py

# Test del predictor

python tests/test_predictor_demanda.py

# Test de ejecución con simulación

python tests/test_ejecucion_rapida.py
\`\`\`

### Con Pytest

\`\`\`bash

# Tests básicos

make test-pytest

# Con cobertura

make test-cov
\`\`\`

---

## 📊 Visualización

### Acceso a Interfaces Web

Una vez iniciado el sistema (\`make start\`), accede a:

- **Grafana**: http://localhost:3001

  - Usuario: \`admin\`
  - Password: \`admin\`
  - Visualización de dashboards y métricas
- **Node-RED**: http://localhost:1880

  - Editor de flujos de procesamiento
  - Importar flows desde \`node-red/flows.json\`
- **InfluxDB**: http://localhost:8086

  - Usuario: \`admin\`
  - Password: \`adminadmin\`
  - Consultas de datos históricos

### Dashboards en Grafana

El sistema incluye visualizaciones para:

- **Ocupación de boxes** por hospital
- **Tiempos de espera** medios
- **Flujo de pacientes** (llegadas, altas, derivaciones)
- **Nivel de saturación** en tiempo real
- **Predicciones de demanda** (próximas horas)
- **Alertas de emergencias** y anomalías
- **Métricas del coordinador** (derivaciones, tiempo ahorrado)

### Importar Flows en Node-RED

1. Acceder a http://localhost:1880
2. Menú → Import → Clipboard
3. Copiar contenido de \`node-red/flows.json\`
4. Click "Import"
5. Click "Deploy"

---

## ⚙️ Configuración

### Hospitales

La configuración de hospitales está en [src/simulador.py](src/simulador.py):

\`\`\`python
HOSPITALES = {
    "chuac": ConfigHospital(
        id="chuac",
        nombre="CHUAC - Complexo Hospitalario Universitario A Coruña",
        num_boxes=40,
        num_camas_observacion=30,
        pacientes_dia_base=420,
        lat=43.3487,
        lon=-8.4066
    ),
    # ... más hospitales
}
\`\`\`

### Niveles de Triaje

Sistema Manchester (5 niveles) en [src/simulador.py](src/simulador.py):

\`\`\`python
CONFIG_TRIAJE = {
    NivelTriaje.ROJO: ConfigTriaje(      # Resucitación
        tiempo_max_espera=0,
        probabilidad=0.001,
        # ...
    ),
    NivelTriaje.NARANJA: ConfigTriaje(   # Emergencia
        tiempo_max_espera=10,
        probabilidad=0.083,
        # ...
    ),
    # ... más niveles
}
\`\`\`

### Umbrales del Coordinador

En [src/coordinador.py](src/coordinador.py):

\`\`\`python
class CoordinadorCentral:
    UMBRAL_SATURACION_WARNING = 0.70   # 70% ocupación
    UMBRAL_SATURACION_CRITICAL = 0.85  # 85% ocupación
    UMBRAL_DERIVACION = 0.80           # Derivar cuando > 80%
\`\`\`

### Variables de Entorno

El simulador puede configurarse mediante variables de entorno:

\`\`\`bash
export MQTT_BROKER=localhost
export MQTT_PORT=1883
export HOSPITALES="chuac hm_modelo san_rafael"
export DURACION=24
export VELOCIDAD=60

python src/simulador.py
\`\`\`

---

## 📚 Documentación Técnica

### Estructura del Proyecto

\`\`\`
gemelo-digital-hospitalario/
├── src/
│   ├── simulador.py          # Motor de simulación (SimPy)
│   ├── coordinador.py        # Coordinación entre hospitales
│   └── predictor.py          # Predicción de demanda
├── tests/
│   ├── test_integracion_simple.py    # Tests de integración
│   ├── test_predictor_demanda.py     # Tests del predictor
│   └── test_ejecucion_rapida.py      # Tests con simulación
├── node-red/
│   └── flows.json            # Configuración Node-RED
├── grafana/
│   └── dashboards/           # Dashboards preconfigured
├── docker-compose.yml        # Orquestación de servicios
├── Makefile                  # Comandos simplificados
├── requirements.txt          # Dependencias Python
└── README.md                 # Esta documentación
\`\`\`

### Flujo de Datos

\`\`\`
Paciente Llega → Triaje → Espera → Box Atención → [Observación] → Alta/Ingreso
                                ↓
                        Coordinador evalúa
                                ↓
                    ¿Saturación > 80%? ──→ Derivar a otro hospital
                                ↓
                          Publicar MQTT
                                ↓
                    Node-RED procesa → InfluxDB guarda → Grafana visualiza
\`\`\`

### Topics MQTT

\`\`\`
urgencias/
├── {hospital_id}/
│   ├── eventos/{tipo}         # Eventos de pacientes (llegada, triaje, salida, etc.)
│   ├── stats                  # Estadísticas en tiempo real
│   ├── recursos/boxes         # Estado de recursos
│   └── prediccion             # Predicciones de demanda
├── coordinador/
│   ├── estado                 # Estado del coordinador
│   └── alertas                # Alertas del sistema
└── prediccion/
    └── alertas                # Alertas de anomalías detectadas
\`\`\`

### Métricas Disponibles

**Eventos de Pacientes:**

- \`tipo\`, \`timestamp\`, \`paciente_id\`, \`edad\`
- \`nivel_triaje\`, \`patologia\`
- \`tiempo_total\`, \`tiempo_espera_atencion\`
- \`destino\`, \`derivado_a\`

**Estadísticas por Hospital:**

- \`boxes_ocupados\`, \`boxes_totales\`, \`ocupacion_boxes\`
- \`observacion_ocupadas\`, \`observacion_totales\`, \`ocupacion_observacion\`
- \`pacientes_en_espera_triaje\`, \`pacientes_en_espera_atencion\`
- \`tiempo_medio_espera\`, \`tiempo_medio_atencion\`, \`tiempo_medio_total\`
- \`pacientes_atendidos_hora\`, \`pacientes_llegados_hora\`
- \`nivel_saturacion\`, \`emergencia_activa\`

**Estado del Coordinador:**

- \`emergencia_activa\`, \`tipo_emergencia\`
- \`derivaciones_totales\`, \`minutos_ahorrados\`
- \`alertas_emitidas\`
- \`hospitales\` (estado de cada uno)

**Predicciones:**

- \`llegadas_esperadas\`, \`minimo\`, \`maximo\`
- \`hora\`, \`timestamp\`
- Alertas de anomalías con \`z_score\`

---

## 🔧 Comandos Útiles

### Docker

\`\`\`bash

# Ver estado de servicios

make status

# Ver logs en tiempo real

make logs
make logs-simulador
make logs-mqtt

# Acceder a shell de contenedores

make shell-influx
make shell-grafana
make shell-nodered

# Reiniciar servicios

make restart

# Limpiar todo

make clean
\`\`\`

### Backup

\`\`\`bash

# Crear backup de todos los volúmenes

make backup

# Los backups se guardan en ./backups/

\`\`\`

### Desarrollo

\`\`\`bash

# Configurar entorno de desarrollo

make dev-setup

# Formatear código

make format

# Ejecutar linter

make lint

# Modo desarrollo con tests automáticos

make dev-test
\`\`\`

---

## 🐛 Resolución de Problemas

### Error: "No se pudo conectar a MQTT"

\`\`\`bash

# Verificar que Mosquitto está corriendo

docker compose ps mosquitto

# Reiniciar si es necesario

docker compose restart mosquitto

# La simulación continuará sin MQTT si no está disponible

\`\`\`

### Error: "ModuleNotFoundError: No module named 'pandas'"

\`\`\`bash

# Instalar dependencias

make install

# O manualmente

pip install -r requirements.txt
\`\`\`

### Grafana no muestra datos

1. Verificar que el simulador está publicando:
   \`\`\`bash
   make test-mqtt
   \`\`\`
2. Verificar que Node-RED está procesando:

   - Acceder a http://localhost:1880
   - Verificar que los flows están desplegados (botón "Deploy")
3. Verificar InfluxDB:
   \`\`\`bash
   make shell-influx
   influx -username admin -password adminadmin

   > use hospitales
   > show measurements
   > \`\`\`
   >

### Prophet no disponible

El sistema funciona sin Prophet usando predicción simplificada:
\`\`\`
⚠️  Prophet no disponible. Usando predicción simplificada.
\`\`\`

Para instalar Prophet (opcional):
\`\`\`bash
pip install prophet
\`\`\`

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (\`git checkout -b feature/AmazingFeature\`)
3. Commit tus cambios (\`git commit -m 'Add AmazingFeature'\`)
4. Push a la rama (\`git push origin feature/AmazingFeature\`)
5. Abre un Pull Request

### Estilo de Código

\`\`\`bash

# Formatear antes de commit

make format

# Verificar estilo

make lint

# Ejecutar tests

make test-all
\`\`\`

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo \`LICENSE\` para más detalles.

---

## 👥 Autores

- **Proyecto Gemelos Digitales** - Desarrollo inicial

---

## 🙏 Agradecimientos

- Sistema Manchester de Triaje
- Datos calibrados basados en urgencias hospitalarias españolas
- Comunidad SimPy
- Prophet (Meta) para predicción de series temporales

---

## 📞 Contacto

Para preguntas, sugerencias o reportar issues:

- Abrir un issue en GitHub
- Documentación adicional en el [Wiki](../../wiki)

---

**Versión:** 2.0
**Última actualización:** 2025-12-03
**Estado:** ✅ Producción
