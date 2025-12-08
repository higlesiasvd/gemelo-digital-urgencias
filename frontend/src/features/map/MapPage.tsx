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
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useHospitals, useContexto } from '@/shared/store';
import { cssVariables } from '@/shared/theme';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Hospital data con coordenadas
const HOSPITALES = {
  chuac: {
    id: 'chuac',
    nombre: 'CHUAC',
    nombreCorto: 'CHUAC',
    coordenadas: { lat: 43.3517, lon: -8.4154 },
    color: '#228be6',
  },
  modelo: {
    id: 'modelo',
    nombre: 'HM Modelo',
    nombreCorto: 'Modelo',
    coordenadas: { lat: 43.3706, lon: -8.3959 },
    color: '#fd7e14',
  },
  san_rafael: {
    id: 'san_rafael',
    nombre: 'San Rafael',
    nombreCorto: 'San Rafael',
    coordenadas: { lat: 43.3628, lon: -8.4089 },
    color: '#40c057',
  },
};

// Crear iconos personalizados
const createHospitalIcon = (color: string, saturacion: number) => {
  const statusEmoji = saturacion > 0.85 ? '🔴' : saturacion > 0.7 ? '🟠' : '🟢';
  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
      ">🏥</div>
      <div style="
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 14px;
      ">${statusEmoji}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Centro del mapa (A Coruña)
const MAP_CENTER: [number, number] = [43.355, -8.40];
const MAP_ZOOM = 13;

// ═══════════════════════════════════════════════════════════════════════════════
// MAP PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function MapPage() {
  const navigate = useNavigate();
  const hospitals = useHospitals();
  const contexto = useContexto();
  const hospitalIds = Object.keys(HOSPITALES) as Array<keyof typeof HOSPITALES>;

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
    if (condicion.includes('lluvia') || condicion.includes('rain')) return <IconCloudRain size={20} />;
    if ((contexto?.temperatura || 15) < 10) return <IconCloud size={20} />;
    return <IconSun size={20} />;
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

      {/* Panel de contexto */}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Paper p="md" radius="md" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light">
              <IconTemperature size={18} />
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={700}>{contexto?.temperatura || '--'}°C</Text>
              <Text size="xs" c="dimmed">Temperatura</Text>
            </Box>
          </Group>
        </Paper>

        <Paper p="md" radius="md" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Group gap="xs">
            <ThemeIcon color="yellow" variant="light">
              {getWeatherIcon()}
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={700}>{contexto?.condicion_climatica || 'Despejado'}</Text>
              <Text size="xs" c="dimmed">Clima</Text>
            </Box>
          </Group>
        </Paper>

        <Paper p="md" radius="md" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Group gap="xs">
            <ThemeIcon color={(contexto?.factor_eventos || 1) > 1.1 ? 'orange' : 'green'} variant="light">
              <IconCalendarEvent size={18} />
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={700}>x{(contexto?.factor_eventos || 1).toFixed(2)}</Text>
              <Text size="xs" c="dimmed">Factor Eventos</Text>
            </Box>
          </Group>
        </Paper>

        <Paper p="md" radius="md" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Group gap="xs">
            <ThemeIcon color={contexto?.es_festivo ? 'pink' : 'gray'} variant="light">
              <IconActivity size={18} />
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={700}>{contexto?.es_festivo ? 'Festivo' : 'Laboral'}</Text>
              <Text size="xs" c="dimmed">Tipo de día</Text>
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

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
    </Stack>
  );
}
