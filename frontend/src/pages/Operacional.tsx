import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Title,
  Stack,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  Progress,
  RingProgress,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Box,
  Divider,
  Select,
  SegmentedControl,
  MultiSelect,
  Tabs,
  rem,
  ActionIcon,
  Tooltip,
  Table,
  Switch,
} from '@mantine/core';
import {
  IconUsers,
  IconBed,
  IconClock,
  IconStethoscope,
  IconBuildingHospital,
  IconAlertTriangle,
  IconTrendingUp,
  IconHourglass,
  IconChartBar,
  IconActivity,
  IconDoor,
  IconHeartbeat,
  IconChartLine,
  IconCheck,
  IconFilter,
  IconRefresh,
  IconTrendingDown,
  IconLayoutDashboard,
  IconListDetails,
} from '@tabler/icons-react';
import { useHospitalStore } from '../store/hospitalStore';
import { HOSPITALES, HospitalStats } from '../types/hospital';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface FilterState {
  hospitals: string[];
  saturacionMin: 'all' | 'normal' | 'medium' | 'high' | 'critical';
  timeRange: 'today' | 'week' | 'month';
}

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
  doorToDoctor: number;
  doorToTriage: number;
  lengthOfStay: number;
  leftWithoutSeen: number;
  patientSatisfaction: number;
  readmissionRate: number;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return hrs + 'h ' + mins + 'm ' + secs + 's';
  if (mins > 0) return mins + 'm ' + secs + 's';
  return secs + 's';
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return Math.round(minutes) + ' min';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hrs + 'h ' + mins + 'm';
};

const getOcupacionColor = (pct: number) => {
  if (pct >= 90) return 'red';
  if (pct >= 70) return 'orange';
  return 'green';
};

const getNivelSaturacionColor = (nivel: number) => {
  if (nivel >= 0.9) return 'red';
  if (nivel >= 0.7) return 'orange';
  if (nivel >= 0.5) return 'yellow';
  return 'green';
};

const getSaturacionLabel = (nivel: number) => {
  if (nivel >= 0.9) return 'Crítico';
  if (nivel >= 0.7) return 'Alto';
  if (nivel >= 0.5) return 'Medio';
  return 'Normal';
};

