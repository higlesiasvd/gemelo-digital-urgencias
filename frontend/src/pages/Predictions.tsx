import { useState, useEffect } from 'react';
import { 
  Stack, 
  Title, 
  Text, 
  Card, 
  Select, 
  Grid, 
  Badge, 
  Group, 
  SimpleGrid, 
  ThemeIcon, 
  Paper,
  Tabs,
  Box,
  Divider,
  rem,
} from '@mantine/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { HOSPITALES } from '@/types/hospital';
import { useHospitalStore } from '@/store/hospitalStore';
import { 
  IconBrain, 
  IconTrendingUp, 
  IconClock, 
  IconUsers, 
  IconChartLine,
  IconFlask,
  IconHistory,
  IconUserCog,
  IconActivity,
} from '@tabler/icons-react';
import { SimulationControl } from '@/components/SimulationControl';
import { WhatIfSimulator } from '@/components/WhatIfSimulator';
import { StaffManagement } from '@/components/StaffManagement';
import { TimelineReplay } from '@/components/TimelineReplay';

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

export function Predictions() {
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
    <Stack gap="lg">
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

      <Group justify="flex-end">
        <Select
          value={selectedHospital}
          onChange={(value) => setSelectedHospital(value || 'chuac')}
          data={hospitalOptions}
          style={{ width: 250 }}
          leftSection={<IconActivity size={16} />}
        />
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="lg">
        <Tabs.List grow mb="lg">
          <Tabs.Tab value="predictions" leftSection={<IconChartLine style={iconStyle} />}>
            Predicciones IA
          </Tabs.Tab>
          <Tabs.Tab value="whatif" leftSection={<IconFlask style={iconStyle} />}>
            Simulador What-If
          </Tabs.Tab>
          <Tabs.Tab value="staff" leftSection={<IconUserCog style={iconStyle} />}>
            Personal
          </Tabs.Tab>
          <Tabs.Tab value="timeline" leftSection={<IconHistory style={iconStyle} />}>
            Timeline
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="predictions">
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 2, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group>
                  <ThemeIcon size="lg" color="violet" variant="light">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Próxima Hora</Text>
                    <Text size="xl" fw={700}>{nextHourPrediction}</Text>
                    <Badge size="sm" color={nextHourPrediction > 10 ? 'red' : nextHourPrediction > 7 ? 'orange' : 'green'}>
                      {nextHourPrediction > 10 ? 'Alto' : nextHourPrediction > 7 ? 'Medio' : 'Normal'}
                    </Badge>
                  </div>
                </Group>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group>
                  <ThemeIcon size="lg" color="blue" variant="light">
                    <IconTrendingUp size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Próximas 6h</Text>
                    <Text size="xl" fw={700}>{next6HoursPrediction}</Text>
                    <Badge size="sm" color={next6HoursPrediction > 50 ? 'red' : next6HoursPrediction > 35 ? 'orange' : 'green'}>
                      {next6HoursPrediction > 50 ? 'Alto' : next6HoursPrediction > 35 ? 'Medio' : 'Normal'}
                    </Badge>
                  </div>
                </Group>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group>
                  <ThemeIcon size="lg" color="orange" variant="light">
                    <IconUsers size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Hora Pico</Text>
                    <Text size="xl" fw={700}>{peakHour?.hora || '--'}</Text>
                    <Badge size="sm" color="orange">{peakHour?.llegadas || 0} llegadas</Badge>
                  </div>
                </Group>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group>
                  <ThemeIcon size="lg" color="grape" variant="light">
                    <IconBrain size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Factor Eventos</Text>
                    <Text size="xl" fw={700}>x{factorEventos.toFixed(2)}</Text>
                    <Badge size="sm" color={factorEventos > 1.2 ? 'red' : factorEventos > 1.1 ? 'orange' : 'green'}>
                      {factorEventos > 1.2 ? 'Aumentado' : factorEventos > 1.1 ? 'Leve' : 'Normal'}
                    </Badge>
                  </div>
                </Group>
              </Card>
            </SimpleGrid>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group mb="md">
                <ThemeIcon size="lg" color="violet" variant="light">
                  <IconChartLine size={20} />
                </ThemeIcon>
                <Title order={3}>Predicción de Llegadas - Próximas 24 Horas</Title>
              </Group>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={predictions}>
                  <defs>
                    <linearGradient id="colorPrediccion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7950f2" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7950f2" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorRango" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#adb5bd" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#adb5bd" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="hora" stroke="#666" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, name === 'llegadas' ? 'Predicción' : name]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="maximo" stroke="#adb5bd" fill="url(#colorRango)" strokeWidth={1} strokeDasharray="3 3" name="Máximo" />
                  <Area type="monotone" dataKey="llegadas" stroke="#7950f2" fill="url(#colorPrediccion)" strokeWidth={3} name="Predicción" />
                  <Area type="monotone" dataKey="minimo" stroke="#adb5bd" fill="none" strokeWidth={1} strokeDasharray="3 3" name="Mínimo" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                  <Title order={4} mb="md">📊 Llegadas Últimas 6 Horas</Title>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={arrivals}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="hora" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '8px' }} />
                      <Bar dataKey="llegadas" fill="#228be6" radius={[4, 4, 0, 0]} name="Llegadas" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                  <Title order={4} mb="md">🏥 Estado Actual del Hospital</Title>
                  {hospitalStats ? (
                    <SimpleGrid cols={2}>
                      <Paper p="md" radius="sm" withBorder>
                        <Text size="xs" c="dimmed">Ocupación Boxes</Text>
                        <Text size="lg" fw={700}>{Math.round((hospitalStats.ocupacion_boxes || 0) * 100)}%</Text>
                      </Paper>
                      <Paper p="md" radius="sm" withBorder>
                        <Text size="xs" c="dimmed">Pacientes en Cola</Text>
                        <Text size="lg" fw={700}>{hospitalStats.pacientes_en_espera_atencion || 0}</Text>
                      </Paper>
                      <Paper p="md" radius="sm" withBorder>
                        <Text size="xs" c="dimmed">T. Espera Medio</Text>
                        <Text size="lg" fw={700}>{Math.round(hospitalStats.tiempo_medio_espera || 0)} min</Text>
                      </Paper>
                      <Paper p="md" radius="sm" withBorder>
                        <Text size="xs" c="dimmed">Saturación</Text>
                        <Text size="lg" fw={700} c={hospitalStats.nivel_saturacion > 0.7 ? 'red' : 'green'}>
                          {Math.round((hospitalStats.nivel_saturacion || 0) * 100)}%
                        </Text>
                      </Paper>
                    </SimpleGrid>
                  ) : (
                    <Text c="dimmed" ta="center" py="xl">Esperando datos del hospital...</Text>
                  )}
                  
                  <Divider my="md" />
                  
                  <Paper p="md" radius="sm" withBorder bg="violet.0">
                    <Group>
                      <ThemeIcon color="violet" variant="light">
                        <IconBrain size={16} />
                      </ThemeIcon>
                      <div>
                        <Text size="sm" fw={500}>Modelo de Predicción</Text>
                        <Text size="xs" c="dimmed">Basado en patrones históricos, clima, eventos y festivos</Text>
                      </div>
                    </Group>
                  </Paper>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="whatif">
          <WhatIfSimulator />
        </Tabs.Panel>

        <Tabs.Panel value="staff">
          <StaffManagement />
        </Tabs.Panel>

        <Tabs.Panel value="timeline">
          <TimelineReplay />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
