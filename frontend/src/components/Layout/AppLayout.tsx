// ═══════════════════════════════════════════════════════════════════════════════
// APP LAYOUT - ESTRUCTURA PRINCIPAL (MODERN DESIGN)
// ═══════════════════════════════════════════════════════════════════════════════

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    AppShell,
    Group,
    Text,
    Badge,
    Box,
    Stack,
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
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useIsConnected, useLastUpdate } from '@/shared/store';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { cssVariables } from '@/shared/theme';
import { FloatingChatWidget } from '@/components/FloatingChat/FloatingChatWidget';

// ═══════════════════════════════════════════════════════════════════════════════
// NAV CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: IconDashboard, color: '#228be6' },
    { path: '/hospitales', label: 'Hospitales', icon: IconBuildingHospital, color: '#40c057' },
    { path: '/personal', label: 'Personal', icon: IconUsers, color: '#be4bdb' },
    { path: '/derivaciones', label: 'Derivaciones', icon: IconArrowsExchange, color: '#fd7e14' },
    { path: '/simulacion', label: 'Simulación', icon: IconTestPipe, color: '#fa5252' },
    { path: '/demanda/predictor', label: 'Predicción', icon: IconChartLine, color: '#15aabf' },
    { path: '/mapa', label: 'Mapa', icon: IconMap, color: '#fab005' },
    { path: '/configuracion', label: 'Configuración', icon: IconSettings, color: '#868e96' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NAV ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface NavItemProps {
    path: string;
    label: string;
    icon: typeof IconDashboard;
    color: string;
    isActive: boolean;
    onClick: () => void;
}

function NavItem({ label, icon: Icon, color, isActive, onClick }: NavItemProps) {
    return (
        <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
        >
            <Box
                onClick={onClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: isActive
                        ? `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`
                        : 'transparent',
                    border: isActive
                        ? `1px solid ${color}40`
                        : '1px solid transparent',
                    transition: 'all 0.2s ease',
                }}
                className={!isActive ? 'nav-item-hover' : ''}
            >
                <Box
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isActive
                            ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`
                            : 'rgba(255,255,255,0.05)',
                        boxShadow: isActive ? `0 4px 12px ${color}40` : 'none',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Icon size={18} style={{ color: isActive ? '#fff' : color }} />
                </Box>
                <Text
                    size="sm"
                    fw={isActive ? 600 : 400}
                    style={{
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                        transition: 'color 0.2s ease',
                    }}
                >
                    {label}
                </Text>
                {isActive && (
                    <motion.div
                        layoutId="activeIndicator"
                        style={{
                            marginLeft: 'auto',
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: color,
                            boxShadow: `0 0 8px ${color}`,
                        }}
                    />
                )}
            </Box>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isConnected = useIsConnected();
    const lastUpdate = useLastUpdate();

    useWebSocket();

    return (
        <>
            {/* Global styles for hover effect */}
            <style>{`
                .nav-item-hover:hover {
                    background: rgba(255,255,255,0.03) !important;
                }
            `}</style>

            <AppShell
                header={{ height: 60 }}
                navbar={{ width: 260, breakpoint: 'sm' }}
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
                {/* Header */}
                <AppShell.Header
                    style={{
                        background: 'linear-gradient(180deg, rgba(8,18,38,0.99) 0%, rgba(12,24,48,0.98) 100%)',
                        backdropFilter: 'blur(24px)',
                        borderBottom: '1px solid rgba(56,189,248,0.12)',
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                    }}
                >
                    <Group h="100%" px="lg" justify="space-between">
                        {/* Left: Logo & Brand */}
                        <Group gap="lg">
                            {/* Modern Logo with glow ring */}
                            <Box style={{ position: 'relative' }}>
                                {/* Outer glow ring */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                    style={{
                                        position: 'absolute',
                                        inset: -3,
                                        borderRadius: 14,
                                        background: 'conic-gradient(from 0deg, #228be6, #15aabf, #40c057, #228be6)',
                                        opacity: 0.6,
                                    }}
                                />
                                {/* Logo container */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, rgba(34,139,230,0.9) 0%, rgba(21,170,191,0.9) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        {/* Modern H + pulse combined */}
                                        <path
                                            d="M4 6v12M20 6v12M4 12h4l2-3 4 6 2-3h4"
                                            stroke="white"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </Box>
                            </Box>

                            {/* Brand text */}
                            <Box>
                                <Text
                                    fw={700}
                                    size="lg"
                                    style={{ lineHeight: 1.2 }}
                                >
                                    <span style={{ color: '#fff' }}>Health</span>
                                    <span style={{
                                        background: 'linear-gradient(90deg, #228be6 0%, #40c057 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>Verse</span>
                                    <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 6 }}>Coruña</span>
                                </Text>
                                <Text size="xs" c="dimmed" style={{ opacity: 0.6 }}>
                                    Digital Hospital Twin
                                </Text>
                            </Box>
                        </Group>

                        {/* Right: Status */}
                        <Group gap="lg">
                            {/* Connection status - minimal */}
                            <Group gap={8}>
                                <motion.div
                                    animate={{
                                        scale: isConnected ? [1, 1.2, 1] : 1,
                                        opacity: isConnected ? 1 : 0.5,
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: isConnected ? '#40c057' : '#fa5252',
                                        boxShadow: isConnected
                                            ? '0 0 8px #40c057, 0 0 16px rgba(64,192,87,0.4)'
                                            : 'none',
                                    }}
                                />
                                <Text size="sm" c={isConnected ? 'green.4' : 'red.4'} fw={500}>
                                    {isConnected ? 'Live' : 'Offline'}
                                </Text>
                            </Group>

                            {/* Time */}
                            {lastUpdate && (
                                <Badge
                                    variant="outline"
                                    color="gray"
                                    size="sm"
                                    style={{
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </Badge>
                            )}
                        </Group>
                    </Group>
                </AppShell.Header>

                {/* Navbar */}
                <AppShell.Navbar
                    p="md"
                    style={{
                        background: 'linear-gradient(180deg, rgba(8,18,38,0.99) 0%, rgba(6,14,30,0.99) 100%)',
                        backdropFilter: 'blur(24px)',
                        borderRight: '1px solid rgba(56,189,248,0.08)',
                        borderTopRightRadius: 16,
                        borderBottomRightRadius: 16,
                    }}
                >
                    <Stack gap={6} style={{ height: '100%' }}>
                        {/* All nav items */}
                        {NAV_ITEMS.map((item, index) => (
                            <motion.div
                                key={item.path}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.2 }}
                            >
                                <NavItem
                                    {...item}
                                    isActive={location.pathname === item.path}
                                    onClick={() => navigate(item.path)}
                                />
                            </motion.div>
                        ))}

                    </Stack>
                </AppShell.Navbar>

                {/* Main content */}
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
        </>
    );
}
