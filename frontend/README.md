# 🏥 Gemelo Digital Urgencias - Frontend UI

UI moderna construida con **React**, **TypeScript**, **Mantine** y **Vite** para el gemelo digital de urgencias hospitalarias.

## 🚀 Características

- ✨ **UI Moderna**: Diseñada con Mantine UI Components
- 📊 **Visualización en Tiempo Real**: Gráficos interactivos con Recharts
- 🔄 **Conexión MQTT**: Actualizaciones en tiempo real vía WebSocket
- 📈 **Predicciones ML**: Visualización de predicciones y análisis
- 🎨 **Tema Personalizado**: Colores específicos para urgencias hospitalarias
- 📱 **Responsive**: Adaptada a todos los tamaños de pantalla

## 📦 Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Mantine 7** - Componentes UI
- **Vite** - Build tool
- **Zustand** - State management
- **Recharts** - Gráficos
- **MQTT.js** - Conexión MQTT
- **InfluxDB Client** - Queries a base de datos

## 🛠️ Desarrollo Local

### Prerrequisitos

- Node.js 18+
- npm o yarn

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar configuración de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173) (dev) o [http://localhost:3003](http://localhost:3003) (Docker)

### Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Linter
```

## 🐳 Docker

### Build y ejecución

```bash
# Build de la imagen
docker build -t urgencias-frontend .

# Ejecutar contenedor
docker run -p 3003:80 urgencias-frontend
```

### Con Docker Compose

```bash
# Desde el directorio raíz del proyecto
docker-compose up -d frontend
```

La UI estará disponible en [http://localhost:3003](http://localhost:3003)

## 📐 Arquitectura

```
frontend/
├── src/
│   ├── components/     # Componentes reutilizables
│   │   ├── Layout.tsx        # Layout principal con navegación
│   │   └── HospitalCard.tsx  # Tarjeta de hospital
│   ├── pages/          # Páginas de la aplicación
│   │   ├── Dashboard.tsx     # Dashboard principal
│   │   └── Predictions.tsx   # Predicciones ML
│   ├── hooks/          # Custom hooks
│   │   └── useMqttConnection.ts  # Hook para MQTT
│   ├── services/       # Servicios externos
│   │   └── influxdb.ts       # Cliente InfluxDB
│   ├── store/          # Estado global (Zustand)
│   │   └── hospitalStore.ts  # Store de hospitales
│   ├── types/          # TypeScript types
│   │   └── hospital.ts       # Tipos del dominio
│   ├── theme/          # Tema Mantine
│   │   └── theme.ts          # Configuración de tema
│   ├── App.tsx         # Componente raíz
│   └── main.tsx        # Entry point
├── Dockerfile          # Dockerfile de producción
├── nginx.conf          # Configuración Nginx
└── vite.config.ts      # Configuración Vite
```

## 🎨 Páginas

### 1. Vista General
- Resumen del estado de todos los hospitales
- Métricas globales (ocupación, cola, emergencias)
- Tarjetas de hospital con estadísticas en tiempo real
- Alertas recientes

### 2. Predicciones
- Gráficos de predicción vs realidad
- Estadísticas de predicción
- Análisis de tendencias
- Comparación con datos históricos

### 3. Operacional (Próximamente)
- Vista detallada por hospital
- Seguimiento de pacientes
- Análisis de flujos

### 4. Eventos (Próximamente)
- Timeline de eventos
- Análisis de patrones
- Contexto externo (clima, festivos, eventos)

### 5. Mapa (Próximamente)
- Visualización geográfica
- Estado de red hospitalaria
- Rutas de derivación

### 6. Alertas (Próximamente)
- Historial completo de alertas
- Filtrado y búsqueda
- Gestión de notificaciones

## 🔧 Configuración

### Variables de Entorno

```env
# InfluxDB
VITE_INFLUXDB_URL=http://localhost:8086
VITE_INFLUXDB_TOKEN=mi-token-secreto-urgencias-dt
VITE_INFLUXDB_ORG=urgencias
VITE_INFLUXDB_BUCKET=hospitales

# MQTT
VITE_MQTT_URL=ws://localhost:9001
```

## 🎯 Roadmap

- [x] Dashboard principal
- [x] Conexión MQTT en tiempo real
- [x] Página de predicciones
- [x] Componentes de visualización
- [ ] Página operacional detallada
- [ ] Página de eventos con timeline
- [ ] Página de mapa interactivo
- [ ] Página de gestión de alertas
- [ ] Sistema de notificaciones push
- [ ] Exportación de informes
- [ ] Modo oscuro
- [ ] PWA (Progressive Web App)

## 📝 Licencia

Este proyecto es parte del Gemelo Digital de Urgencias Hospitalarias.
