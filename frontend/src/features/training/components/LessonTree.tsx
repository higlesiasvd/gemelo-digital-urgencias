// ═══════════════════════════════════════════════════════════════════════════════
// LESSON TREE - Árbol visual de lecciones
// ═══════════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { Box, Stack, Skeleton } from '@mantine/core';
import { LessonNode } from './LessonNode';
import type { Lesson } from '../hooks/useTraining';

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR LINE
// ═══════════════════════════════════════════════════════════════════════════════

interface ConnectorProps {
    color: string;
    isActive: boolean;
}

function Connector({ color, isActive }: ConnectorProps) {
    return (
        <Box
            style={{
                width: 3,
                height: 40,
                background: isActive
                    ? `linear-gradient(180deg, ${color} 0%, ${color}60 100%)`
                    : 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                margin: '0 auto',
            }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LessonTreeProps {
    lessons: Lesson[];
    isLoading?: boolean;
}

export function LessonTree({ lessons, isLoading }: LessonTreeProps) {
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Stack align="center" gap="sm">
                {[1, 2, 3, 4].map((i) => (
                    <Box key={i}>
                        <Skeleton height={70} width={70} radius="xl" />
                        <Box h={40} />
                    </Box>
                ))}
            </Stack>
        );
    }

    // Sort lessons by order
    const sortedLessons = [...lessons].sort((a, b) => a.orden - b.orden);

    return (
        <Stack align="center" gap={0}>
            {sortedLessons.map((lesson, index) => (
                <Box key={lesson.lesson_id}>
                    <LessonNode
                        lesson={lesson}
                        onClick={() => navigate(`/formacion/leccion/${lesson.lesson_id}`)}
                        delay={index * 0.1}
                    />

                    {/* Connector to next lesson */}
                    {index < sortedLessons.length - 1 && (
                        <Connector
                            color={lesson.color}
                            isActive={lesson.completada || lesson.ejercicios_completados > 0}
                        />
                    )}
                </Box>
            ))}
        </Stack>
    );
}
