import { useState, useMemo } from 'react';
import {
  Container, Title, Stack, Grid, Card, Text, Group, Badge,
  Progress, RingProgress, SimpleGrid, Paper, ThemeIcon, Box,
  Divider, Select, Tabs, rem, Table, ScrollArea, Tooltip, ActionIcon,
} from '@mantine/core';
import {
  IconUsers, IconBed, IconClock, IconBuildingHospital,
  IconHourglass, IconActivity, IconLayoutDashboard,
  IconChartBar, IconHistory, IconHeartbeat, IconDoor, IconAlertTriangle,
  IconAmbulance, IconStethoscope, IconRefresh,
} from '@tabler/icons-react';
import { useHospitalStore } from '../store/hospitalStore';
import { HOSPITALES, HospitalStats } from '../types/hospital';
import { TimelineReplay } from '../components/TimelineReplay';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  progress?: number;
  progressColor?: string;
}

function StatCard({ title, value, subtitle, icon, color, progress, progressColor }: StatCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>{title}</Text>
        <ThemeIcon size="md" radius="md" variant="light" color={color}>{icon}</ThemeIcon>
      </Group>
      <Text size="xl" fw={700}>{value}</Text>
      {subtitle && <Text size="xs" c="dimmed" mt={4}>{subtitle}</Text>}
      {progress !== undefined && (
        <Progress value={progress} size="sm" mt="md" color={progressColor || color} radius="xl" />
      )}
    </Card>
  );
}

function HospitalStatusCard({ hospitalId, stats }: { hospitalId: string; stats: HospitalStats | undefined }) {
  const hospital = HOSPITALES[hospitalId];
  if (!hospital || !stats) return <Card shadow="sm" p="lg" radius="md" withBorder><Text c="dimmed">Sin datos</Text></Card>;
  
  const saturacion = stats.nivel_saturacion || 0;
  const saturacionColor = saturacion > 90 ? 'red' : saturacion > 70 ? 'orange' : saturacion > 50 ? 'yellow' : 'green';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue"><IconBuildingHospital size={20} /></ThemeIcon>
          <Box><Text fw={600}>{hospital.nombre}</Text><Text size="xs" c="dimmed">{hospital.ubicacion}</Text></Box>
        </Group>
        <Badge size="lg" variant="light" color={saturacionColor}>{saturacion.toFixed(0)}% ocupación</Badge>
      </Group>
      <SimpleGrid cols={2} spacing="md">
        <Box>
          <Text size="xs" c="dimmed" mb={4}>Boxes</Text>
          <Group gap="xs">
            <RingProgress size={50} thickness={5} sections={[{ value: stats.ocupacion_boxes || 0, color: 'blue' }]}
              label={<Text size="xs" ta="center" fw={600}>{(stats.ocupacion_boxes || 0).toFixed(0)}%</Text>} />
            <Box><Text size="sm" fw={500}>{stats.boxes_ocupados || 0}/{stats.boxes_totales || hospital.num_boxes}</Text>
              <Text size="xs" c="dimmed">ocupados</Text></Box>
          </Group>
        </Box>
        <Box>
          <Text size="xs" c="dimmed" mb={4}>Observación</Text>
          <Group gap="xs">
            <RingProgress size={50} thickness={5} sections={[{ value: stats.ocupacion_observacion || 0, color: 'violet' }]}
              label={<Text size="xs" ta="center" fw={600}>{(stats.ocupacion_observacion || 0).toFixed(0)}%</Text>} />
            <Box><Text size="sm" fw={500}>{stats.observacion_ocupadas || 0}/{stats.observacion_totales || hospital.num_camas_observacion}</Text>
              <Text size="xs" c="dimmed">camas</Text></Box>
          </Group>
        </Box>
      </SimpleGrid>
      <Divider my="md" />
      <SimpleGrid cols={3} spacing="xs">
        <Tooltip label="Tiempo espera"><Box ta="center">
          <Group gap={4} justify="center"><IconClock size={14} /><Text size="lg" fw={600}>{(stats.tiempo_medio_espera || 0).toFixed(0)}</Text></Group>
          <Text size="xs" c="dimmed">min espera</Text>
        </Box></Tooltip>
        <Tooltip label="Cola triaje"><Box ta="center">
          <Group gap={4} justify="center"><IconUsers size={14} /><Text size="lg" fw={600}>{stats.pacientes_en_espera_triaje || 0}</Text></Group>
          <Text size="xs" c="dimmed">triaje</Text>
        </Box></Tooltip>
        <Tooltip label="Cola atención"><Box ta="center">
          <Group gap={4} justify="center"><IconHourglass size={14} /><Text size="lg" fw={600}>{stats.pacientes_en_espera_atencion || 0}</Text></Group>
          <Text size="xs" c="dimmed">atención</Text>
        </Box></Tooltip>
      </SimpleGrid>
      {stats.emergencia_activa && <Badge color="red" variant="filled" fullWidth mt="md" leftSection={<IconAlertTriangle size={14} />}>Emergencia Activa</Badge>}
    </Card>
  );
}

