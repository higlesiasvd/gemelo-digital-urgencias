// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD PAGE - Ranking de usuarios
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
    Box,
    Stack,
    Paper,
    Text,
    Group,
    Avatar,
    Badge,
    Skeleton,
    Tabs,
    ThemeIcon,
} from '@mantine/core';
import {
    IconTrophy,
    IconFlame,
    IconStar,
    IconCrown,
    IconMedal,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';
import { useLeaderboard, LeaderboardEntry } from './hooks/useTraining';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// RANK BADGE
// ═══════════════════════════════════════════════════════════════════════════════

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <ThemeIcon size="lg" radius="xl" color="yellow">
                <IconCrown size={18} />
            </ThemeIcon>
        );
    }
    if (rank === 2) {
        return (
            <ThemeIcon size="lg" radius="xl" color="gray">
                <IconMedal size={18} />
            </ThemeIcon>
        );
    }
    if (rank === 3) {
        return (
            <ThemeIcon size="lg" radius="xl" style={{ background: '#cd7f32' }}>
                <IconMedal size={18} />
            </ThemeIcon>
        );
    }
    return (
        <Box
            style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text size="sm" fw={600}>
                {rank}
            </Text>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD ENTRY ROW
// ═══════════════════════════════════════════════════════════════════════════════

interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
    delay?: number;
    type: 'global' | 'weekly' | 'streak';
}

function LeaderboardRow({ entry, isCurrentUser, delay = 0, type }: LeaderboardRowProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay }}
        >
            <Paper
                p="md"
                radius="xl"
                style={{
                    background: isCurrentUser
                        ? 'linear-gradient(135deg, rgba(0, 196, 220, 0.15) 0%, rgba(0, 214, 143, 0.15) 100%)'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCurrentUser ? cssVariables.accentPrimary : 'rgba(255,255,255,0.08)'}`,
                }}
            >
                <Group justify="space-between">
                    <Group gap="md">
                        <RankBadge rank={entry.rank} />

                        <Avatar
                            src={entry.avatar_url}
                            size="md"
                            radius="xl"
                            color="cyan"
                        >
                            {entry.nombre?.[0]?.toUpperCase()}
                        </Avatar>

                        <Box>
                            <Group gap="xs">
                                <Text fw={600}>
                                    {entry.nombre}
                                </Text>
                                {isCurrentUser && (
                                    <Badge size="xs" color="cyan" variant="light">
                                        Tú
                                    </Badge>
                                )}
                            </Group>
                            <Text size="xs" c="dimmed">
                                Nivel {entry.nivel} • {entry.badges_count} badges
                            </Text>
                        </Box>
                    </Group>

                    <Group gap="md">
                        {type === 'streak' ? (
                            <Group gap="xs">
                                <IconFlame size={18} color="#f97316" />
                                <Text fw={700} style={{ color: '#f97316' }}>
                                    {entry.racha_dias} días
                                </Text>
                            </Group>
                        ) : (
                            <Group gap="xs">
                                <IconStar size={18} color="#fbbf24" />
                                <Text fw={700} style={{ color: '#fbbf24' }}>
                                    {entry.xp_total.toLocaleString()} XP
                                </Text>
                            </Group>
                        )}
                    </Group>
                </Group>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LeaderboardPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'global' | 'weekly' | 'streak'>('global');

    const { data: globalData, isLoading: globalLoading } = useLeaderboard('global', 50);
    const { data: weeklyData, isLoading: weeklyLoading } = useLeaderboard('weekly', 50);
    const { data: streakData, isLoading: streakLoading } = useLeaderboard('streak', 50);

    const currentData = activeTab === 'global' ? globalData
        : activeTab === 'weekly' ? weeklyData
            : streakData;
    const isLoading = activeTab === 'global' ? globalLoading
        : activeTab === 'weekly' ? weeklyLoading
            : streakLoading;

    return (
        <Stack gap="lg">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Group gap="md" justify="center">
                    <IconTrophy size={32} color="#fbbf24" />
                    <Text
                        size="xl"
                        fw={700}
                        style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        RANKING
                    </Text>
                </Group>
            </motion.div>

            {/* User's current rank */}
            {currentData?.user_rank && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Paper
                        p="md"
                        radius="xl"
                        style={{
                            background: cssVariables.gradientPrimary,
                            textAlign: 'center',
                        }}
                    >
                        <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                            Tu posición actual
                        </Text>
                        <Text size="2xl" fw={700} c="white">
                            #{currentData.user_rank}
                        </Text>
                        <Text size="xs" c="white" style={{ opacity: 0.8 }}>
                            de {currentData.total_users} usuarios
                        </Text>
                    </Paper>
                </motion.div>
            )}

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(v) => setActiveTab(v as 'global' | 'weekly' | 'streak')}
                radius="xl"
                styles={{
                    root: { background: 'transparent' },
                    list: {
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 'var(--mantine-radius-xl)',
                        padding: 4,
                        border: 'none',
                    },
                    tab: {
                        borderRadius: 'var(--mantine-radius-xl)',
                        fontWeight: 600,
                        '&[data-active]': {
                            background: 'rgba(0, 196, 220, 0.2)',
                        },
                    },
                }}
            >
                <Tabs.List grow>
                    <Tabs.Tab value="global" leftSection={<IconStar size={16} />}>
                        Global
                    </Tabs.Tab>
                    <Tabs.Tab value="weekly" leftSection={<IconTrophy size={16} />}>
                        Semanal
                    </Tabs.Tab>
                    <Tabs.Tab value="streak" leftSection={<IconFlame size={16} />}>
                        Rachas
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {/* Leaderboard entries */}
            <Stack gap="sm">
                {isLoading ? (
                    [...Array(10)].map((_, i) => (
                        <Skeleton key={i} height={70} radius="xl" />
                    ))
                ) : currentData?.entries?.length ? (
                    currentData.entries.map((entry, index) => (
                        <LeaderboardRow
                            key={entry.user_id}
                            entry={entry}
                            isCurrentUser={entry.user_id === user?.user_id}
                            delay={index * 0.03}
                            type={activeTab}
                        />
                    ))
                ) : (
                    <Paper
                        p="xl"
                        radius="xl"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            textAlign: 'center',
                        }}
                    >
                        <Text c="dimmed">No hay datos de ranking disponibles</Text>
                    </Paper>
                )}
            </Stack>
        </Stack>
    );
}
