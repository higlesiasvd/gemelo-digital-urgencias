# 🏥 Gemelo Digital - Urgencias Hospitalarias A Coruña

Sistema de simulación y visualización en tiempo real de las urgencias hospitalarias de A Coruña, coordinando tres hospitales: CHUAC, HM Modelo y San Rafael.

## 📋 Descripción

Este proyecto implementa un gemelo digital que simula:

- Llegada de pacientes con distribución realista
- Sistema de triaje Manchester (5 niveles)
- Gestión de recursos (boxes, observación)
- Coordinación entre hospitales
- Detección automática de emergencias
- Predicción de demanda con IA

## 🏗️ Arquitectura

```
┌─────────────────┐     MQTT      ┌─────────────────┐
│   Simulación    │──────────────▶│    Node-RED     │
│   (Python)      │               │  (Integración)  │
└─────────────────┘               └────────┬────────┘
                                           │
                                           ▼
┌─────────────────┐               ┌─────────────────┐
│    InfluxDB     │◀──────────────│    Grafana      │
│ (Series temp.)  │               │  (Dashboard)    │
└─────────────────┘               └─────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker Desktop instalado y ejecutándose
- Make (viene preinstalado en macOS/Linux)

### 1. Levantar infraestructura

```bash
# Ver todos los comandos disponibles
make help

# Iniciar todos los servicios
make up

# Verificar estado
make status
```

### 2. Construir e instalar dependencias

```bash
# Construir el contenedor del simulador (instala dependencias automáticamente)
make install

# O si prefieres reconstruir desde cero
make rebuild-simulador
```

### 3. Ejecutar simulación

```bash
# Ejecutar el simulador (una vez)
make run-simulador

# O iniciarlo en segundo plano
make start-simulador

# Ver logs del simulador
make logs-simulador
```

## 🌐 URLs de Acceso

| Servicio                 | URL                   | Credenciales       |
| ------------------------ | --------------------- | ------------------ |
| **Grafana**        | http://localhost:3001 | admin / admin      |
| **Node-RED**       | http://localhost:1880 | -                  |
| **InfluxDB**       | http://localhost:8086 | admin / adminadmin |
| **MQTT**           | localhost:1883        | -                  |
| **MQTT WebSocket** | localhost:9001        | -                  |

## 🛠️ Comandos Make

### Servicios Docker

| Comando          | Descripción                        |
| ---------------- | ----------------------------------- |
| `make up`      | Inicia todos los servicios          |
| `make down`    | Detiene todos los servicios         |
| `make restart` | Reinicia todos los servicios        |
| `make status`  | Muestra el estado de los servicios  |
| `make logs`    | Muestra logs de todos los servicios |
| `make urls`    | Muestra las URLs de acceso          |

### Simulador

| Comando                    | Descripción                             |
| -------------------------- | ---------------------------------------- |
| `make install`           | Construye el contenedor con dependencias |
| `make build-simulador`   | Construye la imagen del simulador        |
| `make rebuild-simulador` | Reconstruye sin caché                   |
| `make run-simulador`     | Ejecuta el simulador una vez             |
| `make start-simulador`   | Inicia el simulador en segundo plano     |
| `make stop-simulador`    | Detiene el simulador                     |
| `make logs-simulador`    | Muestra logs del simulador               |

### Testing

| Comando             | Descripción                   |
| ------------------- | ------------------------------ |
| `make test`       | Ejecuta tests en el contenedor |
| `make test-local` | Ejecuta tests localmente       |
| `make test-mqtt`  | Prueba conexión MQTT          |

### Mantenimiento

| Comando              | Descripción                          |
| -------------------- | ------------------------------------- |
| `make clean`       | Elimina contenedores y volúmenes     |
| `make clean-all`   | Limpieza profunda (incluye imágenes) |
| `make backup`      | Crea backup de los volúmenes         |
| `make update-deps` | Actualiza dependencias                |

### Acceso a contenedores

| Comando                  | Descripción        |
| ------------------------ | ------------------- |
| `make shell-simulador` | Shell del simulador |
| `make shell-influx`    | Shell de InfluxDB   |
| `make shell-grafana`   | Shell de Grafana    |
| `make shell-nodered`   | Shell de Node-RED   |
| `make shell-mqtt`      | Shell de Mosquitto  |

## ⚙️ Opciones de Simulación

Las variables de entorno del simulador se configuran en `docker-compose.yml`:

| Variable        | Descripción                   | Default   |
| --------------- | ------------------------------ | --------- |
| `MQTT_BROKER` | Dirección broker MQTT         | mosquitto |
| `MQTT_PORT`   | Puerto MQTT                    | 1883      |
| `HOSPITALES`  | Hospitales a simular           | chuac     |
| `DURACION`    | Horas simuladas                | 24        |
| `VELOCIDAD`   | Factor velocidad (60 = 1h/min) | 60        |

### Ejecución manual (desarrollo local)

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate

# Instalar dependencias
make install-dev

# Ejecutar simulador
python src/simulador.py --hospitales chuac --duracion 24 --velocidad 60
```

