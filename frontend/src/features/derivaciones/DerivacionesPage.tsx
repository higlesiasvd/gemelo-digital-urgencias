// ═══════════════════════════════════════════════════════════════════════════════
// DERIVACIONES PAGE
// ═══════════════════════════════════════════════════════════════════════════════

import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    ThemeIcon,
    Timeline,
} from '@mantine/core';
import { IconArrowsExchange, IconAlertTriangle } from '@tabler/icons-react';
import { useDerivaciones } from '@/shared/store';
import { cssVariables } from '@/shared/theme';

export function DerivacionesPage() {
    const derivaciones = useDerivaciones();

    const getUrgencyColor = (nivel: string) => {
        if (nivel === 'alta') return 'red';
        if (nivel === 'media') return 'orange';
        return 'blue';
    };

    const hospitalNames: Record<string, string> = {
        chuac: 'CHUAC',
        modelo: 'HM Modelo',
        san_rafael: 'San Rafael',
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Derivaciones</Title>
                <Badge size="lg" color="orange" leftSection={<IconArrowsExchange size={14} />}>
                    {derivaciones.length} derivaciones activas
                </Badge>
            </Group>

            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group gap="sm" mb="md">
                    <ThemeIcon size="lg" color="orange" variant="light">
                        <IconArrowsExchange size={20} />
                    </ThemeIcon>
                    <div>
                        <Title order={4}>Historial de Derivaciones</Title>
                        <Text size="sm" c="dimmed">Traslados de pacientes entre hospitales</Text>
                    </div>
                </Group>

                {derivaciones.length > 0 ? (
                    <Timeline active={0} bulletSize={24} lineWidth={2}>
                        {derivaciones.map((d) => (
                            <Timeline.Item
                                key={d.id}
                                bullet={<IconAlertTriangle size={12} />}
                                color={getUrgencyColor(d.nivel_urgencia)}
                                title={
                                    <Group gap="xs">
                                        <Badge color={getUrgencyColor(d.nivel_urgencia)}>{d.nivel_urgencia.toUpperCase()}</Badge>
                                        <Text size="sm">{d.motivo}</Text>
                                    </Group>
                                }
                            >
                                <Text size="sm" c="dimmed" mt={4}>
                                    {hospitalNames[d.hospital_origen] || d.hospital_origen} →{' '}
                                    {hospitalNames[d.hospital_destino] || d.hospital_destino}
                                </Text>
                                <Text size="xs" c="dimmed">{new Date(d.timestamp).toLocaleString()}</Text>
                            </Timeline.Item>
                        ))}
                    </Timeline>
                ) : (
                    <Text ta="center" c="dimmed" py="xl">No hay derivaciones registradas</Text>
                )}
            </Card>
        </Stack>
    );
}
