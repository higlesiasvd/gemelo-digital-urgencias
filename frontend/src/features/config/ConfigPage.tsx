// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG PAGE
// ═══════════════════════════════════════════════════════════════════════════════

import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    ThemeIcon,
    Switch,
    Select,
    Divider,
} from '@mantine/core';
import {
    IconSettings,
} from '@tabler/icons-react';
import { cssVariables } from '@/shared/theme';

export function ConfigPage() {
    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Configuración</Title>
            </Group>

            <Card
                className="glass-card"
                style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}
            >
                <Group gap="md" mb="lg">
                    <ThemeIcon size={50} variant="gradient" gradient={{ from: 'gray', to: 'dark' }} radius="xl">
                        <IconSettings size={28} />
                    </ThemeIcon>
                    <div>
                        <Title order={3}>Ajustes del Sistema</Title>
                        <Text c="dimmed">Configura el comportamiento del gemelo digital</Text>
                    </div>
                </Group>

                <Stack gap="md">
                    <Switch label="Notificaciones de alerta" defaultChecked />
                    <Switch label="Modo oscuro" defaultChecked disabled />
                    <Switch label="Actualización automática" defaultChecked />

                    <Divider my="md" />

                    <Select
                        label="Intervalo de actualización"
                        defaultValue="2000"
                        data={[
                            { value: '1000', label: '1 segundo' },
                            { value: '2000', label: '2 segundos' },
                            { value: '5000', label: '5 segundos' },
                        ]}
                    />
                </Stack>
            </Card>
        </Stack>
    );
}
