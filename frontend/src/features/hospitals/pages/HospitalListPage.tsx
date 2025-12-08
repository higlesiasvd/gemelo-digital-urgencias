// ═══════════════════════════════════════════════════════════════════════════════
// HOSPITAL LIST PAGE
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
    ThemeIcon,
    Paper,
    Table,
    Divider,
    Skeleton,
} from '@mantine/core';
import {
    IconBuildingHospital,
    IconChevronRight,
    IconActivity,
    IconStethoscope,
    IconNurse,
    IconUsers,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHospitals } from '@/shared/store';
import { fetchHospitals } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';
import type { HospitalConfig } from '@/shared/types';

interface HospitalDetailCardProps {
    config: HospitalConfig;
}

function HospitalDetailCard({ config }: HospitalDetailCardProps) {
    const navigate = useNavigate();
    const hospitalState = useHospitals()[config.id];
    const saturation = hospitalState?.nivel_saturacion ?? 0;
    const saturationPercent = Math.round(saturation * 100);

    const getStatusColor = () => {
        if (saturationPercent > 85) return 'red';
        if (saturationPercent > 70) return 'orange';
        if (saturationPercent > 50) return 'yellow';
        return 'green';
    };

    const personalBase = {
        celadores: config.ventanillas,
        enfermeras: config.boxes_triaje * 2 + config.consultas * 2,
        medicos: config.consultas,
    };

    const handleClick = () => {
        const route = config.id === 'san_rafael' ? 'san-rafael' : config.id;
        navigate(`/hospitales/${route}`);
    };

    return (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}`, cursor: 'pointer' }} onClick={handleClick}>
                <Group justify="space-between" mb="md">
                    <Group gap="md">
                        <ThemeIcon size={50} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }}>
                            <IconBuildingHospital size={28} />
                        </ThemeIcon>
                        <div>
                            <Text fw={700} size="xl">{config.nombre.split(' - ')[0]}</Text>
                            <Text size="sm" c="dimmed">{config.nombre.split(' - ')[1] || config.tipo}</Text>
                        </div>
                    </Group>
                    <Group gap="sm">
                        <Badge size="lg" color={getStatusColor()} variant="filled">{saturationPercent}% Saturación</Badge>
                        <IconChevronRight size={24} />
                    </Group>
                </Group>

                <Divider my="md" />

                <Text fw={600} mb="sm">Capacidad Física</Text>
                <Table mb="md">
                    <Table.Thead><Table.Tr><Table.Th>Componente</Table.Th><Table.Th>Cantidad</Table.Th><Table.Th>Personal/Unidad</Table.Th><Table.Th>Total Personal</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        <Table.Tr><Table.Td>Ventanillas</Table.Td><Table.Td><Badge>{config.ventanillas}</Badge></Table.Td><Table.Td>1 celador</Table.Td><Table.Td>{config.ventanillas} celadores</Table.Td></Table.Tr>
                        <Table.Tr><Table.Td>Boxes Triaje</Table.Td><Table.Td><Badge>{config.boxes_triaje}</Badge></Table.Td><Table.Td>2 enfermeras</Table.Td><Table.Td>{config.boxes_triaje * 2} enfermeras</Table.Td></Table.Tr>
                        <Table.Tr><Table.Td>Consultas</Table.Td><Table.Td><Badge>{config.consultas}</Badge></Table.Td><Table.Td>2 enfermeras + 1-{config.medicos_max_consulta} médicos</Table.Td><Table.Td>{config.consultas * 2} enf. + {config.consultas}-{config.consultas * config.medicos_max_consulta} méd.</Table.Td></Table.Tr>
                    </Table.Tbody>
                </Table>

                <SimpleGrid cols={3} mb="md">
                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Group gap="xs"><ThemeIcon size="sm" variant="light" color="blue"><IconUsers size={14} /></ThemeIcon><div><Text size="xs" c="dimmed">Celadores</Text><Text fw={600}>{personalBase.celadores}</Text></div></Group>
                    </Paper>
                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Group gap="xs"><ThemeIcon size="sm" variant="light" color="green"><IconNurse size={14} /></ThemeIcon><div><Text size="xs" c="dimmed">Enfermeras</Text><Text fw={600}>{personalBase.enfermeras}</Text></div></Group>
                    </Paper>
                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Group gap="xs"><ThemeIcon size="sm" variant="light" color="violet"><IconStethoscope size={14} /></ThemeIcon><div><Text size="xs" c="dimmed">Médicos</Text><Text fw={600}>{config.escalable ? `${config.consultas}-${config.consultas * config.medicos_max_consulta}` : personalBase.medicos}</Text></div></Group>
                    </Paper>
                </SimpleGrid>

                {config.escalable ? (
                    <Badge variant="gradient" gradient={{ from: 'violet', to: 'grape' }} fullWidth size="lg">✨ CHUAC: Escalable - Cada consulta puede tener 1-4 médicos (velocidad x1-x4)</Badge>
                ) : (
                    <Badge variant="light" color="gray" fullWidth size="lg">Capacidad fija - No escalable</Badge>
                )}
            </Card>
        </motion.div>
    );
}

export function HospitalListPage() {
    const { data: hospitalConfigs, isLoading } = useQuery({
        queryKey: ['hospitals'],
        queryFn: fetchHospitals,
    });

    if (isLoading) {
        return (<Stack gap="md"><Skeleton height={40} />{[1, 2, 3].map((i) => <Skeleton key={i} height={300} />)}</Stack>);
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Hospitales</Title>
                <Badge size="lg" variant="light" leftSection={<IconActivity size={14} />}>Capacidades reales del sistema</Badge>
            </Group>
            <Text c="dimmed" mb="md">Cada hospital tiene una capacidad física y de personal definida. El CHUAC es escalable mediante la asignación de médicos adicionales de la lista SERGAS.</Text>
            <Stack gap="lg">{hospitalConfigs?.hospitales.map((config) => <HospitalDetailCard key={config.id} config={config} />)}</Stack>
        </Stack>
    );
}
