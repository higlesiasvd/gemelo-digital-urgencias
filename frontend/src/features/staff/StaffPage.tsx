// ═══════════════════════════════════════════════════════════════════════════════
// STAFF PAGE - PERSONAL Y SERGAS
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
    Button,
    Select,
    ThemeIcon,
    SimpleGrid,
    Table,
    Alert,
    Modal,
} from '@mantine/core';
import { IconStethoscope, IconUserPlus, IconUserMinus, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { fetchListaSergas, assignDoctor, unassignDoctor } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

export function StaffPage() {
    const queryClient = useQueryClient();
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedMedico, setSelectedMedico] = useState<string | null>(null);
    const [selectedConsulta, setSelectedConsulta] = useState<string | null>(null);

    const { data: sergasDisponible } = useQuery({
        queryKey: ['sergas', 'disponible'],
        queryFn: () => fetchListaSergas(true),
    });

    const { data: sergasAsignados } = useQuery({
        queryKey: ['sergas', 'asignados'],
        queryFn: () => fetchListaSergas(false),
    });

    const assignMutation = useMutation({
        mutationFn: ({ medicoId, consultaId }: { medicoId: string; consultaId: number }) => assignDoctor(medicoId, consultaId),
        onSuccess: () => {
            notifications.show({ title: 'Médico asignado', message: 'El médico ha sido asignado correctamente', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['sergas'] });
            setAssignModalOpen(false);
            setSelectedMedico(null);
            setSelectedConsulta(null);
        },
        onError: (error) => {
            notifications.show({ title: 'Error', message: error instanceof Error ? error.message : 'Error al asignar', color: 'red' });
        },
    });

    const unassignMutation = useMutation({
        mutationFn: (medicoId: string) => unassignDoctor(medicoId, 'Manual'),
        onSuccess: () => {
            notifications.show({ title: 'Médico desasignado', message: 'El médico ha sido devuelto a la lista SERGAS', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['sergas'] });
        },
        onError: (error) => {
            notifications.show({ title: 'Error', message: error instanceof Error ? error.message : 'Error al desasignar', color: 'red' });
        },
    });

    const handleAssign = () => {
        if (selectedMedico && selectedConsulta) {
            assignMutation.mutate({ medicoId: selectedMedico, consultaId: parseInt(selectedConsulta) });
        }
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Personal y SERGAS</Title>
                <Button leftSection={<IconUserPlus size={16} />} onClick={() => setAssignModalOpen(true)} disabled={(sergasDisponible?.length ?? 0) === 0}>Asignar Médico</Button>
            </Group>

            <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <strong>Solo el CHUAC permite asignación de médicos adicionales.</strong> Los hospitales Modelo y San Rafael tienen capacidad fija.
            </Alert>

            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group justify="space-between" mb="md">
                    <Group gap="sm"><ThemeIcon size="lg" color="green" variant="light"><IconStethoscope size={20} /></ThemeIcon><div><Title order={4}>Lista SERGAS - Disponibles</Title><Text size="sm" c="dimmed">Médicos que pueden ser asignados al CHUAC</Text></div></Group>
                    <Badge size="lg" color="green">{sergasDisponible?.length ?? 0} disponibles</Badge>
                </Group>
                <Table>
                    <Table.Thead><Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Especialidad</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {sergasDisponible?.map((medico) => (
                            <Table.Tr key={medico.medico_id}>
                                <Table.Td>{medico.nombre}</Table.Td>
                                <Table.Td>{medico.especialidad || 'General'}</Table.Td>
                                <Table.Td><Badge color="green">Disponible</Badge></Table.Td>
                                <Table.Td><Button size="xs" leftSection={<IconUserPlus size={14} />} onClick={() => { setSelectedMedico(medico.medico_id); setAssignModalOpen(true); }}>Asignar</Button></Table.Td>
                            </Table.Tr>
                        ))}
                        {(!sergasDisponible || sergasDisponible.length === 0) && <Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed">No hay médicos disponibles</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                </Table>
            </Card>

            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group justify="space-between" mb="md">
                    <Group gap="sm"><ThemeIcon size="lg" color="violet" variant="light"><IconStethoscope size={20} /></ThemeIcon><div><Title order={4}>Médicos Asignados</Title><Text size="sm" c="dimmed">Médicos SERGAS actualmente en consultas del CHUAC</Text></div></Group>
                    <Badge size="lg" color="violet">{sergasAsignados?.length ?? 0} asignados</Badge>
                </Group>
                <Table>
                    <Table.Thead><Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Especialidad</Table.Th><Table.Th>Hospital</Table.Th><Table.Th>Consulta</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {sergasAsignados?.map((medico) => (
                            <Table.Tr key={medico.medico_id}>
                                <Table.Td>{medico.nombre}</Table.Td>
                                <Table.Td>{medico.especialidad || 'General'}</Table.Td>
                                <Table.Td><Badge color="blue">{medico.asignado_a_hospital?.toUpperCase()}</Badge></Table.Td>
                                <Table.Td><Badge color="violet">Consulta {medico.asignado_a_consulta}</Badge></Table.Td>
                                <Table.Td><Button size="xs" color="red" variant="light" leftSection={<IconUserMinus size={14} />} onClick={() => unassignMutation.mutate(medico.medico_id)} loading={unassignMutation.isPending}>Desasignar</Button></Table.Td>
                            </Table.Tr>
                        ))}
                        {(!sergasAsignados || sergasAsignados.length === 0) && <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed">No hay médicos asignados</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                </Table>
            </Card>

            <Title order={4}>Personal Base por Hospital</Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <Card style={{ background: 'rgba(255,255,255,0.05)' }}><Title order={5} mb="sm">CHUAC</Title><Stack gap="xs"><Group justify="space-between"><Text size="sm">Celadores</Text><Badge>2</Badge></Group><Group justify="space-between"><Text size="sm">Enfermeras</Text><Badge color="green">30</Badge></Group><Group justify="space-between"><Text size="sm">Médicos (base)</Text><Badge color="violet">10</Badge></Group><Group justify="space-between"><Text size="sm">Médicos (SERGAS)</Text><Badge color="violet">{sergasAsignados?.filter(m => m.asignado_a_hospital === 'chuac').length ?? 0}</Badge></Group></Stack></Card>
                <Card style={{ background: 'rgba(255,255,255,0.05)' }}><Title order={5} mb="sm">Modelo</Title><Stack gap="xs"><Group justify="space-between"><Text size="sm">Celadores</Text><Badge>1</Badge></Group><Group justify="space-between"><Text size="sm">Enfermeras</Text><Badge color="green">10</Badge></Group><Group justify="space-between"><Text size="sm">Médicos</Text><Badge color="violet">4</Badge></Group></Stack></Card>
                <Card style={{ background: 'rgba(255,255,255,0.05)' }}><Title order={5} mb="sm">San Rafael</Title><Stack gap="xs"><Group justify="space-between"><Text size="sm">Celadores</Text><Badge>1</Badge></Group><Group justify="space-between"><Text size="sm">Enfermeras</Text><Badge color="green">10</Badge></Group><Group justify="space-between"><Text size="sm">Médicos</Text><Badge color="violet">4</Badge></Group></Stack></Card>
            </SimpleGrid>

            <Modal opened={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Asignar Médico a Consulta">
                <Stack>
                    <Select label="Médico" placeholder="Seleccionar médico" value={selectedMedico} onChange={setSelectedMedico} data={sergasDisponible?.map((m) => ({ value: m.medico_id, label: m.nombre })) ?? []} />
                    <Select label="Consulta (CHUAC)" placeholder="Seleccionar consulta" value={selectedConsulta} onChange={setSelectedConsulta} data={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Consulta ${i + 1}` }))} />
                    <Button onClick={handleAssign} loading={assignMutation.isPending} disabled={!selectedMedico || !selectedConsulta}>Asignar</Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
