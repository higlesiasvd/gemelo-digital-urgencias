# 📁 Ubicación de simulador.py

## 🤔 ¿Dónde debe estar simulador.py?

### Opción 1: En `src/` (ACTUAL) ✅
```
src/
├── simulador.py          ← AQUÍ ESTÁ AHORA
├── config/
├── domain/
└── infrastructure/
```

**Ventajas:**
- ✅ Está con el resto del código fuente
- ✅ Importaciones simples desde otros módulos
- ✅ Estructura coherente

**Ejecutar:**
```bash
PYTHONPATH=src python src/simulador.py --hospitales chuac
```

### Opción 2: En raíz del proyecto (RECOMENDADO) 🎯
```
gemelo-digital-hospitalario/
├── simulador.py          ← MOVERLO AQUÍ
├── src/
│   ├── config/
│   ├── domain/
│   └── infrastructure/
├── tests/
└── README.md
```

**Ventajas:**
- ✅ **Más fácil de ejecutar** (punto de entrada principal)
- ✅ Convención estándar (scripts principales en raíz)
- ✅ Ejecutar con: `python simulador.py` (más simple)

**Ejecutar:**
```bash
python simulador.py --hospitales chuac
```

### Opción 3: En `src/application/` (DDD Puro)
```
src/
├── application/
│   └── simulador.py      ← Capa de aplicación
├── domain/
└── infrastructure/
```

**Ventajas:**
- ✅ Arquitectura DDD más pura
- ✅ Separación clara de capas

**Desventajas:**
- ❌ Menos intuitivo para usuarios
- ❌ Path más largo para ejecutar

## 🎯 Mi Recomendación

### **Mover a la raíz del proyecto:**

```bash
# Mover simulador.py a la raíz
mv src/simulador.py simulador.py

# Actualizar imports en simulador.py:
# De: from domain.services...
# A:  from src.domain.services...
```

### Estructura Final Recomendada:

```
gemelo-digital-hospitalario/
├── simulador.py              ✨ PUNTO DE ENTRADA PRINCIPAL
├── src/
│   ├── config/              # Configuración
│   ├── domain/              # Lógica de negocio
│   │   └── services/
│   │       ├── generador_pacientes.py
│   │       ├── coordinador.py
│   │       └── predictor.py
│   └── infrastructure/      # APIs externas
│       └── external_services/
├── tests/                   # Tests
├── grafana/                 # Dashboards
├── node-red/                # Flujos
├── test_generador.py        # Scripts de prueba
├── ejemplo_uso_avanzado.py
└── README.md
```

### Ejecutar después de mover:

```bash
# Simple y directo:
python simulador.py --hospitales chuac

# En lugar de:
PYTHONPATH=src python src/simulador.py --hospitales chuac
```

## 📝 Cambios Necesarios si Mueves

Si decides mover `simulador.py` a la raíz, actualizar imports:

```python
# En simulador.py, cambiar:
from domain.services.coordinador import CoordinadorCentral
from domain.services.predictor import ServicioPrediccion

# Por:
from src.domain.services.coordinador import CoordinadorCentral
from src.domain.services.predictor import ServicioPrediccion
```

## ✅ Decisión Final

**Estado actual:** `src/simulador.py` - **Funciona bien**
**Recomendación:** Mover a raíz para mayor simplicidad

**¿Mover o no?**
- Si priorizas **facilidad de uso** → Mueve a raíz
- Si priorizas **organización de código** → Déjalo en src/

Ambas opciones son válidas. La actual funciona perfectamente.
