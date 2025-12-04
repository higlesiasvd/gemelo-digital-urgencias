import { Card, Group, Text, Badge, RingProgress, Stack, Flex, ThemeIcon } from '@mantine/core';
import { IconBed, IconUsers, IconClock, IconAlertTriangle } from '@tabler/icons-react';
import type { HospitalStats } from '@/types/hospital';
import { HOSPITALES } from '@/types/hospital';

interface HospitalCardProps {
  stats: HospitalStats;
  onClick?: () => void;
}

export function HospitalCard({ stats, onClick }: HospitalCardProps) {
  const hospital = HOSPITALES[stats.hospital_id];

  if (!hospital) return null;

  const boxesColor = stats.ocupacion_boxes > 0.85 ? 'red' : stats.ocupacion_boxes > 0.7 ? 'orange' : 'green';
  const obsColor = stats.ocupacion_observacion > 0.85 ? 'red' : stats.ocupacion_observacion > 0.7 ? 'orange' : 'green';

  return (
    <Card
      shadow="md"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: onClick ? 'pointer' : 'default', height: '100%' }}
      onClick={onClick}
    >
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={700} size="lg">{hospital.nombre}</Text>
            <Text size="sm" c="dimmed">{hospital.ubicacion}</Text>
          </div>
          {stats.emergencia_activa && (
            <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={14} />}>
              Emergencia
            </Badge>
          )}
        </Group>

        <Group grow>
          <Flex direction="column" align="center">
            <RingProgress
              size={100}
              thickness={12}
              roundCaps
              sections={[{ value: stats.ocupacion_boxes * 100, color: boxesColor }]}
              label={
                <Text ta="center" fw={700} size="lg">
                  {Math.round(stats.ocupacion_boxes * 100)}%
                </Text>
              }
            />
            <Group gap="xs" mt="xs">
              <ThemeIcon size="sm" variant="light" color={boxesColor}>
                <IconBed size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">Boxes</Text>
            </Group>
          </Flex>

          <Flex direction="column" align="center">
            <RingProgress
              size={100}
              thickness={12}
              roundCaps
              sections={[{ value: stats.ocupacion_observacion * 100, color: obsColor }]}
              label={
                <Text ta="center" fw={700} size="lg">
                  {Math.round(stats.ocupacion_observacion * 100)}%
                </Text>
              }
            />
            <Group gap="xs" mt="xs">
              <ThemeIcon size="sm" variant="light" color={obsColor}>
                <IconBed size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">Observación</Text>
            </Group>
          </Flex>
        </Group>

        <Group grow>
          <Card withBorder padding="xs">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light">
                <IconUsers size={14} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">En cola</Text>
                <Text fw={600}>{stats.pacientes_en_espera_atencion || 0}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder padding="xs">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light">
                <IconClock size={14} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">Espera</Text>
                <Text fw={600}>{Math.round(stats.tiempo_medio_espera || 0)} min</Text>
              </div>
            </Group>
          </Card>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Llegadas/hora: <Text span fw={600}>{stats.pacientes_llegados_hora}</Text>
          </Text>
          <Badge
            color={stats.nivel_saturacion > 0.8 ? 'red' : stats.nivel_saturacion > 0.6 ? 'orange' : 'green'}
            variant="light"
          >
            Saturación: {Math.round(stats.nivel_saturacion * 100)}%
          </Badge>
        </Group>
      </Stack>
    </Card>
  );
}
