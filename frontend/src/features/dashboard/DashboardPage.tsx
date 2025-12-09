// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE - CON FLUJO VISUAL Y MODAL DE PACIENTES
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    SimpleGrid,
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    Progress,
    ThemeIcon,
    Paper,
    Box,
    Skeleton,
    Modal,
    Table,
    ScrollArea,
    SegmentedControl,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconBuildingHospital,
    IconUsers,
    IconActivity,
    IconAlertTriangle,
    IconTrendingUp,
    IconArrowRight,
    IconDoor,
    IconHeartRateMonitor,
    IconStethoscope,
    Icon3dCubeSphere,
    IconLayoutList,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHospitals, useDerivaciones } from '@/shared/store';
import { fetchHospitals } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';
import { CSS3DHospitalScene, useChuacConsultas } from '@/features/twin/CSS3DHospitalScene';
import type { HospitalConfig, HospitalState, PatientInQueue } from '@/shared/types';

// Los datos de pacientes ahora vienen del backend via WebSocket en el estado de cada hospital

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DE FLECHA ANIMADA
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedArrow({ active = true }: { active?: boolean }) {
    return (
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
            <motion.div animate={active ? { x: [0, 5, 0] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
                <IconArrowRight size={20} style={{ color: active ? '#15aabf' : '#555' }} />
            </motion.div>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DE FLUJO DE HOSPITAL
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowBoxProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    capacity: number | string;
    color: string;
    sublabel?: string;
    onClick?: () => void;
}

function FlowBox({ icon, label, value, capacity, color, sublabel, onClick }: FlowBoxProps) {
    const valueNum = typeof value === 'number' ? value : 0;
    const capacityNum = typeof capacity === 'number' ? capacity : 0;
    const percentage = capacityNum > 0 ? (valueNum / capacityNum) * 100 : 0;

    const colorRgb = color === 'blue' ? '34,139,230' : color === 'orange' ? '255,159,64' : '64,192,87';

    return (
        <Paper
            p="sm"
            radius="md"
            style={{
                background: `linear-gradient(135deg, rgba(${colorRgb},0.2) 0%, rgba(${colorRgb},0.05) 100%)`,
                border: `1px solid rgba(${colorRgb},0.3)`,
                minWidth: 100,
                textAlign: 'center',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={onClick}
            className={onClick ? 'clickable-flow-box' : ''}
        >
            <ThemeIcon size="lg" variant="light" color={color} radius="xl" mb={4}>
                {icon}
            </ThemeIcon>
            <Text size="xs" c="dimmed" fw={500}>{label}</Text>
            <Text size="lg" fw={700}>{value}/{capacity}</Text>
            {sublabel && <Text size="xs" c="dimmed">{sublabel}</Text>}
            <Progress value={Math.min(percentage, 100)} color={color} size="xs" radius="xl" mt={4} />
            {onClick && <Text size="xs" c="blue" mt={4}>Ver pacientes</Text>}
        </Paper>
    );
}

interface HospitalFlowCardProps {
    config: HospitalConfig;
    state: HospitalState | undefined;
    onClick: () => void;
    onFlowClick: (hospitalId: string, area: 'ventanilla' | 'triaje' | 'consulta') => void;
}

function HospitalFlowCard({ config, state, onClick, onFlowClick }: HospitalFlowCardProps) {
    const saturation = state?.nivel_saturacion ?? 0;
    const saturationPercent = Math.round(saturation * 100);

    const getStatusColor = () => {
        if (saturationPercent > 85) return 'red';
        if (saturationPercent > 70) return 'orange';
        if (saturationPercent > 50) return 'yellow';
        return 'green';
    };

    const getStatusLabel = () => {
        if (saturationPercent > 85) return 'CRÍTICO';
        if (saturationPercent > 70) return 'ALERTA';
        if (saturationPercent > 50) return 'ATENCIÓN';
        return 'NORMAL';
    };

    const ventanillasOcupadas = state?.ventanillas_ocupadas ?? 0;
    const boxesOcupados = state?.boxes_ocupados ?? 0;
    const colaTriaje = state?.cola_triaje ?? 0;
    const consultasOcupadas = state?.consultas_ocupadas ?? 0;
    const colaConsulta = state?.cola_consulta ?? 0;
    const atendidosHora = state?.pacientes_atendidos_hora ?? 0;

    return (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Card
                className="glass-card"
                style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}
            >
                {/* Header */}
                <Group justify="space-between" mb="md" style={{ cursor: 'pointer' }} onClick={onClick}>
                    <Group gap="sm">
                        <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }}>
                            <IconBuildingHospital size={24} />
                        </ThemeIcon>
                        <div>
                            <Text fw={600} size="lg">{config.nombre.split(' - ')[0]}</Text>
                            <Group gap={4}>
                                <Badge size="xs" variant="light" color="blue">{config.tipo.toUpperCase()}</Badge>
                                {config.escalable && <Badge size="xs" variant="outline" color="violet">Escalable</Badge>}
                            </Group>
                        </div>
                    </Group>
                    <Badge size="lg" color={getStatusColor()} variant="filled">{getStatusLabel()}</Badge>
                </Group>

                {/* Flujo Visual: Ventanilla → Triaje → Consulta */}
                <Box
                    p="md"
                    mb="md"
                    style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <Text size="xs" c="dimmed" mb="sm" ta="center" tt="uppercase" fw={600}>
                        Flujo de Pacientes (clic para ver detalle)
                    </Text>
                    <Group justify="center" gap={0} wrap="nowrap">
                        <FlowBox
                            icon={<IconDoor size={18} />}
                            label="Ventanilla"
                            value={ventanillasOcupadas}
                            capacity={config.ventanillas}
                            color="blue"
                            onClick={() => onFlowClick(config.id, 'ventanilla')}
                        />
                        <AnimatedArrow active={colaTriaje > 0} />
                        <FlowBox
                            icon={<IconHeartRateMonitor size={18} />}
                            label="Triaje"
                            value={boxesOcupados}
                            capacity={config.boxes_triaje}
                            color="orange"
                            sublabel={colaTriaje > 0 ? `+${colaTriaje} esperando` : undefined}
                            onClick={() => onFlowClick(config.id, 'triaje')}
                        />
                        <AnimatedArrow active={colaConsulta > 0} />
                        <FlowBox
                            icon={<IconStethoscope size={18} />}
                            label="Consulta"
                            value={consultasOcupadas}
                            capacity={config.consultas}
                            color="green"
                            sublabel={colaConsulta > 0 ? `+${colaConsulta} esperando` : undefined}
                            onClick={() => onFlowClick(config.id, 'consulta')}
                        />
                    </Group>
                </Box>

                {/* Métricas */}
                <Group justify="space-between" mt="sm">
                    <Box ta="center">
                        <Text size="lg" fw={700} c="green">{atendidosHora}/h</Text>
                        <Text size="xs" c="dimmed">Atendidos</Text>
                    </Box>
                    <Box ta="center">
                        <Text size="lg" fw={700} c={getStatusColor()}>{saturationPercent}%</Text>
                        <Text size="xs" c="dimmed">Saturación</Text>
                    </Box>
                    <Box ta="center">
                        <Text size="lg" fw={700} c="blue">{colaTriaje + colaConsulta}</Text>
                        <Text size="xs" c="dimmed">En espera</Text>
                    </Box>
                </Group>
                <Progress value={saturationPercent} color={getStatusColor()} size="md" radius="xl" mt="sm" />
            </Card>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}

function KPICard({ title, value, icon, color, subtitle }: KPICardProps) {
    return (
        <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
            <Group justify="space-between">
                <div>
                    <Text size="sm" c="dimmed">{title}</Text>
                    <Text size="xl" fw={700}>{value}</Text>
                    {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
                </div>
                <ThemeIcon size="xl" variant="light" color={color} radius="xl">{icon}</ThemeIcon>
            </Group>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const HOSPITAL_NAMES: Record<string, string> = {
    chuac: 'CHUAC',
    modelo: 'HM Modelo',
    san_rafael: 'San Rafael',
};

const AREA_NAMES: Record<string, string> = {
    ventanilla: 'Ventanilla',
    triaje: 'Triaje',
    consulta: 'Consulta',
};

export function DashboardPage() {
    const navigate = useNavigate();
    const hospitals = useHospitals();
    const derivaciones = useDerivaciones();
    const [opened, { open, close }] = useDisclosure(false);
    const [selectedArea, setSelectedArea] = useState<{ hospitalId: string; area: 'ventanilla' | 'triaje' | 'consulta' } | null>(null);
    const [viewMode, setViewMode] = useState<'flow' | '3d'>('flow');

    const { data: hospitalConfigs, isLoading } = useQuery({
        queryKey: ['hospitals'],
        queryFn: fetchHospitals,
    });

    const { data: chuacConsultas } = useChuacConsultas();

    const totalPatients = Object.values(hospitals).reduce((acc, h) => acc + (h.cola_triaje ?? 0) + (h.cola_consulta ?? 0), 0);
    const totalAttended = Object.values(hospitals).reduce((acc, h) => acc + (h.pacientes_atendidos_hora ?? 0), 0);
    const avgSaturation = Object.values(hospitals).length > 0
        ? Object.values(hospitals).reduce((acc, h) => acc + (h.nivel_saturacion ?? 0), 0) / Object.values(hospitals).length
        : 0;

    const handleFlowClick = (hospitalId: string, area: 'ventanilla' | 'triaje' | 'consulta') => {
        setSelectedArea({ hospitalId, area });
        open();
    };

    const getPatients = (): PatientInQueue[] => {
        if (!selectedArea) return [];
        const hospitalState = hospitals[selectedArea.hospitalId];
        if (!hospitalState) return [];

        switch (selectedArea.area) {
            case 'ventanilla':
                return hospitalState.pacientes_ventanilla || [];
            case 'triaje':
                return hospitalState.pacientes_triaje || [];
            case 'consulta':
                return hospitalState.pacientes_consulta || [];
            default:
                return [];
        }
    };

    if (isLoading) {
        return (
            <Stack gap="md">
                <Skeleton height={40} />
                <SimpleGrid cols={4}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={100} />)}</SimpleGrid>
                <SimpleGrid cols={3}>{[1, 2, 3].map((i) => <Skeleton key={i} height={300} />)}</SimpleGrid>
            </Stack>
        );
    }

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Title order={2}>Dashboard</Title>
                <Badge size="lg" variant="light" leftSection={<IconActivity size={14} />}>Datos en tiempo real</Badge>
            </Group>

            {/* KPIs */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                <KPICard title="Pacientes en Espera" value={totalPatients} icon={<IconUsers size={24} />} color="blue" subtitle="En todos los hospitales" />
                <KPICard title="Atendidos/Hora" value={totalAttended} icon={<IconTrendingUp size={24} />} color="green" subtitle="Última hora" />
                <KPICard title="Saturación Global" value={`${Math.round(avgSaturation * 100)}%`} icon={<IconActivity size={24} />} color={avgSaturation > 0.7 ? 'red' : avgSaturation > 0.5 ? 'orange' : 'green'} subtitle={avgSaturation > 0.7 ? 'Crítico' : 'Normal'} />
                <KPICard title="Derivaciones Activas" value={derivaciones.length} icon={<IconAlertTriangle size={24} />} color="orange" subtitle="Últimas 24h" />
            </SimpleGrid>

            {/* Hospitales con Flujo Visual o Vista 3D */}
            <Group justify="space-between" align="center" mt="md">
                <Title order={3}>
                    {viewMode === 'flow' ? 'Flujo de Atención' : 'Gemelo Digital 3D'}
                </Title>
                <SegmentedControl
                    value={viewMode}
                    onChange={(v) => setViewMode(v as 'flow' | '3d')}
                    data={[
                        {
                            label: (
                                <Group gap={6}>
                                    <IconLayoutList size={16} />
                                    <span>Flujo</span>
                                </Group>
                            ),
                            value: 'flow'
                        },
                        {
                            label: (
                                <Group gap={6}>
                                    <Icon3dCubeSphere size={16} />
                                    <span>3D</span>
                                </Group>
                            ),
                            value: '3d'
                        },
                    ]}
                    styles={{
                        root: {
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        },
                    }}
                />
            </Group>

            {viewMode === 'flow' ? (
                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
                    {hospitalConfigs?.hospitales.map((config) => (
                        <HospitalFlowCard
                            key={config.id}
                            config={config}
                            state={hospitals[config.id]}
                            onClick={() => navigate(`/hospitales/${config.id === 'san_rafael' ? 'san-rafael' : config.id}`)}
                            onFlowClick={handleFlowClick}
                        />
                    ))}
                </SimpleGrid>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <CSS3DHospitalScene consultasInfo={chuacConsultas} />
                </motion.div>
            )}

            {/* Modal de Pacientes */}
            <Modal
                opened={opened}
                onClose={close}
                title={
                    selectedArea && (
                        <Group>
                            <ThemeIcon color="blue" variant="light"><IconUsers size={18} /></ThemeIcon>
                            <Text fw={600}>
                                Pacientes en {AREA_NAMES[selectedArea.area]} - {HOSPITAL_NAMES[selectedArea.hospitalId]}
                            </Text>
                        </Group>
                    )
                }
                size="lg"
                styles={{
                    header: { background: cssVariables.glassBg },
                    content: { background: cssVariables.glassBg },
                }}
            >
                <ScrollArea h={300}>
                    {getPatients().length > 0 ? (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>ID</Table.Th>
                                    <Table.Th>Nombre</Table.Th>
                                    <Table.Th>Edad</Table.Th>
                                    <Table.Th>Patología</Table.Th>
                                    {selectedArea?.area !== 'ventanilla' && <Table.Th>Nivel</Table.Th>}
                                    {selectedArea?.area === 'consulta' && <Table.Th>Consulta</Table.Th>}
                                    <Table.Th>Tiempo</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {getPatients().map((p) => (
                                    <Table.Tr key={p.patient_id}>
                                        <Table.Td><Badge variant="light">{p.patient_id.slice(0, 8)}</Badge></Table.Td>
                                        <Table.Td>{p.nombre}</Table.Td>
                                        <Table.Td>{p.edad}</Table.Td>
                                        <Table.Td>{p.patologia.replace(/_/g, ' ')}</Table.Td>
                                        {selectedArea?.area !== 'ventanilla' && (
                                            <Table.Td>
                                                <Badge color={
                                                    p.nivel_triaje === 'rojo' ? 'red' :
                                                        p.nivel_triaje === 'naranja' ? 'orange' :
                                                            p.nivel_triaje === 'amarillo' ? 'yellow' : 'green'
                                                }>
                                                    {p.nivel_triaje?.toUpperCase() || '-'}
                                                </Badge>
                                            </Table.Td>
                                        )}
                                        {selectedArea?.area === 'consulta' && <Table.Td>#{p.consulta_id || '-'}</Table.Td>}
                                        <Table.Td>{p.tiempo_en_area.toFixed(1)} min</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    ) : (
                        <Text ta="center" c="dimmed" py="xl">No hay pacientes en esta área actualmente</Text>
                    )}
                </ScrollArea>
            </Modal>
        </Stack>
    );
}
