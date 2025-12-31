// ═══════════════════════════════════════════════════════════════════════════════
// LESSON PAGE - Página de ejercicios de una lección
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Stack,
    Paper,
    Text,
    Group,
    ActionIcon,
    Progress,
    Badge,
    Skeleton,
    Button,
    Alert,
} from '@mantine/core';
import { IconX, IconHeart, IconAlertCircle } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TriageSelector, ResultModal } from './components';
import { useLessonExercises, useLessons, useSubmitAnswer } from './hooks/useTraining';
import type { ClinicalCase, SubmitAnswerResponse } from './hooks/useTraining';
import { useAuth } from '@/features/auth';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL CASE CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface ClinicalCaseCardProps {
    clinicalCase: ClinicalCase;
}

function ClinicalCaseCard({ clinicalCase }: ClinicalCaseCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                p="lg"
                radius="xl"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <Stack gap="md">
                    {/* Patient header */}
                    <Group gap="md">
                        <Badge size="lg" variant="light" color="cyan">
                            👤 {clinicalCase.paciente_sexo === 'Mujer' ? 'Mujer' : 'Varón'}, {clinicalCase.paciente_edad} años
                        </Badge>
                    </Group>

                    {/* Chief complaint */}
                    <Box>
                        <Text size="sm" c="dimmed" mb={4}>
                            📋 Motivo de consulta:
                        </Text>
                        <Text size="md" fw={500} style={{ fontStyle: 'italic' }}>
                            "{clinicalCase.motivo_consulta}"
                        </Text>
                    </Box>

                    {/* Symptoms */}
                    <Box>
                        <Text size="sm" c="dimmed" mb={4}>
                            🩺 Síntomas:
                        </Text>
                        <Stack gap={4}>
                            {clinicalCase.sintomas.map((sintoma, idx) => (
                                <Text key={idx} size="sm">
                                    • {sintoma}
                                </Text>
                            ))}
                        </Stack>
                    </Box>

                    {/* Vital signs */}
                    {clinicalCase.constantes_vitales && (
                        <Box>
                            <Text size="sm" c="dimmed" mb={4}>
                                📊 Constantes vitales:
                            </Text>
                            <Group gap="md">
                                {clinicalCase.constantes_vitales.pa && (
                                    <Badge variant="outline" color="gray">
                                        PA: {clinicalCase.constantes_vitales.pa}
                                    </Badge>
                                )}
                                {clinicalCase.constantes_vitales.fc && (
                                    <Badge variant="outline" color="gray">
                                        FC: {clinicalCase.constantes_vitales.fc}
                                    </Badge>
                                )}
                                {clinicalCase.constantes_vitales.sato2 && (
                                    <Badge variant="outline" color="gray">
                                        SatO2: {clinicalCase.constantes_vitales.sato2}%
                                    </Badge>
                                )}
                                {clinicalCase.constantes_vitales.temp && (
                                    <Badge variant="outline" color="gray">
                                        Temp: {clinicalCase.constantes_vitales.temp}°C
                                    </Badge>
                                )}
                            </Group>
                        </Box>
                    )}

                    {/* Medical history */}
                    {clinicalCase.antecedentes && (
                        <Box>
                            <Text size="sm" c="dimmed" mb={4}>
                                📁 Antecedentes:
                            </Text>
                            <Text size="sm">{clinicalCase.antecedentes}</Text>
                        </Box>
                    )}
                </Stack>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LessonPage() {
    const { id: lessonId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    // State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [lastResult, setLastResult] = useState<SubmitAnswerResponse | null>(null);

    // Queries
    const { data: lessons } = useLessons();
    const { data: exercises, isLoading, error } = useLessonExercises(lessonId || '', 10);
    const submitAnswer = useSubmitAnswer();

    // Get current lesson info
    const currentLesson = lessons?.find((l) => l.lesson_id === lessonId);

    // Get current exercise
    const currentExercise = exercises?.[currentIndex];

    // Total exercises
    const totalExercises = exercises?.length || 0;
    const progress = totalExercises > 0 ? ((currentIndex + 1) / totalExercises) * 100 : 0;

    // Reset start time when exercise changes
    useEffect(() => {
        setStartTime(Date.now());
    }, [currentIndex]);

    // Handle answer submission
    const handleSelectTriage = useCallback(async (triageId: string) => {
        if (!currentExercise || isSubmitting || !user) return;

        const timeTaken = Date.now() - startTime;
        setIsSubmitting(true);

        try {
            const result = await submitAnswer.mutateAsync({
                case_id: currentExercise.case_id,
                respuesta: triageId,
                tiempo_ms: timeTaken,
            });

            setLastResult(result);
            setResultModalOpen(true);
            refreshUser();
        } catch (err) {
            console.error('Error submitting answer:', err);
        } finally {
            setIsSubmitting(false);
        }
    }, [currentExercise, isSubmitting, startTime, submitAnswer, user, refreshUser]);

    // Handle continue after modal
    const handleContinue = useCallback(() => {
        setResultModalOpen(false);
        setLastResult(null);

        // Check if out of lives
        if (lastResult && lastResult.vidas_restantes <= 0) {
            navigate('/formacion');
            return;
        }

        // Move to next exercise or finish
        if (currentIndex < totalExercises - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // Lesson complete
            navigate('/formacion');
        }
    }, [currentIndex, totalExercises, lastResult, navigate]);

    // Handle exit
    const handleExit = () => {
        navigate('/formacion');
    };

    // Loading state
    if (isLoading) {
        return (
            <Stack gap="lg">
                <Skeleton height={20} radius="xl" />
                <Skeleton height={300} radius="xl" />
                <Skeleton height={100} radius="xl" />
            </Stack>
        );
    }

    // Error state
    if (error || !exercises || exercises.length === 0) {
        return (
            <Alert
                icon={<IconAlertCircle size={16} />}
                title="Error"
                color="red"
                radius="xl"
            >
                No se pudieron cargar los ejercicios. Por favor, inténtalo de nuevo.
                <Button
                    mt="md"
                    variant="light"
                    color="red"
                    onClick={() => navigate('/formacion')}
                >
                    Volver
                </Button>
            </Alert>
        );
    }

    // No lives state
    if (user && user.vidas <= 0) {
        return (
            <Stack align="center" gap="lg" py="xl">
                <Text size="4rem">💔</Text>
                <Text size="xl" fw={700} ta="center">
                    ¡Te has quedado sin vidas!
                </Text>
                <Text c="dimmed" ta="center">
                    Las vidas se regeneran con el tiempo. Vuelve más tarde para seguir practicando.
                </Text>
                <Button
                    size="lg"
                    radius="xl"
                    onClick={() => navigate('/formacion')}
                    style={{ background: cssVariables.gradientPrimary }}
                >
                    Volver al inicio
                </Button>
            </Stack>
        );
    }

    return (
        <Stack gap="lg">
            {/* Header with progress */}
            <Group justify="space-between" align="center">
                <ActionIcon
                    variant="subtle"
                    size="lg"
                    radius="xl"
                    onClick={handleExit}
                >
                    <IconX size={20} />
                </ActionIcon>

                <Box style={{ flex: 1, maxWidth: 400 }}>
                    <Text size="xs" c="dimmed" ta="center" mb={4}>
                        {currentLesson?.nombre || 'Lección'}
                    </Text>
                    <Progress
                        value={progress}
                        size="md"
                        radius="xl"
                        color="cyan"
                        animated
                    />
                </Box>

                <Group gap="xs">
                    <IconHeart
                        size={20}
                        color="#ef4444"
                        fill={user && user.vidas > 0 ? '#ef4444' : 'transparent'}
                    />
                    <Text fw={700} c="red">
                        {user?.vidas || 0}/5
                    </Text>
                </Group>
            </Group>

            {/* Question number */}
            <Text ta="center" c="dimmed" size="sm">
                Pregunta {currentIndex + 1} de {totalExercises}
            </Text>

            {/* Clinical case */}
            <AnimatePresence mode="wait">
                {currentExercise && (
                    <ClinicalCaseCard
                        key={currentExercise.case_id}
                        clinicalCase={currentExercise}
                    />
                )}
            </AnimatePresence>

            {/* Triage selector */}
            <Box mt="md">
                <TriageSelector
                    onSelect={handleSelectTriage}
                    disabled={isSubmitting}
                />
            </Box>

            {/* Result modal */}
            {lastResult && (
                <ResultModal
                    opened={resultModalOpen}
                    onClose={() => setResultModalOpen(false)}
                    onContinue={handleContinue}
                    isCorrect={lastResult.es_correcta}
                    respuestaCorrecta={lastResult.respuesta_correcta}
                    explicacion={lastResult.explicacion}
                    xpObtenido={lastResult.xp_obtenido}
                    vidasRestantes={lastResult.vidas_restantes}
                    badgesDesbloqueados={lastResult.badges_desbloqueados}
                />
            )}
        </Stack>
    );
}
