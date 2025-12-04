# 🚀 Mejoras Realizadas - Versión 3.0

## 📋 Resumen

Se ha realizado una mejora integral del sistema de gemelo digital hospitalario, con enfoque en **datos más realistas** y **mejor arquitectura de software**.

---

## ✨ Principales Mejoras

### 1. 🏗️ Nueva Arquitectura de Software

Se implementó una **arquitectura en capas** profesional:

```
src/
├── domain/                    # Capa de dominio
│   └── services/
│       └── generador_pacientes.py    # Generador avanzado de pacientes
├── application/               # Capa de aplicación
├── infrastructure/            # Capa de infraestructura
│   └── external_services/
│       ├── weather_service.py        # Servicio de clima
│       ├── holidays_service.py       # Servicio de festivos
│       └── events_service.py         # Servicio de eventos
└── config/                    # Configuración centralizada
    ├── settings.py
    └── hospital_config.py
```

**Beneficios:**
- ✅ Separación de responsabilidades clara
- ✅ Configuración centralizada
- ✅ Fácil mantenimiento y extensión
- ✅ Testeable y modular

---

### 2. 📊 Datos Mucho Más Realistas

#### Generación de Pacientes Mejorada

**Antes:**
```python
edad = random.randint(0, 95)  # Edad completamente aleatoria
```

**Ahora:**
```python
# Edad correlacionada con patología y triaje
edad = generador.generar_edad(nivel_triaje, patologia)
# Ejemplo: IAM → 50-80 años (realista)
#          Otitis → 1-15 años (niños)
```

#### Factores de Realismo Implementados

| Factor | Descripción | Impacto |
|--------|-------------|---------|
| **Clima** | Temperatura, lluvia, viento | Más gripes con frío, más accidentes con lluvia |
| **Edad-Patología** | Correlación realista | IAM en mayores, otitis en niños |
| **Estacionalidad** | Por mes del año | Pico de gripe en invierno, alergias en primavera |
| **Festivos** | Días festivos y puentes | Reducción de demanda (-15% típico) |
| **Eventos** | Partidos, conciertos | Aumento de traumas y intoxicaciones |
| **Hora del día** | Patrón horario mejorado | Más llegadas en horario laboral |

---

### 3. 🌍 Integración con APIs Públicas

#### Servicio de Clima (OpenWeatherMap)

```python
from infrastructure.external_services import WeatherService

weather = WeatherService(api_key="TU_API_KEY")  # Gratis: 1000 llamadas/día
clima = weather.obtener_clima()

print(f"Temperatura: {clima.temperatura}°C")
print(f"Factor impacto: {clima.factor_temperatura()}x")
```

**Efectos en la simulación:**
- 🌡️ Frío (<10°C) → +30% patologías respiratorias
- ☀️ Calor (>28°C) → +25% urgencias por calor
- 🌧️ Lluvia → +20% accidentes de tráfico

#### Servicio de Festivos

```python
from infrastructure.external_services import HolidaysService

holidays = HolidaysService()

if holidays.es_festivo(fecha):
    factor = holidays.factor_demanda(fecha)  # 0.85 típicamente
```

**Festivos incluidos:**
- Nacionales: Año Nuevo, Navidad, Semana Santa, etc.
- Galicia: Día de las Letras Gallegas, San Jorge
- A Coruña: San Juan (↑80% demanda!), María Pita

#### Servicio de Eventos

```python
from infrastructure.external_services import EventsService

events = EventsService()
factor = events.factor_demanda_total(datetime.now())
```

**Eventos simulados:**
- 🏟️ Partidos Deportivo (Riazor)
- 🎵 Conciertos (Coliseum)
- 🎉 San Juan (¡la noche más crítica!)
- 🎊 Fiestas de María Pita

---

### 4. 📈 Visualizaciones de Grafana Mejoradas

#### Nuevos Dashboards

##### 1. **Dashboard de Correlaciones** (`correlaciones`)

- 📊 Llegadas vs Temperatura en tiempo real
- 🔥 Heatmap de intensidad horaria
- 👥 Distribución de edad por patología
- 🚨 Evolución de triaje apilada

##### 2. **Dashboard de Predicciones** (`predicciones`)

- 🔮 Predicción vs Realidad (gráfico comparativo)
- 📈 Predicción próxima hora/6h
- ⚠️ Detector de anomalías con Z-Score
- 🚨 Historial de alertas predictivas

##### 3. **Dashboard de Eventos** (mejorado)

- Mantiene el **mapa geográfico** original
- Visualización de patologías mejorada
- Tiempos de espera por contexto

---

### 5. 🎯 Configuración Centralizada

Toda la configuración ahora está en un solo lugar:

```python
from config import get_settings

settings = get_settings()

# Configuración desde variables de entorno o defaults
print(settings.mqtt.broker)           # localhost
print(settings.simulation.velocidad)  # 60x
print(settings.weather.enabled)       # True/False
```

**Variables de entorno soportadas:**

```bash
export WEATHER_API_KEY="tu_api_key_openweathermap"
export MQTT_BROKER="localhost"
export MQTT_PORT="1883"
export HOSPITALES="chuac hm_modelo san_rafael"
export DURACION="24"
export VELOCIDAD="60"
export USAR_CLIMA="true"
```

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Edad** | Aleatoria 0-95 | Correlacionada con patología |
| **Patologías** | Aleatorias uniformes | Influenciadas por clima/estación |
| **Clima** | ❌ No considerado | ✅ API real o simulado |
| **Festivos** | ❌ No considerados | ✅ Sistema completo |
| **Eventos** | ❌ No considerados | ✅ Partidos, conciertos, fiestas |
| **Arquitectura** | Archivos planos | Capas separadas (DDD) |
| **Configuración** | Hardcoded | Centralizada + env vars |
| **Dashboards** | 1 básico | 3 avanzados |

