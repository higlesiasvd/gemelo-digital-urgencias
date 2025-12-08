// ═══════════════════════════════════════════════════════════════════════════════
// MAP PAGE - MAPA DE LA RED HOSPITALARIA
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ThemeIcon,
  Paper,
  SimpleGrid,
  Box,
  Title,
} from '@mantine/core';
import {
  IconCloudRain,
  IconSun,
  IconCloud,
  IconTemperature,
  IconActivity,
  IconCalendarEvent,
  IconAlertTriangle,
  IconSnowflake,
  IconWind,
  IconBallFootball,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useHospitals, useContexto } from '@/shared/store';
import { fetchActiveIncidents, type IncidentResponse } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Hospital data con coordenadas REALES
const HOSPITALES = {
  chuac: {
    id: 'chuac',
    nombre: 'CHUAC',
    nombreCorto: 'CHUAC',
    coordenadas: { lat: 43.34415, lon: -8.38881 },
    color: '#228be6',
  },
  modelo: {
    id: 'modelo',
    nombre: 'HM Modelo',
    nombreCorto: 'Modelo',
    coordenadas: { lat: 43.36666, lon: -8.4186 },
    color: '#fd7e14',
  },
  san_rafael: {
    id: 'san_rafael',
    nombre: 'San Rafael',
    nombreCorto: 'San Rafael',
    coordenadas: { lat: 43.34518, lon: -8.38767 },
    color: '#40c057',
  },
};

// Crear iconos personalizados premium con SVG
const createHospitalIcon = (color: string, saturacion: number) => {
  const statusColor = saturacion > 0.85 ? '#ef4444' : saturacion > 0.7 ? '#f97316' : saturacion > 0.5 ? '#eab308' : '#22c55e';
  const statusGlow = saturacion > 0.85 ? 'rgba(239, 68, 68, 0.6)' : saturacion > 0.7 ? 'rgba(249, 115, 22, 0.6)' : 'rgba(34, 197, 94, 0.5)';
  const pulseAnimation = saturacion > 0.7 ? `
    @keyframes statusPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.2); }
    }
  ` : '';

  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="
        position: relative;
        width: 48px;
        height: 48px;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
      ">
        <!-- Círculo principal con gradiente -->
        <div style="
          position: absolute;
          top: 4px;
          left: 4px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(145deg, ${color}, ${color}dd);
          border: 3px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 -3px 8px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.3);
        ">
          <!-- Icono SVG de hospital -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 6V12H2V22H22V12H20V6L12 2Z" fill="white" fill-opacity="0.15"/>
            <path d="M19 10V7.5L12 4L5 7.5V10H4V20H20V10H19ZM15 15H13V17H11V15H9V13H11V11H13V13H15V15Z" fill="white"/>
          </svg>
        </div>
        <!-- Indicador de estado -->
        <div style="
          position: absolute;
          top: 0;
          right: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${statusColor};
          border: 2px solid white;
          box-shadow: 0 2px 6px ${statusGlow};
          ${saturacion > 0.7 ? 'animation: statusPulse 1.5s ease-in-out infinite;' : ''}
        "></div>
      </div>
      <style>
        ${pulseAnimation}
      </style>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
};

// Centro del mapa (A Coruña - entre hospitales)
const MAP_CENTER: [number, number] = [43.355, -8.41];
const MAP_ZOOM = 13;

// Ubicaciones de eventos importantes en A Coruña
const EVENTOS_CIUDAD = [
  {
    id: 'riazor',
    nombre: 'Estadio Riazor',
    tipo: 'football',
    coordenadas: { lat: 43.36755, lon: -8.41085 },
    descripcion: 'Estadio del RC Deportivo',
    color: '#1e88e5',
  },
  {
    id: 'coliseum',
    nombre: 'Coliseum',
    tipo: 'concierto',
    coordenadas: { lat: 43.33537, lon: -8.41171 },
    descripcion: 'Palacio de los Deportes',
    color: '#9c27b0',
  },
  {
    id: 'torre_hercules',
    nombre: 'Torre de Hércules',
    tipo: 'evento',
    coordenadas: { lat: 43.38595, lon: -8.40645 },
    descripcion: 'Zona de eventos turísticos',
    color: '#ff9800',
  },
];

