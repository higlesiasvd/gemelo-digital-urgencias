import { Card, Group, Text, RingProgress, Stack, Badge, Progress, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconClock, IconUsers, IconBed, IconAlertCircle } from '@tabler/icons-react';

interface HospitalMetricsProps {
  stats: {
    boxes_ocupados: number;
    boxes_totales: number;
    observacion_ocupadas: number;
    observacion_totales: number;
    pacientes_en_espera_atencion: number;
    tiempo_medio_espera: number;
    nivel_saturacion: number;
  };
  hospitalName: string;
}

export function HospitalMetrics({ stats, hospitalName }: HospitalMetricsProps) {
  const ocupacionBoxes = (stats.boxes_ocupados / stats.boxes_totales) * 100;
  const ocupacionObs = (stats.observacion_ocupadas / stats.observacion_totales) * 100;
  const saturacion = stats.nivel_saturacion * 100;

  const getSaturationColor = (value: number) => {
    if (value > 85) return 'red.6';
    if (value > 70) return 'vibrantOrange.6';
    if (value > 50) return 'yellow.6';
    return 'emeraldGreen.6';
  };

  const getWaitTimeStatus = (minutes: number) => {
    if (minutes < 30) return { color: 'emeraldGreen', label: 'Excelente' };
    if (minutes < 60) return { color: 'yellow', label: 'Aceptable' };
    if (minutes < 90) return { color: 'vibrantOrange', label: 'Alto' };
    return { color: 'red', label: 'Crítico' };
  };

  const waitStatus = getWaitTimeStatus(stats.tiempo_medio_espera);

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="xl"
      withBorder
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: `2px solid ${saturacion > 85 ? '#ef4444' : saturacion > 70 ? '#f97316' : '#10b981'}`,
      }}
    >
      <Group justify="space-between" mb="lg">
        <div>
          <Text fw={700} size="xl" c="dark">{hospitalName}</Text>
          <Text size="sm" c="dimmed">Estado en tiempo real</Text>
        </div>
        <RingProgress
          size={90}
          thickness={10}
          roundCaps
          sections={[
            { value: saturacion, color: getSaturationColor(saturacion) }
          ]}
          label={
            <div style={{ textAlign: 'center' }}>
              <Text size="xs" c="dimmed" fw={600}>
                Saturación
              </Text>
              <Text size="lg" fw={800} style={{
                background: saturacion > 85 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                           saturacion > 70 ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' :
                           'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {saturacion.toFixed(0)}%
              </Text>
            </div>
          }
        />
      </Group>

      <Stack gap="md">
        {/* Boxes */}
        <div>
          <Group justify="space-between" mb={4}>
            <Group gap="xs">
              <ThemeIcon size="sm" color="blue" variant="light">
                <IconBed size={14} />
              </ThemeIcon>
              <Text size="sm" fw={500}>Boxes de Atención</Text>
            </Group>
            <Text size="sm" fw={700}>
              {stats.boxes_ocupados}/{stats.boxes_totales}
            </Text>
          </Group>
          <Progress
            value={ocupacionBoxes}
            color={getSaturationColor(ocupacionBoxes)}
            size="lg"
            radius="xl"
            animated={ocupacionBoxes > 85}
          />
          <Text size="xs" c="dimmed" mt={4}>
            {ocupacionBoxes > 85
              ? '⚠️ Ocupación crítica - Considere derivaciones'
              : ocupacionBoxes > 70
              ? '⚠️ Alta ocupación - Monitorizar'
              : '✓ Capacidad disponible'
            }
          </Text>
        </div>

        {/* Observación */}
        <div>
          <Group justify="space-between" mb={4}>
            <Group gap="xs">
              <ThemeIcon size="sm" color="grape" variant="light">
                <IconBed size={14} />
              </ThemeIcon>
              <Text size="sm" fw={500}>Observación</Text>
            </Group>
            <Text size="sm" fw={700}>
              {stats.observacion_ocupadas}/{stats.observacion_totales}
            </Text>
          </Group>
          <Progress
            value={ocupacionObs}
            color={getSaturationColor(ocupacionObs)}
            size="lg"
            radius="xl"
          />
        </div>

        {/* Métricas clave */}
        <SimpleGrid cols={2} spacing="xs" mt="sm">
          <Card padding="md" radius="lg" withBorder style={{
            background: stats.pacientes_en_espera_atencion > 20
              ? 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)'
              : 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)',
            border: stats.pacientes_en_espera_atencion > 20 ? '2px solid #fca5a5' : '1px solid #e5e7eb',
          }}>
            <Group gap="xs" mb={4}>
              <ThemeIcon size="md" color="vibrantOrange" variant="gradient" gradient={{ from: 'vibrantOrange.5', to: 'vibrantOrange.7', deg: 135 }}>
                <IconUsers size={16} />
              </ThemeIcon>
              <Text size="xs" c="dimmed" fw={600}>En espera</Text>
            </Group>
            <Text size="2rem" fw={800} style={{
              background: stats.pacientes_en_espera_atencion > 20
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {stats.pacientes_en_espera_atencion}
            </Text>
            <Badge size="sm" variant="light" color={
              stats.pacientes_en_espera_atencion > 30 ? 'red' :
              stats.pacientes_en_espera_atencion > 20 ? 'vibrantOrange' :
              stats.pacientes_en_espera_atencion > 10 ? 'yellow' : 'emeraldGreen'
            }>
              {stats.pacientes_en_espera_atencion > 30 ? 'Cola muy larga' :
               stats.pacientes_en_espera_atencion > 20 ? 'Cola larga' :
               stats.pacientes_en_espera_atencion > 10 ? 'Cola moderada' : 'Cola normal'}
            </Badge>
          </Card>

          <Card padding="md" radius="lg" withBorder style={{
            background: stats.tiempo_medio_espera > 60
              ? 'linear-gradient(135deg, #fff7ed 0%, #fff 100%)'
              : 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)',
            border: stats.tiempo_medio_espera > 60 ? '2px solid #fdba74' : '1px solid #e5e7eb',
          }}>
            <Group gap="xs" mb={4}>
              <ThemeIcon size="md" color={waitStatus.color} variant="gradient" gradient={{ from: `${waitStatus.color}.5`, to: `${waitStatus.color}.7`, deg: 135 }}>
                <IconClock size={16} />
              </ThemeIcon>
              <Text size="xs" c="dimmed" fw={600}>Tiempo espera</Text>
            </Group>
            <Text size="2rem" fw={800} style={{
              background: stats.tiempo_medio_espera > 60
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {stats.tiempo_medio_espera.toFixed(0)}'
            </Text>
            <Badge size="sm" variant="gradient" gradient={{ from: `${waitStatus.color}.5`, to: `${waitStatus.color}.7`, deg: 135 }}>
              {waitStatus.label}
            </Badge>
          </Card>
        </SimpleGrid>

        {/* Alertas importantes */}
        {(ocupacionBoxes > 85 || stats.tiempo_medio_espera > 90 || stats.pacientes_en_espera_atencion > 30) && (
          <Card padding="sm" radius="md" style={{
            background: 'linear-gradient(135deg, #ffe0e0 0%, #ffcccc 100%)',
            border: '2px solid #fa5252'
          }}>
            <Group gap="xs">
              <ThemeIcon size="sm" color="red">
                <IconAlertCircle size={14} />
              </ThemeIcon>
              <Text size="xs" fw={600} c="red">
                {ocupacionBoxes > 85 && 'Urgencias saturada. '}
                {stats.tiempo_medio_espera > 90 && 'Tiempos de espera críticos. '}
                {stats.pacientes_en_espera_atencion > 30 && 'Cola excesiva. '}
                Se recomienda activar protocolo de emergencia.
              </Text>
            </Group>
          </Card>
        )}
      </Stack>
    </Card>
  );
}
