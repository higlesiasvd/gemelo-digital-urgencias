# 🏥 Gemelo Digital - Urgencias Hospitalarias A Coruña# 🏥 Gemelo Digital - Urgencias Hospitalarias A Coruña



Sistema de simulación y visualización en tiempo real de las urgencias hospitalarias de A Coruña, coordinando tres hospitales: CHUAC, HM Modelo y San Rafael.Sistema de simulación y visualización en tiempo real de las urgencias hospitalarias de A Coruña, coordinando tres hospitales: CHUAC, HM Modelo y San Rafael.



## 📋 Descripción## 📋 Descripción



Este proyecto implementa un gemelo digital que simula:Este proyecto implementa un gemelo digital que simula:



- Llegada de pacientes con distribución realista- Llegada de pacientes con distribución realista

- Sistema de triaje Manchester (5 niveles)- Sistema de triaje Manchester (5 niveles)

- Gestión de recursos (boxes, observación)- Gestión de recursos (boxes, observación)

- Coordinación entre hospitales- Coordinación entre hospitales

- Detección automática de emergencias- Detección automática de emergencias

- Predicción de demanda con IA- Predicción de demanda con IA



## 🏗️ Arquitectura## 🏗️ Arquitectura



``````

┌─────────────────┐     MQTT      ┌─────────────────┐┌─────────────────┐     MQTT      ┌─────────────────┐

│   Simulación    │──────────────▶│    Node-RED     ││   Simulación    │──────────────▶│    Node-RED     │

│   (Python)      │               │  (Integración)  ││   (Python)      │               │  (Integración)  │

└─────────────────┘               └────────┬────────┘└─────────────────┘               └────────┬────────┘

                                           │                                           │

                                           ▼                                           ▼

┌─────────────────┐               ┌─────────────────┐┌─────────────────┐               ┌─────────────────┐

│    InfluxDB     │◀──────────────│    Grafana      ││    InfluxDB     │◀──────────────│    Grafana      │

│ (Series temp.)  │               │  (Dashboard)    ││ (Series temp.)  │               │  (Dashboard)    │

└─────────────────┘               └─────────────────┘└─────────────────┘               └─────────────────┘

``````



## 📁 Estructura del Proyecto## 🚀 Inicio Rápido



```### Prerrequisitos

gemelo-digital-hospitalario/

├── 📄 Makefile                     # Comandos de gestión del proyecto- Docker Desktop instalado y ejecutándose

├── 🐳 Dockerfile                   # Imagen del simulador- Make (viene preinstalado en macOS/Linux)

├── 🐳 docker-compose.yml           # Infraestructura Docker

├── 📄 requirements.txt             # Dependencias Python### 1. Levantar infraestructura

├── 📄 README.md

│```bash

├── 📁 src/                         # Código fuente# Ver todos los comandos disponibles

│   ├── simulador.py                # Simulador principal (3 hospitales)make help

│   └── coordinador.py              # Coordinador central y emergencias

│# Iniciar todos los servicios

├── 📁 tests/                       # Tests del proyectomake up

│   ├── __init__.py

│   ├── test_simulacion.py          # Tests unitarios del simulador# Verificar estado

│   ├── test_coordinador.py         # Tests del coordinador multi-hospitalmake status

│   └── test_integracion.py         # Tests de integración MQTT+InfluxDB```

│

├── 📁 config/                      # Configuración de servicios### 2. Construir e instalar dependencias

│   └── mosquitto.conf              # Configuración MQTT

│```bash

├── 📁 grafana/                     # Configuración Grafana# Construir el contenedor del simulador (instala dependencias automáticamente)

│   └── provisioning/make install

│       └── datasources/

│           └── influxdb.yaml       # Datasource InfluxDB auto-configurado# O si prefieres reconstruir desde cero

│make rebuild-simulador

├── 📁 node-red/                    # Flujos Node-RED```

│   └── flows.json                  # Flujos MQTT → InfluxDB

│### 3. Ejecutar simulación

├── 📁 dashboards/                  # Dashboards Grafana

│   └── .gitkeep```bash

│# Ejecutar el simulador (una vez)

├── 📁 scripts/                     # Scripts de utilidadmake run-simulador

│   └── setup-nodered.sh            # Configuración Node-RED

│# O iniciarlo en segundo plano

└── 📁 docs/                        # Documentación adicionalmake start-simulador

```

# Ver logs del simulador

## 🚀 Inicio Rápidomake logs-simulador