// Calendario de eventos próximos con estimación de asistencia
const CALENDARIO_EVENTOS = [
  {
    id: 1,
    fecha: '2025-12-08',
    hora: '17:00',
    nombre: 'RC Deportivo vs Sporting',
    tipo: 'football',
    ubicacion: 'Estadio Riazor',
    asistencia_estimada: 25000,
    impacto: 'alto',
    color: '#1e88e5',
  },
  {
    id: 2,
    fecha: '2025-12-10',
    hora: '21:00',
    nombre: 'Concierto Fito y Fitipaldis',
    tipo: 'concierto',
    ubicacion: 'Coliseum',
    asistencia_estimada: 8500,
    impacto: 'medio',
    color: '#9c27b0',
  },
  {
    id: 3,
    fecha: '2025-12-13',
    hora: '20:00',
    nombre: 'RC Deportivo vs Málaga',
    tipo: 'football',
    ubicacion: 'Estadio Riazor',
    asistencia_estimada: 22000,
    impacto: 'alto',
    color: '#1e88e5',
  },
  {
    id: 4,
    fecha: '2025-12-15',
    hora: '12:00',
    nombre: 'Mercado Navideño',
    tipo: 'evento',
    ubicacion: 'María Pita',
    asistencia_estimada: 15000,
    impacto: 'medio',
    color: '#ff9800',
  },
  {
    id: 5,
    fecha: '2025-12-18',
    hora: '19:00',
    nombre: 'Básquet Leyma vs Valencia',
    tipo: 'deportes',
    ubicacion: 'Coliseum',
    asistencia_estimada: 5500,
    impacto: 'bajo',
    color: '#00897b',
  },
  {
    id: 6,
    fecha: '2025-12-21',
    hora: '20:30',
    nombre: 'RC Deportivo vs Zaragoza',
    tipo: 'football',
    ubicacion: 'Estadio Riazor',
    asistencia_estimada: 28000,
    impacto: 'alto',
    color: '#1e88e5',
  },
  {
    id: 7,
    fecha: '2025-12-24',
    hora: '11:00',
    nombre: 'Cabalgata Pre-Navidad',
    tipo: 'evento',
    ubicacion: 'Centro Ciudad',
    asistencia_estimada: 35000,
    impacto: 'muy alto',
    color: '#e53935',
  },
];

