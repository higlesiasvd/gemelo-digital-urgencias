import { useState, useMemo } from 'react';
import {
  Container, Title, Stack, Grid, Card, Text, Group, Badge,
  Progress, RingProgress, SimpleGrid, Paper, ThemeIcon, Box,
  Divider, Select, Tabs, rem, Table, ScrollArea, Tooltip,
  ActionIcon, Center,
} from '@mantine/core';
import {
  IconUsers, IconBed, IconClock, IconBuildingHospital,
  IconActivity, IconLayoutDashboard,
  IconAlertTriangle, IconAmbulance,
  IconStethoscope, IconRefresh, IconArrowRight,
  IconHeartbeat, IconDoor, IconNetwork, IconMapPin,
  IconFlame, IconUserCheck, IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react';
import { useHospitalStore } from '../store/hospitalStore';
import { HOSPITALES, HospitalStats } from '../types/hospital';
import { DerivacionesPanel } from '../components/DerivacionesPanel';

// ============= Tipos =============

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  progress?: number;
  progressColor?: string;
}

// ============= Componentes auxiliares =============

function StatCard({ title, value, subtitle, icon, color, trend, progress, progressColor }: StatCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>{title}</Text>
        <Group gap={4}>
          {trend && (
            <ThemeIcon 
              size="xs" 
              variant="light" 
              color={trend === 'up' ? 'red' : trend === 'down' ? 'green' : 'gray'}
            >
              {trend === 'up' ? <IconTrendingUp size={10} /> : 
               trend === 'down' ? <IconTrendingDown size={10} /> : 
               <IconActivity size={10} />}
            </ThemeIcon>
          )}
          <ThemeIcon size="md" radius="md" variant="light" color={color}>{icon}</ThemeIcon>
        </Group>
      </Group>
      <Text size="xl" fw={700}>{value}</Text>
      {subtitle && <Text size="xs" c="dimmed" mt={4}>{subtitle}</Text>}
      {progress !== undefined && (
        <Progress value={progress} size="sm" mt="md" color={progressColor || color} radius="xl" />
      )}
    </Card>
  );
}

