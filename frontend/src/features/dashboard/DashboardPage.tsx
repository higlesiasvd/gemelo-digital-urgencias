// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
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
    IconTemperature,
    IconCalendarEvent,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHospitals, useContexto, useDerivaciones } from '@/shared/store';
import { fetchHospitals } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';
import type { HospitalConfig, HospitalState } from '@/shared/types';

interface HospitalCardProps {
    config: HospitalConfig;
    state: HospitalState | undefined;
    onClick: () => void;
}

function HospitalCard({ config, state, onClick }: HospitalCardProps) {
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

    return (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick} style={{ cursor: 'pointer' }}>
            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group justify="space-between" mb="md">
                    <Group gap="sm">
                        <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }}>
                            <IconBuildingHospital size={24} />
                        </ThemeIcon>
                        <div>
                            <Text fw={600} size="lg">{config.nombre.split(' - ')[0]}</Text>
                            <Badge size="xs" variant="light" color="blue">{config.tipo.toUpperCase()}</Badge>
                        </div>
                    </Group>
                    <Badge size="lg" color={getStatusColor()} variant="filled">{getStatusLabel()}</Badge>
                </Group>

                <SimpleGrid cols={2} spacing="xs" mb="md">
                    <Paper p="xs" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text size="xs" c="dimmed">Ventanillas</Text>
                        <Text fw={600}>{config.ventanillas}</Text>
                    </Paper>
                    <Paper p="xs" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text size="xs" c="dimmed">Boxes Triaje</Text>
                        <Text fw={600}>{config.boxes_triaje}</Text>
                    </Paper>
                    <Paper p="xs" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text size="xs" c="dimmed">Consultas</Text>
                        <Text fw={600}>{config.consultas}</Text>
                    </Paper>
                    <Paper p="xs" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text size="xs" c="dimmed">Max Médicos/Cons.</Text>
                        <Text fw={600}>{config.medicos_max_consulta}</Text>
                    </Paper>
                </SimpleGrid>

                <Box mb="sm">
                    <Group justify="space-between" mb={4}>
                        <Text size="sm" c="dimmed">Saturación</Text>
                        <Text size="sm" fw={600} c={getStatusColor()}>{saturationPercent}%</Text>
                    </Group>
                    <Progress value={saturationPercent} color={getStatusColor()} size="lg" radius="xl" />
                </Box>

                <SimpleGrid cols={3} spacing="xs">
                    <Box ta="center">
                        <Text size="lg" fw={700} c="blue">{state?.boxes_ocupados ?? 0}/{config.boxes_triaje}</Text>
                        <Text size="xs" c="dimmed">Boxes</Text>
                    </Box>
                    <Box ta="center">
                        <Text size="lg" fw={700} c="orange">{state?.cola_triaje ?? 0}</Text>
                        <Text size="xs" c="dimmed">En espera</Text>
                    </Box>
                    <Box ta="center">
                        <Text size="lg" fw={700} c="green">{state?.pacientes_atendidos_hora ?? 0}/h</Text>
                        <Text size="xs" c="dimmed">Atendidos</Text>
                    </Box>
                </SimpleGrid>

                {config.escalable && (
                    <Badge mt="sm" variant="outline" color="violet" fullWidth>
                        ✨ Escalable hasta {config.medicos_max_consulta} médicos/consulta
                    </Badge>
                )}
            </Card>
        </motion.div>
    );
}

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

export function DashboardPage() {
    const navigate = useNavigate();
    const hospitals = useHospitals();
    const contexto = useContexto();
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

            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                <KPICard title="Pacientes en Espera" value={totalPatients} icon={<IconUsers size={24} />} color="blue" subtitle="En todos los hospitales" />
                <KPICard title="Atendidos/Hora" value={totalAttended} icon={<IconTrendingUp size={24} />} color="green" subtitle="Última hora" />
                <KPICard title="Saturación Global" value={`${Math.round(avgSaturation * 100)}%`} icon={<IconActivity size={24} />} color={avgSaturation > 0.7 ? 'red' : avgSaturation > 0.5 ? 'orange' : 'green'} subtitle={avgSaturation > 0.7 ? 'Crítico' : 'Normal'} />
                <KPICard title="Derivaciones Activas" value={derivaciones.length} icon={<IconAlertTriangle size={24} />} color="orange" subtitle="Últimas 24h" />
            </SimpleGrid>

            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group>
                    <ThemeIcon size="lg" variant="light" color="blue"><IconTemperature size={20} /></ThemeIcon>
                    <Text>
                        <strong>Contexto:</strong> {contexto.temperatura ? `${contexto.temperatura}°C` : '--'} | {contexto.condicion_climatica || 'Despejado'} | Factor eventos: x{contexto.factor_eventos.toFixed(1)}{' '}
                        {contexto.es_festivo && <Badge size="sm" color="violet" leftSection={<IconCalendarEvent size={12} />}>Festivo</Badge>}
                    </Text>
                </Group>
            </Card>

            <Title order={3} mt="md">Hospitales</Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {hospitalConfigs?.hospitales.map((config) => (
                    <HospitalCard
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
