// ═══════════════════════════════════════════════════════════════════════════════
// STATS BAR - Barra de estadísticas del usuario con timer de vidas
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Group, Paper, Text, ThemeIcon, Tooltip, Skeleton, Badge, Box, Progress } from '@mantine/core';
import { IconFlame, IconHeart, IconStar, IconTrophy, IconClock } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// STAT ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StatItemProps {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color: string;
    iconColor: string;
    extra?: React.ReactNode;
}

function StatItem({ icon, value, label, color, iconColor, extra }: StatItemProps) {
    return (
        <Tooltip label={label} position="bottom" withArrow>
            <Group gap={8} style={{ cursor: 'default' }}>
                <ThemeIcon
                    size={36}
                    radius="xl"
                    variant="light"
                    color={iconColor}
                    style={{
                        background: `${color}20`,
                        border: `1px solid ${color}40`,
                    }}
                >
                    {icon}
                </ThemeIcon>
                <Box>
                    <Text fw={700} size="sm" style={{ color }}>
                        {value}
                    </Text>
                    {extra}
                </Box>
            </Group>
        </Tooltip>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVES TIMER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LivesTimerProps {
    currentLives: number;
    maxLives?: number;
}

function LivesTimer({ currentLives, maxLives = 5 }: LivesTimerProps) {
    const [timeToNextLife, setTimeToNextLife] = useState(0);
    const LIFE_REGEN_TIME = 30 * 60; // 30 minutes in seconds

    useEffect(() => {
        if (currentLives >= maxLives) {
            setTimeToNextLife(0);
            return;
        }

        // Initialize with remaining time (simulated - in production would come from backend)
        const savedTime = localStorage.getItem('lifeRegenTime');
        const now = Date.now();

        if (savedTime) {
            const remainingMs = parseInt(savedTime) - now;
            if (remainingMs > 0) {
                setTimeToNextLife(Math.ceil(remainingMs / 1000));
            } else {
                // Time passed, set new timer
                localStorage.setItem('lifeRegenTime', (now + LIFE_REGEN_TIME * 1000).toString());
                setTimeToNextLife(LIFE_REGEN_TIME);
            }
        } else {
            localStorage.setItem('lifeRegenTime', (now + LIFE_REGEN_TIME * 1000).toString());
            setTimeToNextLife(LIFE_REGEN_TIME);
        }
    }, [currentLives, maxLives]);

    useEffect(() => {
        if (timeToNextLife <= 0 || currentLives >= maxLives) return;

        const interval = setInterval(() => {
            setTimeToNextLife((prev) => {
                if (prev <= 1) {
                    // Would trigger life restoration here
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeToNextLife, currentLives, maxLives]);

    if (currentLives >= maxLives) return null;

    const minutes = Math.floor(timeToNextLife / 60);
    const seconds = timeToNextLife % 60;
    const progress = ((LIFE_REGEN_TIME - timeToNextLife) / LIFE_REGEN_TIME) * 100;

    return (
        <Box>
            <Group gap={4}>
                <IconClock size={10} color="#9ca3af" />
                <Text size="xs" c="dimmed">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                </Text>
            </Group>
            <Progress
                value={progress}
                size={3}
                color="red"
                mt={2}
                style={{ width: 50 }}
            />
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StatsBarProps {
    ranking?: number | null;
    isLoading?: boolean;
}

export function StatsBar({ ranking, isLoading }: StatsBarProps) {
    const { user } = useAuth();

    if (isLoading) {
        return (
            <Paper
                p="md"
                radius="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(13, 31, 60, 0.9) 0%, rgba(10, 22, 40, 0.9) 100%)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                    backdropFilter: 'blur(20px)',
                }}
            >
                <Group justify="center" gap="xl">
                    <Skeleton width={100} height={36} radius="xl" />
                    <Skeleton width={100} height={36} radius="xl" />
                    <Skeleton width={100} height={36} radius="xl" />
                    <Skeleton width={80} height={28} radius="xl" />
                </Group>
            </Paper>
        );
    }

    if (!user) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                p="md"
                px="xl"
                radius="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(13, 31, 60, 0.95) 0%, rgba(10, 22, 40, 0.95) 100%)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
            >
                <Group justify="center" gap="xl">
                    {/* Streak */}
                    <StatItem
                        icon={<IconFlame size={20} />}
                        value={`${user.racha_dias} días`}
                        label="Racha actual"
                        color="#f97316"
                        iconColor="orange"
                    />

                    {/* Lives with Timer */}
                    <StatItem
                        icon={<IconHeart size={20} />}
                        value={`${user.vidas}/5`}
                        label={user.vidas < 5 ? "Vidas (regenerándose)" : "Vidas restantes"}
                        color={user.vidas > 2 ? "#ef4444" : "#dc2626"}
                        iconColor="red"
                        extra={<LivesTimer currentLives={user.vidas} />}
                    />

                    {/* XP */}
                    <StatItem
                        icon={<IconStar size={20} />}
                        value={user.xp_total.toLocaleString()}
                        label="Experiencia total"
                        color="#eab308"
                        iconColor="yellow"
                    />

                    {/* Ranking */}
                    {ranking && (
                        <StatItem
                            icon={<IconTrophy size={20} />}
                            value={`#${ranking}`}
                            label="Posición en ranking"
                            color="#8b5cf6"
                            iconColor="violet"
                        />
                    )}

                    {/* User Level Badge */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Badge
                            size="lg"
                            radius="xl"
                            variant="gradient"
                            gradient={{ from: 'cyan', to: 'teal', deg: 90 }}
                            style={{
                                padding: '12px 20px',
                                fontSize: 14,
                                fontWeight: 700,
                                boxShadow: '0 4px 16px rgba(0, 196, 220, 0.3)',
                            }}
                        >
                            NIVEL {user.nivel}
                        </Badge>
                    </motion.div>
                </Group>
            </Paper>
        </motion.div>
    );
}
