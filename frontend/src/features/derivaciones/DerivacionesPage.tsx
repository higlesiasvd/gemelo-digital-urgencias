// ═══════════════════════════════════════════════════════════════════════════════
// DERIVACIONES PAGE - TRASLADOS ENTRE HOSPITALES
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    ThemeIcon,
    Timeline,
    Switch,
    Paper,
    SimpleGrid,
    Alert,
} from '@mantine/core';
import {
    IconArrowsExchange,
    IconAlertTriangle,
    IconAmbulance,
    IconClock,
    IconBuildingHospital,
} from '@tabler/icons-react';
import { useDerivaciones } from '@/shared/store';
import { cssVariables } from '@/shared/theme';
import type { Derivacion } from '@/shared/types';

// Datos de ejemplo para demo cuando no hay derivaciones reales
const MOCK_DERIVACIONES: Derivacion[] = [
    {
        id: 1,
        paciente_id: 'P-2024-001',
        hospital_origen: 'chuac',
        hospital_destino: 'modelo',
        motivo: 'Saturación en urgencias - Derivación preventiva',
        nivel_urgencia: 'media',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // hace 30 min
    },
    {
        id: 2,
        paciente_id: 'P-2024-002',
        hospital_origen: 'chuac',
        hospital_destino: 'san_rafael',
        motivo: 'Paciente residente en zona comarcal',
        nivel_urgencia: 'baja',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // hace 2 horas
    },
    {
        id: 3,
        paciente_id: 'P-2024-003',
        hospital_origen: 'modelo',
        hospital_destino: 'chuac',
        motivo: 'Requiere UCI - Transferencia urgente',
        nivel_urgencia: 'alta',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // hace 5 horas
    },
];

export function DerivacionesPage() {
    const derivacionesReales = useDerivaciones();
    const [showDemo, setShowDemo] = useState(true);

    // Usar datos reales si existen, sino mostrar demo
    const derivaciones = derivacionesReales.length > 0 ? derivacionesReales : (showDemo ? MOCK_DERIVACIONES : []);

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

    // Estadísticas
    const stats = {
        total: derivaciones.length,
        alta: derivaciones.filter((d) => d.nivel_urgencia === 'alta').length,
        media: derivaciones.filter((d) => d.nivel_urgencia === 'media').length,
        baja: derivaciones.filter((d) => d.nivel_urgencia === 'baja').length,
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Derivaciones</Title>
                <Group gap="md">
                    {derivacionesReales.length === 0 && (
                        <Switch
                            label="Mostrar demo"
                            checked={showDemo}
                            onChange={(e) => setShowDemo(e.currentTarget.checked)}
                            size="sm"
                        />
                    )}
                    <Badge size="lg" color="orange" leftSection={<IconArrowsExchange size={14} />}>
                        {derivaciones.length} derivaciones
                    </Badge>
                </Group>
            </Group>

            {derivacionesReales.length === 0 && showDemo && (
                <Alert color="blue" variant="light" icon={<IconAmbulance size={16} />}>
                    Mostrando datos de demostración. Las derivaciones reales aparecerán cuando el sistema las genere.
                </Alert>
            )}

            {/* Estadísticas */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Group gap="xs">
                        <ThemeIcon color="blue" variant="light"><IconAmbulance size={18} /></ThemeIcon>
                        <div>
                            <Text size="xs" c="dimmed">Total</Text>
                            <Text size="xl" fw={700}>{stats.total}</Text>
                        </div>
                    </Group>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(250,82,82,0.1)' }}>
                    <Group gap="xs">
                        <ThemeIcon color="red" variant="light"><IconAlertTriangle size={18} /></ThemeIcon>
                        <div>
                            <Text size="xs" c="dimmed">Urgencia Alta</Text>
                            <Text size="xl" fw={700}>{stats.alta}</Text>
                        </div>
                    </Group>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(255,159,64,0.1)' }}>
                    <Group gap="xs">
                        <ThemeIcon color="orange" variant="light"><IconClock size={18} /></ThemeIcon>
                        <div>
                            <Text size="xs" c="dimmed">Urgencia Media</Text>
                            <Text size="xl" fw={700}>{stats.media}</Text>
                        </div>
                    </Group>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(64,192,87,0.1)' }}>
                    <Group gap="xs">
                        <ThemeIcon color="green" variant="light"><IconBuildingHospital size={18} /></ThemeIcon>
                        <div>
                            <Text size="xs" c="dimmed">Urgencia Baja</Text>
                            <Text size="xl" fw={700}>{stats.baja}</Text>
                        </div>
                    </Group>
                </Paper>
            </SimpleGrid>

            {/* Timeline de derivaciones */}
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
                                <Group gap="xs" mt={4}>
                                    <Badge variant="light" color="blue">{hospitalNames[d.hospital_origen] || d.hospital_origen}</Badge>
                                    <Text size="sm">→</Text>
                                    <Badge variant="light" color="green">{hospitalNames[d.hospital_destino] || d.hospital_destino}</Badge>
                                </Group>
                                <Text size="xs" c="dimmed" mt={4}>
                                    {new Date(d.timestamp).toLocaleString()} • Paciente: {d.paciente_id}
                                </Text>
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
