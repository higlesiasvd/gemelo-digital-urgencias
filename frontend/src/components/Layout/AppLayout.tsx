// ═══════════════════════════════════════════════════════════════════════════════
// APP LAYOUT - ESTRUCTURA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    AppShell,
    Group,
    Text,
    NavLink,
    Badge,
    Tooltip,
    ThemeIcon,
    rem,
} from '@mantine/core';
import {
    IconDashboard,
    IconBuildingHospital,
    IconUsers,
    IconArrowsExchange,
    IconTestPipe,
    IconChartLine,
    IconMap,
    IconSettings,
    IconWifi,
    IconWifiOff,
    IconActivity,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useIsConnected, useLastUpdate } from '@/shared/store';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { cssVariables } from '@/shared/theme';
import { FloatingChatWidget } from '@/components/FloatingChat/FloatingChatWidget';

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: IconDashboard },
    { path: '/hospitales', label: 'Hospitales', icon: IconBuildingHospital },
    { path: '/personal', label: 'Personal', icon: IconUsers },
    { path: '/derivaciones', label: 'Derivaciones', icon: IconArrowsExchange },
    { path: '/simulacion', label: 'Simulación', icon: IconTestPipe },
    { path: '/demanda/predictor', label: 'Predicción', icon: IconChartLine },
    { path: '/mapa', label: 'Mapa', icon: IconMap },
    { path: '/configuracion', label: 'Configuración', icon: IconSettings },
];

export function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isConnected = useIsConnected();
    const lastUpdate = useLastUpdate();

    useWebSocket();

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 240, breakpoint: 'sm' }}
            padding="md"
            styles={{
                root: {
                    background: cssVariables.bodyBg,
                    backgroundAttachment: 'fixed',
                    minHeight: '100vh',
                },
                main: { background: 'transparent' },
            }}
        >
            <AppShell.Header
                style={{
                    background: cssVariables.glassBg,
                    backdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Group h="100%" px="md" justify="space-between">
                    <Group gap="sm">
                        <ThemeIcon
                            size="lg"
                            radius="xl"
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                        >
                            <IconActivity size={20} />
                        </ThemeIcon>
                        <div>
                            <Text fw={700} size="lg" className="gradient-text">Gemelo Digital</Text>
                            <Text size="xs" c="dimmed">Sistema de Urgencias</Text>
                        </div>
                    </Group>

                    <Group gap="md">
                        <Tooltip label={isConnected ? 'Conectado' : 'Sin conexión'}>
                            <Badge
                                leftSection={isConnected ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
                                color={isConnected ? 'green' : 'red'}
                                variant="light"
                                size="lg"
                            >
                                {isConnected ? 'En línea' : 'Sin conexión'}
                            </Badge>
                        </Tooltip>

                        {lastUpdate && (
                            <Text size="xs" c="dimmed">Actualizado: {lastUpdate.toLocaleTimeString()}</Text>
                        )}
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar
                p="md"
                style={{
                    background: cssVariables.glassBg,
                    backdropFilter: 'blur(20px)',
                    borderRight: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        active={location.pathname === item.path}
                        label={item.label}
                        leftSection={
                            <ThemeIcon
                                variant={location.pathname === item.path ? 'gradient' : 'subtle'}
                                gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                                size="sm"
                                radius="md"
                            >
                                <item.icon size={16} />
                            </ThemeIcon>
                        }
                        onClick={() => navigate(item.path)}
                        style={{ borderRadius: rem(8), marginBottom: rem(4) }}
                    />
                ))}
            </AppShell.Navbar>

            <AppShell.Main>
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Outlet />
                </motion.div>
            </AppShell.Main>

            {/* Floating Chat Widget */}
            <FloatingChatWidget />
        </AppShell>
    );
}