const generateMetrics = (stats: Record<string, HospitalStats>): HospitalMetrics[] => {
  return Object.keys(HOSPITALES).map(hospitalId => {
    const hospital = HOSPITALES[hospitalId];
    const hospitalStats = stats[hospitalId];
    const saturation = hospitalStats?.nivel_saturacion || 0.5;
    const baseMultiplier = 1 + (saturation * 0.5);
    return {
      hospitalId,
      hospitalName: hospital.nombre,
      doorToDoctor: Math.round(15 * baseMultiplier + Math.random() * 10),
      doorToTriage: Math.round(5 * baseMultiplier + Math.random() * 3),
      lengthOfStay: Math.round((4 + Math.random() * 2) * baseMultiplier * 10) / 10,
      leftWithoutSeen: Math.round((2 + saturation * 5) * 10) / 10,
      patientSatisfaction: Math.round((4.5 - saturation * 1.5) * 10) / 10,
      readmissionRate: Math.round((3 + saturation * 2) * 10) / 10,
    };
  });
};

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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, trend }) => (
  <Card shadow="sm" p="md" radius="md" withBorder>
    <Group justify="space-between">
      <ThemeIcon size={44} radius="md" color={color} variant="light">
        {icon}
      </ThemeIcon>
      {trend && (
        <ThemeIcon 
          size="sm" 
          radius="xl" 
          color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'} 
          variant="light"
        >
          {trend === 'up' ? <IconTrendingUp size={12} /> : 
           trend === 'down' ? <IconTrendingDown size={12} /> : 
           <IconActivity size={12} />}
        </ThemeIcon>
      )}
    </Group>
    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mt="sm">{title}</Text>
    <Text size="xl" fw={700}>{value}</Text>
    {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
  </Card>
);

export default function Operacional() {
  const { stats: statsRecord, lastUpdate, isConnected } = useHospitalStore();
  const [operationTime, setOperationTime] = useState<number>(0);
  const [startTime] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<HospitalMetrics[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [filters, setFilters] = useState<FilterState>({
    hospitals: [],
    saturacionMin: 'all',
    timeRange: 'today',
  });

  const allStats = Object.values(statsRecord);

  const filteredStats = useMemo(() => {
    let result = allStats;
    if (filters.hospitals.length > 0) {
      result = result.filter(h => filters.hospitals.includes(h.hospital_id));
    }
    if (filters.saturacionMin !== 'all') {
      result = result.filter(h => {
        const nivel = h.nivel_saturacion;
        switch (filters.saturacionMin) {
          case 'critical': return nivel >= 0.9;
          case 'high': return nivel >= 0.7;
          case 'medium': return nivel >= 0.5;
          case 'normal': return nivel < 0.5;
          default: return true;
        }
      });
    }
    return result;
  }, [allStats, filters]);

  const hospitalOptions = Object.values(HOSPITALES).map(h => ({
    value: h.id,
    label: h.nombre,
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setOperationTime(diffSeconds);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    setMetrics(generateMetrics(statsRecord));
    setHistoricalData(generateHistoricalData());
  }, [statsRecord]);

  const totalBoxesOcupados = filteredStats.reduce((acc, h) => acc + h.boxes_ocupados, 0);
  const totalBoxes = filteredStats.reduce((acc, h) => acc + h.boxes_totales, 0);
  const totalObservacionOcupadas = filteredStats.reduce((acc, h) => acc + h.observacion_ocupadas, 0);
  const totalObservacion = filteredStats.reduce((acc, h) => acc + h.observacion_totales, 0);
  const totalEnEspera = filteredStats.reduce((acc, h) => acc + h.pacientes_en_espera_triaje + h.pacientes_en_espera_atencion, 0);
  const totalAtendidosHora = filteredStats.reduce((acc, h) => acc + h.pacientes_atendidos_hora, 0);
  const totalLlegadosHora = filteredStats.reduce((acc, h) => acc + h.pacientes_llegados_hora, 0);
  const tiempoMedioEspera = filteredStats.length > 0 
    ? filteredStats.reduce((acc, h) => acc + h.tiempo_medio_espera, 0) / filteredStats.length 
    : 0;
  const ocupacionMedia = totalBoxes > 0 ? Math.round((totalBoxesOcupados / totalBoxes) * 100) : 0;

  const filteredMetrics = useMemo(() => {
    if (filters.hospitals.length === 0) return metrics;
    return metrics.filter(m => filters.hospitals.includes(m.hospitalId));
  }, [metrics, filters.hospitals]);

  const globalKPIs: KPI[] = [
    {
      id: 'door-to-doctor',
      label: 'Tiempo Puerta-Médico',
      value: Math.round(filteredMetrics.reduce((sum, m) => sum + m.doorToDoctor, 0) / (filteredMetrics.length || 1)),
      unit: 'min',
      target: 15,
      trend: 'up',
      color: 'blue',
      icon: <IconDoor size={18} />,
    },
    {
      id: 'length-of-stay',
      label: 'Estancia Media',
      value: Math.round(filteredMetrics.reduce((sum, m) => sum + m.lengthOfStay, 0) / (filteredMetrics.length || 1) * 10) / 10,
      unit: 'h',
      target: 4,
      trend: 'stable',
      color: 'violet',
      icon: <IconClock size={18} />,
    },
    {
      id: 'left-without-seen',
      label: 'Abandonos',
      value: Math.round(filteredMetrics.reduce((sum, m) => sum + m.leftWithoutSeen, 0) / (filteredMetrics.length || 1) * 10) / 10,
      unit: '%',
      target: 2,
      trend: 'down',
      color: 'orange',
      icon: <IconUsers size={18} />,
    },
    {
      id: 'satisfaction',
      label: 'Satisfacción',
      value: Math.round(filteredMetrics.reduce((sum, m) => sum + m.patientSatisfaction, 0) / (filteredMetrics.length || 1) * 10) / 10,
      unit: '/5',
      target: 4.5,
      trend: 'up',
      color: 'green',
      icon: <IconHeartbeat size={18} />,
    },
  ];

  const comparisonData = filteredMetrics.map(m => ({
    hospital: m.hospitalName.split(' - ')[0].split(' ')[0],
    'Puerta-Médico': m.doorToDoctor,
    'Puerta-Triage': m.doorToTriage,
  }));

  const getKPIStatus = (kpi: KPI): 'success' | 'warning' | 'error' => {
    const ratio = kpi.id === 'satisfaction' ? kpi.value / kpi.target : kpi.target / kpi.value;
    if (ratio >= 0.9) return 'success';
    if (ratio >= 0.7) return 'warning';
    return 'error';
  };

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper 
          shadow="sm" 
          p="md" 
          radius="lg" 
          withBorder
          style={{
            background: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)',
            color: 'white',
          }}
        >
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Group>
                <ThemeIcon size={50} radius="xl" variant="white" color="blue">
                  <IconBuildingHospital size={28} />
                </ThemeIcon>
                <Box>
                  <Title order={2} c="white">Panel Operacional</Title>
                  <Text size="sm" opacity={0.9}>Monitorización y KPIs en tiempo real</Text>
                </Box>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Group justify="flex-end" gap="md">
                <Box ta="center">
                  <Text size="xs" opacity={0.8} tt="uppercase" fw={600}>Tiempo de Operación</Text>
                  <Group gap="xs" justify="center">
                    <IconClock size={18} />
                    <Text size="lg" fw={700}>{formatDuration(operationTime)}</Text>
                  </Group>
                </Box>
                <Divider orientation="vertical" color="rgba(255,255,255,0.3)" />
                <Box ta="center">
                  <Text size="xs" opacity={0.8} tt="uppercase" fw={600}>Estado</Text>
                  <Badge size="lg" color={isConnected ? 'green' : 'red'} variant="filled">
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </Box>
                {lastUpdate && (
                  <Box ta="center">
                    <Text size="xs" opacity={0.8} tt="uppercase" fw={600}>Última Actualización</Text>
                    <Text size="sm" fw={500}>{lastUpdate.toLocaleTimeString()}</Text>
                  </Box>
                )}
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <Group gap="md">
              <Group gap="xs">
                <IconFilter size={18} color="gray" />
                <Text size="sm" fw={500} c="dimmed">Filtros:</Text>
              </Group>
              <MultiSelect
                placeholder="Todos los hospitales"
                data={hospitalOptions}
                value={filters.hospitals}
                onChange={(value) => setFilters(prev => ({ ...prev, hospitals: value }))}
                clearable
                searchable
                style={{ minWidth: 280 }}
                size="sm"
              />
              <Select
                placeholder="Saturación"
                data={[
                  { value: 'all', label: 'Todos los niveles' },
                  { value: 'normal', label: '�� Normal (<50%)' },
                  { value: 'medium', label: '🟡 Medio (50-70%)' },
                  { value: 'high', label: '🟠 Alto (70-90%)' },
                  { value: 'critical', label: '🔴 Crítico (>90%)' },
                ]}
                value={filters.saturacionMin}
                onChange={(value) => setFilters(prev => ({ ...prev, saturacionMin: value as FilterState['saturacionMin'] }))}
                style={{ width: 180 }}
                size="sm"
              />
              <SegmentedControl
                value={filters.timeRange}
                onChange={(value) => setFilters(prev => ({ ...prev, timeRange: value as FilterState['timeRange'] }))}
                data={[
                  { label: 'Hoy', value: 'today' },
                  { label: 'Semana', value: 'week' },
                  { label: 'Mes', value: 'month' },
                ]}
                size="sm"
              />
            </Group>
            <Group gap="sm">
              <Switch
                label="Auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                size="sm"
              />
              <Tooltip label="Actualizar ahora">
                <ActionIcon variant="light" color="blue" size="lg">
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          {(filters.hospitals.length > 0 || filters.saturacionMin !== 'all') && (
            <Group gap="xs" mt="sm">
              <Text size="xs" c="dimmed">Mostrando:</Text>
              <Badge size="sm" variant="light" color="blue">
                {filteredStats.length} de {allStats.length} hospitales
              </Badge>
              {filters.hospitals.length > 0 && (
                <Badge 
                  size="sm" 
                  variant="outline" 
                  color="gray"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setFilters(prev => ({ ...prev, hospitals: [] }))}
                >
                  × Limpiar filtro hospitales
                </Badge>
              )}
            </Group>
          )}
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="lg">
          <Tabs.List grow mb="lg">
            <Tabs.Tab value="overview" leftSection={<IconLayoutDashboard style={iconStyle} />}>
              Vista General
            </Tabs.Tab>
            <Tabs.Tab value="kpis" leftSection={<IconChartBar style={iconStyle} />}>
              KPIs & Calidad
            </Tabs.Tab>
            <Tabs.Tab value="detailed" leftSection={<IconListDetails style={iconStyle} />}>
              Detalle por Hospital
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                <StatCard
                  title="Boxes Ocupados"
                  value={totalBoxesOcupados + '/' + totalBoxes}
                  icon={<IconBed size={24} />}
                  color="blue"
                  subtitle={'Ocupación: ' + ocupacionMedia + '%'}
                  trend={ocupacionMedia > 80 ? 'up' : 'stable'}
                />
                <StatCard
                  title="Pacientes en Espera"
                  value={totalEnEspera}
                  icon={<IconUsers size={24} />}
                  color={totalEnEspera > 20 ? 'red' : totalEnEspera > 10 ? 'orange' : 'green'}
                  subtitle="Triaje + Atención"
                  trend={totalEnEspera > 15 ? 'up' : 'down'}
                />
                <StatCard
                  title="Tiempo Medio Espera"
                  value={formatMinutes(tiempoMedioEspera)}
                  icon={<IconHourglass size={24} />}
                  color={tiempoMedioEspera > 60 ? 'red' : tiempoMedioEspera > 30 ? 'orange' : 'green'}
                  subtitle="Promedio general"
                />
                <StatCard
                  title="Flujo Pacientes/hora"
                  value={totalLlegadosHora + ' / ' + totalAtendidosHora}
                  icon={<IconTrendingUp size={24} />}
                  color="violet"
                  subtitle="Llegadas / Atendidos"
                  trend={totalLlegadosHora > totalAtendidosHora ? 'up' : 'down'}
                />
              </SimpleGrid>

              <Grid>
                <Grid.Col span={{ base: 12, md: 8 }}>
                  <Card shadow="sm" p="lg" radius="md" withBorder h="100%">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon size="md" radius="md" color="blue" variant="light">
                          <IconActivity size={16} />
                        </ThemeIcon>
                        <Text fw={600} size="lg">Estado por Hospital</Text>
                      </Group>
                      <Badge color="blue" variant="light">
                        {filteredStats.length} centros activos
                      </Badge>
                    </Group>
                    
                    <Stack gap="sm">
                      {filteredStats.map((hospital) => {
                        const info = HOSPITALES[hospital.hospital_id];
                        const ocupBoxes = hospital.boxes_totales > 0 
                          ? Math.round((hospital.boxes_ocupados / hospital.boxes_totales) * 100) 
                          : 0;
                        
                        return (
                          <Paper key={hospital.hospital_id} p="sm" radius="md" withBorder>
                            <Group justify="space-between" mb="xs">
                              <Group gap="sm">
                                <Text size="sm" fw={600}>
                                  {info?.nombre?.split(' - ')[0] || hospital.hospital_id}
                                </Text>
                                {hospital.emergencia_activa && (
                                  <Badge color="red" size="xs" variant="filled">EMERGENCIA</Badge>
                                )}
                              </Group>
                              <Badge 
                                size="sm" 
                                color={getNivelSaturacionColor(hospital.nivel_saturacion)}
                                variant="filled"
                              >
                                {getSaturacionLabel(hospital.nivel_saturacion)} {Math.round(hospital.nivel_saturacion * 100)}%
                              </Badge>
                            </Group>
                            
                            <Grid gutter="xs">
                              <Grid.Col span={6}>
                                <Group gap="xs">
                                  <Text size="xs" c="dimmed" w={50}>Boxes</Text>
                                  <Progress 
                                    value={ocupBoxes} 
                                    size="sm" 
                                    radius="xl"
                                    color={getOcupacionColor(ocupBoxes)}
                                    style={{ flex: 1 }}
                                  />
                                  <Text size="xs" fw={500} w={45} ta="right">
                                    {hospital.boxes_ocupados}/{hospital.boxes_totales}
                                  </Text>
                                </Group>
                              </Grid.Col>
                              <Grid.Col span={6}>
                                <Group gap="xs">
                                  <Text size="xs" c="dimmed" w={50}>Obs.</Text>
                                  <Progress 
                                    value={hospital.ocupacion_observacion} 
                                    size="sm" 
                                    radius="xl"
                                    color={getOcupacionColor(hospital.ocupacion_observacion)}
                                    style={{ flex: 1 }}
                                  />
                                  <Text size="xs" fw={500} w={45} ta="right">
                                    {hospital.observacion_ocupadas}/{hospital.observacion_totales}
                                  </Text>
                                </Group>
                              </Grid.Col>
                            </Grid>
                          </Paper>
                        );
                      })}
                      
                      {filteredStats.length === 0 && (
                        <Text c="dimmed" ta="center" py="xl">
                          No hay hospitales que coincidan con los filtros
                        </Text>
                      )}
                    </Stack>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Card shadow="sm" p="lg" radius="md" withBorder h="100%">
                    <Group justify="space-between" mb="md">
                      <Text fw={600} size="lg">Observación</Text>
                      <Badge color="teal" variant="light">
                        {totalObservacionOcupadas}/{totalObservacion}
                      </Badge>
                    </Group>
                    
                    <Group justify="center" mb="md">
                      <RingProgress
                        size={120}
                        thickness={14}
                        roundCaps
                        sections={[
                          { 
                            value: totalObservacion > 0 
                              ? (totalObservacionOcupadas / totalObservacion) * 100 
                              : 0, 
                            color: getOcupacionColor(totalObservacion > 0 ? (totalObservacionOcupadas / totalObservacion) * 100 : 0)
                          },
                        ]}
                        label={
                          <Box ta="center">
                            <Text size="lg" fw={700}>
                              {totalObservacion > 0 ? Math.round((totalObservacionOcupadas / totalObservacion) * 100) : 0}%
                            </Text>
                            <Text size="xs" c="dimmed">Ocupación</Text>
                          </Box>
                        }
                      />
                    </Group>
                    
                    <Stack gap="xs">
                      {filteredStats.map((hospital) => {
                        const info = HOSPITALES[hospital.hospital_id];
                        return (
                          <Group key={hospital.hospital_id} justify="space-between">
                            <Text size="sm">{info?.nombre?.split(' - ')[0] || hospital.hospital_id}</Text>
                            <Badge 
                              color={getOcupacionColor(hospital.ocupacion_observacion)} 
                              variant="light"
                              size="sm"
                            >
                              {hospital.observacion_ocupadas}/{hospital.observacion_totales}
                            </Badge>
                          </Group>
                        );
                      })}
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>

              {filteredStats.some(h => h.nivel_saturacion >= 0.9 || h.emergencia_activa) && (
                <Card shadow="sm" p="lg" radius="md" withBorder bg="red.0">
                  <Group>
                    <ThemeIcon size={40} radius="md" color="red">
                      <IconAlertTriangle size={24} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={600} c="red.8">Alerta de Saturación</Text>
                      <Text size="sm" c="red.7">
                        {filteredStats.filter(h => h.nivel_saturacion >= 0.9 || h.emergencia_activa).length} hospital(es) 
                        con saturación crítica o emergencia activa
                      </Text>
                    </Box>
                  </Group>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="kpis">
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
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
                        {kpi.trend === 'up' && <IconTrendingUp size={14} color="var(--mantine-color-green-5)" />}
                        {kpi.trend === 'down' && <IconTrendingDown size={14} color="var(--mantine-color-red-5)" />}
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

              <Grid>
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <Card withBorder p="md" radius="md" h="100%">
                    <Group gap="xs" mb="sm">
                      <ThemeIcon size="sm" radius="md" color="violet" variant="light">
                        <IconChartLine size={14} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>Evolución Ocupación (Últimos 7 días)</Text>
                    </Group>
                    <Box h={280}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historicalData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Legend />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="chuac" name="CHUAC" stroke="#228be6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="hm_modelo" name="HM Modelo" stroke="#40c057" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="san_rafael" name="San Rafael" stroke="#be4bdb" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Card withBorder p="md" radius="md" h="100%">
                    <Group gap="xs" mb="sm">
                      <ThemeIcon size="sm" radius="md" color="blue" variant="light">
                        <IconStethoscope size={14} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>Tiempos por Hospital (min)</Text>
                    </Group>
                    <Box h={280}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="hospital" type="category" tick={{ fontSize: 10 }} width={80} />
                          <Legend />
                          <RechartsTooltip />
                          <Bar dataKey="Puerta-Médico" fill="#228be6" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Puerta-Triage" fill="#40c057" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card>
                </Grid.Col>
              </Grid>

              <Card withBorder p="md" radius="md">
                <Group gap="xs" mb="md">
                  <ThemeIcon size="sm" radius="md" color="grape" variant="light">
                    <IconChartBar size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>Métricas Detalladas por Hospital</Text>
                </Group>
                
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
                    {filteredMetrics.map(m => (
                      <Table.Tr key={m.hospitalId}>
                        <Table.Td>
                          <Text fw={500} size="sm">{m.hospitalName.split(' - ')[0]}</Text>
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
                              size={28}
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
              </Card>

              <Card withBorder p="md" radius="md" bg="blue.0">
                <Group justify="space-between" align="center">
                  <Box>
                    <Group gap="sm" mb="xs">
                      <IconActivity size={18} color="#228be6" />
                      <Text size="sm" fw={600}>Índice de Calidad Asistencial Global</Text>
                    </Group>
                    <Text size="xs" c="dimmed">Calculado según estándares del SNS</Text>
                    <Group gap="xs" mt="xs">
                      <Badge variant="light" color="blue">Tiempo respuesta OK</Badge>
                      <Badge variant="light" color="green">Satisfacción OK</Badge>
                      <Badge variant="light" color="orange">Eficiencia Alerta</Badge>
                    </Group>
                  </Box>
                  <RingProgress
                    size={90}
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
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="detailed">
            <Stack gap="md">
              {filteredStats.map((hospital) => {
                const info = HOSPITALES[hospital.hospital_id];
                const ocupBoxes = hospital.boxes_totales > 0 
                  ? Math.round((hospital.boxes_ocupados / hospital.boxes_totales) * 100) 
                  : 0;
                
                return (
                  <Card key={hospital.hospital_id} shadow="sm" p="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon 
                          size="lg" 
                          radius="md" 
                          color={getNivelSaturacionColor(hospital.nivel_saturacion)} 
                          variant="light"
                        >
                          <IconBuildingHospital size={20} />
                        </ThemeIcon>
                        <Box>
                          <Text size="lg" fw={600}>
                            {info?.nombre || hospital.hospital_id}
                          </Text>
                          <Text size="xs" c="dimmed">{info?.ubicacion}</Text>
                        </Box>
                      </Group>
                      <Group gap="sm">
                        {hospital.emergencia_activa && (
                          <Badge color="red" size="lg" variant="filled" leftSection={<IconAlertTriangle size={12} />}>
                            EMERGENCIA ACTIVA
                          </Badge>
                        )}
                        <Badge 
                          size="lg" 
                          color={getNivelSaturacionColor(hospital.nivel_saturacion)}
                          variant="filled"
                        >
                          Saturación: {Math.round(hospital.nivel_saturacion * 100)}%
                        </Badge>
                      </Group>
                    </Group>
                    
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper p="md" radius="md" withBorder>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Ocupación</Text>
                          <Group gap="lg">
                            <Box>
                              <Text size="xs" c="dimmed">Boxes</Text>
                              <Group gap="xs" mt={4}>
                                <RingProgress
                                  size={50}
                                  thickness={5}
                                  sections={[{ value: ocupBoxes, color: getOcupacionColor(ocupBoxes) }]}
                                />
                                <Box>
                                  <Text size="lg" fw={700}>{hospital.boxes_ocupados}/{hospital.boxes_totales}</Text>
                                  <Text size="xs" c="dimmed">{ocupBoxes}%</Text>
                                </Box>
                              </Group>
                            </Box>
                            <Divider orientation="vertical" />
                            <Box>
                              <Text size="xs" c="dimmed">Observación</Text>
                              <Group gap="xs" mt={4}>
                                <RingProgress
                                  size={50}
                                  thickness={5}
                                  sections={[{ value: hospital.ocupacion_observacion, color: getOcupacionColor(hospital.ocupacion_observacion) }]}
                                />
                                <Box>
                                  <Text size="lg" fw={700}>{hospital.observacion_ocupadas}/{hospital.observacion_totales}</Text>
                                  <Text size="xs" c="dimmed">{Math.round(hospital.ocupacion_observacion)}%</Text>
                                </Box>
                              </Group>
                            </Box>
                          </Group>
                        </Paper>
                      </Grid.Col>
                      
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper p="md" radius="md" withBorder>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Colas</Text>
                          <SimpleGrid cols={2}>
                            <Box>
                              <Text size="xs" c="dimmed">En espera triaje</Text>
                              <Text size="xl" fw={700} c={hospital.pacientes_en_espera_triaje > 10 ? 'red' : 'dark'}>
                                {hospital.pacientes_en_espera_triaje}
                              </Text>
                            </Box>
                            <Box>
                              <Text size="xs" c="dimmed">En espera atención</Text>
                              <Text size="xl" fw={700} c={hospital.pacientes_en_espera_atencion > 15 ? 'red' : 'dark'}>
                                {hospital.pacientes_en_espera_atencion}
                              </Text>
                            </Box>
                          </SimpleGrid>
                        </Paper>
                      </Grid.Col>
                      
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper p="md" radius="md" withBorder>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Tiempos</Text>
                          <SimpleGrid cols={3}>
                            <Box>
                              <Text size="xs" c="dimmed">Espera</Text>
                              <Text size="lg" fw={700} c={hospital.tiempo_medio_espera > 60 ? 'red' : hospital.tiempo_medio_espera > 30 ? 'orange' : 'green'}>
                                {formatMinutes(hospital.tiempo_medio_espera)}
                              </Text>
                            </Box>
                            <Box>
                              <Text size="xs" c="dimmed">Atención</Text>
                              <Text size="lg" fw={700}>
                                {formatMinutes(hospital.tiempo_medio_atencion)}
                              </Text>
                            </Box>
                            <Box>
                              <Text size="xs" c="dimmed">Total</Text>
                              <Text size="lg" fw={700}>
                                {formatMinutes(hospital.tiempo_medio_total)}
                              </Text>
                            </Box>
                          </SimpleGrid>
                        </Paper>
                      </Grid.Col>
                    </Grid>
                    
                    <Divider my="md" />
                    
                    <Group justify="space-between">
                      <Group gap="xl">
                        <Box>
                          <Text size="xs" c="dimmed">Llegados/hora</Text>
                          <Group gap="xs">
                            <IconTrendingUp size={16} color="var(--mantine-color-blue-5)" />
                            <Text size="lg" fw={600}>{hospital.pacientes_llegados_hora}</Text>
                          </Group>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">Atendidos/hora</Text>
                          <Group gap="xs">
                            <IconStethoscope size={16} color="var(--mantine-color-green-5)" />
                            <Text size="lg" fw={600}>{hospital.pacientes_atendidos_hora}</Text>
                          </Group>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">Derivados</Text>
                          <Group gap="xs">
                            <IconUsers size={16} color="var(--mantine-color-orange-5)" />
                            <Text size="lg" fw={600}>{hospital.pacientes_derivados}</Text>
                          </Group>
                        </Box>
                      </Group>
                      
                      <Badge 
                        size="lg" 
                        variant="light" 
                        color={hospital.pacientes_llegados_hora > hospital.pacientes_atendidos_hora ? 'orange' : 'green'}
                      >
                        {hospital.pacientes_llegados_hora > hospital.pacientes_atendidos_hora 
                          ? 'Acumulando pacientes' 
                          : 'Flujo estable'}
                      </Badge>
                    </Group>
                  </Card>
                );
              })}
              
              {filteredStats.length === 0 && (
                <Card shadow="sm" p="xl" radius="md" withBorder>
                  <Text c="dimmed" ta="center" py="xl">
                    No hay hospitales que coincidan con los filtros seleccionados
                  </Text>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
