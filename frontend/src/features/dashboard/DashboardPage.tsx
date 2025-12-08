// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE - CON FLUJO VISUAL
// ═══════════════════════════════════════════════════════════════════════════════

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
} from '@mantine/core';
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
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHospitals, useDerivaciones } from '@/shared/store';
import { fetchHospitals } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';
import type { HospitalConfig, HospitalState } from '@/shared/types';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DE FLECHA ANIMADA
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedArrow({ active = true }: { active?: boolean }) {
    return (
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
            <motion.div
                animate={active ? { x: [0, 5, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
            >
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
}

function FlowBox({ icon, label, value, capacity, color, sublabel }: FlowBoxProps) {
    const valueNum = typeof value === 'number' ? value : 0;
    const capacityNum = typeof capacity === 'number' ? capacity : 0;
    const percentage = capacityNum > 0 ? (valueNum / capacityNum) * 100 : 0;

    return (
        <Paper
            p="sm"
            radius="md"
            style={{
                background: `linear-gradient(135deg, rgba(${color === 'blue' ? '34,139,230' : color === 'orange' ? '255,159,64' : '64,192,87'},0.2) 0%, rgba(${color === 'blue' ? '34,139,230' : color === 'orange' ? '255,159,64' : '64,192,87'},0.05) 100%)`,
                border: `1px solid rgba(${color === 'blue' ? '34,139,230' : color === 'orange' ? '255,159,64' : '64,192,87'},0.3)`,
                minWidth: 100,
                textAlign: 'center',
            }}
        >
            <ThemeIcon size="lg" variant="light" color={color} radius="xl" mb={4}>
                {icon}
            </ThemeIcon>
            <Text size="xs" c="dimmed" fw={500}>{label}</Text>
            <Text size="lg" fw={700}>{value}/{capacity}</Text>
            {sublabel && <Text size="xs" c="dimmed">{sublabel}</Text>}
            <Progress value={Math.min(percentage, 100)} color={color} size="xs" radius="xl" mt={4} />
        </Paper>
    );
}

interface HospitalFlowCardProps {
    config: HospitalConfig;
    state: HospitalState | undefined;
    onClick: () => void;
}

function HospitalFlowCard({ config, state, onClick }: HospitalFlowCardProps) {
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

    // Datos del flujo
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
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    cursor: 'pointer',
                }}
                onClick={onClick}
            >
                {/* Header */}
                <Group justify="space-between" mb="md">
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
                    style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <Text size="xs" c="dimmed" mb="sm" ta="center" tt="uppercase" fw={600}>
                        Flujo de Pacientes
                    </Text>
                    <Group justify="center" gap={0} wrap="nowrap">
                        {/* Ventanilla/Entrada */}
                        <FlowBox
                            icon={<IconDoor size={18} />}
                            label="Ventanilla"
                            value={ventanillasOcupadas}
                            capacity={config.ventanillas}
                            color="blue"
                        />

                        <AnimatedArrow active={colaTriaje > 0} />

                        {/* Triaje */}
                        <FlowBox
                            icon={<IconHeartRateMonitor size={18} />}
                            label="Triaje"
                            value={boxesOcupados}
                            capacity={config.boxes_triaje}
                            color="orange"
                            sublabel={colaTriaje > 0 ? `+${colaTriaje} esperando` : undefined}
                        />

                        <AnimatedArrow active={colaConsulta > 0} />

                        {/* Consulta */}
                        <FlowBox
                            icon={<IconStethoscope size={18} />}
                            label="Consulta"
                            value={consultasOcupadas}
                            capacity={config.consultas}
                            color="green"
                            sublabel={colaConsulta > 0 ? `+${colaConsulta} esperando` : undefined}
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
                        <Text size="lg" fw={700} c="blue">{(colaTriaje + colaConsulta)}</Text>
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

export function DashboardPage() {
    const navigate = useNavigate();
    const hospitals = useHospitals();
    const derivaciones = useDerivaciones();

    const { data: hospitalConfigs, isLoading } = useQuery({
        queryKey: ['hospitals'],
        queryFn: fetchHospitals,
    });

    const totalPatients = Object.values(hospitals).reduce((acc, h) => acc + (h.cola_triaje ?? 0) + (h.cola_consulta ?? 0), 0);
    const totalAttended = Object.values(hospitals).reduce((acc, h) => acc + (h.pacientes_atendidos_hora ?? 0), 0);
    const avgSaturation = Object.values(hospitals).length > 0
        ? Object.values(hospitals).reduce((acc, h) => acc + (h.nivel_saturacion ?? 0), 0) / Object.values(hospitals).length
        : 0;

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

            {/* Hospitales con Flujo Visual */}
            <Title order={3} mt="md">Flujo de Atención por Hospital</Title>
            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
                {hospitalConfigs?.hospitales.map((config) => (
                    <HospitalFlowCard
                        key={config.id}
                        config={config}
                        state={hospitals[config.id]}
                        onClick={() => navigate(`/hospitales/${config.id === 'san_rafael' ? 'san-rafael' : config.id}`)}
                    />
                ))}
            </SimpleGrid>
        </Stack>
    );
}