```

### Prerrequisitos

## 🌐 URLs de Acceso

- Docker Desktop instalado y ejecutándose

- Make (viene preinstalado en macOS/Linux)| Servicio                 | URL                   | Credenciales       |

| ------------------------ | --------------------- | ------------------ |

### 1. Levantar infraestructura| **Grafana**        | http://localhost:3001 | admin / admin      |

| **Node-RED**       | http://localhost:1880 | -                  |

```bash| **InfluxDB**       | http://localhost:8086 | admin / adminadmin |

# Ver todos los comandos disponibles| **MQTT**           | localhost:1883        | -                  |

make help| **MQTT WebSocket** | localhost:9001        | -                  |



# Iniciar todos los servicios## 🛠️ Comandos Make

make up

### Servicios Docker

# Verificar estado

make status| Comando          | Descripción                        |

```| ---------------- | ----------------------------------- |

| `make up`      | Inicia todos los servicios          |

### 2. Construir e instalar dependencias| `make down`    | Detiene todos los servicios         |

| `make restart` | Reinicia todos los servicios        |

```bash| `make status`  | Muestra el estado de los servicios  |

# Construir el contenedor del simulador (instala dependencias automáticamente)| `make logs`    | Muestra logs de todos los servicios |

make install| `make urls`    | Muestra las URLs de acceso          |



# O si prefieres reconstruir desde cero### Simulador

make rebuild-simulador

```| Comando                    | Descripción                             |

| -------------------------- | ---------------------------------------- |

### 3. Ejecutar simulación| `make install`           | Construye el contenedor con dependencias |

| `make build-simulador`   | Construye la imagen del simulador        |

```bash| `make rebuild-simulador` | Reconstruye sin caché                   |

# Ejecutar el simulador (una vez)| `make run-simulador`     | Ejecuta el simulador una vez             |

make run-simulador| `make start-simulador`   | Inicia el simulador en segundo plano     |

| `make stop-simulador`    | Detiene el simulador                     |

# O iniciarlo en segundo plano| `make logs-simulador`    | Muestra logs del simulador               |

make start-simulador

### Testing

# Ver logs del simulador

make logs-simulador| Comando             | Descripción                   |

```| ------------------- | ------------------------------ |

| `make test`       | Ejecuta tests en el contenedor |

### 4. Verificar integración| `make test-local` | Ejecuta tests localmente       |

| `make test-mqtt`  | Prueba conexión MQTT          |

```bash

# Ejecutar tests de integración### Mantenimiento

make test-integracion

```| Comando              | Descripción                          |

| -------------------- | ------------------------------------- |

## 🌐 URLs de Acceso| `make clean`       | Elimina contenedores y volúmenes     |

| `make clean-all`   | Limpieza profunda (incluye imágenes) |

| Servicio             | URL                   | Credenciales       || `make backup`      | Crea backup de los volúmenes         |

| -------------------- | --------------------- | ------------------ || `make update-deps` | Actualiza dependencias                |

| **Grafana**          | http://localhost:3001 | admin / admin      |

| **Node-RED**         | http://localhost:1880 | -                  |### Acceso a contenedores

| **InfluxDB**         | http://localhost:8086 | admin / adminadmin |

| **MQTT**             | localhost:1883        | -                  || Comando                  | Descripción        |

| **MQTT WebSocket**   | localhost:9001        | -                  || ------------------------ | ------------------- |

| `make shell-simulador` | Shell del simulador |

## 🛠️ Comandos Make| `make shell-influx`    | Shell de InfluxDB   |

| `make shell-grafana`   | Shell de Grafana    |

### Servicios Docker| `make shell-nodered`   | Shell de Node-RED   |

| `make shell-mqtt`      | Shell de Mosquitto  |

| Comando          | Descripción                        |

| ---------------- | ---------------------------------- |## ⚙️ Opciones de Simulación

| `make up`        | Inicia todos los servicios         |

| `make down`      | Detiene todos los servicios        |Las variables de entorno del simulador se configuran en `docker-compose.yml`:

| `make restart`   | Reinicia todos los servicios       |

| `make status`    | Muestra el estado de los servicios || Variable        | Descripción                      | Default                        |

| `make logs`      | Muestra logs de todos los servicios|| --------------- | -------------------------------- | ------------------------------ |

| `make urls`      | Muestra las URLs de acceso         || `MQTT_BROKER`   | Dirección broker MQTT            | mosquitto                      |

| `MQTT_PORT`     | Puerto MQTT                      | 1883                           |

### Simulador| `HOSPITALES`    | Hospitales a simular             | chuac hm_modelo san_rafael     |

| `DURACION`      | Horas simuladas                  | 24                             |

| Comando                  | Descripción                              || `VELOCIDAD`     | Factor velocidad (60 = 1h/min)   | 60                             |

| ------------------------ | ---------------------------------------- || `EMERGENCIAS`   | Activar emergencias aleatorias   | false                          |

| `make install`           | Construye el contenedor con dependencias |

| `make build-simulador`   | Construye la imagen del simulador        |### Ejecución manual (desarrollo local)

| `make rebuild-simulador` | Reconstruye sin caché                    |

| `make run-simulador`     | Ejecuta el simulador una vez             |```bash

