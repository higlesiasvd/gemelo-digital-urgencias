// ═══════════════════════════════════════════════════════════════════════════════
// RESULT MODAL - Modal de resultado tras responder
// ═══════════════════════════════════════════════════════════════════════════════

import {
    Modal,
    Box,
    Text,
    Stack,
    Button,
    Group,
    ThemeIcon,
    Paper,
    Badge,
} from '@mantine/core';
import {
    IconCheck,
    IconX,
    IconStar,
    IconHeart,
    IconTrophy,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRIAGE_LEVELS } from './TriageSelector';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ResultModalProps {
    opened: boolean;
    onClose: () => void;
    onContinue: () => void;
    isCorrect: boolean;
    respuestaCorrecta: string;
    explicacion: string;
    xpObtenido: number;
    vidasRestantes: number;
    badgesDesbloqueados?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ResultModal({
    opened,
    onClose,
    onContinue,
    isCorrect,
    respuestaCorrecta,
    explicacion,
    xpObtenido,
    vidasRestantes,
    badgesDesbloqueados = [],
}: ResultModalProps) {
    const triageLevel = TRIAGE_LEVELS.find((l) => l.id === respuestaCorrecta);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="lg"
            radius="xl"
            centered
            withCloseButton={false}
            overlayProps={{
                backgroundOpacity: 0.7,
                blur: 3,
            }}
            styles={{
                content: {
                    background: 'rgba(10, 22, 40, 0.95)',
                    border: `2px solid ${isCorrect ? '#22c55e' : '#ef4444'}40`,
                },
            }}
        >
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                >
                    <Stack align="center" gap="lg" p="md">
                        {/* Result Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                        >
                            <ThemeIcon
                                size={80}
                                radius="xl"
                                color={isCorrect ? 'green' : 'red'}
                                style={{
                                    boxShadow: `0 0 40px ${isCorrect ? '#22c55e' : '#ef4444'}40`,
                                }}
                            >
                                {isCorrect ? (
                                    <IconCheck size={45} stroke={3} />
                                ) : (
                                    <IconX size={45} stroke={3} />
                                )}
                            </ThemeIcon>
                        </motion.div>

                        {/* Result Title */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Text
                                size="xl"
                                fw={700}
                                style={{
                                    color: isCorrect ? '#22c55e' : '#ef4444',
                                }}
                            >
                                {isCorrect ? '¡CORRECTO!' : 'INCORRECTO'}
                            </Text>
                        </motion.div>

                        {/* XP Gained / Lives Lost */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Group gap="xl">
                                {isCorrect && xpObtenido > 0 && (
                                    <Group gap="xs">
                                        <IconStar size={20} color="#fbbf24" fill="#fbbf24" />
                                        <Text fw={700} size="lg" style={{ color: '#fbbf24' }}>
                                            +{xpObtenido} XP
                                        </Text>
                                    </Group>
                                )}

                                {!isCorrect && (
                                    <Group gap="xs">
                                        <IconHeart size={20} color="#ef4444" />
                                        <Text fw={600} c="red">
                                            {vidasRestantes} vidas restantes
                                        </Text>
                                    </Group>
                                )}
                            </Group>
                        </motion.div>

                        {/* Correct Answer */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            style={{ width: '100%' }}
                        >
                            <Paper
                                p="md"
                                radius="lg"
                                style={{
                                    background: `${triageLevel?.color || '#666'}15`,
                                    border: `1px solid ${triageLevel?.color || '#666'}40`,
                                }}
                            >
                                <Stack gap="xs">
                                    <Group gap="sm">
                                        <Box
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                background: triageLevel?.color || '#666',
                                            }}
                                        />
                                        <Text fw={600} style={{ color: triageLevel?.color }}>
                                            Respuesta correcta: {triageLevel?.nombre || respuestaCorrecta.toUpperCase()}
                                        </Text>
                                    </Group>
                                </Stack>
                            </Paper>
                        </motion.div>

                        {/* Explanation */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            style={{ width: '100%' }}
                        >
                            <Paper
                                p="md"
                                radius="lg"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <Stack gap="xs">
                                    <Text size="sm" fw={600} c="dimmed">
                                        📖 Explicación:
                                    </Text>
                                    <Text size="sm" style={{ lineHeight: 1.6 }}>
                                        {explicacion}
                                    </Text>
                                </Stack>
                            </Paper>
                        </motion.div>

                        {/* Badges Unlocked */}
                        {badgesDesbloqueados.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6, type: 'spring' }}
                            >
                                <Paper
                                    p="md"
                                    radius="lg"
                                    style={{
                                        background: 'linear-gradient(135deg, #fbbf2420 0%, #8b5cf620 100%)',
                                        border: '1px solid #fbbf2440',
                                    }}
                                >
                                    <Group gap="sm">
                                        <IconTrophy size={24} color="#fbbf24" />
                                        <Text fw={600} style={{ color: '#fbbf24' }}>
                                            ¡Badge desbloqueado!
                                        </Text>
                                    </Group>
                                    <Group gap="xs" mt="sm">
                                        {badgesDesbloqueados.map((badge) => (
                                            <Badge key={badge} color="yellow" variant="light">
                                                {badge}
                                            </Badge>
                                        ))}
                                    </Group>
                                </Paper>
                            </motion.div>
                        )}

                        {/* Continue Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            style={{ width: '100%' }}
                        >
                            <Button
                                fullWidth
                                size="lg"
                                radius="xl"
                                onClick={onContinue}
                                style={{
                                    background: isCorrect
                                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    height: 52,
                                }}
                            >
                                Continuar
                            </Button>
                        </motion.div>
                    </Stack>
                </motion.div>
            </AnimatePresence>
        </Modal>
    );
}
