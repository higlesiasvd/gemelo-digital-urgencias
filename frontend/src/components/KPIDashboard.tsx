import { useState, useEffect } from 'react';
import {
  Paper,
  Text,
  Group,
  Badge,
  Card,
  SimpleGrid,
  ThemeIcon,
  Progress,
  Box,
  RingProgress,
  Divider,
  SegmentedControl,
  Table,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChartBar,
  IconClock,
  IconUsers,
  IconActivity,
  IconTrendingUp,
  IconTrendingDown,
  IconHeartbeat,
  IconStethoscope,
  IconDoor,
  IconCheck,
  IconAlertTriangle,
  IconChartLine,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface KPI {
  id: string;
  label: string;
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: React.ReactNode;
}

interface HospitalMetrics {
  hospitalId: string;
  hospitalName: string;
  doorToDoctor: number; // Tiempo puerta-médico en minutos
  doorToTriage: number; // Tiempo puerta-triage
  lengthOfStay: number; // Estancia media en horas
  leftWithoutSeen: number; // Pacientes que se van sin ser atendidos (%)
  patientSatisfaction: number; // Satisfacción (1-5)
  readmissionRate: number; // Tasa de reingresos (%)
}

// Generar métricas simuladas
const generateMetrics = (stats: Record<string, any>): HospitalMetrics[] => {
  const hospitals = [
    { id: 'chuac', name: 'CHUAC' },
    { id: 'hm_modelo', name: 'HM Modelo' },
    { id: 'san_rafael', name: 'San Rafael' },
  ];
  
  return hospitals.map(hospital => {
    const hospitalStats = stats[hospital.id] || {};
    const saturation = hospitalStats.nivel_saturacion || 0.5;
    
    // Las métricas empeoran con mayor saturación
    const baseMultiplier = 1 + (saturation * 0.5);
    
    return {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      doorToDoctor: Math.round(15 * baseMultiplier + Math.random() * 10),
      doorToTriage: Math.round(5 * baseMultiplier + Math.random() * 3),
      lengthOfStay: Math.round((4 + Math.random() * 2) * baseMultiplier * 10) / 10,
      leftWithoutSeen: Math.round((2 + saturation * 5) * 10) / 10,
      patientSatisfaction: Math.round((4.5 - saturation * 1.5) * 10) / 10,
      readmissionRate: Math.round((3 + saturation * 2) * 10) / 10,
    };
  });
};

// Generar datos históricos para gráficos
const generateHistoricalData = () => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      chuac: Math.round(60 + Math.random() * 30),
      hm_modelo: Math.round(50 + Math.random() * 25),
      san_rafael: Math.round(45 + Math.random() * 20),
    });
  }
  return data;
};