| `make start-simulador`   | Inicia el simulador en segundo plano     |# Crear entorno virtual

| `make stop-simulador`    | Detiene el simulador                     |python -m venv venv

| `make logs-simulador`    | Muestra logs del simulador               |source venv/bin/activate



### Testing# Instalar dependencias

make install-dev

| Comando                      | Descripción                              |

| ---------------------------- | ---------------------------------------- |# Ejecutar con los 3 hospitales

| `make test`                  | Ejecuta todos los tests en contenedor    |python src/simulador.py --hospitales chuac hm_modelo san_rafael

| `make test-simulador`        | Tests unitarios del simulador            |

| `make test-coordinador`      | Tests del coordinador multi-hospital     |# Ejecutar con emergencias aleatorias

| `make test-integracion`      | Tests de integración (requiere `make up`)|python src/simulador.py --hospitales chuac hm_modelo san_rafael --emergencias

| `make test-local`            | Ejecuta todos los tests localmente       |```

| `make test-local-simulador`  | Tests del simulador localmente           |

| `make test-local-coordinador`| Tests del coordinador localmente         |## 📊 Datos Simulados

| `make test-mqtt`             | Prueba conexión MQTT                     |

### Sistema de Triaje Manchester

### Mantenimiento

| Nivel | Color       | Tiempo Máx | % Pacientes |

| Comando          | Descripción                          || ----- | ----------- | ----------- | ----------- |

| ---------------- | ------------------------------------ || 1     | 🔴 Rojo     | Inmediato   | 0.1%        |

| `make clean`     | Elimina contenedores y volúmenes     || 2     | 🟠 Naranja  | ≤10 min    | 8.3%        |

| `make clean-all` | Limpieza profunda (incluye imágenes) || 3     | 🟡 Amarillo | ≤60 min    | 17.9%       |

| `make backup`    | Crea backup de los volúmenes         || 4     | 🟢 Verde    | ≤120 min   | 62.7%       |

| `make update-deps`| Actualiza dependencias              || 5     | 🔵 Azul     | ≤240 min   | 11%         |



### Acceso a contenedores### Hospitales



| Comando                | Descripción         || Hospital   | Boxes | Observación | Pac./día |

| ---------------------- | ------------------- || ---------- | ----- | ------------ | --------- |

| `make shell-simulador` | Shell del simulador || CHUAC      | 40    | 30           | ~420      |

| `make shell-influx`    | Shell de InfluxDB   || HM Modelo  | 15    | 10           | ~120      |

| `make shell-grafana`   | Shell de Grafana    || San Rafael | 12    | 8            | ~80       |

| `make shell-nodered`   | Shell de Node-RED   |

| `make shell-mqtt`      | Shell de Mosquitto  |## 📡 Topics MQTT



## ⚙️ Opciones de SimulaciónEl simulador publica en los siguientes topics:



Las variables de entorno del simulador se configuran en `docker-compose.yml`:### Eventos de pacientes

```

| Variable      | Descripción                    | Default                    |urgencias/{hospital_id}/eventos/llegada

| ------------- | ------------------------------ | -------------------------- |urgencias/{hospital_id}/eventos/triaje_completado

| `MQTT_BROKER` | Dirección broker MQTT          | mosquitto                  |urgencias/{hospital_id}/eventos/inicio_atencion

| `MQTT_PORT`   | Puerto MQTT                    | 1883                       |urgencias/{hospital_id}/eventos/entrada_observacion

| `HOSPITALES`  | Hospitales a simular           | chuac hm_modelo san_rafael |urgencias/{hospital_id}/eventos/derivacion

| `DURACION`    | Horas simuladas                | 24                         |urgencias/{hospital_id}/eventos/salida

| `VELOCIDAD`   | Factor velocidad (60 = 1h/min) | 60                         |```

| `EMERGENCIAS` | Activar emergencias aleatorias | false                      |

### Estadísticas y recursos

### Ejecución manual (desarrollo local)```

urgencias/{hospital_id}/stats

