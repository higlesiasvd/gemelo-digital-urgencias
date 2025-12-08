// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION PAGE
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    Button,
    ThemeIcon,
    Paper,
    SimpleGrid,
    Slider,
    Switch,
} from '@mantine/core';
import { IconPlayerPlay, IconPlayerStop, IconTestPipe } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { startSimulation, stopSimulation } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

export function SimulationPage() {
    const [speed, setSpeed] = useState(1.0);
    const [autoDerivation, setAutoDerivation] = useState(true);
    const [isRunning, setIsRunning] = useState(false);

    const startMutation = useMutation({
        mutationFn: startSimulation,
        onSuccess: () => {
            notifications.show({ title: 'Simulación', message: 'Iniciada correctamente', color: 'green' });
            setIsRunning(true);
        },
    });

    const stopMutation = useMutation({
        mutationFn: stopSimulation,
        onSuccess: () => {
            notifications.show({ title: 'Simulación', message: 'Detenida', color: 'orange' });
            setIsRunning(false);
        },
    });

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Simulación</Title>
                <Badge size="lg" color={isRunning ? 'green' : 'gray'}>{isRunning ? 'En ejecución' : 'Detenida'}</Badge>
            </Group>

            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group gap="md" mb="lg">
                    <ThemeIcon size={50} variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} radius="xl">
                        <IconTestPipe size={28} />
                    </ThemeIcon>
                    <div>
                        <Title order={3}>Control de Simulación</Title>
                        <Text c="dimmed">Gestiona la simulación del sistema de urgencias</Text>
                    </div>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text fw={500} mb="md">Velocidad de simulación</Text>
                        <Slider
                            value={speed}
                            onChange={setSpeed}
                            min={0.1}
                            max={10}
                            step={0.1}
                            marks={[{ value: 1, label: '1x' }, { value: 5, label: '5x' }, { value: 10, label: '10x' }]}
                            label={(v) => `${v}x`}
                        />
                    </Paper>

                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text fw={500} mb="md">Opciones</Text>
                        <Stack gap="sm">
                            <Switch label="Derivación automática" checked={autoDerivation} onChange={(e) => setAutoDerivation(e.currentTarget.checked)} />
                        </Stack>
                    </Paper>
                </SimpleGrid>

                <Group mt="lg" justify="center">
                    {isRunning ? (
                        <Button size="lg" color="red" leftSection={<IconPlayerStop size={20} />} onClick={() => stopMutation.mutate()} loading={stopMutation.isPending}>
                            Detener Simulación
                        </Button>
                    ) : (
                        <Button size="lg" color="green" leftSection={<IconPlayerPlay size={20} />} onClick={() => startMutation.mutate()} loading={startMutation.isPending}>
                            Iniciar Simulación
                        </Button>
                    )}
                </Group>
            </Card>
        </Stack>
    );
}
