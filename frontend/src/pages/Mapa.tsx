import { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, SimpleGrid, Badge, Group, ThemeIcon, Paper, Grid, Loader, Center } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HOSPITALES } from '@/types/hospital';
import { useHospitalStore } from '@/store/hospitalStore';
import { EventCalendar } from '@/components/EventCalendar';
import { HospitalMetrics } from '@/components/HospitalMetrics';
import {
  IconMapPin,
  IconAlertTriangle,
  IconCloudRain,
  IconSun,
  IconCloud,
  IconSnowflake,
  IconCalendarEvent,
  IconTemperature,
  IconActivity,
  IconBallFootball,
  IconMusic,
  IconConfetti,
  IconRun
} from '@tabler/icons-react';

// Fix para iconos de Leaflet en React
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Crear iconos personalizados para cada hospital
const createHospitalIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      ">🏥</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// Icono de incidente/emergencia
const createIncidentIcon = (tipo: string) => {
  const iconEmoji = tipo.includes('INCENDIO') ? '🔥' : 
                    tipo.includes('TRAFICO') || tipo.includes('ACCIDENTE') ? '🚗' :
                    tipo.includes('INTOXICACION') ? '☢️' :
                    tipo.includes('DEPORTIVO') ? '⚽' :
                    tipo.includes('GRIPE') ? '🦠' : '🚨';
  
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        background-color: #ff0000;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid #ffcc00;
        box-shadow: 0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
        animation: pulse-incident 1.5s infinite;
      ">${iconEmoji}</div>
      <style>
        @keyframes pulse-incident {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.5); }
          50% { transform: scale(1.15); box-shadow: 0 0 30px rgba(255,0,0,1), 0 0 60px rgba(255,0,0,0.7); }
          100% { transform: scale(1); box-shadow: 0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.5); }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Coordenadas reales de Grafana
const HOSPITAL_COORDS: Record<string, { lat: number; lon: number; color: string }> = {
  chuac: { lat: 43.34427, lon: -8.38932, color: '#228be6' },
  hm_modelo: { lat: 43.3669, lon: -8.4189, color: '#40c057' },
  san_rafael: { lat: 43.34521, lon: -8.3879, color: '#fab005' },
};

// Centro del mapa (A Coruña)
const MAP_CENTER: [number, number] = [43.355, -8.40];
const MAP_ZOOM = 13;

// Tipos para datos de APIs
interface WeatherData {
  temperatura: number;
  condicion: string;
  humedad: number;
  viento: number;
}

interface PartidoData {
  fecha: string;
  local: string;
  visitante: string;
  estadio: string;
  esLocal: boolean;
  asistentes: number;
  factorDemanda: number;
}

interface EventoData {
  nombre: string;
  fecha: string;
  tipo: string;
  ubicacion: string;
  asistentes: number;
  factorDemanda: number;
}

