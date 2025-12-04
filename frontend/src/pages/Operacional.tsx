import { Grid, Title, Text, Card, Stack, Group, Progress, Badge, SimpleGrid, ThemeIcon, Divider } from '@mantine/core';
import { useHospitalStore } from '@/store/hospitalStore';
import { HOSPITALES } from '@/types/hospital';
import { IconBed, IconClock, IconUsers, IconActivity, IconHeartbeat, IconFirstAidKit } from '@tabler/icons-react';
import dayjs from 'dayjs';

export function Operacional() {
  const { stats, lastUpdate } = useHospitalStore();
  const hospitalIds = Object.keys(HOSPITALES);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={1}>📊 Panel Operacional</Title>
          <Text c="dimmed" size="sm">
            Recursos y tiempos de atención en tiempo real
          </Text>
        </div>
        <Badge size="lg" variant="light" color={lastUpdate ? 'green' : 'gray'}>
          {lastUpdate ? `Actualizado: ${dayjs(lastUpdate).format('HH:mm:ss')}` : 'Esperando datos...'}
        </Badge>
      </Group>

      {hospitalIds.map((id) => {
        const hospitalStats = stats[id];
        const hospital = HOSPITALES[id];
        if (!hospitalStats) return null;

        const boxesOcupados = hospitalStats.boxes_ocupados || 0;
        const boxesTotales = hospitalStats.boxes_totales || hospital.num_boxes;
        const obsOcupadas = hospitalStats.observacion_ocupadas || 0;
        const obsTotales = hospitalStats.observacion_totales || hospital.num_camas_observacion;
        const saturacion = hospitalStats.nivel_saturacion || 0;

        return (
          <Card key={id} shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ThemeIcon size="lg" color={saturacion > 0.8 ? 'red' : saturacion > 0.6 ? 'orange' : 'green'}>
                  <IconHeartbeat size={20} />
                </ThemeIcon>
                <div>
                  <Title order={3}>{hospital.nombre.split(' - ')[0]}</Title>
                  <Text size="xs" c="dimmed">{hospital.ubicacion}</Text>
                </div>
              </Group>
              <Badge 
                size="lg" 
                color={saturacion > 0.8 ? 'red' : saturacion > 0.6 ? 'orange' : 'green'}
              >
                Saturación: {Math.round(saturacion * 100)}%
              </Badge>
            </Group>
            
            <Grid>
              {/* Boxes */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder padding="md" bg="gray.0">
                  <Group mb="xs">
                    <ThemeIcon color="blue" variant="light">
                      <IconBed size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Boxes de Atención</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mb="xs">
                    Cubículos donde se atiende a los pacientes
                  </Text>
                  <Progress 
                    value={(boxesOcupados / boxesTotales) * 100} 
                    size="xl" 
                    color={boxesOcupados / boxesTotales > 0.8 ? 'red' : boxesOcupados / boxesTotales > 0.6 ? 'orange' : 'green'}
                    mb="xs"
                  />
                  <Group justify="space-between">
                    <Text size="sm"><b>{boxesOcupados}</b> ocupados</Text>
                    <Text size="sm">de <b>{boxesTotales}</b> totales</Text>
                    <Badge color={boxesOcupados / boxesTotales > 0.8 ? 'red' : 'green'} size="lg">
                      {Math.round((boxesOcupados / boxesTotales) * 100)}%
                    </Badge>
                  </Group>
                </Card>
              </Grid.Col>

              {/* Observación */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder padding="md" bg="gray.0">
                  <Group mb="xs">
                    <ThemeIcon color="violet" variant="light">
                      <IconActivity size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Sala de Observación</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mb="xs">
                    Camas para pacientes en observación prolongada
                  </Text>
                  <Progress 
                    value={(obsOcupadas / obsTotales) * 100} 
                    size="xl" 
                    color={obsOcupadas / obsTotales > 0.8 ? 'red' : obsOcupadas / obsTotales > 0.6 ? 'orange' : 'green'}
                    mb="xs"
                  />
                  <Group justify="space-between">
                    <Text size="sm"><b>{obsOcupadas}</b> ocupadas</Text>
                    <Text size="sm">de <b>{obsTotales}</b> totales</Text>
                    <Badge color={obsOcupadas / obsTotales > 0.8 ? 'red' : 'green'} size="lg">
                      {Math.round((obsOcupadas / obsTotales) * 100)}%
                    </Badge>
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>

            <Divider my="md" label="Tiempos y Colas" labelPosition="center" />

            <SimpleGrid cols={{ base: 2, md: 4 }}>
              {/* Pacientes en cola */}
              <Card withBorder padding="md" style={{ textAlign: 'center' }} bg="blue.0">
                <ThemeIcon size="xl" color="blue" variant="light" mx="auto">
                  <IconUsers size={24} />
                </ThemeIcon>
                <Text size="xl" fw={700} mt="xs" c="blue.7">
                  {hospitalStats.pacientes_en_espera_atencion || 0}
                </Text>
                <Text size="sm" fw={500}>Pacientes en Cola</Text>
                <Text size="xs" c="dimmed">Esperando atención médica</Text>
              </Card>

              {/* Tiempo de espera */}
              <Card withBorder padding="md" style={{ textAlign: 'center' }} bg="orange.0">
                <ThemeIcon size="xl" color="orange" variant="light" mx="auto">
                  <IconClock size={24} />
                </ThemeIcon>
                <Text size="xl" fw={700} mt="xs" c="orange.7">
                  {Math.round(hospitalStats.tiempo_medio_espera || 0)} min
                </Text>
                <Text size="sm" fw={500}>Tiempo de Espera</Text>
                <Text size="xs" c="dimmed">Desde llegada hasta atención</Text>
              </Card>

              {/* Tiempo de atención */}
              <Card withBorder padding="md" style={{ textAlign: 'center' }} bg="teal.0">
                <ThemeIcon size="xl" color="teal" variant="light" mx="auto">
                  <IconFirstAidKit size={24} />
                </ThemeIcon>
                <Text size="xl" fw={700} mt="xs" c="teal.7">
                  {Math.round(hospitalStats.tiempo_medio_atencion || 0)} min
                </Text>
                <Text size="sm" fw={500}>Tiempo de Atención</Text>
                <Text size="xs" c="dimmed">Duración del tratamiento</Text>
              </Card>

              {/* Tiempo total */}
              <Card withBorder padding="md" style={{ textAlign: 'center' }} bg="grape.0">
                <ThemeIcon size="xl" color="grape" variant="light" mx="auto">
                  <IconClock size={24} />
                </ThemeIcon>
                <Text size="xl" fw={700} mt="xs" c="grape.7">
                  {Math.round(hospitalStats.tiempo_medio_total || 0)} min
                </Text>
                <Text size="sm" fw={500}>Tiempo Total</Text>
                <Text size="xs" c="dimmed">Espera + Atención completa</Text>
              </Card>
            </SimpleGrid>

            {/* Estadísticas adicionales */}
            <Group mt="md" justify="center" gap="xl">
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="blue">
                  {hospitalStats.pacientes_llegados_hora || 0}
                </Text>
                <Text size="xs" c="dimmed">Llegados/hora</Text>
              </div>
              <Divider orientation="vertical" />
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="green">
                  {hospitalStats.pacientes_atendidos_hora || 0}
                </Text>
                <Text size="xs" c="dimmed">Atendidos/hora</Text>
              </div>
              <Divider orientation="vertical" />
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="orange">
                  {hospitalStats.pacientes_derivados || 0}
                </Text>
                <Text size="xs" c="dimmed">Derivados</Text>
              </div>
              <Divider orientation="vertical" />
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="red">
                  {hospitalStats.pacientes_en_espera_triaje || 0}
                </Text>
                <Text size="xs" c="dimmed">En triaje</Text>
              </div>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