// Tarjeta detallada de hospital
function HospitalDetailCard({ hospitalId, stats }: { hospitalId: string; stats: HospitalStats | undefined }) {
  const hospital = HOSPITALES[hospitalId];
  if (!hospital) return null;
  
  const saturacion = stats?.nivel_saturacion || 0;
  const ocupacionBoxes = stats?.ocupacion_boxes || 0;
  const ocupacionObs = stats?.ocupacion_observacion || 0;
  
  const getSaturacionColor = (sat: number) => {
    if (sat >= 95) return 'red';
    if (sat >= 85) return 'orange';
    if (sat >= 70) return 'yellow';
    return 'green';
  };

  const getSaturacionLabel = (sat: number) => {
    if (sat >= 95) return 'CRÍTICO';
    if (sat >= 85) return 'MUY ALTO';
    if (sat >= 70) return 'ALTO';
    if (sat >= 50) return 'MODERADO';
    return 'NORMAL';
  };

  return (
    <Card shadow="md" padding="lg" radius="lg" withBorder>
      {/* Header del hospital */}
      <Group justify="space-between" mb="lg">
        <Group gap="md">
          <ThemeIcon size={50} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconBuildingHospital size={26} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="lg">{hospital.nombre}</Text>
            <Group gap="xs">
              <IconMapPin size={12} style={{ opacity: 0.6 }} />
              <Text size="xs" c="dimmed">{hospital.ubicacion}</Text>
            </Group>
          </Box>
        </Group>
        
        <Badge 
          size="xl" 
          variant="filled" 
          color={getSaturacionColor(saturacion)}
          leftSection={stats?.emergencia_activa ? <IconFlame size={14} /> : undefined}
        >
          {getSaturacionLabel(saturacion)} {saturacion.toFixed(0)}%
        </Badge>
      </Group>

      {/* Métricas principales */}
      <SimpleGrid cols={4} spacing="md" mb="lg">
        {/* Boxes */}
        <Box ta="center">
          <RingProgress
            size={90}
            thickness={10}
            roundCaps
            sections={[{ value: ocupacionBoxes, color: ocupacionBoxes > 80 ? 'red' : 'blue' }]}
            label={
              <Center>
                <IconDoor size={20} />
              </Center>
            }
          />
          <Text size="sm" fw={600} mt="xs">Boxes</Text>
          <Text size="xs" c="dimmed">
            {stats?.boxes_ocupados || 0}/{stats?.boxes_totales || hospital.num_boxes}
          </Text>
        </Box>

        {/* Observación */}
        <Box ta="center">
          <RingProgress
            size={90}
            thickness={10}
            roundCaps
            sections={[{ value: ocupacionObs, color: ocupacionObs > 80 ? 'red' : 'violet' }]}
            label={
              <Center>
                <IconBed size={20} />
              </Center>
            }
          />
          <Text size="sm" fw={600} mt="xs">Observación</Text>
          <Text size="xs" c="dimmed">
            {stats?.observacion_ocupadas || 0}/{stats?.observacion_totales || hospital.num_camas_observacion}
          </Text>
        </Box>

        {/* Cola triaje */}
        <Box ta="center">
          <Box 
            style={{ 
              width: 90, 
              height: 90, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--mantine-color-orange-1), var(--mantine-color-orange-2))',
              margin: '0 auto'
            }}
          >
            <Text size="xl" fw={700} c="orange.7">
              {stats?.pacientes_en_espera_triaje || 0}
            </Text>
          </Box>
          <Text size="sm" fw={600} mt="xs">Cola Triaje</Text>
          <Text size="xs" c="dimmed">esperando</Text>
        </Box>

        {/* Cola atención */}
        <Box ta="center">
          <Box 
            style={{ 
              width: 90, 
              height: 90, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--mantine-color-cyan-1), var(--mantine-color-cyan-2))',
              margin: '0 auto'
            }}
          >
            <Text size="xl" fw={700} c="cyan.7">
              {stats?.pacientes_en_espera_atencion || 0}
            </Text>
          </Box>
          <Text size="sm" fw={600} mt="xs">Cola Atención</Text>
          <Text size="xs" c="dimmed">esperando</Text>
        </Box>
      </SimpleGrid>

      <Divider mb="lg" />

      {/* Tiempos y flujo */}
      <SimpleGrid cols={4} spacing="md">
        <Box>
          <Group gap="xs" mb={4}>
            <IconClock size={14} style={{ opacity: 0.6 }} />
            <Text size="xs" c="dimmed">Tiempo espera</Text>
          </Group>
          <Text size="lg" fw={700} c={(stats?.tiempo_medio_espera || 0) > 30 ? 'orange' : 'green'}>
            {(stats?.tiempo_medio_espera || 0).toFixed(0)} min
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={4}>
            <IconHeartbeat size={14} style={{ opacity: 0.6 }} />
            <Text size="xs" c="dimmed">Tiempo atención</Text>
          </Group>
          <Text size="lg" fw={700}>
            {(stats?.tiempo_medio_atencion || 0).toFixed(0)} min
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={4}>
            <IconAmbulance size={14} style={{ opacity: 0.6 }} />
            <Text size="xs" c="dimmed">Llegadas/hora</Text>
          </Group>
          <Text size="lg" fw={700} c="green">
            {stats?.pacientes_llegados_hora || 0}
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={4}>
            <IconArrowRight size={14} style={{ opacity: 0.6 }} />
            <Text size="xs" c="dimmed">Derivados</Text>
          </Group>
          <Text size="lg" fw={700} c="violet">
            {stats?.pacientes_derivados || 0}
          </Text>
        </Box>
      </SimpleGrid>

      {/* Alerta de emergencia */}
      {stats?.emergencia_activa && (
        <Paper 
          mt="lg" 
          p="md" 
          radius="md" 
          style={{ 
            background: 'linear-gradient(135deg, var(--mantine-color-red-1), var(--mantine-color-orange-1))',
            border: '2px solid var(--mantine-color-red-4)'
          }}
        >
          <Group gap="sm">
            <ThemeIcon color="red" size="lg" radius="xl" variant="filled">
              <IconAlertTriangle size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600} c="red.7">🚨 Emergencia Activa</Text>
              <Text size="xs" c="red.6">Se ha activado el protocolo de emergencia</Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Card>
  );
}

