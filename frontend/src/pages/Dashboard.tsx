import { Grid, Title, Text, Card, Group, Stack, Badge } from '@mantine/core';
import { HospitalCard } from '@/components/HospitalCard';
import { useHospitalStore } from '@/store/hospitalStore';
import { HOSPITALES } from '@/types/hospital';
import { IconAlertTriangle, IconCircleCheck, IconClock } from '@tabler/icons-react';
import dayjs from 'dayjs';

export function Dashboard() {
  const { stats, lastUpdate, alerts } = useHospitalStore();

  const hospitalIds = Object.keys(HOSPITALES);
  const totalStats = hospitalIds.reduce(
    (acc, id) => {
      const hospitalStats = stats[id];
      if (hospitalStats) {
        acc.totalBoxes += hospitalStats.boxes_ocupados || 0;
        acc.totalBoxesCapacity += hospitalStats.boxes_totales || HOSPITALES[id].num_boxes;
        acc.totalQueue += hospitalStats.pacientes_en_espera_atencion || 0;
        acc.emergencies += hospitalStats.emergencia_activa ? 1 : 0;
      }
      return acc;
    },
    { totalBoxes: 0, totalBoxesCapacity: 0, totalQueue: 0, emergencies: 0 }
  );

  const avgOccupation = totalStats.totalBoxesCapacity > 0
    ? (totalStats.totalBoxes / totalStats.totalBoxesCapacity) * 100
    : 0;

  const recentAlerts = alerts.slice(0, 5);
  const criticalAlerts = alerts.filter((a) => a.nivel === 'critical');

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={1}>Vista General del Sistema</Title>
          <Text c="dimmed" size="sm">
            {lastUpdate ? `Última actualización: ${dayjs(lastUpdate).format('HH:mm:ss')}` : 'Esperando datos...'}
          </Text>
        </div>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Ocupación Media
                </Text>
                <Text size="xl" fw={700} mt="xs">
                  {avgOccupation.toFixed(1)}%
                </Text>
              </div>
              <IconCircleCheck size={32} color={avgOccupation > 80 ? '#fa5252' : avgOccupation > 60 ? '#fd7e14' : '#51cf66'} />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Pacientes en Cola
                </Text>
                <Text size="xl" fw={700} mt="xs">
                  {totalStats.totalQueue}
                </Text>
              </div>
              <IconClock size={32} color={totalStats.totalQueue > 20 ? '#fa5252' : totalStats.totalQueue > 10 ? '#fd7e14' : '#51cf66'} />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Emergencias Activas
                </Text>
                <Text size="xl" fw={700} mt="xs">
                  {totalStats.emergencies}
                </Text>
              </div>
              <IconAlertTriangle size={32} color={totalStats.emergencies > 0 ? '#fa5252' : '#51cf66'} />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Alertas Críticas
                </Text>
                <Text size="xl" fw={700} mt="xs">
                  {criticalAlerts.length}
                </Text>
              </div>
              <IconAlertTriangle size={32} color={criticalAlerts.length > 0 ? '#fa5252' : '#51cf66'} />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Title order={2} mt="md">Hospitales</Title>

      <Grid>
        {hospitalIds.map((id) => {
          const hospitalStats = stats[id];
          if (!hospitalStats) return null;

          return (
            <Grid.Col key={id} span={{ base: 12, sm: 6, lg: 4 }}>
              <HospitalCard stats={hospitalStats} />
            </Grid.Col>
          );
        })}
      </Grid>

      {recentAlerts.length > 0 && (
        <>
          <Title order={2} mt="md">Alertas Recientes</Title>
          <Stack gap="xs">
            {recentAlerts.map((alert, idx) => (
              <Card key={idx} padding="sm" withBorder>
                <Group justify="space-between">
                  <Group>
                    <Badge
                      color={alert.nivel === 'critical' ? 'red' : alert.nivel === 'warning' ? 'orange' : 'blue'}
                      variant="filled"
                    >
                      {alert.nivel}
                    </Badge>
                    <Text size="sm" fw={500}>
                      {alert.mensaje}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {dayjs(alert.timestamp).format('HH:mm:ss')}
                  </Text>
                </Group>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
