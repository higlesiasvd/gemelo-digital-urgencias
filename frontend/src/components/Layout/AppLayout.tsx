// ═══════════════════════════════════════════════════════════════════════════════
// APP LAYOUT - MODERN DESIGN WITH LABELED SIDEBAR
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
    IconActivity,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
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
// MODERN NAV ITEM WITH LABEL
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
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            <Box
                onClick={onClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    position: 'relative',
                    background: isActive
                        ? `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`
                        : 'transparent',
                    border: isActive
                        ? `1px solid ${color}40`
                        : '1px solid transparent',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className={!isActive ? 'nav-item-hover' : ''}
            >
                {/* Active indicator bar */}
                {isActive && (
                    <motion.div
                        layoutId="activeBar"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 4,
                            height: 28,
                            borderRadius: '0 4px 4px 0',
                            background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                            boxShadow: `0 0 12px ${color}80`,
                        }}
                    />
                )}

                {/* Icon container */}
                <Box
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isActive
                            ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                            : 'rgba(255,255,255,0.04)',
                        boxShadow: isActive
                            ? `0 6px 20px ${color}50`
                            : 'none',
                        transition: 'all 0.25s ease',
                    }}
                >
                    <Icon
                        size={20}
                        style={{
                            color: isActive ? '#fff' : color,
                            transition: 'color 0.2s ease',
                        }}
                    />
                </Box>

                {/* Label */}
                <Text
                    size="sm"
                    fw={isActive ? 600 : 500}
                    style={{
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                        transition: 'all 0.2s ease',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {label}
                </Text>

                {/* Active dot indicator */}
                {isActive && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                            marginLeft: 'auto',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: color,
                            boxShadow: `0 0 10px ${color}`,
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
            {/* Global styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                .nav-item-hover:hover {
                    background: rgba(255,255,255,0.04) !important;
                    border-color: rgba(255,255,255,0.08) !important;
                }
                
                .modern-sidebar:hover {
                    border-color: rgba(0, 196, 220, 0.15) !important;
                }
                
                .header-glass::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, rgba(0, 196, 220, 0.4) 50%, transparent 100%);
                }
            `}</style>

            <AppShell
                header={{ height: 64 }}
                navbar={{ width: 260, breakpoint: 'sm' }}
                padding="lg"
                styles={{
                    root: {
                        background: cssVariables.bodyBg,
                        backgroundAttachment: 'fixed',
                        minHeight: '100vh',
                    },
                    main: {
                        background: 'transparent',
                    },
                }}
            >
                {/* ═══════════════════════════════════════════════════════════════
                    FLOATING HEADER
                ═══════════════════════════════════════════════════════════════ */}
                <AppShell.Header
                    className="header-glass"
                    style={{
                        background: 'linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(10,22,40,0.95) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: 'none',
                        borderBottom: '1px solid rgba(0, 196, 220, 0.1)',
                        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <Group h="100%" px="xl" justify="space-between">
                        {/* Left: Brand */}
                        <Group gap="md">
                            {/* Animated Logo */}
                            <Box style={{ position: 'relative' }}>
                                {/* Rotating glow ring */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                    style={{
                                        position: 'absolute',
                                        inset: -4,
                                        borderRadius: 18,
                                        background: 'conic-gradient(from 0deg, #00c4dc, #0d6ebd, #00d68f, #8b6ce6, #00c4dc)',
                                        opacity: 0.6,
                                    }}
                                />
                                {/* Inner ring mask */}
                                <Box
                                    style={{
                                        position: 'absolute',
                                        inset: -2,
                                        borderRadius: 16,
                                        background: 'rgba(10, 22, 40, 0.9)',
                                    }}
                                />
                                {/* Logo */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(0, 196, 220, 0.3)',
                                    }}
                                >
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                                        <defs>
                                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#00c4dc" />
                                                <stop offset="100%" stopColor="#00d68f" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M4 6v12M20 6v12M4 12h4l2-3 4 6 2-3h4"
                                            stroke="url(#logoGradient)"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </Box>
                            </Box>

                            {/* Brand Text - Larger with subtitle on right */}
                            <Group gap="lg" align="center">
                                <Text
                                    fw={700}
                                    style={{
                                        fontSize: '1.75rem',
                                        lineHeight: 1,
                                        letterSpacing: '-0.03em',
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >
                                    <span style={{
                                        background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.9) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>Health</span>
                                    <span style={{
                                        background: 'linear-gradient(135deg, #00c4dc 0%, #00d68f 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>Verse</span>
                                </Text>

                                {/* Separator */}
                                <Box
                                    style={{
                                        width: 1,
                                        height: 28,
                                        background: 'linear-gradient(180deg, transparent, rgba(0, 196, 220, 0.4), transparent)',
                                    }}
                                />

                                {/* Descriptive subtitle */}
                                <Text
                                    size="sm"
                                    style={{
                                        color: 'rgba(255,255,255,0.6)',
                                        fontWeight: 500,
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    Emergency Room Digital Twin — A Coruña
                                </Text>
                            </Group>
                        </Group>

                        {/* Right: Status indicators */}
                        <Group gap="lg">
                            {/* Live Status Pill */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Box
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 16px',
                                        borderRadius: 50,
                                        background: isConnected
                                            ? 'rgba(0, 214, 143, 0.1)'
                                            : 'rgba(244, 63, 94, 0.1)',
                                        border: `1px solid ${isConnected ? 'rgba(0, 214, 143, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                    }}
                                >
                                    <motion.div
                                        animate={{
                                            scale: isConnected ? [1, 1.2, 1] : 1,
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: isConnected ? '#00d68f' : '#f43f5e',
                                            boxShadow: isConnected
                                                ? '0 0 12px #00d68f'
                                                : 'none',
                                        }}
                                    />
                                    <Text
                                        size="sm"
                                        fw={600}
                                        style={{
                                            color: isConnected ? '#00d68f' : '#f43f5e',
                                            letterSpacing: '0.02em',
                                        }}
                                    >
                                        {isConnected ? 'LIVE' : 'OFFLINE'}
                                    </Text>
                                    {isConnected && (
                                        <IconActivity size={14} style={{ color: '#00d68f' }} />
                                    )}
                                </Box>
                            </motion.div>

                            {/* Time Badge */}
                            {lastUpdate && (
                                <Badge
                                    size="lg"
                                    radius="xl"
                                    variant="filled"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontWeight: 500,
                                        padding: '0 16px',
                                    }}
                                >
                                    {lastUpdate.toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </Badge>
                            )}
                        </Group>
                    </Group>
                </AppShell.Header>

                {/* ═══════════════════════════════════════════════════════════════
                    FLOATING SIDEBAR WITH LABELS
                ═══════════════════════════════════════════════════════════════ */}
                <AppShell.Navbar
                    className="modern-sidebar"
                    p="md"
                    style={{
                        background: 'linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(5,10,18,0.99) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        borderRight: '1px solid rgba(0, 196, 220, 0.1)',
                        boxShadow: '2px 0 20px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <Stack gap={6} style={{ height: '100%', paddingTop: 8 }}>
                        {/* Navigation Items */}
                        <AnimatePresence>
                            {NAV_ITEMS.map((item, index) => (
                                <motion.div
                                    key={item.path}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.3 }}
                                >
                                    <NavItem
                                        {...item}
                                        isActive={location.pathname === item.path}
                                        onClick={() => navigate(item.path)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </Stack>
                </AppShell.Navbar>

                {/* Main content */}
                <AppShell.Main>
                    <Box
                        style={{
                            background: 'rgba(5, 12, 24, 0.5)',
                            borderRadius: 24,
                            padding: 20,
                            minHeight: 'calc(100vh - 104px)',
                            border: '1px solid rgba(0, 196, 220, 0.06)',
                        }}
                    >
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <Outlet />
                        </motion.div>
                    </Box>
                </AppShell.Main>

                {/* Floating Chat Widget */}
                <FloatingChatWidget />
            </AppShell>
        </>
    );
}
