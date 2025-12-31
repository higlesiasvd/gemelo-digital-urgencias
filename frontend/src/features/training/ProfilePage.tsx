// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE PAGE - Perfil del usuario con badges y estadísticas
// ═══════════════════════════════════════════════════════════════════════════════

import {
    Box,
    Stack,
    Paper,
    Text,
    Group,
    Avatar,
    Badge,
    SimpleGrid,
    Skeleton,
    Progress,
    ThemeIcon,
    Tooltip,
} from '@mantine/core';
import {
    IconStar,
    IconFlame,
    IconTrophy,
    IconTarget,
    IconCheck,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';
import { useMyProfile, useAllBadges } from './hooks/useTraining';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    delay?: number;
}

function StatCard({ icon, label, value, color, delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <Paper
                p="md"
                radius="xl"
                style={{
                    background: `${color}10`,
                    border: `1px solid ${color}30`,
                }}
            >
                <Stack align="center" gap="xs">
                    <ThemeIcon size="lg" radius="xl" style={{ background: color }}>
                        {icon}
                    </ThemeIcon>
                    <Text size="xl" fw={700} style={{ color }}>
                        {value}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {label}
                    </Text>
                </Stack>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE ITEM
// ═══════════════════════════════════════════════════════════════════════════════

interface BadgeItemProps {
    badge: {
        badge_id: string;
        nombre: string;
        descripcion: string | null;
        icono: string;
        color: string;
        obtenido: boolean;
        obtenido_en: string | null;
    };
    delay?: number;
}

function BadgeItem({ badge, delay = 0 }: BadgeItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay }}
        >
            <Tooltip
                label={
                    badge.obtenido
                        ? badge.descripcion
                        : `🔒 ${badge.descripcion}`
                }
                withArrow
                multiline
                w={200}
            >
                <Paper
                    p="md"
                    radius="xl"
                    style={{
                        background: badge.obtenido
                            ? `${badge.color}15`
                            : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${badge.obtenido ? badge.color : 'rgba(255,255,255,0.1)'}40`,
                        opacity: badge.obtenido ? 1 : 0.5,
                        textAlign: 'center',
                    }}
                >
                    <Stack align="center" gap="xs">
                        <Text size="2rem">
                            {badge.obtenido ? badge.icono : '🔒'}
                        </Text>
                        <Text size="xs" fw={600} c={badge.obtenido ? 'white' : 'dimmed'}>
                            {badge.nombre}
                        </Text>
                        {badge.obtenido && badge.obtenido_en && (
                            <Badge size="xs" variant="light" color={badge.color.replace('#', '')}>
                                <IconCheck size={10} /> Obtenido
                            </Badge>
                        )}
                    </Stack>
                </Paper>
            </Tooltip>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ProfilePage() {
    const { user } = useAuth();
    const { data: profile, isLoading: profileLoading } = useMyProfile();
    const { data: allBadges, isLoading: badgesLoading } = useAllBadges();

    if (profileLoading) {
        return (
            <Stack gap="lg">
                <Skeleton height={150} radius="xl" />
                <Skeleton height={100} radius="xl" />
                <Skeleton height={200} radius="xl" />
            </Stack>
        );
    }

    // Calculate XP progress to next level
    const xpForCurrentLevel = profile ? (profile.nivel - 1) * 500 : 0;
    const xpForNextLevel = profile ? profile.nivel * 500 : 500;
    const xpProgress = profile
        ? ((profile.xp_total - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
        : 0;

    return (
        <Stack gap="xl">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: cssVariables.glassBg,
                        border: `1px solid ${cssVariables.glassBorder}`,
                    }}
                >
                    <Group align="flex-start" gap="xl">
                        <Avatar
                            src={user?.avatar_url}
                            size={100}
                            radius="xl"
                            color="cyan"
                            style={{
                                border: '3px solid',
                                borderColor: cssVariables.accentPrimary,
                            }}
                        >
                            {user?.nombre?.[0]?.toUpperCase()}
                        </Avatar>

                        <Box style={{ flex: 1 }}>
                            <Text size="xl" fw={700}>
                                {profile?.nombre} {profile?.apellidos}
                            </Text>
                            <Text c="dimmed" mb="md">
                                {user?.email}
                            </Text>

                            {/* Level progress */}
                            <Group gap="xs" mb="xs">
                                <Badge
                                    size="lg"
                                    radius="xl"
                                    variant="gradient"
                                    gradient={{ from: 'cyan', to: 'teal' }}
                                >
                                    Nivel {profile?.nivel || 1}
                                </Badge>
                                <Text size="sm" c="dimmed">
                                    {profile?.xp_total || 0} / {xpForNextLevel} XP
                                </Text>
                            </Group>
                            <Progress
                                value={xpProgress}
                                size="md"
                                radius="xl"
                                color="cyan"
                            />
                        </Box>
                    </Group>
                </Paper>
            </motion.div>

            {/* Stats Grid */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                <StatCard
                    icon={<IconStar size={20} />}
                    label="XP Total"
                    value={profile?.xp_total?.toLocaleString() || 0}
                    color="#fbbf24"
                    delay={0.1}
                />
                <StatCard
                    icon={<IconFlame size={20} />}
                    label="Racha actual"
                    value={`${profile?.racha_dias || 0} días`}
                    color="#f97316"
                    delay={0.15}
                />
                <StatCard
                    icon={<IconTrophy size={20} />}
                    label="Racha máxima"
                    value={`${profile?.racha_max || 0} días`}
                    color="#8b5cf6"
                    delay={0.2}
                />
                <StatCard
                    icon={<IconTarget size={20} />}
                    label="Precisión"
                    value={`${(profile?.precision || 0).toFixed(0)}%`}
                    color="#22c55e"
                    delay={0.25}
                />
            </SimpleGrid>

            {/* Additional Stats */}
            <Paper
                p="lg"
                radius="xl"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Text fw={600} mb="md">
                    📊 Estadísticas de aprendizaje
                </Text>
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                    <Box>
                        <Text size="2xl" fw={700} style={{ color: '#00c4dc' }}>
                            {profile?.lecciones_completadas || 0}
                        </Text>
                        <Text size="sm" c="dimmed">
                            Lecciones completadas
                        </Text>
                    </Box>
                    <Box>
                        <Text size="2xl" fw={700} style={{ color: '#00d68f' }}>
                            {profile?.ejercicios_total || 0}
                        </Text>
                        <Text size="sm" c="dimmed">
                            Ejercicios realizados
                        </Text>
                    </Box>
                    <Box>
                        <Text size="2xl" fw={700} style={{ color: '#8b5cf6' }}>
                            {profile?.badges?.length || 0}
                        </Text>
                        <Text size="sm" c="dimmed">
                            Badges obtenidos
                        </Text>
                    </Box>
                </SimpleGrid>
            </Paper>

            {/* Badges Section */}
            <Box>
                <Text fw={700} size="lg" mb="md">
                    🏆 Badges
                </Text>

                {badgesLoading ? (
                    <SimpleGrid cols={{ base: 3, sm: 5 }} spacing="md">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} height={100} radius="xl" />
                        ))}
                    </SimpleGrid>
                ) : allBadges ? (
                    <SimpleGrid cols={{ base: 3, sm: 5 }} spacing="md">
                        {allBadges.map((badge, index) => (
                            <BadgeItem
                                key={badge.badge_id}
                                badge={badge}
                                delay={index * 0.05}
                            />
                        ))}
                    </SimpleGrid>
                ) : (
                    <Text c="dimmed">No hay badges disponibles</Text>
                )}
            </Box>
        </Stack>
    );
}
