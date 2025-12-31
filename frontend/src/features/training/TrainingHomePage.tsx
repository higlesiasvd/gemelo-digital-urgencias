// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING HOME PAGE - Dashboard estilo Duolingo con path visual de lecciones
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Box, Stack, Paper, Group, Text, Button, Skeleton, SimpleGrid, Badge, ThemeIcon, RingProgress, Avatar, Progress } from '@mantine/core';
import {
    IconTarget, IconChevronRight, IconFlame, IconHeart, IconStar, IconTrophy,
    IconLock, IconCheck, IconBook, IconAlertTriangle,
    IconStethoscope, IconHeartbeat, IconBrain, IconBabyCarriage,
    IconOld, IconFirstAidKit, IconActivityHeartbeat, IconClock
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLessons, useLeaderboard, useGamificationStats } from './hooks/useTraining';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// ICON MAPPING - Iconos descriptivos por tipo de lección
// ═══════════════════════════════════════════════════════════════════════════════

const LESSON_ICONS: Record<string, React.ReactNode> = {
    'fundamentos': <IconBook size={28} />,
    'niveles': <IconAlertTriangle size={28} />,
    'discriminadores': <IconStethoscope size={28} />,
    'dolor_toracico': <IconHeartbeat size={28} />,
    'disnea': <IconActivityHeartbeat size={28} />,
    'neurologico': <IconBrain size={28} />,
    'pediatrico': <IconBabyCarriage size={28} />,
    'geriatrico': <IconOld size={28} />,
    'trauma': <IconFirstAidKit size={28} />,
    'default': <IconBook size={28} />,
};

