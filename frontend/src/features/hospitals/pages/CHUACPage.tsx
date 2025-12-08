// ═══════════════════════════════════════════════════════════════════════════════
// CHUAC PAGE - HOSPITAL ESCALABLE
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    ThemeIcon,
    Paper,
    SimpleGrid,
    Table,
    Slider,
    Alert,
    Tabs,
    Progress,
} from '@mantine/core';
import {
    IconBuildingHospital,
    IconUsers,
    IconStethoscope,
    IconNurse,
    IconActivity,
    IconRocket,
    IconClock,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useHospitalById } from '@/shared/store';
import { fetchListaSergas, scaleConsulta } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

interface ConsultaScalerProps {
    consultaId: number;
    currentMedicos: number;
    onScale: (target: number) => void;
    disabled?: boolean;
}

function ConsultaScaler({ consultaId, currentMedicos, onScale, disabled }: ConsultaScalerProps) {
    const [value, setValue] = useState(currentMedicos);

    const getSpeedColor = () => {
        if (value >= 4) return 'green';
        if (value >= 3) return 'teal';
        if (value >= 2) return 'blue';
        return 'gray';
    };

    return (
        <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>Consulta {consultaId}</Text>
                <Badge color={getSpeedColor()} variant="filled">x{value} Velocidad</Badge>
            </Group>
            <Slider
                value={value}
                onChange={setValue}
                onChangeEnd={(v) => v !== currentMedicos && onScale(v)}
                min={1}
                max={4}
                step={1}
                disabled={disabled}
                marks={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]}
                color={getSpeedColor()}
            />
            <Text size="xs" c="dimmed" mt="xs" ta="center">{value} médico(s) → Velocidad x{value}</Text>
        </Paper>
    );
}