export function KPIDashboard() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [metrics, setMetrics] = useState<HospitalMetrics[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  
  const { stats } = useHospitalStore();
  const theme = useMantineTheme();

  useEffect(() => {
    setMetrics(generateMetrics(stats));
    setHistoricalData(generateHistoricalData());
  }, [stats]);

  // Calcular KPIs globales
  const globalKPIs: KPI[] = [
    {
      id: 'door-to-doctor',
      label: 'Tiempo Puerta-Médico',
      value: Math.round(metrics.reduce((sum, m) => sum + m.doorToDoctor, 0) / (metrics.length || 1)),
      unit: 'min',
      target: 15,
      trend: 'up',
      color: 'blue',
      icon: <IconDoor size={18} />,
    },
    {
      id: 'length-of-stay',
      label: 'Estancia Media',
      value: Math.round(metrics.reduce((sum, m) => sum + m.lengthOfStay, 0) / (metrics.length || 1) * 10) / 10,
      unit: 'h',
      target: 4,
      trend: 'stable',
      color: 'violet',
      icon: <IconClock size={18} />,
    },
    {
      id: 'left-without-seen',
      label: 'Abandonos',
      value: Math.round(metrics.reduce((sum, m) => sum + m.leftWithoutSeen, 0) / (metrics.length || 1) * 10) / 10,
      unit: '%',
      target: 2,
      trend: 'down',
      color: 'orange',
      icon: <IconUsers size={18} />,
    },
    {
      id: 'satisfaction',
      label: 'Satisfacción',
      value: Math.round(metrics.reduce((sum, m) => sum + m.patientSatisfaction, 0) / (metrics.length || 1) * 10) / 10,
      unit: '/5',
      target: 4.5,
      trend: 'up',
      color: 'green',
      icon: <IconHeartbeat size={18} />,
    },
  ];

  // Datos para gráfico de comparación de hospitales
  const comparisonData = metrics.map(m => ({
    hospital: m.hospitalName,
    'Puerta-Médico': m.doorToDoctor,
    'Puerta-Triage': m.doorToTriage,
    'Estancia (h)': m.lengthOfStay,
  }));

  const getKPIStatus = (kpi: KPI): 'success' | 'warning' | 'error' => {
    const ratio = kpi.id === 'satisfaction' ? kpi.value / kpi.target : kpi.target / kpi.value;
    if (ratio >= 0.9) return 'success';
    if (ratio >= 0.7) return 'warning';
    return 'error';
  };

  return (
    <Paper shadow="sm" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'pink', to: 'grape' }}>
            <IconChartBar size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={600} size="lg">KPIs y Calidad Asistencial</Text>
            <Text size="xs" c="dimmed">Indicadores clave de rendimiento</Text>
          </Box>
        </Group>
        
        <SegmentedControl
          value={timeRange}
          onChange={(value) => setTimeRange(value as 'today' | 'week' | 'month')}
          data={[
            { label: 'Hoy', value: 'today' },
            { label: 'Semana', value: 'week' },
            { label: 'Mes', value: 'month' },
          ]}
          size="xs"
        />
      </Group>

      {/* KPIs Principales */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="lg">
        {globalKPIs.map(kpi => {
          const status = getKPIStatus(kpi);
          const statusColor = status === 'success' ? 'green' : status === 'warning' ? 'yellow' : 'red';
          
          return (
            <Card key={kpi.id} withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <ThemeIcon size="md" radius="md" color={kpi.color} variant="light">
                  {kpi.icon}
                </ThemeIcon>
                <Badge
                  size="xs"
                  color={statusColor}
                  variant="light"
                  leftSection={
                    status === 'success' ? <IconCheck size={10} /> :
                    status === 'warning' ? <IconAlertTriangle size={10} /> :
                    <IconAlertTriangle size={10} />
                  }
                >
                  {status === 'success' ? 'OK' : status === 'warning' ? 'Alerta' : 'Crítico'}
                </Badge>
              </Group>
              
              <Text size="xs" c="dimmed">{kpi.label}</Text>
              <Group gap="xs" align="baseline">
                <Text size="xl" fw={700}>{kpi.value}</Text>
                <Text size="sm" c="dimmed">{kpi.unit}</Text>
                {kpi.trend === 'up' && <IconTrendingUp size={14} color={theme.colors.green[5]} />}
                {kpi.trend === 'down' && <IconTrendingDown size={14} color={theme.colors.red[5]} />}
              </Group>
              
              <Progress
                value={(kpi.id === 'satisfaction' ? kpi.value / 5 : Math.min(kpi.target / kpi.value, 1)) * 100}
                size="xs"
                color={statusColor}
                mt="xs"
              />
              <Text size="xs" c="dimmed" mt={4}>
                Objetivo: {kpi.target}{kpi.unit}
              </Text>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Gráfico de evolución histórica */}
      <Card withBorder p="md" radius="md" mb="md">
        <Group gap="xs" mb="sm">
          <IconChartLine size={16} />
          <Text size="sm" fw={500}>Evolución Ocupación (Últimos 7 días)</Text>
        </Group>
        <Box h={200}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Legend />
              <Line type="monotone" dataKey="chuac" name="CHUAC" stroke="#228be6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="hm_modelo" name="HM Modelo" stroke="#40c057" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="san_rafael" name="San Rafael" stroke="#be4bdb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* Comparación de tiempos por hospital */}
      <Card withBorder p="md" radius="md" mb="md">
        <Group gap="xs" mb="sm">
          <IconStethoscope size={16} />
          <Text size="sm" fw={500}>Tiempos por Hospital (minutos)</Text>
        </Group>
        <Box h={180}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="hospital" type="category" tick={{ fontSize: 10 }} width={80} />
              <Legend />
              <Bar dataKey="Puerta-Médico" fill="#228be6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Puerta-Triage" fill="#40c057" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* Tabla de métricas detalladas */}
      <Divider my="md" label="Métricas Detalladas por Hospital" labelPosition="center" />
      
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Hospital</Table.Th>
            <Table.Th>Puerta-Médico</Table.Th>
            <Table.Th>Puerta-Triage</Table.Th>
            <Table.Th>Estancia</Table.Th>
            <Table.Th>Abandonos</Table.Th>
            <Table.Th>Satisfacción</Table.Th>
            <Table.Th>Reingresos</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {metrics.map(m => (
            <Table.Tr key={m.hospitalId}>
              <Table.Td>
                <Text fw={500} size="sm">{m.hospitalName}</Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={m.doorToDoctor <= 15 ? 'green' : m.doorToDoctor <= 25 ? 'yellow' : 'red'}
                  variant="light"
                  size="sm"
                >
                  {m.doorToDoctor} min
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={m.doorToTriage <= 5 ? 'green' : m.doorToTriage <= 10 ? 'yellow' : 'red'}
                  variant="light"
                  size="sm"
                >
                  {m.doorToTriage} min
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{m.lengthOfStay}h</Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={m.leftWithoutSeen <= 2 ? 'green' : m.leftWithoutSeen <= 5 ? 'yellow' : 'red'}
                  variant="light"
                  size="sm"
                >
                  {m.leftWithoutSeen}%
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <RingProgress
                    size={30}
                    thickness={3}
                    sections={[{ value: (m.patientSatisfaction / 5) * 100, color: 'green' }]}
                  />
                  <Text size="sm">{m.patientSatisfaction}</Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{m.readmissionRate}%</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* Indicadores de calidad */}
      <Card withBorder p="md" radius="md" mt="md" bg="blue.0">
        <Group gap="sm" mb="sm">
          <IconActivity size={16} color="#228be6" />
          <Text size="sm" fw={500}>Índice de Calidad Asistencial Global</Text>
        </Group>
        <Group justify="space-between" align="center">
          <Box>
            <Text size="xs" c="dimmed">Calculado según estándares del SNS</Text>
            <Group gap="xs" mt="xs">
              <Badge variant="light" color="blue">Tiempo respuesta ✓</Badge>
              <Badge variant="light" color="green">Satisfacción ✓</Badge>
              <Badge variant="light" color="orange">Eficiencia ⚠</Badge>
            </Group>
          </Box>
          <RingProgress
            size={100}
            thickness={10}
            roundCaps
            sections={[
              { value: 75, color: 'blue' },
              { value: 15, color: 'green' },
            ]}
            label={
              <Box ta="center">
                <Text size="lg" fw={700}>7.8</Text>
                <Text size="xs" c="dimmed">/10</Text>
              </Box>
            }
          />
        </Group>
      </Card>
    </Paper>
  );
}
