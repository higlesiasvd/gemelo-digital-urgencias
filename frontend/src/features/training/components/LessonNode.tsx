// ═══════════════════════════════════════════════════════════════════════════════
// LESSON NODE - Nodo individual del árbol de lecciones
// ═══════════════════════════════════════════════════════════════════════════════

import { Box, Text, ThemeIcon, Tooltip, Group } from '@mantine/core';
import { IconLock, IconCheck, IconStar } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import type { Lesson } from '../hooks/useTraining';

// ═══════════════════════════════════════════════════════════════════════════════
// STARS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function StarsDisplay({ estrellas }: { estrellas: number }) {
    return (
        <Group gap={2}>
            {[1, 2, 3].map((star) => (
                <IconStar
                    key={star}
                    size={12}
                    fill={star <= estrellas ? '#fbbf24' : 'transparent'}
                    color={star <= estrellas ? '#fbbf24' : 'rgba(255,255,255,0.3)'}
                />
            ))}
        </Group>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LessonNodeProps {
    lesson: Lesson;
    onClick: () => void;
    delay?: number;
}

export function LessonNode({ lesson, onClick, delay = 0 }: LessonNodeProps) {
    const isLocked = !lesson.desbloqueada;
    const isCompleted = lesson.completada;
    const inProgress = lesson.ejercicios_completados > 0 && !lesson.completada;

    // Calculate progress percentage
    const progress = lesson.ejercicios_requeridos > 0
        ? (lesson.ejercicios_completados / lesson.ejercicios_requeridos) * 100
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay }}
            whileHover={!isLocked ? { scale: 1.05 } : {}}
            whileTap={!isLocked ? { scale: 0.95 } : {}}
        >
            <Tooltip
                label={isLocked ? 'Completa la lección anterior para desbloquear' : lesson.descripcion}
                position="right"
                withArrow
                multiline
                w={200}
            >
                <Box
                    onClick={isLocked ? undefined : onClick}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                    }}
                >
                    {/* Icon Circle */}
                    <Box
                        style={{
                            position: 'relative',
                            width: 70,
                            height: 70,
                        }}
                    >
                        {/* Progress ring (for in-progress lessons) */}
                        {inProgress && (
                            <svg
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: 70,
                                    height: 70,
                                    transform: 'rotate(-90deg)',
                                }}
                            >
                                <circle
                                    cx="35"
                                    cy="35"
                                    r="32"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="4"
                                />
                                <circle
                                    cx="35"
                                    cy="35"
                                    r="32"
                                    fill="none"
                                    stroke={lesson.color}
                                    strokeWidth="4"
                                    strokeDasharray={`${progress * 2.01} 201`}
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}

                        {/* Main icon */}
                        <ThemeIcon
                            size={70}
                            radius="xl"
                            style={{
                                background: isLocked
                                    ? 'rgba(255,255,255,0.08)'
                                    : isCompleted
                                        ? `linear-gradient(135deg, ${lesson.color} 0%, ${lesson.color}cc 100%)`
                                        : `linear-gradient(135deg, ${lesson.color}40 0%, ${lesson.color}20 100%)`,
                                border: isCompleted
                                    ? `3px solid ${lesson.color}`
                                    : inProgress
                                        ? 'none'
                                        : `2px solid ${isLocked ? 'rgba(255,255,255,0.1)' : lesson.color}40`,
                                boxShadow: isCompleted
                                    ? `0 0 20px ${lesson.color}40`
                                    : 'none',
                            }}
                        >
                            {isLocked ? (
                                <IconLock size={28} style={{ opacity: 0.5 }} />
                            ) : isCompleted ? (
                                <IconCheck size={32} stroke={3} />
                            ) : (
                                <Text size="xl">{lesson.icono}</Text>
                            )}
                        </ThemeIcon>

                        {/* Completion badge */}
                        {isCompleted && (
                            <Box
                                style={{
                                    position: 'absolute',
                                    bottom: -4,
                                    right: -4,
                                    background: '#22c55e',
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #0a1628',
                                }}
                            >
                                <IconCheck size={14} stroke={3} />
                            </Box>
                        )}
                    </Box>

                    {/* Lesson info */}
                    <Box ta="center">
                        <Text size="sm" fw={600} c={isLocked ? 'dimmed' : 'white'}>
                            {lesson.nombre}
                        </Text>

                        {isCompleted && <StarsDisplay estrellas={lesson.estrellas} />}

                        {inProgress && (
                            <Text size="xs" c="dimmed">
                                {lesson.ejercicios_completados}/{lesson.ejercicios_requeridos}
                            </Text>
                        )}

                        {!isLocked && !isCompleted && !inProgress && (
                            <Text size="xs" c={lesson.color}>
                                +{lesson.xp_recompensa} XP
                            </Text>
                        )}
                    </Box>
                </Box>
            </Tooltip>
        </motion.div>
    );
}
