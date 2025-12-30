// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG PAGE - System Configuration
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
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconSettings,
    IconPlayerPlay,
    IconClock,
    IconCheck,
    IconAlertCircle,
    IconFileTypePdf,
    IconDownload,
    IconCalendarWeek,
    IconCalendarMonth,
    IconCalendarStats,
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
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Configuración</Title>
                {status?.running && (
                    <Badge color="green" size="lg" leftSection={<IconPlayerPlay size={14} />}>
                        Simulación activa
                    </Badge>
                )}
            </Group>

            {/* Report Export Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card
                    style={{
                        background: 'linear-gradient(135deg, rgba(34, 139, 230, 0.15) 0%, rgba(18, 184, 134, 0.1) 100%)',
                        border: `1px solid ${cssVariables.glassBorder}`,
                    }}
                >
                    <Group gap="md" mb="lg">
                        <ThemeIcon
                            size={50}
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'grape' }}
                            radius="xl"
                        >
                            <IconFileTypePdf size={28} />
                        </ThemeIcon>
                        <Box>
                            <Title order={3}>Exportación de Informes</Title>
                            <Text c="dimmed" size="sm">
                                Genera informes PDF con métricas visuales
                            </Text>
                        </Box>
                    </Group>

                    <Stack gap="md">
                        <SegmentedControl
                            value={reportType}
                            onChange={setReportType}
                            fullWidth
                            data={[
                                {
                                    value: 'weekly',
                                    label: (
                                        <Group gap="xs" justify="center">
                                            <IconCalendarWeek size={16} />
                                            <Text size="sm">Semanal</Text>
                                        </Group>
                                    ),
                                },
                                {
                                    value: 'monthly',
                                    label: (
                                        <Group gap="xs" justify="center">
                                            <IconCalendarMonth size={16} />
                                            <Text size="sm">Mensual</Text>
                                        </Group>
                                    ),
                                },
                                {
                                    value: 'custom',
                                    label: (
                                        <Group gap="xs" justify="center">
                                            <IconCalendarStats size={16} />
                                            <Text size="sm">Personalizado</Text>
                                        </Group>
                                    ),
                                },
                            ]}
                            styles={{
                                root: { background: 'rgba(0,0,0,0.2)' },
                            }}
                        />

                        {reportType === 'custom' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.2 }}
                            >
                                <DatePickerInput
                                    type="range"
                                    label="Rango de fechas"
                                    placeholder="Selecciona inicio y fin"
                                    value={customDateRange}
                                    onChange={setCustomDateRange}
                                    maxDate={new Date()}
                                    styles={{
                                        input: { background: 'rgba(0,0,0,0.2)' },
                                    }}
                                />
                            </motion.div>
                        )}

                        <SimpleGrid cols={3} spacing="sm">
                            <Paper
                                p="sm"
                                radius="md"
                                style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}
                            >
                                <Text size="xs" c="dimmed">Incluye</Text>
                                <Text size="sm" fw={500}>📊 KPIs</Text>
                            </Paper>
                            <Paper
                                p="sm"
                                radius="md"
                                style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}
                            >
                                <Text size="xs" c="dimmed">Incluye</Text>
                                <Text size="sm" fw={500}>📈 Gráficos</Text>
                            </Paper>
                            <Paper
                                p="sm"
                                radius="md"
                                style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}
                            >
                                <Text size="xs" c="dimmed">Incluye</Text>
                                <Text size="sm" fw={500}>🏥 Tablas</Text>
                            </Paper>
                        </SimpleGrid>

                        <Alert
                            variant="light"
                            color="violet"
                            icon={<IconFileTypePdf size={16} />}
                            style={{ background: 'rgba(121,80,242,0.1)' }}
                        >
                            <Text size="sm">
                                {reportType === 'weekly' && 'El informe incluirá métricas de los últimos 7 días.'}
                                {reportType === 'monthly' && 'El informe incluirá métricas de los últimos 30 días.'}
                                {reportType === 'custom' && 'Selecciona un rango de fechas para generar el informe.'}
                            </Text>
                        </Alert>

                        <Group justify="flex-end">
                            <Button
                                onClick={downloadReport}
                                loading={isGenerating}
                                leftSection={isGenerating ? <Loader size={16} /> : <IconDownload size={16} />}
                                variant="gradient"
                                gradient={{ from: 'violet', to: 'grape' }}
                                size="md"
                                disabled={reportType === 'custom' && (!customDateRange[0] || !customDateRange[1])}
                            >
                                {isGenerating ? 'Generando...' : 'Descargar PDF'}
                            </Button>
                        </Group>
                    </Stack>
                </Card>
            </motion.div>

            {/* Simulation Speed Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <Card
                    style={{
                        background: cssVariables.glassBg,
                        border: `1px solid ${cssVariables.glassBorder}`,
                    }}
                >
                    <Group gap="md" mb="lg">
                        <ThemeIcon
                            size={50}
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                            radius="xl"
                        >
                            <IconClock size={28} />
                        </ThemeIcon>
                        <Box>
                            <Title order={3}>Velocidad de Simulación</Title>
                            <Text c="dimmed" size="sm">
                                Controla qué tan rápido fluyen los pacientes
                            </Text>
                        </Box>
                        <Badge
                            ml="auto"
                            size="xl"
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                        >
                            {speed}x
                        </Badge>
                    </Group>

                    <Stack gap="md">
                        <Box px="md">
                            <Slider
                                value={speed}
                                onChange={handleSpeedChange}
                                min={1}
                                max={60}
                                step={1}
                                marks={SPEED_MARKS}
                                label={(val) => `${val}x`}
                                styles={{
                                    mark: { display: 'none' },
                                    markLabel: { fontSize: 12 },
                                }}
                            />
                        </Box>

                        <Alert
                            variant="light"
                            color="blue"
                            icon={<IconPlayerPlay size={16} />}
                            style={{ background: 'rgba(34,139,230,0.1)' }}
                        >
                            <Text size="sm">{getSpeedDescription(speed)}</Text>
                        </Alert>

                        <Group justify="flex-end">
                            <Button
                                onClick={applySpeed}
                                loading={isLoading}
                                leftSection={<IconCheck size={16} />}
                                variant="gradient"
                                gradient={{ from: 'blue', to: 'cyan' }}
                            >
                                Aplicar velocidad
                            </Button>
                        </Group>
                    </Stack>
                </Card>
            </motion.div>

            {/* General Settings Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                <Card
                    style={{
                        background: cssVariables.glassBg,
                        border: `1px solid ${cssVariables.glassBorder}`,
                    }}
                >
                    <Group gap="md" mb="lg">
                        <ThemeIcon
                            size={50}
                            variant="gradient"
                            gradient={{ from: 'gray', to: 'dark' }}
                            radius="xl"
                        >
                            <IconSettings size={28} />
                        </ThemeIcon>
                        <Box>
                            <Title order={3}>Ajustes del Sistema</Title>
                            <Text c="dimmed" size="sm">
                                Configuración general del gemelo digital
                            </Text>
                        </Box>
                    </Group>

                    <Stack gap="md">
                        <Switch label="Notificaciones de alerta" defaultChecked />
                        <Switch label="Modo oscuro" defaultChecked disabled />
                        <Switch label="Actualización automática" defaultChecked />

                        <Divider my="md" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                        <Text size="xs" c="dimmed">
                            HealthVerse Coruña v2.0 • Gemelo Digital Hospitalario
                        </Text>
                    </Stack>
                </Card>
            </motion.div>
        </Stack>
    );
}
