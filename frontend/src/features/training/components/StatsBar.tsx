// ═══════════════════════════════════════════════════════════════════════════════
// STATS BAR - Barra de estadísticas del usuario
// ═══════════════════════════════════════════════════════════════════════════════

import { Group, Paper, Text, ThemeIcon, Tooltip, Skeleton, Badge } from '@mantine/core';
import { IconFlame, IconHeart, IconStar, IconTrophy } from '@tabler/icons-react';
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
}

function StatItem({ icon, value, label, color, iconColor }: StatItemProps) {
    return (
        <Tooltip label={label} position="bottom" withArrow>
            <Group gap={8} style={{ cursor: 'default' }}>
                <ThemeIcon
                    size={32}
                    radius="xl"
                    variant="light"
                    color={iconColor}
                    style={{
                        background: `${color}15`,
                    }}
                >
                    {icon}
                </ThemeIcon>
                <Text fw={700} size="sm" style={{ color }}>
                    {value}
                </Text>
            </Group>
        </Tooltip>
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
                p="sm"
                radius="xl"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Group justify="center" gap="xl">
                    <Skeleton width={80} height={32} radius="xl" />
                    <Skeleton width={80} height={32} radius="xl" />
                    <Skeleton width={80} height={32} radius="xl" />
                    <Skeleton width={80} height={32} radius="xl" />
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
                p="sm"
                px="lg"
                radius="xl"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Group justify="center" gap="xl">
                    <StatItem
                        icon={<IconFlame size={18} />}
                        value={`${user.racha_dias} días`}
                        label="Racha actual"
                        color="#f97316"
                        iconColor="orange"
                    />

                    <StatItem
                        icon={<IconHeart size={18} />}
                        value={`${user.vidas}/5`}
                        label="Vidas restantes"
                        color="#ef4444"
                        iconColor="red"
                    />

                    <StatItem
                        icon={<IconStar size={18} />}
                        value={user.xp_total.toLocaleString()}
                        label="Experiencia total"
                        color="#eab308"
                        iconColor="yellow"
                    />

                    {ranking && (
                        <StatItem
                            icon={<IconTrophy size={18} />}
                            value={`#${ranking}`}
                            label="Posición en ranking"
                            color="#8b5cf6"
                            iconColor="violet"
                        />
                    )}

                    {/* User Level Badge */}
                    <Badge
                        size="lg"
                        radius="xl"
                        variant="gradient"
                        gradient={{ from: 'cyan', to: 'teal', deg: 90 }}
                    >
                        Nivel {user.nivel}
                    </Badge>
                </Group>
            </Paper>
        </motion.div>
    );
}
