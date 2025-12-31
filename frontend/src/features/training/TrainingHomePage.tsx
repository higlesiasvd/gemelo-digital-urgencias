// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING HOME PAGE - Dashboard estilo Duolingo
// ═══════════════════════════════════════════════════════════════════════════════

import { Box, Stack, Paper, Group, Text, Button, Skeleton } from '@mantine/core';
import { IconTarget, IconChevronRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StatsBar, LessonTree } from './components';
import { useLessons, useLeaderboard } from './hooks/useTraining';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY CHALLENGE CARD
// ═══════════════════════════════════════════════════════════════════════════════

function DailyChallengeCard() {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
        >
            <Paper
                p="lg"
                radius="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 196, 220, 0.1) 0%, rgba(0, 214, 143, 0.1) 100%)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="md">
                        <Box
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: 12,
                                background: cssVariables.gradientSuccess,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <IconTarget size={28} />
                        </Box>
                        <Box>
                            <Text fw={700} size="lg">
                                🎯 Práctica diaria
                            </Text>
                            <Text size="sm" c="dimmed">
                                Mantén tu racha con 5 ejercicios rápidos
                            </Text>
                        </Box>
                    </Group>

                    <Button
                        radius="xl"
                        size="md"
                        rightSection={<IconChevronRight size={18} />}
                        style={{
                            background: cssVariables.gradientSuccess,
                        }}
                        onClick={() => {
                            // Navigate to first unlocked lesson
                            navigate('/formacion');
                        }}
                    >
                        Empezar
                    </Button>
                </Group>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TrainingHomePage() {
    const { data: lessons, isLoading: lessonsLoading } = useLessons();
    const { data: leaderboard } = useLeaderboard('global', 50);

    return (
        <Stack gap="xl">
            {/* Stats Bar */}
            <StatsBar
                ranking={leaderboard?.user_rank}
                isLoading={lessonsLoading}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <Text
                    size="xl"
                    fw={700}
                    ta="center"
                    style={{
                        background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    📚 LECCIONES
                </Text>
            </motion.div>

            {/* Lesson Tree */}
            <Box py="md">
                {lessonsLoading ? (
                    <Stack align="center" gap="md">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} height={100} width={150} radius="xl" />
                        ))}
                    </Stack>
                ) : lessons ? (
                    <LessonTree lessons={lessons} />
                ) : (
                    <Text c="dimmed" ta="center">
                        No hay lecciones disponibles
                    </Text>
                )}
            </Box>

            {/* Daily Challenge */}
            <DailyChallengeCard />
        </Stack>
    );
}
