// ═══════════════════════════════════════════════════════════════════════════════
// MODE SELECTOR PAGE - Pantalla de selección post-login
// ═══════════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import {
    Box,
    Text,
    Stack,
    Paper,
    Group,
    SimpleGrid,
    ThemeIcon,
    Badge,
} from '@mantine/core';
import {
    IconActivity,
    IconSchool,
    IconChevronRight,
    IconFlame,
    IconStar,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// MODE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ModeCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    onClick: () => void;
    delay?: number;
}

function ModeCard({ icon, title, description, gradient, onClick, delay = 0 }: ModeCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <Paper
                p="xl"
                radius="xl"
                onClick={onClick}
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    backdropFilter: 'blur(20px)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Gradient overlay */}
                <Box
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: gradient,
                    }}
                />

                <Stack gap="md">
                    <ThemeIcon
                        size={60}
                        radius="xl"
                        style={{
                            background: gradient,
                        }}
                    >
                        {icon}
                    </ThemeIcon>

                    <Box>
                        <Text fw={700} size="xl" mb={4}>
                            {title}
                        </Text>
                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                            {description}
                        </Text>
                    </Box>

                    <Group gap="xs" mt="md">
                        <Text
                            size="sm"
                            fw={600}
                            style={{
                                background: gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Acceder
                        </Text>
                        <IconChevronRight size={16} style={{ opacity: 0.7 }} />
                    </Group>
                </Stack>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ModeSelectorPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <Box
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #1a2744 100%)',
                padding: 20,
            }}
        >
            {/* Background decorations */}
            <Box
                style={{
                    position: 'fixed',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.08, 0.12, 0.08],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        top: '15%',
                        right: '15%',
                        width: 500,
                        height: 500,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(0, 196, 220, 0.15) 0%, transparent 70%)',
                    }}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.06, 0.1, 0.06],
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 2 }}
                    style={{
                        position: 'absolute',
                        bottom: '10%',
                        left: '10%',
                        width: 600,
                        height: 600,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(0, 214, 143, 0.12) 0%, transparent 70%)',
                    }}
                />
            </Box>

            <Stack gap="xl" align="center" style={{ maxWidth: 800, width: '100%' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Stack align="center" gap="xs">
                        <Text
                            fw={700}
                            style={{
                                fontSize: '2.5rem',
                                lineHeight: 1.2,
                                letterSpacing: '-0.03em',
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
                        <Text size="lg" c="dimmed">
                            ¡Hola, {user?.nombre || 'Usuario'}! ¿Qué quieres hacer hoy?
                        </Text>
                    </Stack>
                </motion.div>

                {/* Mode Cards */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" w="100%">
                    <ModeCard
                        icon={<IconActivity size={30} stroke={2} />}
                        title="Gemelo Digital"
                        description="Monitoriza y gestiona las urgencias hospitalarias en tiempo real con métricas avanzadas y predicciones."
                        gradient={cssVariables.gradientPrimary}
                        onClick={() => navigate('/gemelo')}
                        delay={0.1}
                    />
                    <ModeCard
                        icon={<IconSchool size={30} stroke={2} />}
                        title="Formación"
                        description="Aprende y practica triaje Manchester con casos clínicos interactivos y sistema de gamificación."
                        gradient={cssVariables.gradientSuccess}
                        onClick={() => navigate('/formacion')}
                        delay={0.2}
                    />
                </SimpleGrid>

                {/* User Stats */}
                {user && (user.racha_dias > 0 || user.xp_total > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Paper
                            p="md"
                            radius="xl"
                            style={{
                                background: 'rgba(10, 22, 40, 0.6)',
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Group gap="xl">
                                {user.racha_dias > 0 && (
                                    <Group gap="xs">
                                        <ThemeIcon size="sm" radius="xl" color="orange" variant="light">
                                            <IconFlame size={14} />
                                        </ThemeIcon>
                                        <Text size="sm" fw={600}>
                                            Racha: <Badge color="orange" variant="light" size="sm">{user.racha_dias} días</Badge>
                                        </Text>
                                    </Group>
                                )}
                                {user.xp_total > 0 && (
                                    <Group gap="xs">
                                        <ThemeIcon size="sm" radius="xl" color="yellow" variant="light">
                                            <IconStar size={14} />
                                        </ThemeIcon>
                                        <Text size="sm" fw={600}>
                                            XP: <Badge color="yellow" variant="light" size="sm">{user.xp_total.toLocaleString()}</Badge>
                                        </Text>
                                    </Group>
                                )}
                            </Group>
                        </Paper>
                    </motion.div>
                )}
            </Stack>
        </Box>
    );
}
