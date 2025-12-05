import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Stack,
  Grid,
  Card,
  Text,
  Group,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Box,
  Select,
  Tabs,
  rem,
  RingProgress,
} from '@mantine/core';
import {
  IconBrain,
  IconFlask,
  IconTrendingUp,
  IconChartLine,
  IconUserCog,
  IconActivity,
  IconClock,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useHospitalStore } from '../store/hospitalStore';
import { HOSPITALES } from '../types/hospital';
import { SimulationControl } from '../components/SimulationControl';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { StaffManagement } from '../components/StaffManagement';

// Generador de predicciones simuladas
const generarPrediccionesSimuladas = (hospitalId: string) => {
  const hospital = HOSPITALES[hospitalId];
  const baseArrivals = hospital?.pacientes_dia_base || 100;
  const horaActual = new Date().getHours();
  
  const patronDemanda = [
    0.3, 0.25, 0.2, 0.2, 0.25, 0.35,
    0.5, 0.7, 0.85, 0.95, 1.0, 0.95,
    0.9, 0.85, 0.8, 0.75, 0.8, 0.9,
    1.0, 0.95, 0.85, 0.7, 0.5, 0.4
  ];

  const predicciones = [];
  for (let i = 0; i < 24; i++) {
    const hora = (horaActual + i) % 24;
    const factor = patronDemanda[hora];
    const llegadasBase = Math.round((baseArrivals / 24) * factor * (0.9 + Math.random() * 0.2));
    
    predicciones.push({
      hora: `${hora.toString().padStart(2, '0')}:00`,
      llegadas: llegadasBase,
      minimo: Math.max(0, llegadasBase - 3),
      maximo: llegadasBase + 4,
    });
  }
  
  return predicciones;
};

const generarHistorialSimulado = (hospitalId: string) => {
  const hospital = HOSPITALES[hospitalId];
  const baseArrivals = hospital?.pacientes_dia_base || 100;
  const horaActual = new Date().getHours();
  
  const historial = [];
  for (let i = 6; i > 0; i--) {
    const hora = (horaActual - i + 24) % 24;
    const llegadas = Math.round((baseArrivals / 24) * (0.5 + Math.random() * 0.6));
    historial.push({
      hora: `${hora.toString().padStart(2, '0')}:00`,
      llegadas,
    });
  }
  
  return historial;
};

