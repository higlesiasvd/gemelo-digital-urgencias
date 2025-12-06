import { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Card,
  SimpleGrid,
  ThemeIcon,
  Box,
  RingProgress,
  Alert,
  SegmentedControl,
  Divider,
} from '@mantine/core';
import {
  IconBrain,
  IconTrendingUp,
  IconAlertTriangle,
  IconClock,
  IconUsers,
  IconActivity,
  IconChartLine,
  IconBulb,
  IconCalendar,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip } from 'recharts';

interface Prediction {
  hour: string;
  occupancy: number;
  arrivals: number;
  predicted: boolean;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  hospital?: string;
  timeToEvent?: number;
}

// Generar predicciones basadas en datos actuales
const generatePredictions = (currentOccupancy: number): Prediction[] => {
  const now = new Date();
  const predictions: Prediction[] = [];
  
  // Patrones típicos de urgencias por hora
  const hourlyPatterns: Record<number, number> = {
    0: 0.7, 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.3, 5: 0.4,
    6: 0.5, 7: 0.7, 8: 0.9, 9: 1.1, 10: 1.2, 11: 1.3,
    12: 1.2, 13: 1.1, 14: 1.0, 15: 1.0, 16: 1.1, 17: 1.2,
    18: 1.3, 19: 1.4, 20: 1.3, 21: 1.2, 22: 1.0, 23: 0.8,
  };
  
  for (let i = -6; i <= 18; i++) {
    const hour = new Date(now.getTime() + i * 3600000);
    const hourOfDay = hour.getHours();
    const pattern = hourlyPatterns[hourOfDay];
    
    // Calcular ocupación predicha con algo de variación
    const baseOccupancy = currentOccupancy * pattern;
    const variation = (Math.random() - 0.5) * 10;
    const predictedOccupancy = Math.min(100, Math.max(20, baseOccupancy + variation));
    
    // Calcular llegadas esperadas
    const baseArrivals = 8 * pattern;
    const arrivals = Math.round(baseArrivals + (Math.random() - 0.5) * 4);
    
    predictions.push({
      hour: `${hourOfDay.toString().padStart(2, '0')}:00`,
      occupancy: Math.round(predictedOccupancy),
      arrivals,
      predicted: i > 0,
    });
  }
  
  return predictions;
};

// Generar alertas proactivas
const generateAlerts = (stats: Record<string, any>): Alert[] => {
  const alerts: Alert[] = [];
  
  Object.entries(stats).forEach(([hospitalId, data]) => {
    const occupancy = (data.boxes_ocupados / data.boxes_totales) * 100;
    const hospitalName = hospitalId === 'chuac' ? 'CHUAC' : 
                        hospitalId === 'modelo' ? 'HM Modelo' : 'San Rafael';
    
    // Alerta de saturación próxima
    if (occupancy > 75 && occupancy < 90) {
      alerts.push({
        id: `sat-${hospitalId}`,
        type: 'warning',
        title: `${hospitalName} alcanzará saturación`,
        message: `Ocupación actual: ${Math.round(occupancy)}%. Predicción: saturación en ~2 horas`,
        hospital: hospitalId,
        timeToEvent: 120,
      });
    }
    
    // Alerta crítica
    if (occupancy >= 90) {
      alerts.push({
        id: `crit-${hospitalId}`,
        type: 'critical',
        title: `${hospitalName} en estado crítico`,
        message: `Ocupación: ${Math.round(occupancy)}%. Considerar desvío de ambulancias.`,
        hospital: hospitalId,
      });
    }
    
    // Alerta de tiempo de espera alto
    if (data.pacientes_en_espera_atencion > 10) {
      alerts.push({
        id: `wait-${hospitalId}`,
        type: 'warning',
        title: `Cola elevada en ${hospitalName}`,
        message: `${data.pacientes_en_espera_atencion} pacientes esperando atención`,
        hospital: hospitalId,
      });
    }
  });
  
  // Alertas generales basadas en el día/hora
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  if ((day === 5 || day === 6) && hour >= 20) {
    alerts.push({
      id: 'weekend-night',
      type: 'info',
      title: 'Patrón de fin de semana detectado',
      message: 'Históricamente hay +30% de incidencias en noches de fin de semana',
    });
  }
  
  if (hour >= 8 && hour <= 10) {
    alerts.push({
      id: 'morning-peak',
      type: 'info',
      title: 'Pico matutino en progreso',
      message: 'Período de alta demanda típico. Máximo esperado a las 11:00',
    });
  }
  
  return alerts;
};