// Panel del coordinador
function CoordinadorPanel({ stats }: { stats: Record<string, HospitalStats> }) {
  const hospitalIds = Object.keys(HOSPITALES);
  
  // Calcular estado del sistema
  const sistemaStats = useMemo(() => {
    let totalBoxes = 0, boxesOcupados = 0;
    let totalDerivados = 0, totalLlegadas = 0;
    let tiempoEsperaMax = 0;
    let hospitalCritico: string | null = null;
    let hospitalMejor: string | null = null;
    let saturacionMax = 0, saturacionMin = 100;

    hospitalIds.forEach(id => {
      const s = stats[id];
      const h = HOSPITALES[id];
      if (s) {
        totalBoxes += s.boxes_totales || h.num_boxes;
        boxesOcupados += s.boxes_ocupados || 0;
        totalDerivados += s.pacientes_derivados || 0;
        totalLlegadas += s.pacientes_llegados_hora || 0;
        
        const sat = s.nivel_saturacion || 0;
        if (sat > saturacionMax) {
          saturacionMax = sat;
          hospitalCritico = id;
        }
        if (sat < saturacionMin) {
          saturacionMin = sat;
          hospitalMejor = id;
        }
        
        const te = s.tiempo_medio_espera || 0;
        if (te > tiempoEsperaMax) tiempoEsperaMax = te;
      }
    });

    return {
      ocupacionMedia: totalBoxes > 0 ? (boxesOcupados / totalBoxes) * 100 : 0,
      totalDerivados,
      totalLlegadas,
      tiempoEsperaMax,
      hospitalCritico,
      hospitalMejor,
      saturacionMax,
      saturacionMin,
    };
  }, [stats, hospitalIds]);

  return (
    <Paper shadow="md" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon size={44} radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
            <IconNetwork size={24} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="lg">Coordinador Central</Text>
            <Text size="xs" c="dimmed">Estado del sistema de urgencias</Text>
          </Box>
        </Group>
        <Badge size="lg" variant="filled" color="green">
          OPERATIVO
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        <Card withBorder p="md" radius="md" bg="blue.0">
          <Text size="xs" c="dimmed" mb={4}>Ocupación Media</Text>
          <Text size="xl" fw={700} c="blue.7">{sistemaStats.ocupacionMedia.toFixed(0)}%</Text>
        </Card>
        <Card withBorder p="md" radius="md" bg="green.0">
          <Text size="xs" c="dimmed" mb={4}>Llegadas/hora</Text>
          <Text size="xl" fw={700} c="green.7">{sistemaStats.totalLlegadas}</Text>
        </Card>
        <Card withBorder p="md" radius="md" bg="violet.0">
          <Text size="xs" c="dimmed" mb={4}>Derivaciones</Text>
          <Text size="xl" fw={700} c="violet.7">{sistemaStats.totalDerivados}</Text>
        </Card>
        <Card withBorder p="md" radius="md" bg="orange.0">
          <Text size="xs" c="dimmed" mb={4}>Espera Máx</Text>
          <Text size="xl" fw={700} c="orange.7">{sistemaStats.tiempoEsperaMax.toFixed(0)} min</Text>
        </Card>
      </SimpleGrid>

      {/* Comparativa de hospitales */}
      <Text size="sm" fw={600} mb="sm">Comparativa de Saturación</Text>
      <Stack gap="sm">
        {hospitalIds.map(id => {
          const h = HOSPITALES[id];
          const s = stats[id];
          const sat = s?.nivel_saturacion || 0;
          const color = sat >= 95 ? 'red' : sat >= 85 ? 'orange' : sat >= 70 ? 'yellow' : 'green';
          
          return (
            <Box key={id}>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  {id === sistemaStats.hospitalCritico && (
                    <Badge size="xs" color="red" variant="filled">MÁS SATURADO</Badge>
                  )}
                  {id === sistemaStats.hospitalMejor && (
                    <Badge size="xs" color="green" variant="filled">MÁS DISPONIBLE</Badge>
                  )}
                  <Text size="sm" fw={500}>{h.nombre}</Text>
                </Group>
                <Text size="sm" fw={600} c={color}>{sat.toFixed(0)}%</Text>
              </Group>
              <Progress 
                value={sat} 
                size="lg" 
                radius="xl" 
                color={color}
                striped={sat >= 85}
                animated={sat >= 95}
              />
            </Box>
          );
        })}
      </Stack>

      {/* Recomendaciones */}
      {sistemaStats.saturacionMax >= 85 && sistemaStats.hospitalMejor && (
        <Paper mt="lg" p="md" radius="md" bg="blue.0">
          <Group gap="sm">
            <ThemeIcon color="blue" size="lg" radius="xl" variant="light">
              <IconUserCheck size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600} size="sm">💡 Recomendación del Coordinador</Text>
              <Text size="xs" c="dimmed">
                Derivar nuevos ingresos a {HOSPITALES[sistemaStats.hospitalMejor]?.nombre} 
                (saturación: {sistemaStats.saturacionMin.toFixed(0)}%)
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Paper>
  );
}

// ============= Componente Principal =============

export function Operacional() {
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const { stats, isConnected } = useHospitalStore();

  const hospitalOptions = [
    { value: 'all', label: '🏥 Todos los hospitales' },
    ...Object.values(HOSPITALES).map((h) => ({ value: h.id, label: h.nombre }))
  ];

  const iconStyle = { width: rem(16), height: rem(16) };

  // Estadísticas agregadas
  const aggregatedStats = useMemo(() => {
    const ids = selectedHospital === 'all' ? Object.keys(HOSPITALES) : [selectedHospital];
    let totalBoxes = 0, boxesOcupados = 0, totalObs = 0, obsOcupadas = 0;
    let totalTriaje = 0, totalEsperando = 0;
    let tiempoEsperaSum = 0, llegadosHora = 0, atendidosHora = 0, derivados = 0;
    let activos = 0, emergencias = 0;

    ids.forEach(id => {
      const h = HOSPITALES[id], s = stats[id];
      if (h && s) {
        activos++;
        totalBoxes += s.boxes_totales || h.num_boxes;
        boxesOcupados += s.boxes_ocupados || 0;
        totalObs += s.observacion_totales || h.num_camas_observacion;
        obsOcupadas += s.observacion_ocupadas || 0;
        totalTriaje += s.pacientes_en_espera_triaje || 0;
        totalEsperando += s.pacientes_en_espera_atencion || 0;
        tiempoEsperaSum += s.tiempo_medio_espera || 0;
        llegadosHora += s.pacientes_llegados_hora || 0;
        atendidosHora += s.pacientes_atendidos_hora || 0;
        derivados += s.pacientes_derivados || 0;
        if (s.emergencia_activa) emergencias++;
      }
    });

    return {
      totalBoxes, boxesOcupados, totalObs, obsOcupadas,
      totalTriaje, totalEsperando,
      avgTiempoEspera: activos > 0 ? tiempoEsperaSum / activos : 0,
      llegadosHora, atendidosHora, derivados, activos, emergencias,
      ocupacionBoxes: totalBoxes > 0 ? (boxesOcupados / totalBoxes) * 100 : 0,
    };
  }, [stats, selectedHospital]);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Paper 
          shadow="md" 
          radius="lg" 
          p="lg" 
          style={{ 
            background: 'linear-gradient(135deg, #1a9e5e 0%, #0d6a3e 100%)', 
            color: 'white' 
          }}
        >
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Group gap="md">
                <ThemeIcon size="xl" radius="xl" variant="white" color="green">
                  <IconActivity size={28} />
                </ThemeIcon>
                <Box>
                  <Title order={2} c="white">Centro de Control Operacional</Title>
                  <Group gap="sm" mt={4}>
                    <Badge 
                      size="sm" 
                      variant="white" 
                      color={isConnected ? 'green' : 'red'}
                      leftSection={
                        <Box 
                          w={6} 
                          h={6} 
                          bg={isConnected ? 'green' : 'red'} 
                          style={{ borderRadius: '50%' }} 
                        />
                      }
                    >
                      {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                    </Badge>
                    <Text size="sm" opacity={0.9}>
                      Monitorización en tiempo real
                    </Text>
                  </Group>
                </Box>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Group justify="flex-end" gap="md">
                <Select
                  placeholder="Filtrar hospital"
                  value={selectedHospital}
                  onChange={(v) => setSelectedHospital(v || 'all')}
                  data={hospitalOptions}
                  style={{ minWidth: 280 }}
                  styles={{ 
                    input: { 
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      fontWeight: 500,
                    } 
                  }}
                />
                <Tooltip label="Actualizar">
                  <ActionIcon variant="white" size="lg" radius="md">
                    <IconRefresh size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Alertas de emergencia */}
        {aggregatedStats.emergencias > 0 && (
          <Paper 
            p="md" 
            radius="lg" 
            style={{ 
              background: 'linear-gradient(135deg, var(--mantine-color-red-1), var(--mantine-color-orange-1))',
              border: '2px solid var(--mantine-color-red-4)'
            }}
          >
            <Group gap="md">
              <ThemeIcon color="red" size="xl" radius="xl" variant="filled">
                <IconFlame size={24} />
              </ThemeIcon>
              <Box>
                <Text fw={700} size="lg" c="red.7">
                  🚨 {aggregatedStats.emergencias} Hospital(es) con Emergencia Activa
                </Text>
                <Text size="sm" c="red.6">
                  El protocolo de emergencia ha sido activado. Verificar estado del sistema.
                </Text>
              </Box>
            </Group>
          </Paper>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="overview" leftSection={<IconLayoutDashboard style={iconStyle} />}>
              Vista General
            </Tabs.Tab>
            <Tabs.Tab value="hospitals" leftSection={<IconBuildingHospital style={iconStyle} />}>
              Hospitales
            </Tabs.Tab>
            <Tabs.Tab value="coordinator" leftSection={<IconNetwork style={iconStyle} />}>
              Coordinador
            </Tabs.Tab>
            <Tabs.Tab value="derivations" leftSection={<IconAmbulance style={iconStyle} />}>
              Derivaciones
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab Vista General */}
          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              {/* Métricas principales */}
              <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
                <StatCard 
                  title="Boxes" 
                  value={`${aggregatedStats.boxesOcupados}/${aggregatedStats.totalBoxes}`}
                  icon={<IconDoor size={16} />} 
                  color="blue" 
                  progress={aggregatedStats.ocupacionBoxes}
                  progressColor={aggregatedStats.ocupacionBoxes > 80 ? 'red' : 'green'} 
                />
                <StatCard 
                  title="Observación" 
                  value={`${aggregatedStats.obsOcupadas}/${aggregatedStats.totalObs}`}
                  icon={<IconBed size={16} />} 
                  color="violet" 
                />
                <StatCard 
                  title="Cola Triaje" 
                  value={aggregatedStats.totalTriaje} 
                  subtitle="esperando" 
                  icon={<IconStethoscope size={16} />} 
                  color="orange"
                  trend={aggregatedStats.totalTriaje > 10 ? 'up' : 'stable'}
                />
                <StatCard 
                  title="Cola Atención" 
                  value={aggregatedStats.totalEsperando} 
                  subtitle="esperando" 
                  icon={<IconUsers size={16} />} 
                  color="cyan" 
                />
                <StatCard 
                  title="Llegadas/hora" 
                  value={aggregatedStats.llegadosHora} 
                  icon={<IconAmbulance size={16} />} 
                  color="green" 
                />
                <StatCard 
                  title="T. Espera Medio" 
                  value={`${aggregatedStats.avgTiempoEspera.toFixed(0)} min`} 
                  icon={<IconClock size={16} />} 
                  color={aggregatedStats.avgTiempoEspera > 30 ? 'red' : 'teal'} 
                />
              </SimpleGrid>

              {/* Tabla comparativa */}
              <Card shadow="sm" padding="lg" radius="lg" withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600} size="lg">📊 Estado de Hospitales</Text>
                  <Badge variant="light" color="blue">{Object.keys(HOSPITALES).length} hospitales</Badge>
                </Group>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Hospital</Table.Th>
                        <Table.Th ta="center">Saturación</Table.Th>
                        <Table.Th ta="center">Boxes</Table.Th>
                        <Table.Th ta="center">Observación</Table.Th>
                        <Table.Th ta="center">Cola Triaje</Table.Th>
                        <Table.Th ta="center">Cola Atención</Table.Th>
                        <Table.Th ta="center">T. Espera</Table.Th>
                        <Table.Th ta="center">Estado</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Object.keys(HOSPITALES).map((id) => {
                        const h = HOSPITALES[id];
                        const s = stats[id];
                        const sat = s?.nivel_saturacion || 0;
                        const satColor = sat >= 95 ? 'red' : sat >= 85 ? 'orange' : sat >= 70 ? 'yellow' : 'green';
                        
                        return (
                          <Table.Tr key={id}>
                            <Table.Td>
                              <Group gap="xs">
                                <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                                  <IconBuildingHospital size={12} />
                                </ThemeIcon>
                                <Text size="sm" fw={500}>{h.nombre}</Text>
                              </Group>
                            </Table.Td>
                            <Table.Td ta="center">
                              <Badge variant="filled" color={satColor} size="md">
                                {sat.toFixed(0)}%
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="center">
                              <Text size="sm">{s?.boxes_ocupados || 0}/{s?.boxes_totales || h.num_boxes}</Text>
                            </Table.Td>
                            <Table.Td ta="center">
                              <Text size="sm">{s?.observacion_ocupadas || 0}/{s?.observacion_totales || h.num_camas_observacion}</Text>
                            </Table.Td>
                            <Table.Td ta="center">
                              <Badge size="sm" variant="light" color="orange">
                                {s?.pacientes_en_espera_triaje || 0}
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="center">
                              <Badge size="sm" variant="light" color="cyan">
                                {s?.pacientes_en_espera_atencion || 0}
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="center">
                              <Text size="sm" c={(s?.tiempo_medio_espera || 0) > 30 ? 'orange' : 'green'}>
                                {(s?.tiempo_medio_espera || 0).toFixed(0)} min
                              </Text>
                            </Table.Td>
                            <Table.Td ta="center">
                              {s?.emergencia_activa ? (
                                <Badge color="red" variant="filled" size="sm" leftSection={<IconFlame size={10} />}>
                                  Emergencia
                                </Badge>
                              ) : (
                                <Badge color={satColor} variant="light" size="sm">
                                  {sat >= 95 ? 'Crítico' : sat >= 85 ? 'Alto' : sat >= 70 ? 'Moderado' : 'Normal'}
                                </Badge>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* Tab Hospitales */}
          <Tabs.Panel value="hospitals" pt="lg">
            <SimpleGrid cols={{ base: 1, lg: selectedHospital === 'all' ? 1 : 1 }} spacing="lg">
              {selectedHospital === 'all' 
                ? Object.keys(HOSPITALES).map((id) => (
                    <HospitalDetailCard key={id} hospitalId={id} stats={stats[id]} />
                  ))
                : <HospitalDetailCard hospitalId={selectedHospital} stats={stats[selectedHospital]} />
              }
            </SimpleGrid>
          </Tabs.Panel>

          {/* Tab Coordinador */}
          <Tabs.Panel value="coordinator" pt="lg">
            <CoordinadorPanel stats={stats} />
          </Tabs.Panel>

          {/* Tab Derivaciones */}
          <Tabs.Panel value="derivations" pt="lg">
            <DerivacionesPanel />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

export default Operacional;
