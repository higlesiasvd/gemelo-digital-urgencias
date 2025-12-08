// ═══════════════════════════════════════════════════════════════════════════════
// SAN RAFAEL PAGE - HOSPITAL FIJO
// ═══════════════════════════════════════════════════════════════════════════════

import { Card, Text, Title, Group, Stack, Badge, ThemeIcon, Paper, SimpleGrid, Table } from '@mantine/core';
import { IconBuildingHospital, IconUsers, IconStethoscope, IconNurse, IconActivity, IconClock } from '@tabler/icons-react';
import { useHospitalById } from '@/shared/store';
import { cssVariables } from '@/shared/theme';

export function SanRafaelPage() {
    const hospitalState = useHospitalById('san_rafael');
    const saturation = hospitalState?.nivel_saturacion ?? 0;
    const saturationPercent = Math.round(saturation * 100);

    const getStatusColor = () => {
        if (saturationPercent > 85) return 'red';
        if (saturationPercent > 70) return 'orange';
        if (saturationPercent > 50) return 'yellow';
        return 'green';
    };

    return (
        <Stack gap="lg">
            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group justify="space-between">
                    <Group gap="md">
                        <ThemeIcon size={60} radius="xl" variant="gradient" gradient={{ from: 'green', to: 'teal', deg: 135 }}><IconBuildingHospital size={32} /></ThemeIcon>
                        <div><Title order={2}>Hospital San Rafael</Title><Text c="dimmed">Hospital Comarcal</Text><Badge mt="xs" variant="light" color="gray">Capacidad Fija</Badge></div>
                    </Group>
                    <Stack align="end" gap="xs">
                        <Badge size="xl" color={getStatusColor()} variant="filled">{saturationPercent}% Saturación</Badge>
                        <Text size="sm" c="dimmed">Última actualización: {hospitalState?.ultimo_update ? new Date(hospitalState.ultimo_update).toLocaleTimeString() : '--'}</Text>
                    </Stack>
                </Group>
            </Card>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <Card style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="md" mb="md"><ThemeIcon size="lg" color="blue" variant="light"><IconUsers size={20} /></ThemeIcon><Title order={4}>Ventanillas</Title></Group><Text size="xl" fw={700}>1</Text><Text size="sm" c="dimmed">1 celador</Text></Card>
                <Card style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="md" mb="md"><ThemeIcon size="lg" color="green" variant="light"><IconNurse size={20} /></ThemeIcon><Title order={4}>Boxes Triaje</Title></Group><Text size="xl" fw={700}>1</Text><Text size="sm" c="dimmed">2 enfermeras</Text><Group mt="md" gap="xs"><Text size="sm">Ocupados:</Text><Badge>{hospitalState?.boxes_ocupados ?? 0}/1</Badge></Group></Card>
                <Card style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="md" mb="md"><ThemeIcon size="lg" color="violet" variant="light"><IconStethoscope size={20} /></ThemeIcon><Title order={4}>Consultas</Title></Group><Text size="xl" fw={700}>4</Text><Text size="sm" c="dimmed">2 enfermeras + 1 médico cada una</Text></Card>
            </SimpleGrid>

            <Card style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Title order={4} mb="md">Personal</Title>
                <Table><Table.Thead><Table.Tr><Table.Th>Rol</Table.Th><Table.Th>Ubicación</Table.Th><Table.Th>Cantidad</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        <Table.Tr><Table.Td><Badge color="blue">Celadores</Badge></Table.Td><Table.Td>Ventanilla</Table.Td><Table.Td>1</Table.Td></Table.Tr>
                        <Table.Tr><Table.Td><Badge color="green">Enfermeras</Badge></Table.Td><Table.Td>Box Triaje</Table.Td><Table.Td>2</Table.Td></Table.Tr>
                        <Table.Tr><Table.Td><Badge color="green">Enfermeras</Badge></Table.Td><Table.Td>Consultas</Table.Td><Table.Td>8</Table.Td></Table.Tr>
                        <Table.Tr><Table.Td><Badge color="violet">Médicos</Badge></Table.Td><Table.Td>Consultas</Table.Td><Table.Td>4</Table.Td></Table.Tr>
                    </Table.Tbody></Table>
            </Card>

            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconClock size={20} /><Text size="sm" c="dimmed">Tiempo espera</Text></Group><Text size="xl" fw={700}>{hospitalState?.tiempo_medio_espera?.toFixed(0) ?? '--'} min</Text></Paper>
                <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconUsers size={20} /><Text size="sm" c="dimmed">Cola triaje</Text></Group><Text size="xl" fw={700}>{hospitalState?.cola_triaje ?? 0}</Text></Paper>
                <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconUsers size={20} /><Text size="sm" c="dimmed">Cola consulta</Text></Group><Text size="xl" fw={700}>{hospitalState?.cola_consulta ?? 0}</Text></Paper>
                <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconActivity size={20} /><Text size="sm" c="dimmed">Atendidos/hora</Text></Group><Text size="xl" fw={700}>{hospitalState?.pacientes_atendidos_hora ?? 0}</Text></Paper>
            </SimpleGrid>
        </Stack>
    );
}