```bashurgencias/{hospital_id}/recursos/boxes

# Crear entorno virtualurgencias/{hospital_id}/alertas

python -m venv venv```

source venv/bin/activate

### Coordinador central

# Instalar dependencias```

make install-devurgencias/coordinador/estado

urgencias/coordinador/alertas

# Ejecutar con los 3 hospitales```

python src/simulador.py --hospitales chuac hm_modelo san_rafael

## 🚨 Sistema de Emergencias

# Ejecutar con emergencias aleatorias

python src/simulador.py --hospitales chuac hm_modelo san_rafael --emergenciasEl coordinador central gestiona 3 tipos de emergencias:

```

| Tipo | Descripción | Pacientes Extra | Duración |

## 📊 Datos Simulados|------|-------------|-----------------|----------|

| **Accidente Múltiple** | Colisión en A-6/AP-9 | 15-30 | 2-4 horas |

### Sistema de Triaje Manchester| **Brote Vírico** | Gastroenteritis/Gripe | 50-100 | 3-7 días |

| **Evento Masivo** | Incidentes en Riazor/Coliseum | 20-50 | 4-8 horas |

| Nivel | Color       | Tiempo Máx | % Pacientes |

| ----- | ----------- | ---------- | ----------- |Las emergencias activan:

| 1     | 🔴 Rojo     | Inmediato  | 0.1%        |- Aumento de llegadas de pacientes

| 2     | 🟠 Naranja  | ≤10 min    | 8.3%        |- Distribución de triaje específica

| 3     | 🟡 Amarillo | ≤60 min    | 17.9%       |- Alertas a la población

| 4     | 🟢 Verde    | ≤120 min   | 62.7%       |- Coordinación intensiva entre hospitales

| 5     | 🔵 Azul     | ≤240 min   | 11%         |

## 🔄 Sistema de Derivaciones

### Hospitales

El coordinador central deriva pacientes automáticamente cuando:

| Hospital   | Boxes | Observación | Pac./día |- Un hospital supera el **80% de ocupación**

| ---------- | ----- | ----------- | -------- |- Hay diferencia significativa (>10%) con otros hospitales

| CHUAC      | 40    | 30          | ~420     |- El paciente **no es nivel 1** (críticos se atienden donde llegan)

| HM Modelo  | 15    | 10          | ~120     |

| San Rafael | 12    | 8           | ~80      |Beneficios:

- Reducción de tiempos de espera

## 📡 Topics MQTT- Distribución equilibrada de carga

- Mejor uso de recursos

El simulador publica en los siguientes topics:

## 📁 Estructura del Proyecto

### Eventos de pacientes

``````

urgencias/{hospital_id}/eventos/llegadagemelo-digital-hospitalario/

urgencias/{hospital_id}/eventos/triaje_completado├── Makefile                    # Comandos de gestión del proyecto

urgencias/{hospital_id}/eventos/inicio_atencion├── Dockerfile                  # Imagen del simulador

urgencias/{hospital_id}/eventos/entrada_observacion├── docker-compose.yml          # Infraestructura Docker

urgencias/{hospital_id}/eventos/derivacion├── requirements.txt            # Dependencias Python

urgencias/{hospital_id}/eventos/salida├── README.md

```├── config/

│   └── mosquitto.conf          # Configuración MQTT

### Estadísticas y recursos├── src/

```│   ├── simulador.py            # Simulador principal (3 hospitales)

urgencias/{hospital_id}/stats│   ├── coordinador.py          # Coordinador central y emergencias

urgencias/{hospital_id}/recursos/boxes│   ├── test_simulacion.py      # Tests básicos del simulador

urgencias/{hospital_id}/alertas│   └── test_coordinador.py     # Tests del coordinador

```├── dashboards/                 # Dashboards Grafana

├── node-red/                   # Flujos Node-RED

### Coordinador central└── docs/                       # Documentación adicional

``````

urgencias/coordinador/estado

urgencias/coordinador/alertas## 🔧 Troubleshooting

```

### Docker no funciona en macOS

## 🔄 Flujos Node-RED

```bash

Los flujos pre-configurados en `node-red/flows.json` procesan:# Abrir Docker Desktop

open -a Docker

| Flujo | Descripción |

| ----- | ----------- |# Añadir Docker al PATH (temporal)

| **Eventos Pacientes** | Recibe MQTT `urgencias/+/eventos/+` → InfluxDB |export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

| **Stats Hospitales** | Recibe MQTT `urgencias/+/stats` → InfluxDB |

| **Coordinador** | Recibe estado y alertas del coordinador central |# Añadir permanentemente al ~/.zshrc

