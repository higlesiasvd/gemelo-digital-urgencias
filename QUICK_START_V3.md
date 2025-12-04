# 🚀 Quick Start - Versión 3.0

## ⚡ Empezar en 2 Minutos

### 1. Probar el Nuevo Generador

```bash
# Ejecutar demostración del generador de pacientes realista
PYTHONPATH=src python test_generador.py
```

**Verás:**
```
👨‍⚕️ Generador de Pacientes Realista inicializado
   - Clima: ✅ Habilitado
   - Festivos: ✅ Habilitado
   - Eventos: ✅ Habilitado

Paciente 1:
   - Edad: 28 años
   - Triaje: VERDE (Menos urgente)
   - Patología: Faringitis
```

---

### 2. Ver Ejemplos Avanzados

```bash
# Ejecutar ejemplos interactivos
PYTHONPATH=src python ejemplo_uso_avanzado.py
```

**Incluye:**
- ✅ Generación básica de pacientes
- ✅ Correlaciones edad-patología
- ✅ Influencia del clima
- ✅ Festivos y eventos
- ✅ Simulación especial: San Juan 🔥

---

### 3. Explorar los Nuevos Dashboards

```bash
# Iniciar sistema completo
make start

# Esperar 30 segundos y abrir Grafana
open http://localhost:3001
```

**Nuevos dashboards disponibles:**
1. 📊 **Correlaciones y Análisis Avanzado** (`uid: correlaciones`)
2. 🔮 **Predicción y Detección de Anomalías** (`uid: predicciones`)
3. 🎯 **Dashboard de Eventos** (mejorado, mantiene mapa)

---

## 🌍 Configurar API de Clima (Opcional)

Para usar datos reales de clima:

### 1. Obtener API Key Gratuita

1. Ir a https://openweathermap.org/api
2. Crear cuenta (gratis)
3. Generar API Key
4. Copiar la clave

### 2. Configurar

```bash
export WEATHER_API_KEY="tu_api_key_aqui"
export USAR_CLIMA="true"
```

### 3. Probar

```bash
PYTHONPATH=src python -c "
from infrastructure.external_services import WeatherService
w = WeatherService(api_key='${WEATHER_API_KEY}')
clima = w.obtener_clima()
print(f'Temperatura: {clima.temperatura}°C')
print(f'Descripción: {clima.descripcion}')
"
```

---

## 📚 Estructura de Archivos Nuevos

```
src/
├── config/                           # Configuración centralizada
│   ├── settings.py                  # ✨ NUEVO: Settings con env vars
│   └── hospital_config.py           # ✨ NUEVO: Config hospitales + patologías
│
├── domain/                           # Lógica de dominio
│   └── services/
│       └── generador_pacientes.py   # ✨ NUEVO: Generador avanzado
│
└── infrastructure/                   # Servicios externos
    └── external_services/
        ├── weather_service.py        # ✨ NUEVO: API clima
        ├── holidays_service.py       # ✨ NUEVO: Festivos España/Galicia
        └── events_service.py         # ✨ NUEVO: Eventos A Coruña

grafana/provisioning/dashboards/
├── dashboard-correlaciones.json      # ✨ NUEVO: Dashboard correlaciones
├── dashboard-predicciones.json       # ✨ NUEVO: Dashboard predicciones
└── dashboard-eventos.json            # ⭐ Original (se mantiene)

test_generador.py                     # ✨ NUEVO: Test rápido
ejemplo_uso_avanzado.py               # ✨ NUEVO: Ejemplos interactivos
MEJORAS_REALIZADAS.md                 # ✨ NUEVO: Documentación completa
```

---

## 🎯 Casos de Uso

### Caso 1: Generar 1 Paciente Realista

```python
from infrastructure.external_services import WeatherService
from domain.services.generador_pacientes import GeneradorPacientes

gen = GeneradorPacientes(weather_service=WeatherService(api_key=""))
paciente = gen.generar_paciente_completo(1, "chuac", 0)

print(paciente['edad'])        # Edad correlacionada
print(paciente['patologia'])   # Influenciada por clima
```