export function Mapa() {
  const { stats, contexto, incidenteActivo, setIncidenteActivo } = useHospitalStore();
  const hospitalIds = Object.keys(HOSPITALES);
  
  // Estados para datos de APIs (simulados basados en el contexto del simulador)
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [partidos, setPartidos] = useState<PartidoData[]>([]);
  const [eventos, setEventos] = useState<EventoData[]>([]);
  const [loading, setLoading] = useState(true);

  // Simular carga de datos de APIs basados en el contexto
  useEffect(() => {
    // Simular datos de clima basados en el contexto
    if (contexto) {
      setWeather({
        temperatura: contexto.temperatura || 15,
        condicion: contexto.esta_lloviendo ? 'Lluvia' : 'Soleado',
        humedad: 70,
        viento: 15,
      });
    } else {
      // Datos por defecto de A Coruña
      setWeather({
        temperatura: 14,
        condicion: 'Nublado',
        humedad: 75,
        viento: 20,
      });
    }

    // Helper function to format dates as DD/MM/YYYY
    const formatDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Simular próximos partidos del Deportivo (TheSportsDB API)
    const hoy = new Date();
    setPartidos([
      {
        fecha: formatDate(new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000)),
        local: 'RC Deportivo',
        visitante: 'Racing Santander',
        estadio: 'Riazor',
        esLocal: true,
        asistentes: 22000,
        factorDemanda: 1.35,
      },
      {
        fecha: formatDate(new Date(hoy.getTime() + 10 * 24 * 60 * 60 * 1000)),
        local: 'Real Oviedo',
        visitante: 'RC Deportivo',
        estadio: 'Carlos Tartiere',
        esLocal: false,
        asistentes: 0,
        factorDemanda: 1.0,
      },
      {
        fecha: formatDate(new Date(hoy.getTime() + 17 * 24 * 60 * 60 * 1000)),
        local: 'RC Deportivo',
        visitante: 'SD Eibar',
        estadio: 'Riazor',
        esLocal: true,
        asistentes: 18000,
        factorDemanda: 1.30,
      },
    ]);

    // Simular próximos eventos
    setEventos([
      {
        nombre: 'Concierto en Coliseum',
        fecha: formatDate(new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000)),
        tipo: 'musical',
        ubicacion: 'Coliseum A Coruña',
        asistentes: 6000,
        factorDemanda: 1.25,
      },
      {
        nombre: 'Maratón A Coruña',
        fecha: formatDate(new Date(hoy.getTime() + 12 * 24 * 60 * 60 * 1000)),
        tipo: 'deportivo',
        ubicacion: 'Ciudad A Coruña',
        asistentes: 5000,
        factorDemanda: 1.2,
      },
    ]);

    setLoading(false);
  }, [contexto]);

  // Generar alertas basadas en el estado actual
  const alertasActivas = hospitalIds.flatMap((id) => {
    const hospital = HOSPITALES[id];
    const hospitalStats = stats[id];
    const alertList: Array<{id: string; hospital: string; tipo: string; nivel: 'critical' | 'warning'; mensaje: string}> = [];

    if (!hospitalStats) return [];

    if (hospitalStats.ocupacion_boxes > 0.9) {
      alertList.push({
        id: `${id}-boxes-critical`,
        hospital: hospital.nombre.split(' - ')[0],
        tipo: 'Ocupación Crítica',
        nivel: 'critical',
        mensaje: `Boxes al ${Math.round(hospitalStats.ocupacion_boxes * 100)}%`,
      });
    } else if (hospitalStats.ocupacion_boxes > 0.75) {
      alertList.push({
        id: `${id}-boxes-warning`,
        hospital: hospital.nombre.split(' - ')[0],
        tipo: 'Ocupación Alta',
        nivel: 'warning',
        mensaje: `Boxes al ${Math.round(hospitalStats.ocupacion_boxes * 100)}%`,
      });
    }

    if (hospitalStats.pacientes_en_espera_atencion > 15) {
      alertList.push({
        id: `${id}-espera-critical`,
        hospital: hospital.nombre.split(' - ')[0],
        tipo: 'Cola Excesiva',
        nivel: 'critical',
        mensaje: `${hospitalStats.pacientes_en_espera_atencion} pacientes`,
      });
    }

    if (hospitalStats.tiempo_medio_espera > 60) {
      alertList.push({
        id: `${id}-tiempo-critical`,
        hospital: hospital.nombre.split(' - ')[0],
        tipo: 'Tiempo Crítico',
        nivel: 'critical',
        mensaje: `${hospitalStats.tiempo_medio_espera.toFixed(0)} min`,
      });
    }

    return alertList;
  });

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

  const getWeatherIcon = (condicion: string) => {
    if (condicion.toLowerCase().includes('lluvia')) return <IconCloudRain size={20} />;
    if (condicion.toLowerCase().includes('nieve')) return <IconSnowflake size={20} />;
    if (condicion.toLowerCase().includes('nublado')) return <IconCloud size={20} />;
    return <IconSun size={20} />;
  };

  const getEventIcon = (tipo: string) => {
    if (tipo === 'deportivo') return <IconRun size={16} />;
    if (tipo === 'musical') return <IconMusic size={16} />;
    if (tipo === 'festivo') return <IconConfetti size={16} />;
    return <IconCalendarEvent size={16} />;
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>🗺️ Mapa, Eventos y Alertas</Title>
        <Text c="dimmed" size="sm">
          Estado de hospitales, datos de APIs externas y alertas en tiempo real
        </Text>
      </div>

      {/* Panel de APIs Externas */}
      <Grid>
        {/* Clima - Open-Meteo API */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder h="100%">
            <Group mb="sm">
              <ThemeIcon size="lg" color="blue" variant="light">
                {weather && getWeatherIcon(weather.condicion)}
              </ThemeIcon>
              <div>
                <Text fw={600}>🌤️ Clima A Coruña</Text>
                <Text size="xs" c="dimmed">Open-Meteo API</Text>
              </div>
            </Group>
            {weather && (
              <SimpleGrid cols={2}>
                <Paper p="xs" radius="sm" withBorder>
                  <Group gap="xs">
                    <IconTemperature size={16} />
                    <Text size="sm" fw={500}>{weather.temperatura}°C</Text>
                  </Group>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="sm" fw={500}>{weather.condicion}</Text>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">Humedad: {weather.humedad}%</Text>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">Viento: {weather.viento} km/h</Text>
                </Paper>
              </SimpleGrid>
            )}
            {contexto?.esta_lloviendo && (
              <Badge color="blue" mt="sm" fullWidth>⚠️ Lluvia activa - Más accidentes de tráfico</Badge>
            )}
          </Card>
        </Grid.Col>

        {/* Resumen de Eventos (eliminando duplicados) */}
        <Grid.Col span={{ base: 12, md: 12 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group mb="md" justify="space-between">
              <div>
                <Text fw={600} size="lg">📅 Próximos Eventos de Alto Impacto</Text>
                <Text size="xs" c="dimmed">Eventos que aumentarán la demanda hospitalaria - Ver calendario completo abajo</Text>
              </div>
              <Group>
                <Badge size="lg" color="green" variant="light">
                  {partidos.filter(p => p.esLocal).length} Partidos
                </Badge>
                <Badge size="lg" color="grape" variant="light">
                  {eventos.length} Eventos
                </Badge>
              </Group>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {/* Mostrar partidos locales */}
              {partidos.filter(p => p.esLocal).slice(0, 2).map((partido, idx) => (
                <Paper key={`partido-${idx}`} p="md" radius="md" withBorder style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-green-0) 100%)'
                }}>
                  <Group gap="xs" mb="xs">
                    <ThemeIcon size="lg" color="green" variant="light">
                      <IconBallFootball size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {partido.local} vs {partido.visitante}
                      </Text>
                      <Text size="xs" c="dimmed">{partido.fecha}</Text>
                    </div>
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <Badge size="sm" variant="dot" color="orange">
                      {partido.asistentes ? `${(partido.asistentes / 1000).toFixed(0)}k personas` : 'Impacto alto'}
                    </Badge>
                    <Text size="xs" fw={600} c="orange">
                      +{((partido.factorDemanda - 1) * 100).toFixed(0)}% demanda
                    </Text>
                  </Group>
                </Paper>
              ))}
              {/* Mostrar eventos */}
              {eventos.slice(0, 1).map((evento, idx) => (
                <Paper key={`evento-${idx}`} p="md" radius="md" withBorder style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-grape-0) 100%)'
                }}>
                  <Group gap="xs" mb="xs">
                    <ThemeIcon size="lg" color="grape" variant="light">
                      {getEventIcon(evento.tipo)}
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {evento.nombre}
                      </Text>
                      <Text size="xs" c="dimmed">{evento.fecha}</Text>
                    </div>
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <Badge size="sm" variant="dot" color="orange">
                      {evento.asistentes ? `${(evento.asistentes / 1000).toFixed(0)}k personas` : 'Impacto alto'}
                    </Badge>
                    <Text size="xs" fw={600} c="orange">
                      +{((evento.factorDemanda - 1) * 100).toFixed(0)}% demanda
                    </Text>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Factores de contexto actuales */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Title order={4} mb="sm">📊 Factores de Demanda Actuales</Title>
        <SimpleGrid cols={{ base: 2, md: 5 }}>
          <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="lg" color="blue" variant="light" mx="auto" mb="xs">
              <IconTemperature size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>{contexto?.temperatura || '--'}°C</Text>
            <Text size="xs" c="dimmed">Temperatura</Text>
          </Paper>
          <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="lg" color={contexto?.esta_lloviendo ? 'blue' : 'yellow'} variant="light" mx="auto" mb="xs">
              {contexto?.esta_lloviendo ? <IconCloudRain size={20} /> : <IconSun size={20} />}
            </ThemeIcon>
            <Text size="lg" fw={700}>{contexto?.esta_lloviendo ? 'Sí' : 'No'}</Text>
            <Text size="xs" c="dimmed">Lluvia</Text>
          </Paper>
          <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="lg" color={(contexto?.factor_eventos || 1) > 1.1 ? 'orange' : 'green'} variant="light" mx="auto" mb="xs">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>x{(contexto?.factor_eventos || 1).toFixed(2)}</Text>
            <Text size="xs" c="dimmed">Factor Eventos</Text>
          </Paper>
          <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="lg" color={(contexto?.factor_festivos || 1) > 1.1 ? 'pink' : 'green'} variant="light" mx="auto" mb="xs">
              <IconConfetti size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>x{(contexto?.factor_festivos || 1).toFixed(2)}</Text>
            <Text size="xs" c="dimmed">Factor Festivos</Text>
          </Paper>
          <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size="lg" color={contexto?.es_festivo ? 'pink' : contexto?.es_fin_de_semana ? 'violet' : 'gray'} variant="light" mx="auto" mb="xs">
              <IconActivity size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>{contexto?.es_festivo ? 'Festivo' : contexto?.es_fin_de_semana ? 'Fin Sem.' : 'Laboral'}</Text>
            <Text size="xs" c="dimmed">Tipo de Día</Text>
          </Paper>
        </SimpleGrid>
      </Card>

      <Grid>
        {/* Mapa Real con Leaflet */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              <Group gap="xs">
                <IconMapPin size={20} />
                Red Hospitalaria A Coruña
              </Group>
            </Title>

            {/* Mapa Leaflet */}
            <div style={{ height: 400, borderRadius: 8, overflow: 'hidden' }}>
              <MapContainer
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {hospitalIds.map((id) => {
                  const hospital = HOSPITALES[id];
                  const hospitalStats = stats[id];
                  const coords = HOSPITAL_COORDS[id];
                  const saturacion = hospitalStats?.nivel_saturacion || 0;
                  const color = getColorBySaturation(saturacion);

                  return (
                    <div key={id}>
                      {/* Círculo de área de influencia */}
                      <Circle
                        center={[coords.lat, coords.lon]}
                        radius={800}
                        pathOptions={{
                          color: color,
                          fillColor: color,
                          fillOpacity: 0.2,
                          weight: 2,
                        }}
                      />
                      
                      {/* Marcador del hospital */}
                      <Marker
                        position={[coords.lat, coords.lon]}
                        icon={createHospitalIcon(color)}
                      >
                        <Popup>
                          <div style={{ minWidth: 200 }}>
                            <h4 style={{ margin: '0 0 8px 0' }}>{hospital.nombre.split(' - ')[0]}</h4>
                            <div style={{ 
                              padding: '4px 8px', 
                              borderRadius: 4, 
                              backgroundColor: color,
                              color: 'white',
                              display: 'inline-block',
                              marginBottom: 8
                            }}>
                              {getSaturationLabel(saturacion)} - {Math.round(saturacion * 100)}%
                            </div>
                            <table style={{ width: '100%', fontSize: 12 }}>
                              <tbody>
                                <tr>
                                  <td>Boxes:</td>
                                  <td><strong>{hospitalStats?.boxes_ocupados || 0}/{hospital.num_boxes}</strong></td>
                                </tr>
                                <tr>
                                  <td>Observación:</td>
                                  <td><strong>{hospitalStats?.observacion_ocupadas || 0}/{hospital.num_camas_observacion}</strong></td>
                                </tr>
                                <tr>
                                  <td>En cola:</td>
                                  <td><strong>{hospitalStats?.pacientes_en_espera_atencion || 0}</strong></td>
                                </tr>
                                <tr>
                                  <td>T. espera:</td>
                                  <td><strong>{hospitalStats?.tiempo_medio_espera?.toFixed(0) || 0} min</strong></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </Popup>
                      </Marker>
                    </div>
                  );
                })}

                {/* Marcador de incidente activo */}
                {incidenteActivo && incidenteActivo.ubicacionCoords && (
                  <>
                    {/* Círculo de zona de impacto del incidente */}
                    <Circle
                      center={incidenteActivo.ubicacionCoords}
                      radius={1200}
                      pathOptions={{
                        color: '#ff0000',
                        fillColor: '#ff0000',
                        fillOpacity: 0.15,
                        weight: 3,
                        dashArray: '10, 5',
                      }}
                    />
                    
                    {/* Marcador del incidente */}
                    <Marker
                      position={incidenteActivo.ubicacionCoords}
                      icon={createIncidentIcon(incidenteActivo.tipo)}
                    >
                      <Popup>
                        <div style={{ minWidth: 220 }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '6px 6px 0 0',
                            margin: '-14px -20px 10px -20px',
                            textAlign: 'center',
                          }}>
                            <strong>🚨 INCIDENTE ACTIVO</strong>
                          </div>
                          <table style={{ width: '100%', fontSize: 12 }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: '4px 0' }}>Tipo:</td>
                                <td><strong>{incidenteActivo.tipo.replace(/_/g, ' ')}</strong></td>
                              </tr>
                              <tr>
                                <td style={{ padding: '4px 0' }}>Ubicación:</td>
                                <td><strong>{incidenteActivo.ubicacion}</strong></td>
                              </tr>
                              <tr>
                                <td style={{ padding: '4px 0' }}>Pacientes:</td>
                                <td><strong style={{ color: '#cc0000' }}>{incidenteActivo.numPacientes}</strong></td>
                              </tr>
                              <tr>
                                <td style={{ padding: '4px 0' }}>Hora:</td>
                                <td><strong>{incidenteActivo.timestamp.toLocaleTimeString()}</strong></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}
              </MapContainer>
            </div>

            {/* Leyenda */}
            <Group mt="md" justify="center">
              <Badge color="green" variant="filled">Normal &lt;50%</Badge>
              <Badge color="yellow" variant="filled">Atención 50-70%</Badge>
              <Badge color="orange" variant="filled">Alerta 70-85%</Badge>
              <Badge color="red" variant="filled">Crítico &gt;85%</Badge>
              {incidenteActivo && (
                <Badge 
                  color="red" 
                  variant="outline" 
                  style={{ animation: 'pulse 1.5s infinite', cursor: 'pointer' }}
                  onClick={() => setIncidenteActivo(null)}
                  title="Click para cerrar incidente"
                >
                  🚨 Incidente Activo ✕
                </Badge>
              )}
            </Group>
          </Card>
        </Grid.Col>

        {/* Panel de Alertas Mejorado */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder h="100%">
            <Group justify="space-between" mb="sm">
              <Title order={4}>
                <Group gap="xs">
                  <IconAlertTriangle size={20} />
                  Situación Crítica
                </Group>
              </Title>
              {alertasActivas.length > 0 && (
                <Badge size="lg" color="red" variant="filled">
                  {alertasActivas.length}
                </Badge>
              )}
            </Group>

            {alertasActivas.length === 0 ? (
              <Paper p="xl" radius="md" style={{
                textAlign: 'center',
                background: 'linear-gradient(135deg, var(--mantine-color-green-0) 0%, var(--mantine-color-teal-0) 100%)'
              }}>
                <ThemeIcon size="xl" color="green" variant="light" mx="auto" mb="sm">
                  <IconActivity size={24} />
                </ThemeIcon>
                <Text fw={600} c="green" size="lg">Sistema Operativo</Text>
                <Text size="sm" c="dimmed" mt="xs">
                  Todos los hospitales funcionan dentro de parámetros normales
                </Text>
              </Paper>
            ) : (
              <Stack gap="md">
                {alertasActivas.map((alerta) => {
                  const isCritical = alerta.nivel === 'critical';
                  const messages: Record<string, string> = {
                    'Ocupación Crítica': 'Urgencias saturada. Considere activar protocolo de derivación.',
                    'Ocupación Alta': 'Urgencias cerca de su capacidad máxima. Monitorizar de cerca.',
                    'Cola Excesiva': 'Alto número de pacientes esperando. Tiempo de espera aumentado.',
                    'Tiempo Crítico': 'Tiempos de espera excesivos. Pacientes pueden derivarse a otros centros.',
                  };

                  return (
                    <Paper
                      key={alerta.id}
                      p="md"
                      radius="md"
                      withBorder
                      style={{
                        background: isCritical
                          ? 'linear-gradient(135deg, #ffe0e0 0%, #ffcccc 100%)'
                          : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                        borderLeft: `4px solid ${isCritical ? '#fa5252' : '#fd7e14'}`,
                      }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Badge
                          size="lg"
                          color={isCritical ? 'red' : 'orange'}
                          variant="filled"
                        >
                          {isCritical ? '🚨 CRÍTICO' : '⚠️ ALERTA'}
                        </Badge>
                        <Text size="xs" c="dimmed" fw={600}>
                          {alerta.hospital}
                        </Text>
                      </Group>
                      <Text size="sm" fw={600} mb="xs">
                        {alerta.tipo}: {alerta.mensaje}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                        {messages[alerta.tipo] || 'Requiere atención inmediata del equipo de gestión.'}
                      </Text>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Calendario completo de eventos */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">📅 Calendario de Eventos y Partidos</Title>
        <EventCalendar 
          partidos={partidos.map(p => ({
            nombre: `${p.local} vs ${p.visitante}`,
            fecha: p.fecha,
            tipo: 'futbol',
            ubicacion: p.estadio,
            asistentes: p.asistentes,
            factorDemanda: p.factorDemanda,
            local: p.local,
            visitante: p.visitante,
            esLocal: p.esLocal,
            estadio: p.estadio,
          }))} 
          eventos={eventos.map(e => ({
            nombre: e.nombre,
            fecha: e.fecha,
            tipo: e.tipo,
            ubicacion: e.ubicacion,
            asistentes: e.asistentes,
            factorDemanda: e.factorDemanda,
          }))} 
        />
      </Card>

      {/* Estado de la Red Hospitalaria - Componente visual mejorado */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={4}>🏥 Estado de la Red Hospitalaria</Title>
            <Text size="xs" c="dimmed">Métricas en tiempo real de todos los centros</Text>
          </div>
          <Badge size="lg" variant="light" color={
            hospitalIds.some(id => (stats[id]?.nivel_saturacion || 0) > 0.85) ? 'red' :
            hospitalIds.some(id => (stats[id]?.nivel_saturacion || 0) > 0.70) ? 'orange' : 'green'
          }>
            {hospitalIds.filter(id => (stats[id]?.nivel_saturacion || 0) > 0.85).length > 0
              ? `${hospitalIds.filter(id => (stats[id]?.nivel_saturacion || 0) > 0.85).length} en situación crítica`
              : 'Red operativa'
            }
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {hospitalIds.map((id) => {
            const hospital = HOSPITALES[id];
            const hospitalStats = stats[id];

            if (!hospitalStats) return null;

            return (
              <HospitalMetrics
                key={id}
                stats={hospitalStats}
                hospitalName={hospital.nombre.split(' - ')[0]}
              />
            );
          })}
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