export function Operacional() {
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string | null>('dashboard');
  const { stats } = useHospitalStore();

  const hospitalOptions = [{ value: 'all', label: 'Todos los hospitales' },
    ...Object.values(HOSPITALES).map((h) => ({ value: h.id, label: h.nombre }))];

  const aggregatedStats = useMemo(() => {
    const ids = selectedHospital === 'all' ? Object.keys(HOSPITALES) : [selectedHospital];
    let totalBoxes = 0, boxesOcupados = 0, totalObs = 0, obsOcupadas = 0, totalEsperando = 0, totalTriaje = 0;
    let tiempoEsperaSum = 0, tiempoAtencionSum = 0, llegadosHora = 0, atendidosHora = 0, derivados = 0, activos = 0, emergencias = 0;

    ids.forEach(id => {
      const h = HOSPITALES[id], s = stats[id];
      if (h && s) {
        activos++;
        totalBoxes += s.boxes_totales || h.num_boxes;
        boxesOcupados += s.boxes_ocupados || 0;
        totalObs += s.observacion_totales || h.num_camas_observacion;
        obsOcupadas += s.observacion_ocupadas || 0;
        totalEsperando += s.pacientes_en_espera_atencion || 0;
        totalTriaje += s.pacientes_en_espera_triaje || 0;
        tiempoEsperaSum += s.tiempo_medio_espera || 0;
        tiempoAtencionSum += s.tiempo_medio_atencion || 0;
        llegadosHora += s.pacientes_llegados_hora || 0;
        atendidosHora += s.pacientes_atendidos_hora || 0;
        derivados += s.pacientes_derivados || 0;
        if (s.emergencia_activa) emergencias++;
      }
    });

    return {
      totalBoxes, boxesOcupados, totalObs, obsOcupadas, totalEsperando, totalTriaje,
      avgTiempoEspera: activos > 0 ? tiempoEsperaSum / activos : 0,
      avgTiempoAtencion: activos > 0 ? tiempoAtencionSum / activos : 0,
      llegadosHora, atendidosHora, derivados, activos, emergencias,
      ocupacionBoxes: totalBoxes > 0 ? (boxesOcupados / totalBoxes) * 100 : 0,
      ocupacionObs: totalObs > 0 ? (obsOcupadas / totalObs) * 100 : 0,
    };
  }, [stats, selectedHospital]);

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper shadow="sm" radius="lg" p="lg" style={{ background: 'linear-gradient(135deg, #1a9e5e 0%, #0d6a3e 100%)', color: 'white' }}>
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Group gap="sm">
                <ThemeIcon size="xl" radius="xl" variant="white" color="green"><IconActivity size={24} /></ThemeIcon>
                <Box><Title order={2} c="white">Centro Operacional</Title>
                  <Text size="sm" opacity={0.9}>Monitorización en tiempo real</Text></Box>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Group justify="flex-end" gap="md">
                <Select placeholder="Filtrar hospital" value={selectedHospital} onChange={(v) => setSelectedHospital(v || 'all')}
                  data={hospitalOptions} style={{ minWidth: 250 }} styles={{ input: { backgroundColor: 'rgba(255,255,255,0.9)' } }} />
                <Tooltip label="Actualizar"><ActionIcon variant="white" size="lg" radius="md"><IconRefresh size={20} /></ActionIcon></Tooltip>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard style={iconStyle} />}>Dashboard</Tabs.Tab>
            <Tabs.Tab value="hospitals" leftSection={<IconBuildingHospital style={iconStyle} />}>Hospitales</Tabs.Tab>
            <Tabs.Tab value="kpis" leftSection={<IconChartBar style={iconStyle} />}>KPIs</Tabs.Tab>
            <Tabs.Tab value="timeline" leftSection={<IconHistory style={iconStyle} />}>Timeline</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="md">
            <Stack gap="md">
              {aggregatedStats.emergencias > 0 && (
                <Paper p="md" radius="md" bg="red.0" withBorder style={{ borderColor: 'var(--mantine-color-red-4)' }}>
                  <Group gap="sm"><ThemeIcon color="red" size="lg" radius="xl"><IconAlertTriangle size={20} /></ThemeIcon>
                    <Box><Text fw={600} c="red.7">{aggregatedStats.emergencias} hospital(es) con emergencia</Text></Box></Group>
                </Paper>
              )}
              <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
                <StatCard title="Boxes" value={`${aggregatedStats.boxesOcupados}/${aggregatedStats.totalBoxes}`}
                  icon={<IconDoor size={16} />} color="blue" progress={aggregatedStats.ocupacionBoxes}
                  progressColor={aggregatedStats.ocupacionBoxes > 80 ? 'red' : 'green'} />
                <StatCard title="Observación" value={`${aggregatedStats.obsOcupadas}/${aggregatedStats.totalObs}`}
                  icon={<IconBed size={16} />} color="violet" progress={aggregatedStats.ocupacionObs}
                  progressColor={aggregatedStats.ocupacionObs > 80 ? 'red' : 'green'} />
                <StatCard title="Cola Triaje" value={aggregatedStats.totalTriaje} subtitle="esperando" icon={<IconStethoscope size={16} />} color="teal" />
                <StatCard title="Cola Atención" value={aggregatedStats.totalEsperando} subtitle="esperando" icon={<IconUsers size={16} />} color="orange" />
                <StatCard title="T. Espera" value={`${aggregatedStats.avgTiempoEspera.toFixed(0)} min`} icon={<IconClock size={16} />} color="cyan" />
                <StatCard title="T. Atención" value={`${aggregatedStats.avgTiempoAtencion.toFixed(0)} min`} icon={<IconHeartbeat size={16} />} color="pink" />
              </SimpleGrid>
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="md"><Text fw={500}>Flujo (última hora)</Text>
                      <ThemeIcon size="sm" variant="light" color="blue"><IconAmbulance size={14} /></ThemeIcon></Group>
                    <SimpleGrid cols={3}>
                      <Box ta="center"><Text size="xl" fw={700} c="green">{aggregatedStats.llegadosHora}</Text><Text size="xs" c="dimmed">Llegadas</Text></Box>
                      <Box ta="center"><Text size="xl" fw={700} c="blue">{aggregatedStats.atendidosHora}</Text><Text size="xs" c="dimmed">Atendidos</Text></Box>
                      <Box ta="center"><Text size="xl" fw={700} c="violet">{aggregatedStats.derivados}</Text><Text size="xs" c="dimmed">Derivados</Text></Box>
                    </SimpleGrid>
                  </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 8 }}>
                  <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                    <Text fw={500} mb="md">Ocupación por Hospital</Text>
                    <Stack gap="sm">
                      {Object.keys(HOSPITALES).map((id) => {
                        const h = HOSPITALES[id], s = stats[id], o = s?.nivel_saturacion || 0;
                        return (<Box key={id}><Group justify="space-between" mb={4}><Text size="sm">{h.nombre}</Text>
                          <Text size="sm" fw={500}>{o.toFixed(0)}%</Text></Group>
                          <Progress value={o} size="md" radius="xl" color={o > 90 ? 'red' : o > 70 ? 'orange' : 'green'} /></Box>);
                      })}
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="hospitals" pt="md">
            <SimpleGrid cols={{ base: 1, md: selectedHospital === 'all' ? 3 : 1 }} spacing="lg">
              {selectedHospital === 'all' ? Object.keys(HOSPITALES).map((id) => <HospitalStatusCard key={id} hospitalId={id} stats={stats[id]} />)
                : <HospitalStatusCard hospitalId={selectedHospital} stats={stats[selectedHospital]} />}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="kpis" pt="md">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text fw={500} mb="md">Indicadores por Hospital</Text>
              <ScrollArea><Table striped highlightOnHover>
                <Table.Thead><Table.Tr>
                  <Table.Th>Hospital</Table.Th><Table.Th ta="center">Boxes</Table.Th><Table.Th ta="center">Obs.</Table.Th>
                  <Table.Th ta="center">Triaje</Table.Th><Table.Th ta="center">Atención</Table.Th><Table.Th ta="center">T. Espera</Table.Th>
                  <Table.Th ta="center">T. Atención</Table.Th><Table.Th ta="center">Estado</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {(selectedHospital === 'all' ? Object.keys(HOSPITALES) : [selectedHospital]).map((id) => {
                    const h = HOSPITALES[id], s = stats[id], sat = s?.nivel_saturacion || 0;
                    return (<Table.Tr key={id}>
                      <Table.Td><Group gap="xs"><ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <IconBuildingHospital size={12} /></ThemeIcon><Text size="sm" fw={500}>{h.nombre}</Text></Group></Table.Td>
                      <Table.Td ta="center"><Badge variant="light" color={(s?.ocupacion_boxes || 0) > 80 ? 'red' : 'blue'}>{(s?.ocupacion_boxes || 0).toFixed(0)}%</Badge></Table.Td>
                      <Table.Td ta="center"><Badge variant="light" color={(s?.ocupacion_observacion || 0) > 80 ? 'red' : 'violet'}>{(s?.ocupacion_observacion || 0).toFixed(0)}%</Badge></Table.Td>
                      <Table.Td ta="center">{s?.pacientes_en_espera_triaje || 0}</Table.Td>
                      <Table.Td ta="center">{s?.pacientes_en_espera_atencion || 0}</Table.Td>
                      <Table.Td ta="center">{(s?.tiempo_medio_espera || 0).toFixed(0)} min</Table.Td>
                      <Table.Td ta="center">{(s?.tiempo_medio_atencion || 0).toFixed(0)} min</Table.Td>
                      <Table.Td ta="center"><Badge color={sat > 90 ? 'red' : sat > 70 ? 'orange' : 'green'} variant="filled" size="sm">
                        {sat > 90 ? 'Crítico' : sat > 70 ? 'Alto' : 'Normal'}</Badge></Table.Td>
                    </Table.Tr>);
                  })}
                </Table.Tbody>
              </Table></ScrollArea>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="timeline" pt="md"><TimelineReplay /></Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

export default Operacional;
