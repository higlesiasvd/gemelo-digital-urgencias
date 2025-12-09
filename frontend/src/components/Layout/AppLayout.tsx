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
    { path: '/', label: 'Dashboard', icon: IconDashboard, color: '#00c4dc' },
    { path: '/hospitales', label: 'Hospitales', icon: IconBuildingHospital, color: '#00d68f' },
    { path: '/personal', label: 'Personal', icon: IconUsers, color: '#8b6ce6' },
    { path: '/derivaciones', label: 'Derivaciones', icon: IconArrowsExchange, color: '#f97316' },
    { path: '/simulacion', label: 'Simulación', icon: IconTestPipe, color: '#f43f5e' },
    { path: '/demanda/predictor', label: 'Predicción', icon: IconChartLine, color: '#1a8cde' },
    { path: '/mapa', label: 'Mapa', icon: IconMap, color: '#fbbf24' },
    { path: '/configuracion', label: 'Configuración', icon: IconSettings, color: '#64748b' },
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
                        background: 'linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(5,10,18,0.95) 100%)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderBottom: '1px solid rgba(0, 196, 220, 0.08)',
                        borderBottomLeftRadius: 20,
                        borderBottomRightRadius: 20,
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <Group h="100%" px="xl" justify="space-between">
                        {/* Left: Logo & Brand */}
                        <Group gap="lg">
                            {/* Modern Logo with glow ring */}
                            <Box style={{ position: 'relative' }}>
                                {/* Outer glow ring */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                                    style={{
                                        position: 'absolute',
                                        inset: -3,
                                        borderRadius: 16,
                                        background: 'conic-gradient(from 0deg, #00c4dc, #0d6ebd, #00d68f, #00c4dc)',
                                        opacity: 0.5,
                                    }}
                                />
                                {/* Logo container */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        width: 46,
                                        height: 46,
                                        borderRadius: 14,
                                        background: 'linear-gradient(135deg, #0d6ebd 0%, #00c4dc 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 16px rgba(0, 196, 220, 0.3)',
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
                                    fw={600}
                                    size="lg"
                                    style={{ lineHeight: 1.2, letterSpacing: '-0.02em' }}
                                >
                                    <span style={{ color: '#fff' }}>Health</span>
                                    <span style={{
                                        background: 'linear-gradient(90deg, #00c4dc 0%, #00d68f 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>Verse</span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8, fontWeight: 400 }}>Coruña</span>
                                </Text>
                                <Text size="xs" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                    Digital Hospital Twin
                                </Text>
                            </Box>
                        </Group>

                        {/* Right: Status */}
                        <Group gap="xl">
                            {/* Connection status - minimal */}
                            <Group gap={10}>
                                <motion.div
                                    animate={{
                                        scale: isConnected ? [1, 1.15, 1] : 1,
                                        opacity: isConnected ? 1 : 0.5,
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: isConnected ? '#00d68f' : '#f43f5e',
                                        boxShadow: isConnected
                                            ? '0 0 10px #00d68f, 0 0 20px rgba(0,214,143,0.4)'
                                            : 'none',
                                    }}
                                />
                                <Text size="sm" style={{ color: isConnected ? '#00d68f' : '#f43f5e' }} fw={500}>
                                    {isConnected ? 'Live' : 'Offline'}
                                </Text>
                            </Group>

                            {/* Time */}
                            {lastUpdate && (
                                <Badge
                                    variant="light"
                                    size="md"
                                    radius="xl"
                                    style={{
                                        background: 'rgba(0, 196, 220, 0.1)',
                                        border: '1px solid rgba(0, 196, 220, 0.2)',
                                        color: 'rgba(255,255,255,0.7)',
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
                    p="lg"
                    style={{
                        background: 'linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(5,10,18,0.95) 100%)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderRight: '1px solid rgba(0, 196, 220, 0.06)',
                        borderTopRightRadius: 24,
                        borderBottomRightRadius: 24,
                        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.2)',
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
