# 🌍 APIs 100% Gratuitas (Sin Límites)

## ✅ APIs Actualizadas

### 1. 🌦️ Open-Meteo (Clima)
- **URL**: https://open-meteo.com/
- **✅ Totalmente gratuito**
- **✅ Sin API key necesaria**
- **✅ Sin límites de llamadas**
- **✅ Sin registro**

**Uso:**
```python
from infrastructure.external_services import WeatherService

# No necesita API key
weather = WeatherService()
clima = weather.obtener_clima()
```

### 2. ⚽ TheSportsDB (Partidos)
- **URL**: https://www.thesportsdb.com/
- **✅ Tier gratuito sin API key**
- **✅ Datos de LaLiga y Segunda División**
- **✅ Sin límites estrictos**

**Uso:**
```python
from infrastructure.external_services import FootballService

# Tier gratuito incluido
football = FootballService()
partidos = football.obtener_proximos_partidos(30)
```

## 📊 Comparación: Antes vs Ahora

| API | Antes | Ahora |
|-----|-------|-------|
| **Clima** | OpenWeatherMap (1000/día) | Open-Meteo (ilimitado) ✅ |
| **Partidos** | Football-Data (10/min) | TheSportsDB (gratuito) ✅ |

## 🎯 Ventajas

1. **✅ Sin configuración** - Funcionan sin API keys
2. **✅ Sin límites** - Usar cuanto quieras
3. **✅ Sin registro** - Empezar de inmediato
4. **✅ Siempre activas** - No hay modo "simulado"

## 🚀 Probar Ahora

```bash
PYTHONPATH=src python -c "
from infrastructure.external_services import WeatherService, FootballService

# Clima real A Coruña (Open-Meteo)
w = WeatherService()
c = w.obtener_clima()
print(f'Temp: {c.temperatura}°C - {c.descripcion}')

# Partidos Deportivo (TheSportsDB)
f = FootballService()
p = f.obtener_proximos_partidos(30)
print(f'Próximos partidos: {len(p)}')
"
```

**¡Sin configuración necesaria! 🎉**