| **Alertas Críticas** | Filtra y notifica alertas nivel "critical" |echo 'export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"' >> ~/.zshrc

| **Panel Estado** | Query periódico a InfluxDB para mostrar saturación |```



## 🚨 Sistema de Emergencias### Puerto ya en uso



El coordinador central gestiona 3 tipos de emergencias:```bash

# Ver qué proceso usa el puerto (ej: 8086)

| Tipo                   | Descripción              | Pacientes Extra | Duración  |lsof -i :8086

| ---------------------- | ------------------------ | --------------- | --------- |

| **Accidente Múltiple** | Colisión en A-6/AP-9     | 15-30           | 2-4 horas |# Matar el proceso

| **Brote Vírico**       | Gastroenteritis/Gripe    | 50-100          | 3-7 días  |kill -9 <PID>

| **Evento Masivo**      | Incidentes Riazor/Coliseum | 20-50         | 4-8 horas |

# O cambiar el puerto en docker-compose.yml

Las emergencias activan:```

- Aumento de llegadas de pacientes

- Distribución de triaje específica### MQTT no conecta

- Alertas a la población

- Coordinación intensiva entre hospitales```bash

# Verificar que Mosquitto está corriendo

## 🔄 Sistema de Derivacionesmake logs-mqtt



El coordinador central deriva pacientes automáticamente cuando:# Probar conexión

- Un hospital supera el **80% de ocupación**make test-mqtt

- Hay diferencia significativa (>10%) con otros hospitales```

- El paciente **no es nivel 1** (críticos se atienden donde llegan)

### Grafana no muestra datos

Beneficios:

- Reducción de tiempos de espera1. Verificar que InfluxDB está configurado como datasource

- Distribución equilibrada de carga2. Comprobar que la simulación está publicando: `make logs-simulador`

- Mejor uso de recursos3. Revisar logs: `make logs-grafana`



## 🧪 Testing### Reconstruir todo desde cero



### Ejecutar todos los tests```bash

make clean-all

```bashmake up

# En Docker (recomendado)make install

make test```



# Localmente## 📅 Roadmap

make test-local

```- [x] Día 1: Simulación básica 1 hospital

- [x] Día 2: 3 hospitales + coordinación + emergencias

### Tests por categoría- [ ] Día 3: Node-RED + InfluxDB

- [ ] Día 4: Predicción IA

```bash- [ ] Día 5: Dashboard Grafana

# Tests unitarios del simulador- [ ] Día 6: Flowcharting + escenarios

make test-simulador- [ ] Día 7: Documentación final



# Tests del coordinador multi-hospital## 👨‍💻 Autor

make test-coordinador

Proyecto para la asignatura de Gemelos Digitales

# Tests de integración (requiere servicios activos)

make up## 📄 Licencia

make test-integracion

```MIT License


## 🔧 Troubleshooting

### Docker no funciona en macOS

```bash
# Abrir Docker Desktop
open -a Docker

# Añadir Docker al PATH (temporal)
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Añadir permanentemente al ~/.zshrc
echo 'export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"' >> ~/.zshrc
```

### Puerto ya en uso

```bash
# Ver qué proceso usa el puerto (ej: 8086)
lsof -i :8086

# Matar el proceso
kill -9 <PID>

# O cambiar el puerto en docker-compose.yml
```

### MQTT no conecta

```bash
# Verificar que Mosquitto está corriendo
make logs-mqtt

# Probar conexión
make test-mqtt
```

### Grafana no muestra datos

1. El datasource InfluxDB se configura automáticamente (ver `grafana/provisioning/datasources/`)
2. Verificar que Node-RED está procesando mensajes: http://localhost:1880
3. Comprobar que la simulación está publicando: `make logs-simulador`
4. Revisar logs: `make logs-grafana`

### Node-RED no tiene los flujos

Los flujos se montan automáticamente desde `node-red/flows.json`. Si no aparecen:
1. Reiniciar: `make restart`
2. Importar manualmente desde http://localhost:1880

### Reconstruir todo desde cero

```bash
make clean-all
make up
make install
```

## 📅 Roadmap

- [x] Día 1: Simulación básica 1 hospital
- [x] Día 2: 3 hospitales + coordinación + emergencias
- [x] Día 3: Node-RED + InfluxDB + tests integración
- [ ] Día 4: Predicción IA
- [ ] Día 5: Dashboard Grafana
- [ ] Día 6: Flowcharting + escenarios
- [ ] Día 7: Documentación final

## 👨‍💻 Autor

Proyecto para la asignatura de Gemelos Digitales

## 📄 Licencia

MIT License
