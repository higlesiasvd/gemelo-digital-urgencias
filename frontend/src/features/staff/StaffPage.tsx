// ═══════════════════════════════════════════════════════════════════════════════
// STAFF PAGE - PERSONAL Y SERGAS - DISEÑO PREMIUM
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
    Box,
    Paper,
    Avatar,
    Progress,
    Tooltip,
    ActionIcon,
    Transition,
} from '@mantine/core';
import {
    IconStethoscope,
    IconUserPlus,
    IconUserMinus,
    IconAlertCircle,
    IconNurse,
    IconUsers,
    IconBuildingHospital,
    IconHeartbeat,
    IconClipboardCheck,
    IconArrowRight,
    IconSparkles,
    IconShieldCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { fetchListaSergas, assignDoctor, unassignDoctor } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

// Gradientes para tarjetas de hospitales
const HOSPITAL_GRADIENTS = {
    chuac: 'linear-gradient(135deg, rgba(34, 139, 230, 0.15) 0%, rgba(99, 179, 237, 0.08) 100%)',
    modelo: 'linear-gradient(135deg, rgba(253, 126, 20, 0.15) 0%, rgba(255, 183, 77, 0.08) 100%)',
    san_rafael: 'linear-gradient(135deg, rgba(64, 192, 87, 0.15) 0%, rgba(129, 230, 217, 0.08) 100%)',
};

const HOSPITAL_COLORS = {
    chuac: '#228be6',
    modelo: '#fd7e14',
    san_rafael: '#40c057',
};

// Datos del personal base
const PERSONAL_BASE = {
    chuac: {
        nombre: 'CHUAC',
        nombreCompleto: 'Complexo Hospitalario Universitario A Coruña',
        celadores: 2,
        enfermeras: 30,
        medicos_base: 10,
        ventanillas: 2,
        boxes_triaje: 4,
        consultas: 10,
        capacidadVariable: true,
    },
    modelo: {
        nombre: 'HM Modelo',
        nombreCompleto: 'Hospital Modelo',
        celadores: 1,
        enfermeras: 10,
        medicos_base: 4,
        ventanillas: 1,
        boxes_triaje: 2,
        consultas: 4,
        capacidadVariable: false,
    },
    san_rafael: {
        nombre: 'San Rafael',
        nombreCompleto: 'Hospital San Rafael',
        celadores: 1,
        enfermeras: 10,
        medicos_base: 4,
        ventanillas: 1,
        boxes_triaje: 1,
        consultas: 4,
        capacidadVariable: false,
    },
};

export function StaffPage() {
    const queryClient = useQueryClient();
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedMedico, setSelectedMedico] = useState<string | null>(null);
    const [selectedConsulta, setSelectedConsulta] = useState<string | null>(null);
    const [hoveredDoctor, setHoveredDoctor] = useState<string | null>(null);

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

    // Calcular totales
    const totalCeladores = Object.values(PERSONAL_BASE).reduce((acc, h) => acc + h.celadores, 0);
    const totalEnfermeras = Object.values(PERSONAL_BASE).reduce((acc, h) => acc + h.enfermeras, 0);
    const totalMedicosBase = Object.values(PERSONAL_BASE).reduce((acc, h) => acc + h.medicos_base, 0);
    const totalMedicosSergas = sergasAsignados?.length ?? 0;

    return (
        <Stack gap="xl">
            {/* Header con estadísticas globales */}
            <Box>
                <Group justify="space-between" align="flex-start" mb="md">
                    <Box>
                        <Group gap="sm" mb={4}>
                            <ThemeIcon size={44} radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
                                <IconUsers size={24} />
                            </ThemeIcon>
                            <Box>
                                <Title order={2}>Personal y SERGAS</Title>
                                <Text size="sm" c="dimmed">Gestión integral del personal sanitario</Text>
                            </Box>
                        </Group>
                    </Box>
                    <Button
                        leftSection={<IconUserPlus size={18} />}
                        variant="gradient"
                        gradient={{ from: 'violet', to: 'grape' }}
                        size="md"
                        onClick={() => setAssignModalOpen(true)}
                        disabled={(sergasDisponible?.length ?? 0) === 0}
                        style={{ boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)' }}
                    >
                        Asignar Médico SERGAS
                    </Button>
                </Group>

                {/* Estadísticas globales en cards premium */}
                <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                    >
                        <Group gap="sm">
                            <ThemeIcon size={40} radius="xl" color="blue" variant="light">
                                <IconUsers size={22} />
                            </ThemeIcon>
                            <Box>
                                <Text size="2rem" fw={700} lh={1}>{totalCeladores}</Text>
                                <Text size="xs" c="dimmed">Celadores</Text>
                            </Box>
                        </Group>
                    </Paper>

                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                        }}
                    >
                        <Group gap="sm">
                            <ThemeIcon size={40} radius="xl" color="teal" variant="light">
                                <IconNurse size={22} />
                            </ThemeIcon>
                            <Box>
                                <Text size="2rem" fw={700} lh={1}>{totalEnfermeras}</Text>
                                <Text size="xs" c="dimmed">Enfermeras</Text>
                            </Box>
                        </Group>
                    </Paper>

                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(167, 139, 250, 0.08) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}
                    >
                        <Group gap="sm">
                            <ThemeIcon size={40} radius="xl" color="violet" variant="light">
                                <IconStethoscope size={22} />
                            </ThemeIcon>
                            <Box>
                                <Text size="2rem" fw={700} lh={1}>{totalMedicosBase}</Text>
                                <Text size="xs" c="dimmed">Médicos Base</Text>
                            </Box>
                        </Group>
                    </Paper>

                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(248, 113, 113, 0.08) 100%)',
                            border: '1px solid rgba(236, 72, 153, 0.2)',
                        }}
                    >
                        <Group gap="sm">
                            <ThemeIcon size={40} radius="xl" color="pink" variant="light">
                                <IconHeartbeat size={22} />
                            </ThemeIcon>
                            <Box>
                                <Text size="2rem" fw={700} lh={1}>{totalMedicosSergas}</Text>
                                <Text size="xs" c="dimmed">SERGAS Asignados</Text>
                            </Box>
                        </Group>
                    </Paper>
                </SimpleGrid>
            </Box>

            {/* Alerta informativa con mejor diseño */}
            <Alert
                icon={<IconAlertCircle size={20} />}
                color="blue"
                variant="light"
                radius="lg"
                styles={{
                    root: {
                        background: 'linear-gradient(135deg, rgba(34, 139, 230, 0.12) 0%, rgba(99, 179, 237, 0.06) 100%)',
                        border: '1px solid rgba(34, 139, 230, 0.2)',
                    },
                }}
            >
                <Group gap="xs">
                    <IconSparkles size={16} style={{ color: '#228be6' }} />
                    <Text size="sm">
                        <strong>Solo el CHUAC permite asignación de médicos adicionales del SERGAS.</strong>{' '}
                        Los hospitales Modelo y San Rafael tienen capacidad fija.
                    </Text>
                </Group>
            </Alert>

            {/* Sección de médicos SERGAS disponibles */}
            <Card
                padding="xl"
                radius="lg"
                style={{
                    background: cssVariables.glassBg,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Group justify="space-between" mb="lg">
                    <Group gap="md">
                        <ThemeIcon size={50} radius="xl" variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
                            <IconShieldCheck size={26} />
                        </ThemeIcon>
                        <Box>
                            <Title order={3}>Lista SERGAS - Disponibles</Title>
                            <Text size="sm" c="dimmed">Médicos que pueden ser asignados al CHUAC</Text>
                        </Box>
                    </Group>
                    <Badge
                        size="xl"
                        variant="gradient"
                        gradient={{ from: 'green', to: 'teal' }}
                        style={{ boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}
                    >
                        {sergasDisponible?.length ?? 0} disponibles
                    </Badge>
                </Group>

                {(!sergasDisponible || sergasDisponible.length === 0) ? (
                    <Paper
                        p="xl"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                            textAlign: 'center',
                        }}
                    >
                        <ThemeIcon size={60} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                            <IconUsers size={30} />
                        </ThemeIcon>
                        <Text size="lg" fw={500} c="dimmed">No hay médicos disponibles</Text>
                        <Text size="sm" c="dimmed" mt="xs">Todos los médicos SERGAS están asignados</Text>
                    </Paper>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                        {sergasDisponible?.map((medico) => (
                            <Paper
                                key={medico.medico_id}
                                p="md"
                                radius="lg"
                                onMouseEnter={() => setHoveredDoctor(medico.medico_id)}
                                onMouseLeave={() => setHoveredDoctor(null)}
                                style={{
                                    background: hoveredDoctor === medico.medico_id
                                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%)'
                                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                    border: hoveredDoctor === medico.medico_id
                                        ? '1px solid rgba(16, 185, 129, 0.4)'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                }}
                            >
                                <Group justify="space-between" mb="sm">
                                    <Group gap="sm">
                                        <Avatar
                                            size={44}
                                            radius="xl"
                                            color="green"
                                            variant="gradient"
                                            gradient={{ from: 'green', to: 'teal' }}
                                        >
                                            {medico.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </Avatar>
                                        <Box>
                                            <Text fw={600} size="sm">{medico.nombre}</Text>
                                            <Badge size="xs" color="teal" variant="light">
                                                {medico.especialidad || 'General'}
                                            </Badge>
                                        </Box>
                                    </Group>
                                    <Badge color="green" variant="dot">Disponible</Badge>
                                </Group>
                                <Transition mounted={hoveredDoctor === medico.medico_id} transition="fade" duration={200}>
                                    {(styles) => (
                                        <Button
                                            style={styles}
                                            fullWidth
                                            variant="gradient"
                                            gradient={{ from: 'green', to: 'teal' }}
                                            size="sm"
                                            leftSection={<IconUserPlus size={16} />}
                                            rightSection={<IconArrowRight size={16} />}
                                            onClick={() => { setSelectedMedico(medico.medico_id); setAssignModalOpen(true); }}
                                        >
                                            Asignar a CHUAC
                                        </Button>
                                    )}
                                </Transition>
                            </Paper>
                        ))}
                    </SimpleGrid>
                )}
            </Card>

            {/* Sección de médicos SERGAS asignados */}
            <Card
                padding="xl"
                radius="lg"
                style={{
                    background: cssVariables.glassBg,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Group justify="space-between" mb="lg">
                    <Group gap="md">
                        <ThemeIcon size={50} radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
                            <IconClipboardCheck size={26} />
                        </ThemeIcon>
                        <Box>
                            <Title order={3}>Médicos SERGAS Asignados</Title>
                            <Text size="sm" c="dimmed">Médicos del SERGAS actualmente en consultas del CHUAC</Text>
                        </Box>
                    </Group>
                    <Badge
                        size="xl"
                        variant="gradient"
                        gradient={{ from: 'violet', to: 'grape' }}
                        style={{ boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)' }}
                    >
                        {sergasAsignados?.length ?? 0} asignados
                    </Badge>
                </Group>

                {(!sergasAsignados || sergasAsignados.length === 0) ? (
                    <Paper
                        p="xl"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                            textAlign: 'center',
                        }}
                    >
                        <ThemeIcon size={60} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                            <IconClipboardCheck size={30} />
                        </ThemeIcon>
                        <Text size="lg" fw={500} c="dimmed">No hay médicos asignados</Text>
                        <Text size="sm" c="dimmed" mt="xs">Asigna médicos del SERGAS a las consultas del CHUAC</Text>
                    </Paper>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                        {sergasAsignados?.map((medico) => (
                            <Paper
                                key={medico.medico_id}
                                p="md"
                                radius="lg"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(167, 139, 250, 0.06) 100%)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                }}
                            >
                                <Group justify="space-between" mb="sm">
                                    <Group gap="sm">
                                        <Avatar
                                            size={44}
                                            radius="xl"
                                            color="violet"
                                            variant="gradient"
                                            gradient={{ from: 'violet', to: 'grape' }}
                                        >
                                            {medico.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </Avatar>
                                        <Box>
                                            <Text fw={600} size="sm">{medico.nombre}</Text>
                                            <Badge size="xs" color="violet" variant="light">
                                                {medico.especialidad || 'General'}
                                            </Badge>
                                        </Box>
                                    </Group>
                                </Group>

                                <Stack gap="xs" mb="sm">
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Hospital:</Text>
                                        <Badge size="sm" color="blue">{medico.asignado_a_hospital?.toUpperCase()}</Badge>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Consulta:</Text>
                                        <Badge size="sm" variant="outline" color="violet">
                                            Consulta {medico.asignado_a_consulta}
                                        </Badge>
                                    </Group>
                                </Stack>

                                <Button
                                    fullWidth
                                    variant="light"
                                    color="red"
                                    size="sm"
                                    leftSection={<IconUserMinus size={16} />}
                                    onClick={() => unassignMutation.mutate(medico.medico_id)}
                                    loading={unassignMutation.isPending}
                                >
                                    Desasignar
                                </Button>
                            </Paper>
                        ))}
                    </SimpleGrid>
                )}
            </Card>

            {/* Personal Base por Hospital - Diseño premium */}
            <Box>
                <Group gap="sm" mb="lg">
                    <ThemeIcon size={40} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                        <IconBuildingHospital size={22} />
                    </ThemeIcon>
                    <Title order={3}>Personal Base por Hospital</Title>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                    {(Object.entries(PERSONAL_BASE) as [keyof typeof PERSONAL_BASE, typeof PERSONAL_BASE.chuac][]).map(([id, hospital]) => {
                        const medicosSergas = sergasAsignados?.filter(m => m.asignado_a_hospital === id).length ?? 0;
                        const totalMedicos = hospital.medicos_base + medicosSergas;
                        const capacidadColor = HOSPITAL_COLORS[id];

                        return (
                            <Card
                                key={id}
                                padding="lg"
                                radius="lg"
                                style={{
                                    background: HOSPITAL_GRADIENTS[id],
                                    border: `1px solid ${capacidadColor}33`,
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <Group justify="space-between" mb="md">
                                    <Group gap="sm">
                                        <ThemeIcon
                                            size={40}
                                            radius="xl"
                                            style={{ background: capacidadColor }}
                                        >
                                            <IconBuildingHospital size={22} color="white" />
                                        </ThemeIcon>
                                        <Box>
                                            <Text fw={700}>{hospital.nombre}</Text>
                                            <Text size="xs" c="dimmed" lineClamp={1}>{hospital.nombreCompleto}</Text>
                                        </Box>
                                    </Group>
                                    {hospital.capacidadVariable && (
                                        <Tooltip label="Permite asignación de médicos SERGAS">
                                            <Badge size="sm" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
                                                SERGAS ✓
                                            </Badge>
                                        </Tooltip>
                                    )}
                                </Group>

                                {/* Estadísticas con barras de progreso */}
                                <Stack gap="sm">
                                    <Box>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap={4}>
                                                <IconUsers size={14} />
                                                <Text size="xs">Celadores</Text>
                                            </Group>
                                            <Badge size="sm" variant="light">{hospital.celadores}</Badge>
                                        </Group>
                                        <Progress value={hospital.celadores / 2 * 100} size="xs" color="blue" radius="xl" />
                                    </Box>

                                    <Box>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap={4}>
                                                <IconNurse size={14} />
                                                <Text size="xs">Enfermeras</Text>
                                            </Group>
                                            <Badge size="sm" variant="light" color="teal">{hospital.enfermeras}</Badge>
                                        </Group>
                                        <Progress value={hospital.enfermeras / 30 * 100} size="xs" color="teal" radius="xl" />
                                    </Box>

                                    <Box>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap={4}>
                                                <IconStethoscope size={14} />
                                                <Text size="xs">Médicos (base)</Text>
                                            </Group>
                                            <Badge size="sm" variant="light" color="violet">{hospital.medicos_base}</Badge>
                                        </Group>
                                        <Progress value={hospital.medicos_base / 10 * 100} size="xs" color="violet" radius="xl" />
                                    </Box>

                                    {hospital.capacidadVariable && (
                                        <Box>
                                            <Group justify="space-between" mb={4}>
                                                <Group gap={4}>
                                                    <IconHeartbeat size={14} />
                                                    <Text size="xs">Médicos SERGAS</Text>
                                                </Group>
                                                <Badge size="sm" variant="gradient" gradient={{ from: 'pink', to: 'grape' }}>
                                                    +{medicosSergas}
                                                </Badge>
                                            </Group>
                                            <Progress
                                                value={medicosSergas > 0 ? Math.min(medicosSergas / 5 * 100, 100) : 0}
                                                size="xs"
                                                color="pink"
                                                radius="xl"
                                                striped
                                                animated={medicosSergas > 0}
                                            />
                                        </Box>
                                    )}
                                </Stack>

                                {/* Resumen de infraestructura */}
                                <Paper
                                    mt="md"
                                    p="sm"
                                    radius="md"
                                    style={{ background: 'rgba(0,0,0,0.2)' }}
                                >
                                    <Group justify="space-around">
                                        <Box ta="center">
                                            <Text size="lg" fw={700}>{hospital.ventanillas}</Text>
                                            <Text size="xs" c="dimmed">Ventanillas</Text>
                                        </Box>
                                        <Box ta="center">
                                            <Text size="lg" fw={700}>{hospital.boxes_triaje}</Text>
                                            <Text size="xs" c="dimmed">Boxes Triaje</Text>
                                        </Box>
                                        <Box ta="center">
                                            <Text size="lg" fw={700}>{hospital.consultas}</Text>
                                            <Text size="xs" c="dimmed">Consultas</Text>
                                        </Box>
                                    </Group>
                                </Paper>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            </Box>

            {/* Modal de asignación mejorado */}
            <Modal
                opened={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                title={
                    <Group gap="sm">
                        <ThemeIcon size={32} radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
                            <IconUserPlus size={18} />
                        </ThemeIcon>
                        <Text fw={600}>Asignar Médico a Consulta</Text>
                    </Group>
                }
                size="md"
                radius="lg"
                overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
            >
                <Stack gap="lg">
                    <Alert icon={<IconBuildingHospital size={16} />} color="blue" variant="light" radius="md">
                        Los médicos del SERGAS solo pueden asignarse a consultas del <strong>CHUAC</strong>.
                    </Alert>

                    <Select
                        label="Médico"
                        placeholder="Seleccionar médico"
                        value={selectedMedico}
                        onChange={setSelectedMedico}
                        data={sergasDisponible?.map((m) => ({ value: m.medico_id, label: m.nombre })) ?? []}
                        leftSection={<IconStethoscope size={16} />}
                        radius="md"
                        size="md"
                    />

                    <Select
                        label="Consulta (CHUAC)"
                        placeholder="Seleccionar consulta"
                        value={selectedConsulta}
                        onChange={setSelectedConsulta}
                        data={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Consulta ${i + 1}` }))}
                        leftSection={<IconClipboardCheck size={16} />}
                        radius="md"
                        size="md"
                    />

                    <Button
                        fullWidth
                        size="lg"
                        variant="gradient"
                        gradient={{ from: 'violet', to: 'grape' }}
                        onClick={handleAssign}
                        loading={assignMutation.isPending}
                        disabled={!selectedMedico || !selectedConsulta}
                        leftSection={<IconUserPlus size={20} />}
                        style={{ boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)' }}
                    >
                        Confirmar Asignación
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
