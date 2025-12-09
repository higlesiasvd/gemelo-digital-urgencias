// ═══════════════════════════════════════════════════════════════════════════════
// DERIVACIONES PAGE - TRASLADOS ENTRE HOSPITALES (WITH FILTERS & AMBULANCE)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    ThemeIcon,
    Switch,
    Paper,
    SimpleGrid,
    Alert,
    Box,
    Progress,
    Select,
} from '@mantine/core';
import {
    IconArrowsExchange,
    IconAlertTriangle,
    IconAmbulance,
    IconClock,
    IconActivity,
    IconTrendingUp,
    IconFilter,
    IconUser,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDerivaciones } from '@/shared/store';
import { cssVariables } from '@/shared/theme';
import type { Derivacion } from '@/shared/types';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA WITH PATIENT NAMES
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DERIVACIONES: (Derivacion & { nombre_paciente?: string })[] = [
    {
        id: 1,
        paciente_id: 'P-2024-001',
        nombre_paciente: 'María García López',
        hospital_origen: 'chuac',
        hospital_destino: 'modelo',
        motivo: 'Saturación en urgencias - Derivación preventiva',
        nivel_urgencia: 'media',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
        id: 2,
        paciente_id: 'P-2024-002',
        nombre_paciente: 'Carlos Rodríguez Fernández',
        hospital_origen: 'chuac',
        hospital_destino: 'san_rafael',
        motivo: 'Paciente residente en zona comarcal',
        nivel_urgencia: 'baja',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        id: 3,
        paciente_id: 'P-2024-003',
        nombre_paciente: 'Ana Martínez Pérez',
        hospital_origen: 'modelo',
        hospital_destino: 'chuac',
        motivo: 'Requiere UCI - Transferencia urgente',
        nivel_urgencia: 'alta',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
        id: 4,
        paciente_id: 'P-2024-004',
        nombre_paciente: 'José Luis Vázquez',
        hospital_origen: 'san_rafael',
        hospital_destino: 'chuac',
        motivo: 'Cirugía especializada requerida',
        nivel_urgencia: 'alta',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
        id: 5,
        paciente_id: 'P-2024-005',
        nombre_paciente: 'Laura Sánchez Gómez',
        hospital_origen: 'modelo',
        hospital_destino: 'san_rafael',
        motivo: 'Rehabilitación postoperatoria',
        nivel_urgencia: 'baja',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const HOSPITAL_CONFIG: Record<string, { name: string; color: string }> = {
    chuac: { name: 'CHUAC', color: '#228be6' },
    modelo: { name: 'HM Modelo', color: '#fd7e14' },
    san_rafael: { name: 'San Rafael', color: '#40c057' },
};

const HOSPITAL_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'chuac', label: 'CHUAC' },
    { value: 'modelo', label: 'HM Modelo' },
    { value: 'san_rafael', label: 'San Rafael' },
];

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
    alta: { color: '#fa5252', label: 'URGENTE' },
    media: { color: '#fd7e14', label: 'MEDIA' },
    baja: { color: '#40c057', label: 'BAJA' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    total: number;
}

function StatCard({ title, value, icon, color, total }: StatCardProps) {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <Paper
            p="sm"
            radius="md"
            style={{
                background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
                border: `1px solid ${color}40`,
            }}
        >
            <Group gap="sm">
                <ThemeIcon size="lg" radius="md" style={{ background: color }}>
                    {icon}
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" tt="uppercase">{title}</Text>
                    <Text size="xl" fw={800} style={{ color }}>{value}</Text>
                </Box>
            </Group>
            <Progress value={percentage} color={color} size="xs" radius="xl" mt="xs" />
        </Paper>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED AMBULANCE
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedAmbulance({ color }: { color: string }) {
    return (
        <Box style={{ position: 'relative', width: 50, height: 20, overflow: 'hidden' }}>
            {/* Road line */}
            <Box
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 1,
                }}
            />
            {/* Ambulance moving */}
            <motion.div
                animate={{ x: [-10, 40, -10] }}
                transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    marginTop: -8,
                }}
            >
                <IconAmbulance size={16} style={{ color }} />
            </motion.div>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVACION ROW
// ═══════════════════════════════════════════════════════════════════════════════

interface DerivacionRowProps {
    derivacion: Derivacion & { nombre_paciente?: string };
    index: number;
}