export function GemeloDigital() {
  const [selectedHospital, setSelectedHospital] = useState<string>('chuac');
  const [predictions, setPredictions] = useState<Array<{hora: string; llegadas: number; minimo: number; maximo: number}>>([]);
  const [arrivals, setArrivals] = useState<Array<{hora: string; llegadas: number}>>([]);
  const [activeTab, setActiveTab] = useState<string | null>('predictions');
  const { stats, contexto } = useHospitalStore();

  useEffect(() => {
    setPredictions(generarPrediccionesSimuladas(selectedHospital));
    setArrivals(generarHistorialSimulado(selectedHospital));
    
    const interval = setInterval(() => {
      setPredictions(generarPrediccionesSimuladas(selectedHospital));
      setArrivals(generarHistorialSimulado(selectedHospital));
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedHospital]);

  const hospitalOptions = Object.values(HOSPITALES).map((h) => ({
    value: h.id,
    label: h.nombre,
  }));

  const nextHourPrediction = predictions[0]?.llegadas || 0;
  const next6HoursPrediction = predictions.slice(0, 6).reduce((sum, p) => sum + p.llegadas, 0);
  const peakHour = predictions.reduce((max, p) => p.llegadas > max.llegadas ? p : max, predictions[0]);
  
  const hospitalStats = stats[selectedHospital];
  const factorEventos = contexto?.factor_eventos || 1.0;

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header con control de simulación */}
        <Paper
          shadow="sm"
          radius="lg"
          p="lg"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Group gap="sm" mb="xs">
                <ThemeIcon size="xl" radius="xl" variant="white" color="violet">
                  <IconBrain size={24} />
                </ThemeIcon>
                <Box>
                  <Title order={2} c="white">Gemelo Digital & Predicciones</Title>
                  <Text size="sm" opacity={0.9}>
                    Centro de control inteligente del sistema de urgencias
                  </Text>
                </Box>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <SimulationControl />
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Selector de hospital */}
        <Group justify="flex-end">
          <Select
            placeholder="Seleccionar hospital"
            value={selectedHospital}
            onChange={(value) => setSelectedHospital(value || 'chuac')}
            data={hospitalOptions}
            style={{ minWidth: 280 }}
            leftSection={<IconActivity size={16} />}
          />
        </Group>

        {/* Tabs principales */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="predictions" leftSection={<IconChartLine style={iconStyle} />}>
              Predicciones IA
            </Tabs.Tab>
            <Tabs.Tab value="whatif" leftSection={<IconFlask style={iconStyle} />}>
              Simulador What-If
            </Tabs.Tab>
            <Tabs.Tab value="staff" leftSection={<IconUserCog style={iconStyle} />}>
              Gestión Personal
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab Predicciones */}
          <Tabs.Panel value="predictions" pt="md">
            <Stack gap="md">
              {/* Resumen de predicciones */}
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">Próxima hora</Text>
                    <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                      <IconClock size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700}>{nextHourPrediction}</Text>
                  <Text size="xs" c="dimmed">llegadas esperadas</Text>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">Próximas 6h</Text>
                    <ThemeIcon size="sm" radius="md" variant="light" color="violet">
                      <IconTrendingUp size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700}>{next6HoursPrediction}</Text>
                  <Text size="xs" c="dimmed">llegadas acumuladas</Text>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">Hora pico</Text>
                    <ThemeIcon size="sm" radius="md" variant="light" color="orange">
                      <IconAlertTriangle size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700}>{peakHour?.hora || '--'}</Text>
                  <Text size="xs" c="dimmed">{peakHour?.llegadas || 0} llegadas</Text>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">Factor eventos</Text>
                    <ThemeIcon size="sm" radius="md" variant="light" color={factorEventos > 1.2 ? 'red' : 'green'}>
                      <IconActivity size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700}>x{factorEventos.toFixed(2)}</Text>
                  <Text size="xs" c="dimmed">multiplicador demanda</Text>
                </Card>
              </SimpleGrid>

              {/* Gráfico de predicciones */}
              <Grid>
                <Grid.Col span={{ base: 12, lg: 8 }}>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text fw={500} mb="md">Predicción de llegadas (próximas 24h)</Text>
                    <Box h={350}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={predictions}>
                          <defs>
                            <linearGradient id="colorLlegadas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRango" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255,255,255,0.95)', 
                              borderRadius: '8px',
                              border: '1px solid #eee'
                            }} 
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="maximo" 
                            stackId="1" 
                            stroke="#82ca9d" 
                            fill="url(#colorRango)" 
                            name="Máximo"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="llegadas" 
                            stroke="#667eea" 
                            fill="url(#colorLlegadas)" 
                            name="Predicción"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="minimo" 
                            stackId="2" 
                            stroke="#ffc658" 
                            fill="transparent" 
                            name="Mínimo"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, lg: 4 }}>
                  <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                    <Text fw={500} mb="md">Llegadas recientes</Text>
                    <Box h={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={arrivals}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="llegadas" fill="#667eea" radius={[4, 4, 0, 0]} name="Llegadas reales" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card>
                </Grid.Col>
              </Grid>

              {/* Estado actual del hospital */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text fw={500} mb="md">Estado actual: {HOSPITALES[selectedHospital]?.nombre}</Text>
                <Grid>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Group gap="md">
                      <RingProgress
                        size={80}
                        thickness={8}
                        sections={[{ value: hospitalStats?.ocupacion_boxes || 0, color: 'blue' }]}
                        label={
                          <Text size="xs" ta="center" fw={600}>
                            {(hospitalStats?.ocupacion_boxes || 0).toFixed(0)}%
                          </Text>
                        }
                      />
                      <Box>
                        <Text size="sm" fw={500}>Boxes</Text>
                        <Text size="xs" c="dimmed">
                          {hospitalStats?.boxes_ocupados || 0}/{hospitalStats?.boxes_totales || HOSPITALES[selectedHospital]?.num_boxes}
                        </Text>
                      </Box>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Group gap="md">
                      <RingProgress
                        size={80}
                        thickness={8}
                        sections={[{ value: hospitalStats?.ocupacion_observacion || 0, color: 'violet' }]}
                        label={
                          <Text size="xs" ta="center" fw={600}>
                            {(hospitalStats?.ocupacion_observacion || 0).toFixed(0)}%
                          </Text>
                        }
                      />
                      <Box>
                        <Text size="sm" fw={500}>Observación</Text>
                        <Text size="xs" c="dimmed">
                          {hospitalStats?.observacion_ocupadas || 0}/{hospitalStats?.observacion_totales || HOSPITALES[selectedHospital]?.num_camas_observacion}
                        </Text>
                      </Box>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Box ta="center">
                      <Text size="xl" fw={700} c="orange">{hospitalStats?.pacientes_en_espera_triaje || 0}</Text>
                      <Text size="sm">Cola triaje</Text>
                    </Box>
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Box ta="center">
                      <Text size="xl" fw={700} c="cyan">{(hospitalStats?.tiempo_medio_espera || 0).toFixed(0)} min</Text>
                      <Text size="sm">Tiempo espera</Text>
                    </Box>
                  </Grid.Col>
                </Grid>
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* Tab What-If */}
          <Tabs.Panel value="whatif" pt="md">
            <WhatIfSimulator selectedHospital={selectedHospital} />
          </Tabs.Panel>

          {/* Tab Gestión de Personal */}
          <Tabs.Panel value="staff" pt="md">
            <StaffManagement selectedHospital={selectedHospital} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

export default GemeloDigital;