---

## 🚀 Uso del Nuevo Sistema

### Opción 1: Usar el Generador Directamente

```python
from infrastructure.external_services import WeatherService, HolidaysService, EventsService
from domain.services.generador_pacientes import GeneradorPacientes

# Crear servicios
weather = WeatherService(api_key="")  # Vacío = modo simulado
holidays = HolidaysService()
events = EventsService()

# Crear generador
generador = GeneradorPacientes(
    weather_service=weather,
    holidays_service=holidays,
    events_service=events,
)

# Generar paciente realista
paciente = generador.generar_paciente_completo(
    paciente_id=1,
    hospital_id="chuac",
    tiempo_simulado=0,
)

print(f"Edad: {paciente['edad']}")
print(f"Patología: {paciente['patologia']}")
print(f"Temperatura: {paciente['contexto']['temperatura']}°C")
```

### Opción 2: Probar el Generador

```bash
# Ejecutar prueba del generador
PYTHONPATH=src python test_generador.py
```

Salida ejemplo:
```
👨‍⚕️ Generador de Pacientes Realista inicializado
   - Clima: ✅ Habilitado
   - Festivos: ✅ Habilitado
   - Eventos: ✅ Habilitado

Paciente 1:
   - Edad: 28 años
   - Triaje: VERDE (Menos urgente)
   - Patología: Faringitis
   - Temperatura: 11.8°C ❄️
```

---

## 🔑 Obtener API Key de OpenWeatherMap (Gratis)

1. Ir a https://openweathermap.org/api
2. Crear cuenta gratuita
3. Generar API Key
4. Configurar:
   ```bash
   export WEATHER_API_KEY="tu_api_key_aqui"
   ```

**Límite gratuito:** 1000 llamadas/día (suficiente con el cache de 1 hora)

---

## 📦 Nuevas Dependencias

**No se requieren dependencias nuevas** para la funcionalidad básica. Todo funciona sin APIs externas (modo simulado).

**Opcional (si quieres usar API real de clima):**
```bash
pip install requests  # Ya está en requirements.txt
```

---

## 🧪 Testing

```bash
# Test rápido del generador
PYTHONPATH=src python test_generador.py

# Test de servicios externos
PYTHONPATH=src python -m infrastructure.external_services.weather_service
PYTHONPATH=src python -m infrastructure.external_services.holidays_service
PYTHONPATH=src python -m infrastructure.external_services.events_service
```

---

## 🔜 Próximos Pasos Sugeridos

1. **Integrar generador en simulador principal**
   - Reemplazar `generar_edad()` actual
   - Usar `GeneradorPacientes` para crear pacientes
   - Publicar datos de contexto (clima, eventos) por MQTT

2. **Ampliar dashboards**
   - Añadir panel de clima en tiempo real
   - Gráfico de correlación clima-patologías
   - Predicciones de Prophet mejoradas

3. **Añadir más APIs**
   - API de tráfico (Google Maps) para accidentes
   - API de contaminación del aire
   - Calendario de eventos real de A Coruña

4. **Machine Learning**
   - Entrenar modelo con datos históricos reales
   - Predicción de demanda más precisa
   - Clasificación automática de patologías

---

## 📝 Notas de Implementación

### Patologías con Correlación de Edad

Cada patología ahora tiene:
- `edad_preferente_min/max`: Rango de edad más común
- `estacionalidad`: Época del año de mayor incidencia
- `factor_clima_frio/calor/lluvia`: Multiplicadores según clima

Ejemplo:
```python
Patologia(
    "Faringitis",
    edad_preferente_min=5,
    edad_preferente_max=40,
    estacionalidad="invierno",
    factor_clima_frio=1.4  # +40% cuando hace frío
)
```

### Cálculo de Llegadas Mejorado

```python
tasa_total = (
    pacientes_base
    * factor_horario        # Más en horas punta
    * factor_semanal        # Lunes > Domingo
    * factor_estacional     # Invierno > Verano (gripe)
    * factor_clima          # Frío/Lluvia aumenta
    * factor_eventos        # Partidos/Conciertos aumentan
    * factor_festivos       # Festivos reducen
)
```

---

## 🎯 Impacto de las Mejoras

### Realismo de Datos

**Antes:**
- Edad: Completamente aleatoria
- Patologías: Distribución uniforme
- Llegadas: Solo patrón horario básico

**Ahora:**
- Edad: Correlacionada (IAM en 60-80 años, otitis en niños)
- Patologías: Influenciadas por clima y estación
- Llegadas: 6 factores contextuales aplicados

### Ejemplo Real: San Juan en A Coruña

```python
# 23 de junio, 22:00h
evento = "Noche de San Juan"
factor_eventos = 1.8      # +80% demanda
factor_traumas = 1.6      # Hogueras, pirotecnia
factor_alcohol = 1.8      # Celebraciones

# Resultado:
# - Llegadas esperadas: ~30-40/hora (vs 15-20 normal)
# - Más traumas (quemaduras)
# - Más intoxicaciones etílicas
# - Edad media baja (20-35 años)
```

---

## 👏 Conclusión

**Versión 3.0** representa un salto cualitativo en el realismo de la simulación:

✅ **Arquitectura profesional** - Fácil de mantener y extender
✅ **Datos realistas** - Correlaciones edad-patología, clima, eventos
✅ **Visualizaciones avanzadas** - Dashboards de correlaciones y predicciones
✅ **APIs públicas** - Integración con datos reales del mundo
✅ **Configuración flexible** - Variables de entorno, modo simulado
✅ **Retrocompatible** - Sistema antiguo sigue funcionando

---

**Autor:** Claude Code
**Fecha:** Diciembre 2025
**Versión:** 3.0.0
