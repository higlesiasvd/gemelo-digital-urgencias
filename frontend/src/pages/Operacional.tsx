import { useEffect, useState } from 'react';
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
} from '@tabler/icons-react';
import { useHospitalStore } from '../store/hospitalStore';
import { HOSPITALES } from '../types/hospital';

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return hrs + 'h ' + mins + 'm ' + secs + 's';
  } else if (mins > 0) {
    return mins + 'm ' + secs + 's';
  }
  return secs + 's';
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return Math.round(minutes) + ' min';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hrs + 'h ' + mins + 'm';
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card shadow="sm" p="md" radius="md" withBorder>
    <Group>
      <ThemeIcon size={50} radius="md" color={color}>
        {icon}
      </ThemeIcon>
      <Box style={{ flex: 1 }}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {title}
        </Text>
        <Text size="xl" fw={700}>
          {value}
        </Text>
        {subtitle && (
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
        )}
      </Box>
    </Group>
  </Card>
);

export default function Operacional() {
  const { stats: statsRecord, lastUpdate, isConnected } = useHospitalStore();
  const [operationTime, setOperationTime] = useState<number>(0);
  const [startTime] = useState<Date>(() => new Date());

  const stats = Object.values(statsRecord);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setOperationTime(diffSeconds);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Totales
  const totalBoxesOcupados = stats.reduce((acc: number, h) => acc + h.boxes_ocupados, 0);
  const totalBoxes = stats.reduce((acc: number, h) => acc + h.boxes_totales, 0);
  const totalObservacionOcupadas = stats.reduce((acc: number, h) => acc + h.observacion_ocupadas, 0);
  const totalObservacion = stats.reduce((acc: number, h) => acc + h.observacion_totales, 0);
  const totalEnEspera = stats.reduce((acc: number, h) => acc + h.pacientes_en_espera_triaje + h.pacientes_en_espera_atencion, 0);
  const totalAtendidosHora = stats.reduce((acc: number, h) => acc + h.pacientes_atendidos_hora, 0);
  const totalLlegadosHora = stats.reduce((acc: number, h) => acc + h.pacientes_llegados_hora, 0);
  const tiempoMedioEspera = stats.length > 0 
    ? stats.reduce((acc: number, h) => acc + h.tiempo_medio_espera, 0) / stats.length 
    : 0;
  
  const ocupacionMedia = totalBoxes > 0 
    ? Math.round((totalBoxesOcupados / totalBoxes) * 100) 
    : 0;

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

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between" align="center">
            <Group>
              <ThemeIcon size={40} radius="md" color="blue">
                <IconBuildingHospital size={24} />
              </ThemeIcon>
              <Box>
                <Title order={2}>Panel Operacional</Title>
                <Text size="sm" c="dimmed">
                  Monitorización en tiempo real del sistema hospitalario
                </Text>
              </Box>
            </Group>
            
            <Group gap="xl">
              <Box ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Tiempo de Operación
                </Text>
                <Group gap="xs" justify="center">
                  <IconClock size={18} color="var(--mantine-color-blue-6)" />
                  <Text size="lg" fw={700} c="blue">
                    {formatDuration(operationTime)}
                  </Text>
                </Group>
              </Box>
              
              <Divider orientation="vertical" />
              
              <Box ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Estado
                </Text>
                <Badge 
                  size="lg" 
                  color={isConnected ? 'green' : 'red'} 
                  variant="filled"
                >
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </Badge>
              </Box>
              
              {lastUpdate && (
                <Box ta="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Última Actualización
                  </Text>
                  <Text size="sm" fw={500}>
                    {lastUpdate.toLocaleTimeString()}
                  </Text>
                </Box>
              )}
            </Group>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <StatCard
            title="Boxes Ocupados"
            value={totalBoxesOcupados + '/' + totalBoxes}
            icon={<IconBed size={28} />}
            color="blue"
            subtitle={'Ocupación: ' + ocupacionMedia + '%'}
          />
          <StatCard
            title="Pacientes en Espera"
            value={totalEnEspera}
            icon={<IconUsers size={28} />}
            color={totalEnEspera > 20 ? 'red' : totalEnEspera > 10 ? 'orange' : 'green'}
            subtitle={'Triaje + Atención'}
          />
          <StatCard
            title="Tiempo Medio Espera"
            value={formatMinutes(tiempoMedioEspera)}
            icon={<IconHourglass size={28} />}
            color={tiempoMedioEspera > 60 ? 'red' : tiempoMedioEspera > 30 ? 'orange' : 'green'}
            subtitle="Promedio general"
          />
          <StatCard
            title="Flujo Pacientes/hora"
            value={totalLlegadosHora + ' / ' + totalAtendidosHora}
            icon={<IconTrendingUp size={28} />}
            color="violet"
            subtitle="Llegadas / Atendidos"
          />
        </SimpleGrid>

        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">Estado por Hospital</Text>
            <Badge color="blue" variant="light">
              {stats.length} centros activos
            </Badge>
          </Group>
          
          <Stack gap="md">
            {stats.map((hospital) => {
              const info = HOSPITALES[hospital.hospital_id];
              const ocupBoxes = hospital.boxes_totales > 0 
                ? Math.round((hospital.boxes_ocupados / hospital.boxes_totales) * 100) 
                : 0;
              
              return (
                <Paper key={hospital.hospital_id} p="md" radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <Group gap="sm">
                      <Text size="sm" fw={600}>
                        {info?.nombre || hospital.hospital_id}
                      </Text>
                      {hospital.emergencia_activa && (
                        <Badge color="red" size="xs" variant="filled">
                          EMERGENCIA
                        </Badge>
                      )}
                    </Group>
                    <Badge 
                      size="sm" 
                      color={getNivelSaturacionColor(hospital.nivel_saturacion)}
                      variant="filled"
                    >
                      Saturación: {Math.round(hospital.nivel_saturacion * 100)}%
                    </Badge>
                  </Group>
                  
                  <Grid>
                    <Grid.Col span={6}>
                      <Text size="xs" c="dimmed">Boxes</Text>
                      <Group gap="xs">
                        <Progress 
                          value={ocupBoxes} 
                          size="sm" 
                          radius="xl"
                          color={getOcupacionColor(ocupBoxes)}
                          style={{ flex: 1 }}
                        />
                        <Text size="xs" fw={500} w={70} ta="right">
                          {hospital.boxes_ocupados}/{hospital.boxes_totales}
                        </Text>
                      </Group>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="xs" c="dimmed">Observación</Text>
                      <Group gap="xs">
                        <Progress 
                          value={hospital.ocupacion_observacion} 
                          size="sm" 
                          radius="xl"
                          color={getOcupacionColor(hospital.ocupacion_observacion)}
                          style={{ flex: 1 }}
                        />
                        <Text size="xs" fw={500} w={70} ta="right">
                          {hospital.observacion_ocupadas}/{hospital.observacion_totales}
                        </Text>
                      </Group>
                    </Grid.Col>
                  </Grid>
                  
                  <Group gap="xl" mt="sm">
                    <Box>
                      <Text size="xs" c="dimmed">Espera triaje</Text>
                      <Text size="sm" fw={500}>{hospital.pacientes_en_espera_triaje}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">Espera atención</Text>
                      <Text size="sm" fw={500}>{hospital.pacientes_en_espera_atencion}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">T. espera</Text>
                      <Text size="sm" fw={500}>{formatMinutes(hospital.tiempo_medio_espera)}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">T. total</Text>
                      <Text size="sm" fw={500}>{formatMinutes(hospital.tiempo_medio_total)}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">Derivados</Text>
                      <Text size="sm" fw={500}>{hospital.pacientes_derivados}</Text>
                    </Box>
                  </Group>
                </Paper>
              );
            })}
            
            {stats.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                No hay datos de hospitales disponibles
              </Text>
            )}
          </Stack>
        </Card>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" p="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Text fw={600} size="lg">Observación</Text>
                <Badge color="teal" variant="light">
                  {totalObservacionOcupadas}/{totalObservacion} camas
                </Badge>
              </Group>
              
              <Group justify="center" mb="md">
                <RingProgress
                  size={150}
                  thickness={16}
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
                      <Text size="xl" fw={700}>
                        {totalObservacion > 0 ? Math.round((totalObservacionOcupadas / totalObservacion) * 100) : 0}%
                      </Text>
                      <Text size="xs" c="dimmed">Ocupación</Text>
                    </Box>
                  }
                />
              </Group>
              
              <Stack gap="xs">
                {stats.map((hospital) => {
                  const info = HOSPITALES[hospital.hospital_id];
                  return (
                    <Group key={hospital.hospital_id} justify="space-between">
                      <Text size="sm">{info?.nombre || hospital.hospital_id}</Text>
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

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" p="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Text fw={600} size="lg">Tiempos de Atención</Text>
                <ThemeIcon size="sm" radius="xl" color="gray" variant="light">
                  <IconStethoscope size={14} />
                </ThemeIcon>
              </Group>
              
              <Stack gap="sm">
                {stats.map((hospital) => {
                  const info = HOSPITALES[hospital.hospital_id];
                  return (
                    <Paper key={hospital.hospital_id} p="sm" radius="md" withBorder>
                      <Text size="sm" fw={500} mb="xs">
                        {info?.nombre || hospital.hospital_id}
                      </Text>
                      <Group gap="xl">
                        <Box>
                          <Text size="xs" c="dimmed">Espera</Text>
                          <Text size="sm" fw={600} c={hospital.tiempo_medio_espera > 60 ? 'red' : hospital.tiempo_medio_espera > 30 ? 'orange' : 'green'}>
                            {formatMinutes(hospital.tiempo_medio_espera)}
                          </Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">Atención</Text>
                          <Text size="sm" fw={600}>
                            {formatMinutes(hospital.tiempo_medio_atencion)}
                          </Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">Total</Text>
                          <Text size="sm" fw={600}>
                            {formatMinutes(hospital.tiempo_medio_total)}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {stats.some(h => h.nivel_saturacion >= 0.9 || h.emergencia_activa) && (
          <Card shadow="sm" p="lg" radius="md" withBorder bg="red.0">
            <Group>
              <ThemeIcon size={40} radius="md" color="red">
                <IconAlertTriangle size={24} />
              </ThemeIcon>
              <Box>
                <Text fw={600} c="red.8">Alerta de Saturación</Text>
                <Text size="sm" c="red.7">
                  {stats.filter(h => h.nivel_saturacion >= 0.9 || h.emergencia_activa).length} hospital(es) 
                  con saturación crítica o emergencia activa
                </Text>
              </Box>
            </Group>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
