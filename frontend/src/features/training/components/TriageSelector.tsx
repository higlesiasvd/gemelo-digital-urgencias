// ═══════════════════════════════════════════════════════════════════════════════
// TRIAGE SELECTOR - Selector de nivel de triaje Manchester
// ═══════════════════════════════════════════════════════════════════════════════

import { Box, SimpleGrid, Paper, Text, Stack, Tooltip } from '@mantine/core';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAGE LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

export const TRIAGE_LEVELS = [
    {
        id: 'rojo',
        nombre: 'ROJO',
        color: '#ef4444',
        tiempo: 'Inmediato',
        descripcion: 'Atención inmediata - riesgo vital',
    },
    {
        id: 'naranja',
        nombre: 'NARANJA',
        color: '#f97316',
        tiempo: '10 min',
        descripcion: 'Muy urgente - atención en 10 minutos',
    },
    {
        id: 'amarillo',
        nombre: 'AMARILLO',
        color: '#eab308',
        tiempo: '60 min',
        descripcion: 'Urgente - atención en 60 minutos',
    },
    {
        id: 'verde',
        nombre: 'VERDE',
        color: '#22c55e',
        tiempo: '120 min',
        descripcion: 'Poco urgente - atención en 2 horas',
    },
    {
        id: 'azul',
        nombre: 'AZUL',
        color: '#3b82f6',
        tiempo: '240 min',
        descripcion: 'No urgente - atención en 4 horas',
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAGE BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface TriageButtonProps {
    level: typeof TRIAGE_LEVELS[0];
    onClick: () => void;
    disabled?: boolean;
    delay?: number;
}

function TriageButton({ level, onClick, disabled, delay = 0 }: TriageButtonProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
        >
            <Tooltip label={level.descripcion} withArrow>
                <Paper
                    onClick={disabled ? undefined : onClick}
                    p="md"
                    radius="xl"
                    style={{
                        background: `${level.color}15`,
                        border: `2px solid ${level.color}40`,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: disabled ? 0.5 : 1,
                    }}
                    styles={{
                        root: {
                            '&:hover': disabled ? {} : {
                                background: `${level.color}25`,
                                borderColor: level.color,
                                boxShadow: `0 0 20px ${level.color}30`,
                            },
                        },
                    }}
                >
                    <Stack align="center" gap={4}>
                        {/* Color circle */}
                        <Box
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${level.color} 0%, ${level.color}cc 100%)`,
                                boxShadow: `0 4px 15px ${level.color}40`,
                            }}
                        />

                        <Text fw={700} size="xs" style={{ color: level.color }}>
                            {level.nombre}
                        </Text>

                        <Text size="xs" c="dimmed">
                            {level.tiempo}
                        </Text>
                    </Stack>
                </Paper>
            </Tooltip>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TriageSelectorProps {
    onSelect: (triageId: string) => void;
    disabled?: boolean;
}

export function TriageSelector({ onSelect, disabled }: TriageSelectorProps) {
    return (
        <Box>
            <Text size="lg" fw={600} ta="center" mb="md">
                ¿Qué nivel de triaje asignas?
            </Text>

            <SimpleGrid cols={{ base: 3, xs: 5 }} spacing="sm">
                {TRIAGE_LEVELS.map((level, index) => (
                    <TriageButton
                        key={level.id}
                        level={level}
                        onClick={() => onSelect(level.id)}
                        disabled={disabled}
                        delay={index * 0.05}
                    />
                ))}
            </SimpleGrid>
        </Box>
    );
}
