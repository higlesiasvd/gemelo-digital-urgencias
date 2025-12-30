// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG PAGE - System Configuration (Redesigned)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    ThemeIcon,
    Switch,
    Slider,
    Divider,
    Badge,
    Button,
    Box,
    Alert,
    SegmentedControl,
    SimpleGrid,
    Paper,
    Loader,
    Grid,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconSettings,
    IconClock,
    IconCheck,
    IconAlertCircle,
    IconFileTypePdf,
    IconDownload,
    IconCalendarWeek,
    IconCalendarMonth,
    IconCalendarStats,
    IconGauge,
    IconBell,
    IconMoon,
    IconRefresh,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { motion } from 'framer-motion';
import { cssVariables } from '@/shared/theme';

// Speed presets with descriptions
const SPEED_MARKS = [
    { value: 1, label: '1x' },
    { value: 10, label: '10x' },
    { value: 30, label: '30x' },
    { value: 60, label: '60x' },
];

const SPEED_DESCRIPTIONS: Record<number, string> = {
    1: 'Tiempo real: Ventanilla 2 min, Triaje 5 min',
    10: 'Rápido: Ventanilla 12 seg, Triaje 30 seg',
    30: 'Muy rápido: Ventanilla 4 seg, Triaje 10 seg',
    60: 'Ultra rápido: 1 hora real = 1 hora simulada',
};

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

