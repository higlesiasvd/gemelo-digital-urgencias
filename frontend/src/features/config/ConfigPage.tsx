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
} from '@mantine/core';
import {
    IconSettings,
    IconPlayerPlay,
    IconClock,
    IconCheck,
    IconAlertCircle,
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

export function ConfigPage() {
    const [speed, setSpeed] = useState<number>(10);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ running: boolean; speed: number } | null>(null);

    // Fetch current status on mount
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000'}/simulation/status`);
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
                `${import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000'}/simulation/speed`,
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

            {/* Simulation Speed Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
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
                            HealthVerse Coruña v1.0 • Gemelo Digital Hospitalario
                        </Text>
                    </Stack>
                </Card>
            </motion.div>
        </Stack>
    );
}