// Crear icono premium para eventos con SVG
const createEventIcon = (tipo: string, color: string) => {
  // SVG paths para diferentes tipos de eventos
  const getEventSvg = () => {
    if (tipo === 'football') {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 4.3l2.12.41.02.02 1.29 1.77-.71 2.1-2.08.57L12 9.43V6.3zm-2 0v3.13l-1.64 1.74-2.08-.57-.71-2.1 1.29-1.77.02-.02L10 6.3zM5.51 13.83l.71-2.1.02-.02 1.77-1.29 2.1.71.57 2.08L9.43 15H6.3l-.79-1.17zm5.49 4.87l-2.12-.41-.02-.02-1.29-1.77.71-2.1 2.08-.57L12 15.57v3.13zm1 0v-3.13l1.64-1.74 2.08.57.71 2.1-1.29 1.77-.02.02-2.12.41zm5.49-4.87L16.7 15h-3.13l-1.57-1.43.57-2.08 2.1-.71 1.77 1.29.02.02.71 2.1z"/></svg>`;
    }
    if (tipo === 'concierto') {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
  };

  return L.divIcon({
    className: 'custom-event-marker',
    html: `
      <div style="
        position: relative;
        width: 34px;
        height: 34px;
        filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35));
      ">
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(145deg, ${color}, ${color}cc);
          border: 2.5px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 -2px 6px rgba(0,0,0,0.15);
        ">
          ${getEventSvg()}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

// Crear icono para incidentes activos (con animación de pulso)
const createIncidentIcon = (icono: string, gravedad: string) => {
  const color = gravedad === 'catastrofico' ? '#dc2626'
    : gravedad === 'grave' ? '#ea580c'
      : gravedad === 'moderado' ? '#f59e0b'
        : '#84cc16';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <!-- Círculo pulsante de fondo -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: ${color}55;
          animation: incidentPulse 1.5s ease-out infinite;
        "></div>
        <!-- Icono principal -->
        <div style="
          position: absolute;
          top: 4px;
          left: 4px;
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">${icono}</div>
      </div>
      <style>
        @keyframes incidentPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAP PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function MapPage() {
  const navigate = useNavigate();
  const hospitals = useHospitals();
  const contexto = useContexto();
  const hospitalIds = Object.keys(HOSPITALES) as Array<keyof typeof HOSPITALES>;

  // Obtener incidentes activos
  const { data: incidentsData } = useQuery({
    queryKey: ['active-incidents'],
    queryFn: fetchActiveIncidents,
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });
  const activeIncidents: IncidentResponse[] = incidentsData?.incidentes || [];

  const getColorBySaturation = (saturacion: number) => {
    if (saturacion > 0.85) return '#fa5252';
    if (saturacion > 0.70) return '#fd7e14';
    if (saturacion > 0.50) return '#fab005';
    return '#40c057';
  };

  const getSaturationLabel = (saturacion: number) => {
    if (saturacion > 0.85) return 'CRÍTICO';
    if (saturacion > 0.70) return 'ALERTA';
    if (saturacion > 0.50) return 'ATENCIÓN';
    return 'NORMAL';
  };

  const getWeatherIcon = () => {
    const condicion = contexto?.condicion_climatica?.toLowerCase() || '';
    if (condicion.includes('lluvia') || condicion.includes('rain')) return <IconCloudRain size={22} />;
    if (condicion.includes('nieve') || condicion.includes('snow')) return <IconSnowflake size={22} />;
    if (condicion.includes('viento') || condicion.includes('wind')) return <IconWind size={22} />;
    if ((contexto?.temperatura || 15) < 5) return <IconSnowflake size={22} />;
    if ((contexto?.temperatura || 15) < 12) return <IconCloud size={22} />;
    return <IconSun size={22} />;
  };

  // Detectar mal tiempo (lluvia, nieve, viento fuerte, hielo)
  const isBadWeather = () => {
    const condicion = contexto?.condicion_climatica?.toLowerCase() || '';
    const temperatura = contexto?.temperatura || 15;

    // Lluvia, nieve o viento
    if (condicion.includes('lluvia') || condicion.includes('rain')) return true;
    if (condicion.includes('nieve') || condicion.includes('snow')) return true;
    if (condicion.includes('tormenta') || condicion.includes('storm')) return true;
    if (condicion.includes('niebla') || condicion.includes('fog')) return true;
    if (condicion.includes('viento') || condicion.includes('wind')) return true;

    // Temperatura muy baja (riesgo de hielo)
    if (temperatura <= 3) return true;

    return false;
  };

  // Mensaje específico según condición climática
  const getWeatherAlertMessage = () => {
    const condicion = contexto?.condicion_climatica?.toLowerCase() || '';
    const temperatura = contexto?.temperatura || 15;

    if (condicion.includes('lluvia') || condicion.includes('rain')) {
      return 'Pavimento mojado y visibilidad reducida.';
    }
    if (condicion.includes('nieve') || condicion.includes('snow')) {
      return 'Nieve en calzada, riesgo de deslizamiento.';
    }
    if (condicion.includes('niebla') || condicion.includes('fog')) {
      return 'Niebla densa, visibilidad muy reducida.';
    }
    if (temperatura <= 3) {
      return 'Riesgo de heladas y placas de hielo.';
    }
    if (condicion.includes('viento') || condicion.includes('wind')) {
      return 'Vientos fuertes, precaución con vehículos altos.';
    }
    return 'Precaución en carretera.';
  };

  // Generar alertas basadas en el estado actual
  const alertasActivas = hospitalIds.flatMap((id) => {
    const hospital = HOSPITALES[id];
    const hospitalStats = hospitals[id];
    const alertList: Array<{ id: string; hospital: string; tipo: string; nivel: 'critical' | 'warning'; mensaje: string }> = [];

    if (!hospitalStats) return [];

    if ((hospitalStats.nivel_saturacion || 0) > 0.9) {
      alertList.push({
        id: `${id}-sat-critical`,
        hospital: hospital.nombreCorto,
        tipo: 'Saturación Crítica',
        nivel: 'critical',
        mensaje: `Saturación al ${Math.round((hospitalStats.nivel_saturacion || 0) * 100)}%`,
      });
    } else if ((hospitalStats.nivel_saturacion || 0) > 0.75) {
      alertList.push({
        id: `${id}-sat-warning`,
        hospital: hospital.nombreCorto,
        tipo: 'Saturación Alta',
        nivel: 'warning',
        mensaje: `Saturación al ${Math.round((hospitalStats.nivel_saturacion || 0) * 100)}%`,
      });
    }

    return alertList;
  });

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2}>Mapa de la Red Hospitalaria</Title>
          <Text c="dimmed" size="sm">
            Visualización geográfica del estado de urgencias en A Coruña
          </Text>
        </Box>
      </Group>

      {/* Panel de contexto mejorado */}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {/* Temperatura con gradiente */}
        <Paper
          p="md"
          radius="md"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 139, 230, 0.2) 0%, rgba(64, 192, 203, 0.1) 100%)',
            border: '1px solid rgba(34, 139, 230, 0.3)',
          }}
        >
          <Group gap="xs">
            <ThemeIcon size={40} radius="xl" color="blue" variant="light">
              <IconTemperature size={22} />
            </ThemeIcon>
            <Box>
              <Text size="xl" fw={700}>{contexto?.temperatura || '--'}°C</Text>
              <Text size="xs" c="dimmed">Temperatura actual</Text>
            </Box>
          </Group>
        </Paper>

        {/* Clima con icono dinámico */}
        <Paper
          p="md"
          radius="md"
          style={{
            background: isBadWeather()
              ? 'linear-gradient(135deg, rgba(250, 82, 82, 0.2) 0%, rgba(253, 126, 20, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(64, 192, 87, 0.2) 0%, rgba(250, 176, 5, 0.1) 100%)',
            border: isBadWeather()
              ? '1px solid rgba(250, 82, 82, 0.3)'
              : '1px solid rgba(64, 192, 87, 0.3)',
          }}
        >
          <Group gap="xs">
            <ThemeIcon size={40} radius="xl" color={isBadWeather() ? 'red' : 'green'} variant="light">
              {getWeatherIcon()}
            </ThemeIcon>
            <Box>
              <Text size="xl" fw={700}>{contexto?.condicion_climatica || 'Despejado'}</Text>
              <Text size="xs" c="dimmed">Condición climática</Text>
            </Box>
          </Group>
        </Paper>

        {/* Factor eventos mejorado */}
        <Paper
          p="md"
          radius="md"
          style={{
            background: (contexto?.factor_eventos || 1) > 1.1
              ? 'linear-gradient(135deg, rgba(253, 126, 20, 0.2) 0%, rgba(255, 152, 0, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: (contexto?.factor_eventos || 1) > 1.1
              ? '1px solid rgba(253, 126, 20, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Group gap="xs">
            <ThemeIcon size={40} radius="xl" color={(contexto?.factor_eventos || 1) > 1.1 ? 'orange' : 'gray'} variant="light">
              <IconBallFootball size={22} />
            </ThemeIcon>
            <Box>
              <Text size="xl" fw={700}>x{(contexto?.factor_eventos || 1).toFixed(2)}</Text>
              <Text size="xs" c="dimmed">Factor eventos/partidos</Text>
            </Box>
          </Group>
        </Paper>

        {/* Tipo de día */}
        <Paper
          p="md"
          radius="md"
          style={{
            background: contexto?.es_festivo
              ? 'linear-gradient(135deg, rgba(190, 75, 219, 0.2) 0%, rgba(156, 39, 176, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: contexto?.es_festivo
              ? '1px solid rgba(190, 75, 219, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Group gap="xs">
            <ThemeIcon size={40} radius="xl" color={contexto?.es_festivo ? 'grape' : 'gray'} variant="light">
              <IconCalendarEvent size={22} />
            </ThemeIcon>
            <Box>
              <Text size="xl" fw={700}>{contexto?.es_festivo ? '🎉 Festivo' : 'Laboral'}</Text>
              <Text size="xs" c="dimmed">Tipo de día</Text>
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Alerta de peligro de accidente por mal tiempo */}
      {isBadWeather() && (
        <Paper
          p="md"
          radius="md"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 82, 82, 0.15) 0%, rgba(253, 126, 20, 0.1) 100%)',
            border: '1px solid rgba(250, 82, 82, 0.4)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          <Group>
            <ThemeIcon size={50} radius="xl" color="red" variant="filled">
              <IconAlertTriangle size={28} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Group gap="xs" mb={4}>
                <Badge color="red" variant="filled" size="lg">⚠️ ALERTA DE TRÁFICO</Badge>
                <Badge color="orange" variant="light" size="sm">Riesgo de accidentes elevado</Badge>
              </Group>
              <Text size="sm">
                <strong>Condiciones meteorológicas adversas detectadas.</strong> Se espera un aumento de accidentes de tráfico
                y mayor afluencia de pacientes traumatológicos. {getWeatherAlertMessage()}
              </Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* Mapa y Alertas */}
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {/* Mapa */}
        <Card
          padding={0}
          radius="lg"
          style={{
            background: cssVariables.glassBg,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${cssVariables.glassBorder}`,
            overflow: 'hidden',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ height: 500, width: '100%' }}>
            <MapContainer
              center={MAP_CENTER}
              zoom={MAP_ZOOM}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {hospitalIds.map((id) => {
                const hospital = HOSPITALES[id];
                const hospitalStats = hospitals[id];
                const saturacion = hospitalStats?.nivel_saturacion || 0;
                const color = getColorBySaturation(saturacion);

                return (
                  <div key={id}>
                    {/* Círculo de área de influencia */}
                    <Circle
                      center={[hospital.coordenadas.lat, hospital.coordenadas.lon]}
                      radius={600}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.15,
                        weight: 2,
                      }}
                    />

                    {/* Marcador del hospital */}
                    <Marker
                      position={[hospital.coordenadas.lat, hospital.coordenadas.lon]}
                      icon={createHospitalIcon(hospital.color, saturacion)}
                      eventHandlers={{
                        click: () => {
                          const route = id === 'san_rafael' ? 'san-rafael' : id;
                          navigate(`/hospitales/${route}`);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 180, color: '#333' }}>
                          <h4 style={{ margin: '0 0 8px 0' }}>{hospital.nombreCorto}</h4>
                          <div
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              backgroundColor: color,
                              color: 'white',
                              display: 'inline-block',
                              marginBottom: 8,
                              fontSize: 12,
                            }}
                          >
                            {getSaturationLabel(saturacion)} - {Math.round(saturacion * 100)}%
                          </div>
                          <table style={{ width: '100%', fontSize: 12 }}>
                            <tbody>
                              <tr>
                                <td>Boxes:</td>
                                <td><strong>{hospitalStats?.boxes_ocupados || 0}/{hospitalStats?.boxes_totales || 0}</strong></td>
                              </tr>
                              <tr>
                                <td>Cola:</td>
                                <td><strong>{(hospitalStats?.cola_triaje || 0) + (hospitalStats?.cola_consulta || 0)}</strong></td>
                              </tr>
                              <tr>
                                <td>Tiempo:</td>
                                <td><strong>{hospitalStats?.tiempo_medio_total?.toFixed(0) || 0} min</strong></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                );
              })}

              {/* Marcadores de eventos/lugares de interés */}
              {EVENTOS_CIUDAD.map((evento) => (
                <Marker
                  key={evento.id}
                  position={[evento.coordenadas.lat, evento.coordenadas.lon]}
                  icon={createEventIcon(evento.tipo, evento.color)}
                >
                  <Popup>
                    <div style={{ minWidth: 150, color: '#333' }}>
                      <h4 style={{ margin: '0 0 8px 0' }}>
                        {evento.tipo === 'football' ? '⚽' : evento.tipo === 'concierto' ? '🎵' : '🎉'} {evento.nombre}
                      </h4>
                      <p style={{ fontSize: 12, margin: 0 }}>{evento.descripcion}</p>
                      {(contexto?.factor_eventos || 1) > 1.1 && (
                        <p style={{ fontSize: 11, margin: '8px 0 0', color: '#ff9800', fontWeight: 'bold' }}>
                          ⚠️ Evento activo - Mayor afluencia esperada
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Marcadores de incidentes activos */}
              {activeIncidents.map((incident: IncidentResponse) => (
                <div key={incident.incident_id}>
                  {/* Círculo de área afectada */}
                  <Circle
                    center={[incident.ubicacion.lat, incident.ubicacion.lon]}
                    radius={300}
                    pathOptions={{
                      color: '#dc2626',
                      fillColor: '#dc2626',
                      fillOpacity: 0.2,
                      weight: 2,
                      dashArray: '5, 5',
                    }}
                  />

                  {/* Marcador del incidente */}
                  <Marker
                    position={[incident.ubicacion.lat, incident.ubicacion.lon]}
                    icon={createIncidentIcon(incident.icono, 'grave')}
                  >
                    <Popup>
                      <div style={{ minWidth: 200, color: '#333' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>
                          {incident.icono} {incident.nombre}
                        </h4>
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          backgroundColor: '#dc2626',
                          color: 'white',
                          display: 'inline-block',
                          marginBottom: 8,
                          fontSize: 12,
                        }}>
                          🚨 INCIDENTE ACTIVO
                        </div>
                        <table style={{ width: '100%', fontSize: 12 }}>
                          <tbody>
                            <tr>
                              <td>Pacientes:</td>
                              <td><strong>{incident.pacientes_generados}</strong></td>
                            </tr>
                            <tr>
                              <td>Hospital:</td>
                              <td><strong>{incident.hospital_nombre}</strong></td>
                            </tr>
                            <tr>
                              <td>Distancia:</td>
                              <td><strong>{incident.distancia_km} km</strong></td>
                            </tr>
                            <tr>
                              <td>Hora:</td>
                              <td><strong>{new Date(incident.timestamp).toLocaleTimeString()}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              ))}
            </MapContainer>
          </div>

          {/* Leyenda */}
          <Group p="md" justify="center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Badge color="green" variant="filled" size="sm">Normal &lt;50%</Badge>
            <Badge color="yellow" variant="filled" size="sm">Atención 50-70%</Badge>
            <Badge color="orange" variant="filled" size="sm">Alerta 70-85%</Badge>
            <Badge color="red" variant="filled" size="sm">Crítico &gt;85%</Badge>
          </Group>
        </Card>

        {/* Panel de Alertas */}
        <Card
          padding="lg"
          radius="lg"
          style={{
            background: cssVariables.glassBg,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${cssVariables.glassBorder}`,
          }}
        >
          <Group justify="space-between" mb="md">
            <Text fw={600}>Alertas Activas</Text>
            {alertasActivas.length > 0 && (
              <Badge color="red" variant="filled">{alertasActivas.length}</Badge>
            )}
          </Group>

          {alertasActivas.length === 0 ? (
            <Paper
              p="xl"
              radius="md"
              style={{
                background: 'linear-gradient(135deg, rgba(64, 192, 87, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%)',
                textAlign: 'center',
              }}
            >
              <ThemeIcon size={50} radius="xl" color="green" variant="light" mx="auto" mb="sm">
                <IconActivity size={24} />
              </ThemeIcon>
              <Text fw={600} c="green">Sistema Operativo</Text>
              <Text size="sm" c="dimmed" mt="xs">Todos los hospitales funcionan correctamente</Text>
            </Paper>
          ) : (
            <Stack gap="sm">
              {alertasActivas.map((alerta) => (
                <Paper
                  key={alerta.id}
                  p="sm"
                  radius="md"
                  style={{
                    background: alerta.nivel === 'critical' ? 'rgba(250, 82, 82, 0.1)' : 'rgba(253, 126, 20, 0.1)',
                    borderLeft: `3px solid ${alerta.nivel === 'critical' ? '#fa5252' : '#fd7e14'}`,
                  }}
                >
                  <Group justify="space-between" mb={4}>
                    <Badge color={alerta.nivel === 'critical' ? 'red' : 'orange'} variant="light" size="sm">
                      {alerta.nivel === 'critical' ? '🚨 CRÍTICO' : '⚠️ ALERTA'}
                    </Badge>
                    <Text size="xs" c="dimmed">{alerta.hospital}</Text>
                  </Group>
                  <Text size="sm">{alerta.tipo}: {alerta.mensaje}</Text>
                </Paper>
              ))}
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      {/* Calendario de Eventos */}
      <Card
        padding="lg"
        radius="lg"
        style={{
          background: cssVariables.glassBg,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${cssVariables.glassBorder}`,
        }}
      >
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon size={40} radius="xl" variant="gradient" gradient={{ from: 'grape', to: 'pink' }}>
              <IconCalendarEvent size={22} />
            </ThemeIcon>
            <Box>
              <Title order={4}>Calendario de Eventos</Title>
              <Text size="xs" c="dimmed">Próximos eventos con estimación de asistencia</Text>
            </Box>
          </Group>
          <Badge size="lg" variant="light" color="grape">
            {CALENDARIO_EVENTOS.length} eventos
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {CALENDARIO_EVENTOS.map((evento) => {
            const fecha = new Date(evento.fecha);
            const diasHasta = Math.ceil((fecha.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const esHoy = diasHasta === 0;
            const esProximo = diasHasta >= 0 && diasHasta <= 3;

            const impactoColor = evento.impacto === 'muy alto' ? 'red'
              : evento.impacto === 'alto' ? 'orange'
                : evento.impacto === 'medio' ? 'yellow'
                  : 'green';

            const tipoEmoji = evento.tipo === 'football' ? '⚽'
              : evento.tipo === 'concierto' ? '🎵'
                : evento.tipo === 'deportes' ? '🏀'
                  : '🎉';

            return (
              <Paper
                key={evento.id}
                p="md"
                radius="md"
                style={{
                  background: esHoy
                    ? `linear-gradient(135deg, ${evento.color}40 0%, ${evento.color}20 100%)`
                    : esProximo
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  border: esHoy
                    ? `2px solid ${evento.color}`
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                }}
              >
                {/* Fecha y badges */}
                <Group justify="space-between" mb="xs">
                  <Group gap={4}>
                    <Text size="xl" fw={700}>{fecha.getDate()}</Text>
                    <Box>
                      <Text size="xs" tt="uppercase" c="dimmed">
                        {fecha.toLocaleString('es-ES', { month: 'short' })}
                      </Text>
                      <Text size="xs" c="dimmed">{evento.hora}</Text>
                    </Box>
                  </Group>
                  <Badge
                    size="sm"
                    variant={esHoy ? 'filled' : 'light'}
                    color={esHoy ? 'red' : esProximo ? 'orange' : 'gray'}
                  >
                    {esHoy ? '🔴 HOY' : diasHasta < 0 ? 'Pasado' : `${diasHasta}d`}
                  </Badge>
                </Group>

                {/* Nombre del evento */}
                <Text fw={600} size="sm" mb={4} lineClamp={2}>
                  {tipoEmoji} {evento.nombre}
                </Text>

                {/* Ubicación */}
                <Text size="xs" c="dimmed" mb="sm">
                  📍 {evento.ubicacion}
                </Text>

                {/* Asistencia estimada */}
                <Box
                  p="xs"
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    borderLeft: `3px solid ${evento.color}`
                  }}
                >
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Asistencia est.</Text>
                    <Text size="sm" fw={700}>
                      {evento.asistencia_estimada.toLocaleString('es-ES')}
                    </Text>
                  </Group>
                  <Group justify="space-between" mt={4}>
                    <Text size="xs" c="dimmed">Impacto</Text>
                    <Badge size="xs" color={impactoColor} variant="filled">
                      {evento.impacto.toUpperCase()}
                    </Badge>
                  </Group>
                </Box>
              </Paper>
            );
          })}
        </SimpleGrid>

        {/* Leyenda de impacto */}
        <Group justify="center" mt="lg" gap="lg">
          <Text size="xs" c="dimmed">Nivel de impacto en urgencias:</Text>
          <Badge size="xs" color="green" variant="dot">Bajo (&lt;10K)</Badge>
          <Badge size="xs" color="yellow" variant="dot">Medio (10-20K)</Badge>
          <Badge size="xs" color="orange" variant="dot">Alto (20-30K)</Badge>
          <Badge size="xs" color="red" variant="dot">Muy Alto (&gt;30K)</Badge>
        </Group>
      </Card>
    </Stack>
  );
}