export function ConfigPage() {
    const [speed, setSpeed] = useState<number>(10);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ running: boolean; speed: number } | null>(null);

    // Report export state
    const [reportType, setReportType] = useState<string>('weekly');
    const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch current status on mount
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/simulation/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                setSpeed(data.speed || 10);
            }
        } catch (error) {
            console.error('Error fetching simulation status:', error);
        }
    };

    const handleSpeedChange = async (newSpeed: number) => {
        setSpeed(newSpeed);
    };

    const applySpeed = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/simulation/speed`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speed }),
                }
            );

            if (res.ok) {
                notifications.show({
                    title: 'Velocidad actualizada',
                    message: `Simulación ahora corre a ${speed}x`,
                    color: 'green',
                    icon: <IconCheck size={16} />,
                });
                setStatus(prev => prev ? { ...prev, speed } : null);
            } else {
                throw new Error('Error al cambiar velocidad');
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo cambiar la velocidad del simulador',
                color: 'red',
                icon: <IconAlertCircle size={16} />,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getSpeedDescription = (s: number) => {
        if (s <= 1) return SPEED_DESCRIPTIONS[1];
        if (s <= 10) return SPEED_DESCRIPTIONS[10];
        if (s <= 30) return SPEED_DESCRIPTIONS[30];
        return SPEED_DESCRIPTIONS[60];
    };

    const downloadReport = async () => {
        setIsGenerating(true);
        try {
            let url = '';
            let filename = '';

            if (reportType === 'weekly') {
                url = `${API_URL}/reports/weekly`;
                filename = `informe_semanal_${new Date().toISOString().split('T')[0]}.pdf`;
            } else if (reportType === 'monthly') {
                url = `${API_URL}/reports/monthly`;
                filename = `informe_mensual_${new Date().toISOString().slice(0, 7)}.pdf`;
            } else if (reportType === 'custom' && customDateRange[0] && customDateRange[1]) {
                const start = customDateRange[0].toISOString().split('T')[0];
                const end = customDateRange[1].toISOString().split('T')[0];
                url = `${API_URL}/reports/custom?start=${start}&end=${end}`;
                filename = `informe_${start}_${end}.pdf`;
            } else {
                notifications.show({
                    title: 'Selecciona fechas',
                    message: 'Por favor selecciona un rango de fechas para el informe personalizado',
                    color: 'yellow',
                });
                setIsGenerating(false);
                return;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error al generar el informe');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            notifications.show({
                title: 'Informe generado',
                message: `${filename} descargado correctamente`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo generar el informe PDF',
                color: 'red',
                icon: <IconAlertCircle size={16} />,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Stack gap="xl" p="md">
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* HEADER */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card
                    style={{
                        background: 'linear-gradient(135deg, rgba(13, 110, 189, 0.2) 0%, rgba(0, 196, 220, 0.15) 100%)',
                        border: `1px solid ${cssVariables.glassBorder}`,
                    }}
                    p="lg"
                >
                    <Group justify="space-between" align="center">
                        <Group gap="md">
                            <ThemeIcon
                                size={56}
                                variant="gradient"
                                gradient={{ from: 'blue', to: 'cyan' }}
                                radius="xl"
                            >
                                <IconSettings size={30} />
                            </ThemeIcon>
                            <Box>
                                <Title order={2}>Configuración del Sistema</Title>
                                <Text c="dimmed" size="sm">
                                    Ajusta los parámetros de simulación y exporta informes
                                </Text>
                            </Box>
                        </Group>
                        {status?.running && (
                            <Badge
                                size="xl"
                                variant="dot"
                                color="green"
                                styles={{ root: { textTransform: 'none' } }}
                            >
                                Simulación activa • {status.speed}x
                            </Badge>
                        )}
                    </Group>
                </Card>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MAIN GRID - 2 COLUMNS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Grid gutter="lg">
                {/* ─────────────────────────────────────────────────────────────── */}
                {/* LEFT COLUMN - Simulation Speed */}
                {/* ─────────────────────────────────────────────────────────────── */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        style={{ height: '100%' }}
                    >
                        <Card
                            h="100%"
                            style={{
                                background: cssVariables.glassBg,
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Stack gap="lg">
                                {/* Card Header */}
                                <Group justify="space-between" align="flex-start">
                                    <Group gap="md">
                                        <ThemeIcon
                                            size={48}
                                            variant="gradient"
                                            gradient={{ from: 'blue', to: 'cyan' }}
                                            radius="xl"
                                        >
                                            <IconGauge size={26} />
                                        </ThemeIcon>
                                        <Box>
                                            <Title order={4}>Velocidad de Simulación</Title>
                                            <Text c="dimmed" size="sm">
                                                Controla el flujo de pacientes
                                            </Text>
                                        </Box>
                                    </Group>
                                    <Badge
                                        size="xl"
                                        variant="gradient"
                                        gradient={{ from: 'blue', to: 'cyan' }}
                                        styles={{ root: { fontSize: '1.1rem', padding: '0.75rem 1rem' } }}
                                    >
                                        {speed}x
                                    </Badge>
                                </Group>

                                <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                                {/* Slider */}
                                <Paper
                                    p="lg"
                                    radius="md"
                                    style={{ background: 'rgba(0,0,0,0.15)' }}
                                >
                                    <Box px="xs" py="md">
                                        <Slider
                                            value={speed}
                                            onChange={handleSpeedChange}
                                            min={1}
                                            max={60}
                                            step={1}
                                            marks={SPEED_MARKS}
                                            label={(val) => `${val}x`}
                                            size="lg"
                                            styles={{
                                                mark: { display: 'none' },
                                                markLabel: { fontSize: 13, marginTop: 10 },
                                                thumb: { borderWidth: 3 },
                                            }}
                                        />
                                    </Box>
                                </Paper>

                                {/* Speed Description */}
                                <Alert
                                    variant="light"
                                    color="blue"
                                    icon={<IconClock size={20} />}
                                    radius="md"
                                    styles={{ root: { background: 'rgba(34,139,230,0.12)' } }}
                                >
                                    <Text size="sm" fw={500}>{getSpeedDescription(speed)}</Text>
                                </Alert>

                                {/* Apply Button */}
                                <Button
                                    onClick={applySpeed}
                                    loading={isLoading}
                                    leftSection={<IconCheck size={18} />}
                                    variant="gradient"
                                    gradient={{ from: 'blue', to: 'cyan' }}
                                    size="md"
                                    radius="md"
                                    fullWidth
                                >
                                    Aplicar velocidad
                                </Button>
                            </Stack>
                        </Card>
                    </motion.div>
                </Grid.Col>

                {/* ─────────────────────────────────────────────────────────────── */}
                {/* RIGHT COLUMN - System Settings */}
                {/* ─────────────────────────────────────────────────────────────── */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                        style={{ height: '100%' }}
                    >
                        <Card
                            h="100%"
                            style={{
                                background: cssVariables.glassBg,
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Stack gap="lg">
                                {/* Card Header */}
                                <Group gap="md">
                                    <ThemeIcon
                                        size={48}
                                        variant="gradient"
                                        gradient={{ from: 'gray.6', to: 'gray.8' }}
                                        radius="xl"
                                    >
                                        <IconSettings size={26} />
                                    </ThemeIcon>
                                    <Box>
                                        <Title order={4}>Ajustes del Sistema</Title>
                                        <Text c="dimmed" size="sm">
                                            Preferencias generales
                                        </Text>
                                    </Box>
                                </Group>

                                <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                                {/* Settings List */}
                                <Stack gap="sm">
                                    <Paper
                                        p="md"
                                        radius="md"
                                        style={{ background: 'rgba(0,0,0,0.15)' }}
                                    >
                                        <Group justify="space-between">
                                            <Group gap="sm">
                                                <ThemeIcon size={32} variant="light" color="orange" radius="md">
                                                    <IconBell size={18} />
                                                </ThemeIcon>
                                                <Box>
                                                    <Text fw={500} size="sm">Notificaciones</Text>
                                                    <Text size="xs" c="dimmed">Alertas de incidentes</Text>
                                                </Box>
                                            </Group>
                                            <Switch defaultChecked size="md" />
                                        </Group>
                                    </Paper>

                                    <Paper
                                        p="md"
                                        radius="md"
                                        style={{ background: 'rgba(0,0,0,0.15)' }}
                                    >
                                        <Group justify="space-between">
                                            <Group gap="sm">
                                                <ThemeIcon size={32} variant="light" color="violet" radius="md">
                                                    <IconMoon size={18} />
                                                </ThemeIcon>
                                                <Box>
                                                    <Text fw={500} size="sm">Modo oscuro</Text>
                                                    <Text size="xs" c="dimmed">Tema visual</Text>
                                                </Box>
                                            </Group>
                                            <Switch defaultChecked disabled size="md" />
                                        </Group>
                                    </Paper>

                                    <Paper
                                        p="md"
                                        radius="md"
                                        style={{ background: 'rgba(0,0,0,0.15)' }}
                                    >
                                        <Group justify="space-between">
                                            <Group gap="sm">
                                                <ThemeIcon size={32} variant="light" color="teal" radius="md">
                                                    <IconRefresh size={18} />
                                                </ThemeIcon>
                                                <Box>
                                                    <Text fw={500} size="sm">Auto-actualización</Text>
                                                    <Text size="xs" c="dimmed">Datos en tiempo real</Text>
                                                </Box>
                                            </Group>
                                            <Switch defaultChecked size="md" />
                                        </Group>
                                    </Paper>
                                </Stack>

                                {/* App Info */}
                                <Paper
                                    p="md"
                                    radius="md"
                                    mt="auto"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 196, 220, 0.08) 100%)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    <Group justify="space-between" align="center">
                                        <Box>
                                            <Text fw={600}>HealthVerse Coruña</Text>
                                            <Text size="xs" c="dimmed">Gemelo Digital Hospitalario</Text>
                                        </Box>
                                        <Badge variant="light" color="blue" size="lg">v2.0</Badge>
                                    </Group>
                                </Paper>
                            </Stack>
                        </Card>
                    </motion.div>
                </Grid.Col>
            </Grid>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* REPORTS CARD - Full Width */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <Card
                    style={{
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                        border: `1px solid rgba(139, 92, 246, 0.25)`,
                    }}
                >
                    <Grid gutter="xl" align="stretch">
                        {/* Left Side - Info */}
                        <Grid.Col span={{ base: 12, md: 5 }}>
                            <Stack gap="md" h="100%" justify="center">
                                <Group gap="md">
                                    <ThemeIcon
                                        size={56}
                                        variant="gradient"
                                        gradient={{ from: 'violet', to: 'grape' }}
                                        radius="xl"
                                    >
                                        <IconFileTypePdf size={30} />
                                    </ThemeIcon>
                                    <Box>
                                        <Title order={3}>Exportar Informes</Title>
                                        <Text c="dimmed" size="sm">
                                            Genera informes PDF profesionales
                                        </Text>
                                    </Box>
                                </Group>

                                <SimpleGrid cols={3} spacing="sm" mt="md">
                                    <Paper
                                        p="sm"
                                        radius="md"
                                        style={{
                                            background: 'rgba(139, 92, 246, 0.15)',
                                            border: '1px solid rgba(139, 92, 246, 0.25)',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Text size="lg" mb={2}>📊</Text>
                                        <Text size="xs" fw={600}>KPIs</Text>
                                    </Paper>
                                    <Paper
                                        p="sm"
                                        radius="md"
                                        style={{
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            border: '1px solid rgba(59, 130, 246, 0.25)',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Text size="lg" mb={2}>📈</Text>
                                        <Text size="xs" fw={600}>Gráficos</Text>
                                    </Paper>
                                    <Paper
                                        p="sm"
                                        radius="md"
                                        style={{
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Text size="lg" mb={2}>🏥</Text>
                                        <Text size="xs" fw={600}>Tablas</Text>
                                    </Paper>
                                </SimpleGrid>
                            </Stack>
                        </Grid.Col>

                        {/* Divider */}
                        <Grid.Col span={{ base: 12, md: 1 }} visibleFrom="md">
                            <Divider
                                orientation="vertical"
                                h="100%"
                                style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 0 }} hiddenFrom="md">
                            <Divider my="md" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }} />
                        </Grid.Col>

                        {/* Right Side - Controls */}
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Stack gap="md">
                                {/* Report Type Selector */}
                                <Box>
                                    <Text size="sm" fw={500} mb="xs" c="dimmed">
                                        Tipo de informe
                                    </Text>
                                    <SegmentedControl
                                        value={reportType}
                                        onChange={setReportType}
                                        fullWidth
                                        size="md"
                                        data={[
                                            {
                                                value: 'weekly',
                                                label: (
                                                    <Group gap="xs" justify="center">
                                                        <IconCalendarWeek size={18} />
                                                        <Text size="sm" fw={500}>Semanal</Text>
                                                    </Group>
                                                ),
                                            },
                                            {
                                                value: 'monthly',
                                                label: (
                                                    <Group gap="xs" justify="center">
                                                        <IconCalendarMonth size={18} />
                                                        <Text size="sm" fw={500}>Mensual</Text>
                                                    </Group>
                                                ),
                                            },
                                            {
                                                value: 'custom',
                                                label: (
                                                    <Group gap="xs" justify="center">
                                                        <IconCalendarStats size={18} />
                                                        <Text size="sm" fw={500}>Personalizado</Text>
                                                    </Group>
                                                ),
                                            },
                                        ]}
                                        styles={{
                                            root: { background: 'rgba(0,0,0,0.25)', borderRadius: 10 },
                                        }}
                                    />
                                </Box>

                                {/* Custom Date Range */}
                                {reportType === 'custom' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <DatePickerInput
                                            type="range"
                                            label="Rango de fechas"
                                            placeholder="Selecciona inicio y fin"
                                            value={customDateRange}
                                            onChange={setCustomDateRange}
                                            maxDate={new Date()}
                                            size="md"
                                            styles={{ input: { background: 'rgba(0,0,0,0.2)' } }}
                                        />
                                    </motion.div>
                                )}

                                {/* Info Alert */}
                                <Alert
                                    variant="light"
                                    color="violet"
                                    icon={<IconFileTypePdf size={18} />}
                                    radius="md"
                                    styles={{ root: { background: 'rgba(139, 92, 246, 0.12)' } }}
                                >
                                    <Text size="sm">
                                        {reportType === 'weekly' && 'Métricas de los últimos 7 días.'}
                                        {reportType === 'monthly' && 'Métricas de los últimos 30 días.'}
                                        {reportType === 'custom' && 'Selecciona un rango de fechas.'}
                                    </Text>
                                </Alert>

                                {/* Download Button */}
                                <Button
                                    onClick={downloadReport}
                                    loading={isGenerating}
                                    leftSection={isGenerating ? <Loader size={18} color="white" /> : <IconDownload size={18} />}
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'grape' }}
                                    size="lg"
                                    radius="md"
                                    fullWidth
                                    disabled={reportType === 'custom' && (!customDateRange[0] || !customDateRange[1])}
                                >
                                    {isGenerating ? 'Generando informe...' : 'Descargar PDF'}
                                </Button>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Card>
            </motion.div>
        </Stack>
    );
}
