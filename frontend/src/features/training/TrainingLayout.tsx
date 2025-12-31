// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING LAYOUT - Layout para el modo formación
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
} from '@mantine/core';
import {
    IconArrowLeft,
    IconUser,
    IconLogout,
    IconTrophy,
    IconHome,
} from '@tabler/icons-react';
import { useAuth } from '@/features/auth';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TrainingLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isHome = location.pathname === '/formacion';

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a1628 0%, #050a12 100%)',
            }}
        >
            {/* Header */}
            <Box
                component="header"
                py="sm"
                px="lg"
                style={{
                    background: cssVariables.glassBg,
                    borderBottom: `1px solid ${cssVariables.glassBorder}`,
                    backdropFilter: 'blur(20px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                <Group justify="space-between">
                    {/* Left side - Back button or Home */}
                    <Group gap="md">
                        {!isHome ? (
                            <Tooltip label="Volver">
                                <ActionIcon
                                    variant="subtle"
                                    size="lg"
                                    radius="xl"
                                    onClick={() => navigate('/formacion')}
                                >
                                    <IconArrowLeft size={20} />
                                </ActionIcon>
                            </Tooltip>
                        ) : (
                            <Tooltip label="Selector de modo">
                                <ActionIcon
                                    variant="subtle"
                                    size="lg"
                                    radius="xl"
                                    onClick={() => navigate('/')}
                                >
                                    <IconHome size={20} />
                                </ActionIcon>
                            </Tooltip>
                        )}

                        <Text
                            fw={700}
                            style={{
                                fontSize: '1.25rem',
                                background: 'linear-gradient(135deg, #00c4dc 0%, #00d68f 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            FORMACIÓN
                        </Text>
                    </Group>

                    {/* Right side - Navigation & Profile */}
                    <Group gap="sm">
                        <Tooltip label="Ranking">
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                radius="xl"
                                onClick={() => navigate('/formacion/ranking')}
                            >
                                <IconTrophy size={20} />
                            </ActionIcon>
                        </Tooltip>

                        {/* User menu */}
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <UnstyledButton>
                                    <Group gap="xs">
                                        <Avatar
                                            src={user?.avatar_url}
                                            alt={user?.nombre}
                                            size="md"
                                            radius="xl"
                                            color="cyan"
                                        >
                                            {user?.nombre?.[0]?.toUpperCase()}
                                        </Avatar>
                                    </Group>
                                </UnstyledButton>
                            </Menu.Target>

                            <Menu.Dropdown
                                style={{
                                    background: cssVariables.glassBg,
                                    border: `1px solid ${cssVariables.glassBorder}`,
                                }}
                            >
                                <Menu.Label>{user?.nombre}</Menu.Label>
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

            {/* Main content */}
            <Box
                component="main"
                p="lg"
                style={{
                    maxWidth: 900,
                    margin: '0 auto',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
