// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING LAYOUT - Layout Duolingo-style con header estilo Gemelo Digital
// ═══════════════════════════════════════════════════════════════════════════════

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Group,
    ActionIcon,
    Text,
    Avatar,
    Menu,
    UnstyledButton,
    Tooltip,
    Paper,
} from '@mantine/core';
import {
    IconUser,
    IconLogout,
    IconTrophy,
    IconHome,
    IconSchool,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TrainingLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <>
            {/* Global styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                .training-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.5) 50%, transparent 100%);
                }
                
                .hover-scale:hover {
                    transform: scale(1.02);
                }
            `}</style>

            <Box
                style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(180deg, #0a1628 0%, #050a12 100%)',
                }}
            >
                {/* ═══════════════════════════════════════════════════════════════════
                    HEADER - Estilo Gemelo Digital
                ═══════════════════════════════════════════════════════════════════ */}
                <Box
                    component="header"
                    className="training-header"
                    style={{
                        height: 70,
                        background: 'linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(10,22,40,0.95) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                    }}
                >
                    <Group h="100%" px="xl" justify="space-between">
                        {/* Left: Brand con Logo */}
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
                                        borderRadius: 16,
                                        background: 'conic-gradient(from 0deg, #8b5cf6, #6366f1, #a78bfa, #c4b5fd, #8b5cf6)',
                                        opacity: 0.7,
                                    }}
                                />
                                {/* Inner ring mask */}
                                <Box
                                    style={{
                                        position: 'absolute',
                                        inset: -2,
                                        borderRadius: 14,
                                        background: 'rgba(10, 22, 40, 0.9)',
                                    }}
                                />
                                {/* Logo */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                    }}
                                >
                                    <IconSchool size={26} color="#a78bfa" />
                                </Box>
                            </Box>

                            {/* Brand Text */}
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
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>Verse</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}> A Coruña</span>
                                </Text>

                                {/* Separator */}
                                <Box
                                    style={{
                                        width: 1,
                                        height: 28,
                                        background: 'linear-gradient(180deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
                                    }}
                                />

                                {/* Subtitle */}
                                <Text
                                    size="sm"
                                    style={{
                                        color: 'rgba(255,255,255,0.6)',
                                        fontWeight: 500,
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    Formación
                                </Text>
                            </Group>
                        </Group>

                        {/* Right: Nav + Profile */}
                        <Group gap="md">
                            {/* Quick Stats Pills */}
                            <Group gap="sm">
                                {/* Professor Button */}
                                <Paper
                                    px="md"
                                    py={8}
                                    radius="xl"
                                    onClick={() => navigate('/formacion/profesor')}
                                    className="hover-scale"
                                    style={{
                                        background: location.pathname.includes('/profesor')
                                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)'
                                            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Group gap={8}>
                                        <IconSchool size={18} color="#a78bfa" />
                                        <Text size="sm" fw={600} c="violet.3">Profesor IA</Text>
                                    </Group>
                                </Paper>

                                {/* Ranking Button */}
                                <Tooltip label="Ver Ranking">
                                    <ActionIcon
                                        variant="subtle"
                                        size="lg"
                                        radius="xl"
                                        onClick={() => navigate('/formacion/ranking')}
                                        style={{
                                            background: location.pathname.includes('/ranking')
                                                ? 'rgba(251, 191, 36, 0.15)'
                                                : 'transparent',
                                        }}
                                    >
                                        <IconTrophy size={20} color="#fbbf24" />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>

                            {/* Separator */}
                            <Box style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />

                            {/* User menu */}
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <UnstyledButton>
                                        <Group gap="sm">
                                            <Avatar
                                                src={user?.avatar_url}
                                                alt={user?.nombre}
                                                size={42}
                                                radius="xl"
                                                color="violet"
                                                style={{
                                                    border: '2px solid rgba(139, 92, 246, 0.4)',
                                                }}
                                            >
                                                {user?.nombre?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Box visibleFrom="sm">
                                                <Text size="sm" fw={600}>{user?.nombre}</Text>
                                                <Text size="xs" c="dimmed">Ver perfil</Text>
                                            </Box>
                                        </Group>
                                    </UnstyledButton>
                                </Menu.Target>

                                <Menu.Dropdown
                                    style={{
                                        background: 'rgba(13, 31, 60, 0.98)',
                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                        backdropFilter: 'blur(20px)',
                                    }}
                                >
                                    <Menu.Label>Mi cuenta</Menu.Label>
                                    <Menu.Item
                                        leftSection={<IconUser size={16} />}
                                        onClick={() => navigate('/formacion/perfil')}
                                    >
                                        Mi perfil
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconTrophy size={16} />}
                                        onClick={() => navigate('/formacion/ranking')}
                                    >
                                        Ranking
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconHome size={16} />}
                                        onClick={() => navigate('/')}
                                    >
                                        Selector de modo
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                        color="red"
                                        leftSection={<IconLogout size={16} />}
                                        onClick={() => {
                                            logout();
                                            navigate('/login');
                                        }}
                                    >
                                        Cerrar sesión
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </Group>
                </Box>

                {/* ═══════════════════════════════════════════════════════════════════
                    MAIN CONTENT
                ═══════════════════════════════════════════════════════════════════ */}
                <Box
                    component="main"
                    p="lg"
                    style={{
                        maxWidth: 1000,
                        margin: '0 auto',
                    }}
                >
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Outlet />
                    </motion.div>
                </Box>
            </Box>
        </>
    );
}