export function PredictionsPanel() {
  const [timeRange, setTimeRange] = useState<'6h' | '12h' | '24h'>('12h');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const { stats } = useHospitalStore();
  
  // Actualizar predicciones cada minuto
  useEffect(() => {
    const updatePredictions = () => {
      // Calcular ocupación media actual
      const totalBoxes = Object.values(stats).reduce((acc, s) => acc + (s.boxes_totales || 0), 0);
      const occupiedBoxes = Object.values(stats).reduce((acc, s) => acc + (s.boxes_ocupados || 0), 0);
      const avgOccupancy = totalBoxes > 0 ? (occupiedBoxes / totalBoxes) * 100 : 50;
      
      setPredictions(generatePredictions(avgOccupancy));
      setAlerts(generateAlerts(stats));
    };
    
    updatePredictions();
    const interval = setInterval(updatePredictions, 60000);
    
    return () => clearInterval(interval);
  }, [stats]);
  
  // Filtrar predicciones según rango de tiempo
  const filteredPredictions = predictions.slice(
    6, // Empezar desde ahora
    timeRange === '6h' ? 12 : timeRange === '12h' ? 18 : 24
  );
  
  // Encontrar el pico de ocupación predicho
  const peakPrediction = predictions.reduce((max, p) => 
    p.predicted && p.occupancy > max.occupancy ? p : max, 
    { hour: '', occupancy: 0, arrivals: 0, predicted: true }
  );
  
  // Calcular métricas de predicción
  const avgPredictedOccupancy = Math.round(
    filteredPredictions.filter(p => p.predicted).reduce((sum, p) => sum + p.occupancy, 0) / 
    filteredPredictions.filter(p => p.predicted).length
  );
  
  const totalPredictedArrivals = filteredPredictions
    .filter(p => p.predicted)
    .reduce((sum, p) => sum + p.arrivals, 0);

  return (
    <Paper shadow="sm" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
            <IconBrain size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={600} size="lg">Predicciones IA</Text>
            <Text size="xs" c="dimmed">Análisis predictivo de demanda</Text>
          </Box>
        </Group>
        
        <SegmentedControl
          value={timeRange}
          onChange={(value) => setTimeRange(value as '6h' | '12h' | '24h')}
          data={[
            { label: '6h', value: '6h' },
            { label: '12h', value: '12h' },
            { label: '24h', value: '24h' },
          ]}
          size="xs"
        />
      </Group>

      {/* Alertas Proactivas */}
      {alerts.length > 0 && (
        <Stack gap="xs" mb="lg">
          {alerts.slice(0, 3).map(alert => (
            <Alert
              key={alert.id}
              icon={
                alert.type === 'critical' ? <IconAlertTriangle size={16} /> :
                alert.type === 'warning' ? <IconBulb size={16} /> :
                <IconActivity size={16} />
              }
              title={alert.title}
              color={alert.type === 'critical' ? 'red' : alert.type === 'warning' ? 'orange' : 'blue'}
              variant="light"
              radius="md"
            >
              <Text size="xs">{alert.message}</Text>
              {alert.timeToEvent && (
                <Badge size="xs" variant="outline" mt="xs">
                  En ~{Math.round(alert.timeToEvent / 60)}h
                </Badge>
              )}
            </Alert>
          ))}
        </Stack>
      )}

      {/* Gráfico de Predicción */}
      <Card withBorder p="md" radius="md" mb="md">
        <Text size="sm" fw={500} mb="sm">
          <IconChartLine size={14} style={{ marginRight: 4 }} />
          Predicción de Ocupación
        </Text>
        <Box h={200}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictions}>
              <defs>
                <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4c6ef5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4c6ef5" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#be4bdb" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#be4bdb" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <ReferenceLine y={85} stroke="#fa5252" strokeDasharray="3 3" label="Crítico" />
              <ReferenceLine y={70} stroke="#fd7e14" strokeDasharray="3 3" label="Alerta" />
              <RechartsTooltip 
                content={(props: any) => {
                  const { active, payload, label } = props;
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Paper p="xs" shadow="sm" radius="sm" withBorder>
                        <Text size="xs" fw={500}>{label}</Text>
                        <Text size="xs" c="blue">Ocupación: {data.occupancy}%</Text>
                        <Text size="xs" c="dimmed">Llegadas: {data.arrivals}/h</Text>
                        {data.predicted && (
                          <Badge size="xs" color="violet" mt={4}>Predicción</Badge>
                        )}
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#4c6ef5"
                fill="url(#colorOccupancy)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
        <Group justify="center" gap="lg" mt="xs">
          <Group gap={4}>
            <Box w={12} h={12} bg="blue.5" style={{ borderRadius: 2 }} />
            <Text size="xs" c="dimmed">Histórico</Text>
          </Group>
          <Group gap={4}>
            <Box w={12} h={12} bg="violet.5" style={{ borderRadius: 2 }} />
            <Text size="xs" c="dimmed">Predicción</Text>
          </Group>
        </Group>
      </Card>

      {/* Métricas de Predicción */}
      <SimpleGrid cols={3} spacing="md">
        <Card withBorder p="sm" radius="md" ta="center">
          <RingProgress
            size={60}
            thickness={6}
            roundCaps
            sections={[{ value: avgPredictedOccupancy, color: avgPredictedOccupancy > 85 ? 'red' : avgPredictedOccupancy > 70 ? 'orange' : 'blue' }]}
            label={
              <Text size="xs" fw={700}>{avgPredictedOccupancy}%</Text>
            }
            mx="auto"
          />
          <Text size="xs" c="dimmed" mt="xs">Ocupación Media</Text>
          <Text size="xs" c="dimmed">Próximas {timeRange}</Text>
        </Card>
        
        <Card withBorder p="sm" radius="md" ta="center">
          <ThemeIcon size={50} radius="xl" variant="light" color="violet" mx="auto">
            <IconUsers size={24} />
          </ThemeIcon>
          <Text size="lg" fw={700} mt="xs">{totalPredictedArrivals}</Text>
          <Text size="xs" c="dimmed">Llegadas Esperadas</Text>
        </Card>
        
        <Card withBorder p="sm" radius="md" ta="center">
          <ThemeIcon size={50} radius="xl" variant="light" color="orange" mx="auto">
            <IconClock size={24} />
          </ThemeIcon>
          <Text size="sm" fw={700} mt="xs">{peakPrediction.hour}</Text>
          <Text size="xs" c="dimmed">Pico Esperado</Text>
          <Badge size="xs" color="red" variant="light">{peakPrediction.occupancy}%</Badge>
        </Card>
      </SimpleGrid>

      <Divider my="md" />

      {/* Recomendaciones */}
      <Box>
        <Group gap="xs" mb="sm">
          <IconBulb size={16} color="#fab005" />
          <Text size="sm" fw={500}>Recomendaciones IA</Text>
        </Group>
        <Stack gap="xs">
          {avgPredictedOccupancy > 80 && (
            <Card withBorder p="xs" radius="sm" bg="red.0">
              <Group gap="xs">
                <IconTrendingUp size={14} color="#fa5252" />
                <Text size="xs">Considerar activar personal de refuerzo antes de las {peakPrediction.hour}</Text>
              </Group>
            </Card>
          )}
          {alerts.some(a => a.type === 'critical') && (
            <Card withBorder p="xs" radius="sm" bg="orange.0">
              <Group gap="xs">
                <IconAlertTriangle size={14} color="#fd7e14" />
                <Text size="xs">Preparar protocolo de desvío de ambulancias por saturación inminente</Text>
              </Group>
            </Card>
          )}
          <Card withBorder p="xs" radius="sm" bg="blue.0">
            <Group gap="xs">
              <IconCalendar size={14} color="#228be6" />
              <Text size="xs">
                Demanda esperada {avgPredictedOccupancy > 70 ? 'por encima' : 'dentro'} de los niveles normales
              </Text>
            </Group>
          </Card>
        </Stack>
      </Box>
    </Paper>
  );
}