function DerivacionRow({ derivacion, index }: DerivacionRowProps) {
    const urgencyConfig = URGENCY_CONFIG[derivacion.nivel_urgencia] || URGENCY_CONFIG.baja;
    const origenConfig = HOSPITAL_CONFIG[derivacion.hospital_origen];
    const destinoConfig = HOSPITAL_CONFIG[derivacion.hospital_destino];
    const timeAgo = getTimeAgo(derivacion.timestamp);

    return (
        <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            <Paper
                p="md"
                radius="md"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    borderLeft: `4px solid ${urgencyConfig.color}`,
                }}
            >
                {/* Top row: Patient name and urgency */}
                <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                        <ThemeIcon
                            size="md"
                            radius="xl"
                            style={{ background: urgencyConfig.color }}
                        >
                            <IconUser size={14} />
                        </ThemeIcon>
                        <Box>
                            {derivacion.nombre_paciente ? (
                                <>
                                    <Text size="md" fw={700}>
                                        {derivacion.nombre_paciente}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        ID: {derivacion.paciente_id}
                                    </Text>
                                </>
                            ) : (
                                <Text size="md" fw={700}>
                                    Paciente {derivacion.paciente_id}
                                </Text>
                            )}
                        </Box>
                    </Group>
                    <Group gap="xs">
                        <Badge size="sm" style={{ background: urgencyConfig.color }}>
                            {urgencyConfig.label}
                        </Badge>
                        <Badge variant="outline" color="gray" size="sm">
                            {timeAgo}
                        </Badge>
                    </Group>
                </Group>

                {/* Transfer visualization */}
                <Paper
                    p="xs"
                    radius="sm"
                    style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <Group justify="center" gap="md" wrap="nowrap">
                        <Badge
                            size="lg"
                            variant="light"
                            style={{
                                background: `${origenConfig?.color}20`,
                                color: origenConfig?.color,
                                border: `1px solid ${origenConfig?.color}50`,
                            }}
                        >
                            {origenConfig?.name || derivacion.hospital_origen}
                        </Badge>

                        <AnimatedAmbulance color={urgencyConfig.color} />

                        <Badge
                            size="lg"
                            variant="light"
                            style={{
                                background: `${destinoConfig?.color}20`,
                                color: destinoConfig?.color,
                                border: `1px solid ${destinoConfig?.color}50`,
                            }}
                        >
                            {destinoConfig?.name || derivacion.hospital_destino}
                        </Badge>
                    </Group>
                </Paper>

                {/* Motivo */}
                <Text size="sm" c="dimmed" mt="xs">
                    <Text span fw={500} c="white">Motivo: </Text>
                    {derivacion.motivo}
                </Text>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getTimeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DerivacionesPage() {
    const derivacionesReales = useDerivaciones();
    const [showDemo, setShowDemo] = useState(true);
    const [filterOrigen, setFilterOrigen] = useState<string>('');
    const [filterDestino, setFilterDestino] = useState<string>('');

    const allDerivaciones = derivacionesReales.length > 0
        ? derivacionesReales
        : (showDemo ? MOCK_DERIVACIONES : []);

    // Apply filters
    const derivaciones = useMemo(() => {
        return allDerivaciones.filter(d => {
            if (filterOrigen && d.hospital_origen !== filterOrigen) return false;
            if (filterDestino && d.hospital_destino !== filterDestino) return false;
            return true;
        });
    }, [allDerivaciones, filterOrigen, filterDestino]);

    const stats = useMemo(() => ({
        total: derivaciones.length,
        alta: derivaciones.filter((d) => d.nivel_urgencia === 'alta').length,
        media: derivaciones.filter((d) => d.nivel_urgencia === 'media').length,
        baja: derivaciones.filter((d) => d.nivel_urgencia === 'baja').length,
    }), [derivaciones]);

    return (
        <Stack gap="md">
            {/* Header */}
            <Group justify="space-between">
                <Group gap="sm">
                    <ThemeIcon
                        size="lg"
                        radius="xl"
                        variant="gradient"
                        gradient={{ from: 'orange', to: 'red', deg: 135 }}
                    >
                        <IconAmbulance size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={2} size="h3">Derivaciones</Title>
                        <Text size="xs" c="dimmed">Traslados entre hospitales</Text>
                    </Box>
                </Group>

                <Group gap="sm">
                    {derivacionesReales.length === 0 && (
                        <Switch
                            label="Demo"
                            checked={showDemo}
                            onChange={(e) => setShowDemo(e.currentTarget.checked)}
                            size="sm"
                        />
                    )}
                    <Badge
                        size="lg"
                        variant="gradient"
                        gradient={{ from: 'orange', to: 'red' }}
                        leftSection={<IconArrowsExchange size={14} />}
                    >
                        {derivaciones.length} activas
                    </Badge>
                </Group>
            </Group>

            {/* Demo Alert */}
            <AnimatePresence>
                {derivacionesReales.length === 0 && showDemo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Alert color="blue" variant="light" icon={<IconAmbulance size={16} />} radius="md" p="xs">
                            <Text size="xs">Datos de demostración. Las derivaciones reales aparecerán automáticamente.</Text>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters */}
            <Paper
                p="md"
                radius="md"
                style={{
                    background: 'linear-gradient(135deg, rgba(34,139,230,0.1) 0%, rgba(34,139,230,0.03) 100%)',
                    border: '1px solid rgba(34,139,230,0.2)',
                }}
            >
                <Group gap="lg" wrap="wrap">
                    <Group gap={8}>
                        <ThemeIcon size="sm" color="blue" variant="light" radius="xl">
                            <IconFilter size={12} />
                        </ThemeIcon>
                        <Text size="sm" fw={600} c="blue">Filtrar por hospital:</Text>
                    </Group>

                    <Group gap="md">
                        <Box>
                            <Text size="xs" c="dimmed" mb={4}>Origen</Text>
                            <Select
                                placeholder="Todos los hospitales"
                                data={HOSPITAL_OPTIONS}
                                value={filterOrigen}
                                onChange={(v) => setFilterOrigen(v || '')}
                                size="sm"
                                clearable
                                style={{ width: 180 }}
                            />
                        </Box>

                        <Box>
                            <Text size="xs" c="dimmed" mb={4}>Destino</Text>
                            <Select
                                placeholder="Todos los hospitales"
                                data={HOSPITAL_OPTIONS}
                                value={filterDestino}
                                onChange={(v) => setFilterDestino(v || '')}
                                size="sm"
                                clearable
                                style={{ width: 180 }}
                            />
                        </Box>
                    </Group>

                    {(filterOrigen || filterDestino) && (
                        <Badge size="lg" variant="filled" color="blue" radius="md">
                            Mostrando {derivaciones.length} de {allDerivaciones.length}
                        </Badge>
                    )}
                </Group>
            </Paper>

            {/* Stats Grid */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
                <StatCard
                    title="Total"
                    value={stats.total}
                    icon={<IconTrendingUp size={18} />}
                    color="#228be6"
                    total={stats.total}
                />
                <StatCard
                    title="Alta"
                    value={stats.alta}
                    icon={<IconAlertTriangle size={18} />}
                    color="#fa5252"
                    total={stats.total}
                />
                <StatCard
                    title="Media"
                    value={stats.media}
                    icon={<IconClock size={18} />}
                    color="#fd7e14"
                    total={stats.total}
                />
                <StatCard
                    title="Baja"
                    value={stats.baja}
                    icon={<IconActivity size={18} />}
                    color="#40c057"
                    total={stats.total}
                />
            </SimpleGrid>

            {/* Derivaciones List */}
            <Box>
                <Group gap="xs" mb="sm">
                    <IconArrowsExchange size={16} style={{ color: '#fd7e14' }} />
                    <Text size="sm" fw={600}>Historial de Traslados</Text>
                </Group>

                <Stack gap="sm">
                    <AnimatePresence>
                        {derivaciones.length > 0 ? (
                            derivaciones.map((d, i) => (
                                <DerivacionRow key={d.id} derivacion={d} index={i} />
                            ))
                        ) : (
                            <Card
                                p="xl"
                                radius="md"
                                style={{
                                    background: cssVariables.glassBg,
                                    border: `1px solid ${cssVariables.glassBorder}`,
                                    textAlign: 'center',
                                }}
                            >
                                <IconAmbulance size={32} style={{ color: '#868e96', marginBottom: 8 }} />
                                <Text size="sm" c="dimmed">
                                    {filterOrigen || filterDestino
                                        ? 'No hay derivaciones con estos filtros'
                                        : 'No hay derivaciones registradas'}
                                </Text>
                            </Card>
                        )}
                    </AnimatePresence>
                </Stack>
            </Box>
        </Stack>
    );
}
