# Guía de Capturas de Pantalla para Presentación

Este documento describe las capturas de pantalla y grabaciones recomendadas para la presentación del proyecto.

## Capturas Recomendadas

### 1. Dashboard Principal (Vista 3D)
- **URL**: http://localhost:3003
- **Qué capturar**: Los 3 hospitales con cubos 3D, colores de saturación, contadores
- **Momento**: Cuando haya actividad visible (pacientes en tránsito)

### 2. Vista de Flujo
- **URL**: http://localhost:3003 (cambiar a vista "Flujo")
- **Qué capturar**: Las tarjetas de flujo mostrando ventanilla → triaje → consulta
- **Momento**: Con varios pacientes en diferentes etapas

### 3. Mapa Interactivo
- **URL**: http://localhost:3003/mapa
- **Qué capturar**: Mapa de A Coruña con hospitales y colores de saturación
- **Momento**: Idealmente con un incidente activo visible

### 4. Panel de Predicción
- **URL**: http://localhost:3003/demanda/predictor
- **Qué capturar**: Gráfica de demanda proyectada con intervalos de confianza
- **Momento**: Después de hacer una predicción a 24h

### 5. Gestión de Personal
- **URL**: http://localhost:3003/personal
- **Qué capturar**: Lista SERGAS con médicos disponibles, panel de asignación
- **Momento**: Mostrando asignación a consultas del CHUAC

### 6. Chatbot IA
- **URL**: Cualquier página (widget flotante)
- **Qué capturar**: Conversación con el chatbot preguntando estado del sistema
- **Preguntas sugeridas**:
  - "¿Cuál es el estado actual del CHUAC?"
  - "¿Qué hospital tiene menos saturación?"
  - "¿Cuántos pacientes están esperando en total?"

### 7. API Documentation (Swagger)
- **URL**: http://localhost:8000/docs
- **Qué capturar**: Página principal de Swagger mostrando endpoints
- **Momento**: Mostrando los endpoints disponibles

### 8. Kafka UI
- **URL**: http://localhost:8085
- **Qué capturar**: Lista de topics con mensajes fluyendo
- **Momento**: Durante simulación activa

### 9. Grafana Dashboard
- **URL**: http://localhost:3001
- **Qué capturar**: Dashboard de métricas hospitalarias
- **Credenciales**: admin / admin

## Grabación de Video Recomendada

### Flujo Completo (2-3 minutos)
1. Mostrar Dashboard 3D funcionando
2. Cambiar a vista Flujo
3. Navegar al Mapa
4. Crear un incidente desde el mapa
5. Ver cómo aumentan los pacientes
6. Abrir el chatbot y hacer una pregunta
7. Ir a Personal y asignar un médico
8. Mostrar el cambio de velocidad (1x → 2x)

### Comandos para Preparar el Sistema

```bash
# Asegurar que todo está corriendo
make status

# Reiniciar si es necesario
make restart

# Ver logs en tiempo real (útil para demo)
make logs
```

## Tips para la Presentación

1. **Velocidad de simulación**: Usar 10x para que los cambios sean visibles pero no demasiado rápidos
2. **Resolución**: Capturar en al menos 1920x1080
3. **Tema oscuro**: El frontend usa tema oscuro por defecto, ideal para presentaciones
4. **Chatbot**: Preparar preguntas de antemano para evitar tiempos de espera

## Herramientas de Captura Sugeridas

- **macOS**: Cmd+Shift+5 para capturas y grabaciones
- **OBS Studio**: Para grabaciones más elaboradas
- **Loom**: Para grabaciones rápidas con narración