// Helper para obtener icono por código de lección
const getLessonIcon = (codigo: string) => {
    return LESSON_ICONS[codigo] || LESSON_ICONS['default'];
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE TIMER HOOK - Timer persistente basado en localStorage
// ═══════════════════════════════════════════════════════════════════════════════

const LIFE_REGEN_MS = 30 * 60 * 1000; // 30 minutos por vida
const STORAGE_KEY = 'life_lost_timestamp';

function useLifeTimer(currentLives: number, maxLives: number = 5) {
    const [timeUntilNextLife, setTimeUntilNextLife] = useState<number>(0);

    useEffect(() => {
        if (currentLives >= maxLives) {
            localStorage.removeItem(STORAGE_KEY);
            setTimeUntilNextLife(0);
            return;
        }

        // Obtener timestamp guardado de cuando se perdió la vida
        let lostTimestamp = localStorage.getItem(STORAGE_KEY);
        if (!lostTimestamp) {
            lostTimestamp = Date.now().toString();
            localStorage.setItem(STORAGE_KEY, lostTimestamp);
        }

        const updateTimer = () => {
            const storedTime = parseInt(localStorage.getItem(STORAGE_KEY) || Date.now().toString());
            const elapsed = Date.now() - storedTime;
            const remaining = LIFE_REGEN_MS - (elapsed % LIFE_REGEN_MS);
            setTimeUntilNextLife(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [currentLives, maxLives]);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return {
        timeUntilNextLife,
        formattedTime: formatTime(timeUntilNextLife),
        progress: ((LIFE_REGEN_MS - timeUntilNextLife) / LIFE_REGEN_MS) * 100,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENT (smaller stats)
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    subtext?: string;
}

function StatCard({ icon, label, value, color, subtext }: StatCardProps) {
    return (
        <Paper
            p="md"
            radius="xl"
            style={{
                background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                border: `1px solid ${color}30`,
            }}
        >
            <Group gap="sm">
                <ThemeIcon size={44} radius="xl" style={{ background: `${color}20`, color }}>
                    {icon}
                </ThemeIcon>
                <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{label}</Text>
                    <Text size="xl" fw={800} style={{ color }}>{value}</Text>
                    {subtext && <Text size="xs" c="dimmed">{subtext}</Text>}
                </Box>
            </Group>
        </Paper>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON PATH NODE (Duolingo style)
// ═══════════════════════════════════════════════════════════════════════════════

interface LessonNodeProps {
    lesson: {
        lesson_id: string;
        titulo: string;
        codigo: string;
        orden: number;
        xp_reward: number;
        completed?: boolean;
        unlocked?: boolean;
    };
    isFirst?: boolean;
    position: 'left' | 'center' | 'right';
}

function LessonPathNode({ lesson, isFirst, position }: LessonNodeProps) {
    const navigate = useNavigate();
    const isCompleted = lesson.completed;
    const isLocked = !lesson.unlocked;
    const isCurrent = lesson.unlocked && !lesson.completed;

    // Position offset for zig-zag path
    const offsetX = position === 'left' ? -60 : position === 'right' ? 60 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: lesson.orden * 0.1 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                transform: `translateX(${offsetX}px)`,
            }}
        >
            {/* Connection line to previous */}
            {!isFirst && (
                <Box
                    style={{
                        position: 'absolute',
                        top: -40,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 40,
                        background: isCompleted || isCurrent
                            ? 'linear-gradient(180deg, #8b5cf6 0%, #a78bfa 100%)'
                            : 'rgba(255,255,255,0.1)',
                        borderRadius: 4,
                    }}
                />
            )}

            {/* Node button */}
            <motion.div
                whileHover={!isLocked ? { scale: 1.08 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
            >
                <Box
                    onClick={() => !isLocked && navigate(`/formacion/leccion/${lesson.lesson_id}`)}
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        background: isCompleted
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : isCurrent
                                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                                : 'rgba(255,255,255,0.05)',
                        border: isCurrent
                            ? '4px solid rgba(139, 92, 246, 0.5)'
                            : isCompleted
                                ? '4px solid rgba(34, 197, 94, 0.5)'
                                : '3px solid rgba(255,255,255,0.1)',
                        boxShadow: isCurrent
                            ? '0 0 30px rgba(139, 92, 246, 0.4)'
                            : isCompleted
                                ? '0 0 20px rgba(34, 197, 94, 0.3)'
                                : 'none',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {isLocked ? (
                        <IconLock size={28} color="rgba(255,255,255,0.3)" />
                    ) : isCompleted ? (
                        <IconCheck size={32} color="#fff" strokeWidth={3} />
                    ) : (
                        getLessonIcon(lesson.codigo)
                    )}
                </Box>
            </motion.div>

            {/* Label */}
            <Text
                size="sm"
                fw={isCurrent ? 700 : 500}
                mt="sm"
                ta="center"
                style={{
                    color: isLocked ? 'rgba(255,255,255,0.3)' : isCurrent ? '#a78bfa' : '#fff',
                    maxWidth: 120,
                }}
            >
                {lesson.titulo}
            </Text>

            {/* XP badge */}
            {!isLocked && (
                <Badge
                    size="sm"
                    variant={isCompleted ? 'filled' : 'light'}
                    color={isCompleted ? 'green' : 'violet'}
                    mt={4}
                >
                    +{lesson.xp_reward} XP
                </Badge>
            )}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function LeaderboardPreview() {
    const { data: leaderboard, isLoading } = useLeaderboard('weekly', 5);
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Paper p="lg" radius="xl" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Skeleton height={150} radius="md" />
            </Paper>
        );
    }

    return (
        <Paper
            p="lg"
            radius="xl"
            style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
            }}
        >
            <Group justify="space-between" mb="md">
                <Group gap="sm">
                    <IconTrophy size={22} color="#fbbf24" />
                    <Text fw={700}>Ranking Semanal</Text>
                </Group>
                <Button
                    variant="subtle"
                    size="xs"
                    rightSection={<IconChevronRight size={14} />}
                    onClick={() => navigate('/formacion/ranking')}
                >
                    Ver todo
                </Button>
            </Group>

            <Stack gap="sm">
                {leaderboard?.entries?.slice(0, 5).map((user: any, index: number) => (
                    <Group key={user.user_id} justify="space-between" p="xs" style={{
                        background: index === 0 ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                        borderRadius: 12,
                    }}>
                        <Group gap="sm">
                            <Text fw={700} w={20} ta="center" c={index < 3 ? 'yellow' : 'dimmed'}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                            </Text>
                            <Avatar size={32} radius="xl" color="violet">
                                {user.nombre?.[0]}
                            </Avatar>
                            <Text size="sm" fw={500}>{user.nombre}</Text>
                        </Group>
                        <Badge color="yellow" variant="light">{user.xp_total} XP</Badge>
                    </Group>
                ))}
            </Stack>
        </Paper>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TrainingHomePage() {
    const { data: lessons, isLoading } = useLessons();
    const { data: stats } = useGamificationStats();

    // Timer persistente para recuperación de vidas
    const currentLives = stats?.vidas_actuales || 5;
    const lifeTimer = useLifeTimer(currentLives, 5);

    // Mock positions for zig-zag path
    const getPosition = (index: number): 'left' | 'center' | 'right' => {
        const positions: ('left' | 'center' | 'right')[] = ['center', 'right', 'center', 'left', 'center', 'right'];
        return positions[index % positions.length];
    };

    return (
        <Stack gap="xl">
            {/* ═══════════════════════════════════════════════════════════════════
                TOP STATS ROW
            ═══════════════════════════════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    <StatCard
                        icon={<IconFlame size={24} />}
                        label="Racha"
                        value={stats?.racha_actual || 0}
                        color="#f97316"
                        subtext="días seguidos"
                    />
                    {/* Vida con timer de recuperación */}
                    <Paper
                        p="md"
                        radius="xl"
                        style={{
                            background: 'linear-gradient(135deg, #ef444415 0%, #ef444408 100%)',
                            border: '1px solid #ef444430',
                        }}
                    >
                        <Group gap="sm">
                            <ThemeIcon size={44} radius="xl" style={{ background: '#ef444420', color: '#ef4444' }}>
                                <IconHeart size={24} />
                            </ThemeIcon>
                            <Box style={{ flex: 1 }}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Vidas</Text>
                                <Text size="xl" fw={800} style={{ color: '#ef4444' }}>
                                    {currentLives}
                                    <span style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.6 }}>/5</span>
                                </Text>
                                {currentLives < 5 && (
                                    <Group gap={4} mt={4}>
                                        <IconClock size={12} color="#ef4444" />
                                        <Text size="xs" c="red.4">{lifeTimer.formattedTime}</Text>
                                        <Progress
                                            value={lifeTimer.progress}
                                            size="xs"
                                            color="red"
                                            style={{ flex: 1, maxWidth: 50 }}
                                        />
                                    </Group>
                                )}
                            </Box>
                        </Group>
                    </Paper>
                    <StatCard
                        icon={<IconStar size={24} />}
                        label="XP Total"
                        value={stats?.xp_total || 0}
                        color="#8b5cf6"
                        subtext={`Nivel ${stats?.nivel_actual || 1}`}
                    />
                    <StatCard
                        icon={<IconBook size={24} />}
                        label="Lecciones"
                        value={`${stats?.lecciones_completadas || 0}/${lessons?.length || 0}`}
                        color="#0ea5e9"
                        subtext="completadas"
                    />
                </SimpleGrid>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════════
                MAIN CONTENT: Lesson Path + Sidebar
            ═══════════════════════════════════════════════════════════════════ */}
            <Group align="flex-start" gap="xl" style={{ flexWrap: 'nowrap' }}>
                {/* Lesson Path - Main Column */}
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <Paper
                        p="xl"
                        radius="xl"
                        style={{
                            background: cssVariables.glassBg,
                            border: `1px solid ${cssVariables.glassBorder}`,
                        }}
                    >
                        <Group justify="space-between" mb="xl">
                            <Box>
                                <Text fw={700} size="xl">Tu Camino de Aprendizaje</Text>
                                <Text size="sm" c="dimmed">Completa las lecciones para dominar el triaje Manchester</Text>
                            </Box>
                            <Badge size="lg" color="violet" variant="light">
                                Sistema Manchester
                            </Badge>
                        </Group>

                        {/* Lesson Path */}
                        {isLoading ? (
                            <Stack gap="xl" py="xl" align="center">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} height={80} width={80} radius="xl" />
                                ))}
                            </Stack>
                        ) : (
                            <Stack gap="xl" py="lg" align="center">
                                {lessons?.map((lesson: any, index: number) => (
                                    <LessonPathNode
                                        key={lesson.lesson_id}
                                        lesson={{
                                            ...lesson,
                                            completed: lesson.completada,
                                            unlocked: index === 0 || lessons[index - 1]?.completada,
                                        }}
                                        isFirst={index === 0}
                                        position={getPosition(index)}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Paper>
                </Box>

                {/* Sidebar - Right Column */}
                <Box w={320} visibleFrom="md">
                    <Stack gap="md">
                        {/* Daily Challenge */}
                        <Paper
                            p="lg"
                            radius="xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0, 196, 220, 0.1) 0%, rgba(0, 214, 143, 0.1) 100%)',
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Group gap="md" mb="md">
                                <ThemeIcon size={48} radius="xl" style={{ background: cssVariables.gradientSuccess }}>
                                    <IconTarget size={26} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={700} size="lg">Desafío Diario</Text>
                                    <Text size="sm" c="dimmed">5 casos aleatorios</Text>
                                </Box>
                            </Group>
                            <Button
                                fullWidth
                                radius="xl"
                                size="md"
                                rightSection={<IconChevronRight size={18} />}
                                style={{ background: cssVariables.gradientSuccess }}
                            >
                                Empezar Desafío
                            </Button>
                        </Paper>

                        {/* Leaderboard Preview */}
                        <LeaderboardPreview />

                        {/* Progress Ring */}
                        <Paper
                            p="lg"
                            radius="xl"
                            style={{
                                background: cssVariables.glassBg,
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Group justify="center" mb="md">
                                <RingProgress
                                    size={120}
                                    thickness={12}
                                    roundCaps
                                    sections={[
                                        { value: ((stats?.lecciones_completadas || 0) / (lessons?.length || 1)) * 100, color: 'violet' },
                                    ]}
                                    label={
                                        <Text ta="center" fw={700} size="xl">
                                            {Math.round(((stats?.lecciones_completadas || 0) / (lessons?.length || 1)) * 100)}%
                                        </Text>
                                    }
                                />
                            </Group>
                            <Text ta="center" fw={600}>Progreso del Curso</Text>
                            <Text ta="center" size="sm" c="dimmed">
                                {stats?.lecciones_completadas || 0} de {lessons?.length || 0} lecciones
                            </Text>
                        </Paper>
                    </Stack>
                </Box>
            </Group>
        </Stack>
    );
}