## 📊 Datos Simulados

### Sistema de Triaje Manchester

| Nivel | Color       | Tiempo Máx | % Pacientes |
| ----- | ----------- | ----------- | ----------- |
| 1     | 🔴 Rojo     | Inmediato   | 0.1%        |
| 2     | 🟠 Naranja  | ≤10 min    | 8.3%        |
| 3     | 🟡 Amarillo | ≤60 min    | 17.9%       |
| 4     | 🟢 Verde    | ≤120 min   | 62.7%       |
| 5     | 🔵 Azul     | ≤240 min   | 11%         |

### Hospitales

| Hospital   | Boxes | Observación | Pac./día |
| ---------- | ----- | ------------ | --------- |
| CHUAC      | 40    | 30           | ~420      |
| HM Modelo  | 15    | 10           | ~120      |
| San Rafael | 12    | 8            | ~80       |

## 📡 Topics MQTT

El simulador publica en los siguientes topics:

```
urgencias/{hospital_id}/eventos/llegada
urgencias/{hospital_id}/eventos/triaje_completado
urgencias/{hospital_id}/eventos/inicio_atencion
urgencias/{hospital_id}/eventos/entrada_observacion
urgencias/{hospital_id}/eventos/salida
urgencias/{hospital_id}/stats
urgencias/{hospital_id}/recursos/boxes
urgencias/{hospital_id}/alertas
```

## 📁 Estructura del Proyecto

```
gemelo-digital-hospitalario/
├── Makefile                # Comandos de gestión del proyecto
├── Dockerfile              # Imagen del simulador
├── docker-compose.yml      # Infraestructura Docker
├── requirements.txt        # Dependencias Python
├── README.md
├── config/
│   └── mosquitto.conf      # Configuración MQTT
├── src/
│   ├── simulador.py        # Simulador principal
│   └── test_simulacion.py  # Tests
├── dashboards/             # Dashboards Grafana
├── node-red/               # Flujos Node-RED
└── docs/                   # Documentación adicional
```

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

1. Verificar que InfluxDB está configurado como datasource
2. Comprobar que la simulación está publicando: `make logs-simulador`
3. Revisar logs: `make logs-grafana`

### Reconstruir todo desde cero

```bash
make clean-all
make up
make install
```

## 📅 Roadmap

- [X] Día 1: Simulación básica 1 hospital
- [ ] Día 2: 3 hospitales + coordinación
- [ ] Día 3: Node-RED + InfluxDB
- [ ] Día 4: Predicción IA
- [ ] Día 5: Dashboard Grafana
- [ ] Día 6: Flowcharting + escenarios
- [ ] Día 7: Documentación final

## 👨‍💻 Autor

Proyecto para la asignatura de Gemelos Digitales

## 📄 Licencia

MIT License