export function CHUACPage() {
    const queryClient = useQueryClient();
    const hospitalState = useHospitalById('chuac');
    const saturation = hospitalState?.nivel_saturacion ?? 0;
    const saturationPercent = Math.round(saturation * 100);

    const [consultaMedicos, setConsultaMedicos] = useState<Record<number, number>>(
        Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 1]))
    );

    const { data: sergasAvailable } = useQuery({
        queryKey: ['sergas', 'disponible'],
        queryFn: () => fetchListaSergas(true),
    });

    const scaleMutation = useMutation({
        mutationFn: ({ consultaId, target }: { consultaId: number; target: number }) => scaleConsulta(consultaId, target),
        onSuccess: (_, { consultaId, target }) => {
            setConsultaMedicos((prev) => ({ ...prev, [consultaId]: target }));
            notifications.show({ title: 'Consulta escalada', message: `Consulta ${consultaId} ahora tiene ${target} médico(s)`, color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['sergas'] });
        },
        onError: (error) => {
            notifications.show({ title: 'Error', message: error instanceof Error ? error.message : 'Error al escalar', color: 'red' });
        },
    });

    const getStatusColor = () => {
        if (saturationPercent > 85) return 'red';
        if (saturationPercent > 70) return 'orange';
        if (saturationPercent > 50) return 'yellow';
        return 'green';
    };

    const totalMedicos = Object.values(consultaMedicos).reduce((a, b) => a + b, 0);
    const medicosDisponibles = sergasAvailable?.length ?? 0;

    return (
        <Stack gap="lg">
            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group justify="space-between">
                    <Group gap="md">
                        <ThemeIcon size={60} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }}>
                            <IconBuildingHospital size={32} />
                        </ThemeIcon>
                        <div>
                            <Title order={2}>CHUAC</Title>
                            <Text c="dimmed">Complejo Hospitalario Universitario A Coruña</Text>
                            <Badge mt="xs" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>✨ Hospital Escalable</Badge>
                        </div>
                    </Group>
                    <Stack align="end" gap="xs">
                        <Badge size="xl" color={getStatusColor()} variant="filled">{saturationPercent}% Saturación</Badge>
                        <Text size="sm" c="dimmed">Última actualización: {hospitalState?.ultimo_update ? new Date(hospitalState.ultimo_update).toLocaleTimeString() : '--'}</Text>
                    </Stack>
                </Group>
            </Card>

            <Alert icon={<IconUsers size={16} />} title={`${medicosDisponibles} médicos disponibles en Lista SERGAS`} color="blue" variant="light">
                Puedes asignar médicos adicionales a las consultas para aumentar la velocidad de atención hasta x4.
            </Alert>

            <Tabs defaultValue="capacidad">
                <Tabs.List>
                    <Tabs.Tab value="capacidad" leftSection={<IconBuildingHospital size={14} />}>Capacidad</Tabs.Tab>
                    <Tabs.Tab value="escalado" leftSection={<IconRocket size={14} />}>Escalado de Consultas</Tabs.Tab>
                    <Tabs.Tab value="stats" leftSection={<IconActivity size={14} />}>Estadísticas</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="capacidad" pt="md">
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                        <Card style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <Group gap="md" mb="md"><ThemeIcon size="lg" color="blue" variant="light"><IconUsers size={20} /></ThemeIcon><Title order={4}>Ventanillas</Title></Group>
                            <Text size="xl" fw={700}>2</Text>
                            <Text size="sm" c="dimmed">1 celador cada una</Text>
                            <Progress value={50} mt="md" color="blue" />
                        </Card>
                        <Card style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <Group gap="md" mb="md"><ThemeIcon size="lg" color="green" variant="light"><IconNurse size={20} /></ThemeIcon><Title order={4}>Boxes Triaje</Title></Group>
                            <Text size="xl" fw={700}>5</Text>
                            <Text size="sm" c="dimmed">2 enfermeras cada uno (10 total)</Text>
                            <Group mt="md" gap="xs"><Text size="sm">Ocupados:</Text><Badge>{hospitalState?.boxes_ocupados ?? 0}/5</Badge></Group>
                        </Card>
                        <Card style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <Group gap="md" mb="md"><ThemeIcon size="lg" color="violet" variant="light"><IconStethoscope size={20} /></ThemeIcon><Title order={4}>Consultas</Title></Group>
                            <Text size="xl" fw={700}>10</Text>
                            <Text size="sm" c="dimmed">2 enfermeras + 1-4 médicos cada una</Text>
                            <Group mt="md" gap="xs"><Text size="sm">Médicos totales:</Text><Badge color="violet">{totalMedicos}</Badge></Group>
                        </Card>
                    </SimpleGrid>

                    <Card mt="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Title order={4} mb="md">Personal Base</Title>
                        <Table>
                            <Table.Thead><Table.Tr><Table.Th>Rol</Table.Th><Table.Th>Ubicación</Table.Th><Table.Th>Cantidad</Table.Th></Table.Tr></Table.Thead>
                            <Table.Tbody>
                                <Table.Tr><Table.Td><Badge color="blue">Celadores</Badge></Table.Td><Table.Td>Ventanillas</Table.Td><Table.Td>2</Table.Td></Table.Tr>
                                <Table.Tr><Table.Td><Badge color="green">Enfermeras</Badge></Table.Td><Table.Td>Boxes Triaje</Table.Td><Table.Td>10</Table.Td></Table.Tr>
                                <Table.Tr><Table.Td><Badge color="green">Enfermeras</Badge></Table.Td><Table.Td>Consultas</Table.Td><Table.Td>20</Table.Td></Table.Tr>
                                <Table.Tr><Table.Td><Badge color="violet">Médicos</Badge></Table.Td><Table.Td>Consultas (escalable)</Table.Td><Table.Td>{totalMedicos} ({10}-40 posibles)</Table.Td></Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="escalado" pt="md">
                    <Alert icon={<IconRocket size={16} />} mb="md" color="violet">
                        <strong>Escalado de consultas:</strong> Cada médico adicional aumenta la velocidad de atención. Máximo 4 médicos por consulta = velocidad x4.
                    </Alert>
                    <SimpleGrid cols={{ base: 2, md: 5 }} spacing="md">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((consultaId) => (
                            <ConsultaScaler key={consultaId} consultaId={consultaId} currentMedicos={consultaMedicos[consultaId] || 1} onScale={(target) => scaleMutation.mutate({ consultaId, target })} disabled={scaleMutation.isPending} />
                        ))}
                    </SimpleGrid>
                    <Card mt="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Group justify="space-between">
                            <div><Text fw={600}>Resumen de Escalado</Text><Text size="sm" c="dimmed">Total médicos asignados: {totalMedicos} | Disponibles SERGAS: {medicosDisponibles}</Text></div>
                            <Badge size="lg" color="violet">Capacidad: {Math.round((totalMedicos / 40) * 100)}%</Badge>
                        </Group>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="stats" pt="md">
                    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                        <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconClock size={20} /><Text size="sm" c="dimmed">Tiempo espera</Text></Group><Text size="xl" fw={700}>{hospitalState?.tiempo_medio_espera?.toFixed(0) ?? '--'} min</Text></Paper>
                        <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconUsers size={20} /><Text size="sm" c="dimmed">Cola triaje</Text></Group><Text size="xl" fw={700}>{hospitalState?.cola_triaje ?? 0}</Text></Paper>
                        <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconUsers size={20} /><Text size="sm" c="dimmed">Cola consulta</Text></Group><Text size="xl" fw={700}>{hospitalState?.cola_consulta ?? 0}</Text></Paper>
                        <Paper p="md" style={{ background: 'rgba(255,255,255,0.05)' }}><Group gap="xs"><IconActivity size={20} /><Text size="sm" c="dimmed">Atendidos/hora</Text></Group><Text size="xl" fw={700}>{hospitalState?.pacientes_atendidos_hora ?? 0}</Text></Paper>
                    </SimpleGrid>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