### Caso 2: Verificar Festivos

```python
from infrastructure.external_services import HolidaysService
from datetime import date

holidays = HolidaysService()

# Comprobar si hoy es festivo
if holidays.es_festivo(date.today()):
    print("¡Es festivo!")
    factor = holidays.factor_demanda(date.today())
    print(f"Demanda esperada: {factor:.2f}x")
```

### Caso 3: Verificar Eventos

```python
from infrastructure.external_services import EventsService
from datetime import datetime

events = EventsService()

# Eventos activos ahora
eventos_activos = events.obtener_eventos_activos(datetime.now())

for evento in eventos_activos:
    print(f"{evento.nombre}: {evento.asistentes_esperados:,} personas")
    print(f"Factor demanda: {evento.factor_demanda:.2f}x")
```

---

## 🔥 Demo Especial: San Juan

```bash
# Ejecutar solo el ejemplo de San Juan
PYTHONPATH=src python -c "
import sys
sys.path.insert(0, 'src')
from ejemplo_uso_avanzado import ejemplo_san_juan
ejemplo_san_juan()
"
```

Simula la **noche más crítica** de A Coruña:
- 🔥 100,000 personas en las playas
- 🎉 Hogueras por toda la ciudad
- 🍺 Celebraciones hasta el amanecer
- 📈 +80% de demanda de urgencias
- 🏥 Pico de quemaduras, traumas y intoxicaciones

---

## 📊 Comparación Visual: Antes vs Ahora

### Antes
```
Paciente 42:
  - Edad: 73 (aleatorio)
  - Patología: Otitis (¡en un anciano!)
  - Contexto: Ninguno
```

### Ahora
```
Paciente 42:
  - Edad: 8 años (correlacionado: otitis en niños)
  - Patología: Otitis
  - Contexto:
    • Temperatura: 9.2°C ❄️
    • Estación: Invierno (+40% otitis)
    • Festivo: No
    • Eventos: Ninguno
```

---

## ⚙️ Variables de Entorno Disponibles

```bash
# Servicios externos
export WEATHER_API_KEY="..."         # API OpenWeatherMap (opcional)
export USAR_CLIMA="true"             # Habilitar clima real

# MQTT
export MQTT_BROKER="localhost"
export MQTT_PORT="1883"

# Simulación
export HOSPITALES="chuac hm_modelo san_rafael"
export DURACION="24"                 # Horas simuladas
export VELOCIDAD="60"                # 60x = 1h sim/min real

# Otros
export LOG_LEVEL="INFO"
export DEBUG="false"
export RANDOM_SEED="42"              # Para reproducibilidad
```

---

## 🐛 Troubleshooting

### Error: "ImportError: attempted relative import..."

```bash
# Solución: Usar PYTHONPATH
PYTHONPATH=src python test_generador.py
```

### Error: "No module named 'requests'"

```bash
# Solución: Instalar dependencias
pip install -r requirements.txt
```

### Los dashboards no muestran datos

1. Verificar que el simulador está corriendo
2. Verificar que Node-RED está procesando (http://localhost:1880)
3. Verificar que InfluxDB tiene datos:
   ```bash
   make shell-influx
   > influx -username admin -password adminadmin
   > use hospitales
   > show measurements
   ```

---

## 📖 Más Información

- **Documentación completa:** [MEJORAS_REALIZADAS.md](MEJORAS_REALIZADAS.md)
- **README principal:** [README.md](README.md)
- **Configuración:** `src/config/settings.py`

---

## 🎯 Próximos Pasos Sugeridos

1. ✅ **Probar el generador** → `python test_generador.py`
2. ✅ **Ver ejemplos** → `python ejemplo_uso_avanzado.py`
3. ✅ **Explorar dashboards** → Abrir Grafana
4. ⏭️ **Integrar en simulador** → Modificar `src/simulador.py`
5. ⏭️ **Configurar API clima** → OpenWeatherMap
6. ⏭️ **Añadir más eventos** → `src/infrastructure/external_services/events_service.py`

---

**¡Disfruta explorando el nuevo sistema! 🚀**
