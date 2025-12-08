// ═══════════════════════════════════════════════════════════════════════════════
// MCP PAGE - ASISTENTE IA PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    ThemeIcon,
    Paper,
    TextInput,
    ActionIcon,
    ScrollArea,
    Loader,
    Box,
    SimpleGrid,
    Tooltip,
    Button,
    Transition,
} from '@mantine/core';
import {
    IconRobot,
    IconSend,
    IconUser,
    IconSparkles,
    IconBuildingHospital,
    IconClock,
    IconUsers,
    IconStethoscope,
    IconHeartbeat,
    IconAlertTriangle,
    IconChartBar,
    IconMapPin,
    IconCalendarEvent,
    IconCloudRain,
    IconBrain,
    IconMessageCircle,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    aiPowered?: boolean;
}

interface SuggestedQuestion {
    icon: React.ReactNode;
    text: string;
    category: string;
    color: string;
}

// Preguntas sugeridas organizadas por categoría
const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
    {
        icon: <IconBuildingHospital size={16} />,
        text: "¿Cuál es el mejor hospital para ir ahora?",
        category: "Recomendación",
        color: "blue",
    },
    {
        icon: <IconClock size={16} />,
        text: "¿Cuáles son los tiempos de espera actuales?",
        category: "Tiempos",
        color: "orange",
    },
    {
        icon: <IconUsers size={16} />,
        text: "¿Cuántos médicos y enfermeras hay por hospital?",
        category: "Personal",
        color: "teal",
    },
    {
        icon: <IconStethoscope size={16} />,
        text: "¿Hay médicos SERGAS disponibles para asignar?",
        category: "SERGAS",
        color: "violet",
    },
    {
        icon: <IconHeartbeat size={16} />,
        text: "Dame un resumen completo del estado actual",
        category: "Resumen",
        color: "pink",
    },
    {
        icon: <IconChartBar size={16} />,
        text: "¿Cómo está la distribución de triaje hoy?",
        category: "Triaje",
        color: "green",
    },
    {
        icon: <IconAlertTriangle size={16} />,
        text: "¿Ha habido algún incidente en la ciudad?",
        category: "Incidentes",
        color: "red",
    },
    {
        icon: <IconMapPin size={16} />,
        text: "¿Cuántas derivaciones se han hecho?",
        category: "Derivaciones",
        color: "cyan",
    },
    {
        icon: <IconCalendarEvent size={16} />,
        text: "¿Hay eventos que puedan afectar las urgencias?",
        category: "Eventos",
        color: "grape",
    },
    {
        icon: <IconCloudRain size={16} />,
        text: "¿Cómo afecta el clima a las urgencias ahora?",
        category: "Clima",
        color: "indigo",
    },
];

// Animación de typing dots
const TypingDots = () => (
    <Group gap={4}>
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                animate={{
                    y: [-3, 3, -3],
                    opacity: [0.4, 1, 0.4],
                }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                }}
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #228be6, #15aabf)',
                }}
            />
        ))}
    </Group>
);

// Componente de partículas de fondo
const FloatingParticles = () => (
    <Box
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
        }}
    >
        {[...Array(15)].map((_, i) => (
            <motion.div
                key={i}
                initial={{
                    x: Math.random() * 100 + '%',
                    y: '100%',
                    opacity: 0,
                }}
                animate={{
                    y: '-20%',
                    opacity: [0, 0.6, 0],
                }}
                transition={{
                    duration: 8 + Math.random() * 4,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                    ease: 'linear',
                }}
                style={{
                    position: 'absolute',
                    width: 4 + Math.random() * 6,
                    height: 4 + Math.random() * 6,
                    borderRadius: '50%',
                    background: `rgba(34, 139, 230, ${0.2 + Math.random() * 0.3})`,
                    filter: 'blur(1px)',
                }}
            />
        ))}
    </Box>
);

export function MCPPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            role: 'assistant',
            content: '¡Hola! 👋 Soy el asistente inteligente del **Gemelo Digital Hospitalario**.\n\nTengo acceso en tiempo real a:\n\n🏥 **Estado de hospitales** (Kafka)\n👨‍⚕️ **Personal y médicos SERGAS** (PostgreSQL)\n🚨 **Incidentes y derivaciones**\n🌡️ **Contexto climático y eventos**\n\n¿Qué información necesitas?',
            timestamp: new Date(),
            aiPowered: true,
        },
    ]);
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatMutation = useMutation({
        mutationFn: (message: string) => sendChatMessage(message),
        onSuccess: (data) => {
            const newMessage: Message = {
                id: messages.length + 1,
                role: 'assistant',
                content: data.response || 'Lo siento, no pude procesar tu solicitud.',
                timestamp: new Date(),
                aiPowered: data.ai_powered,
            };
            setMessages((prev) => [...prev, newMessage]);
        },
        onError: () => {
            const errorMessage: Message = {
                id: messages.length + 1,
                role: 'assistant',
                content: '❌ Error al comunicar con el asistente. Por favor, intenta de nuevo.',
                timestamp: new Date(),
                aiPowered: false,
            };
            setMessages((prev) => [...prev, errorMessage]);
        },
    });

    const handleSend = (text?: string) => {
        const messageText = text || input;
        if (!messageText.trim() || chatMutation.isPending) return;

        const userMessage: Message = {
            id: messages.length,
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setShowSuggestions(false);
        chatMutation.mutate(messageText);
        setInput('');
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <Stack h="calc(100vh - 140px)" gap="md">
            {/* Header con animación */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="md">
                        <motion.div
                            animate={{
                                rotate: [0, 5, -5, 0],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            <ThemeIcon
                                size={50}
                                radius="xl"
                                variant="gradient"
                                gradient={{ from: 'violet', to: 'grape', deg: 135 }}
                                style={{
                                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                                }}
                            >
                                <IconBrain size={28} />
                            </ThemeIcon>
                        </motion.div>
                        <Box>
                            <Title order={2}>MCP Asistente Inteligente</Title>
                            <Text size="sm" c="dimmed">
                                Datos en tiempo real • Kafka + PostgreSQL
                            </Text>
                        </Box>
                    </Group>
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <Badge
                            size="xl"
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'grape' }}
                            leftSection={<IconSparkles size={14} />}
                            style={{
                                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                            }}
                        >
                            Groq Llama 3.3 70B
                        </Badge>
                    </motion.div>
                </Group>
            </motion.div>

            {/* Chat Principal */}
            <Card
                flex={1}
                className="glass-card"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Partículas flotantes */}
                <FloatingParticles />

                {/* Header del chat */}
                <Paper
                    p="md"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)',
                        borderBottom: `1px solid ${cssVariables.glassBorder}`,
                        zIndex: 1,
                    }}
                >
                    <Group gap="md">
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                            }}
                        >
                            <ThemeIcon
                                size={56}
                                radius="xl"
                                variant="gradient"
                                gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                                style={{
                                    boxShadow: '0 4px 16px rgba(34, 139, 230, 0.4)',
                                }}
                            >
                                <IconRobot size={32} />
                            </ThemeIcon>
                        </motion.div>
                        <Box>
                            <Group gap="xs">
                                <Title order={4}>Asistente de Urgencias</Title>
                                <Badge
                                    size="xs"
                                    variant="dot"
                                    color="green"
                                    style={{ animation: 'pulse 2s infinite' }}
                                >
                                    Online
                                </Badge>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Acceso a 12 fuentes de datos en tiempo real
                            </Text>
                        </Box>
                    </Group>
                </Paper>

                {/* Área de mensajes */}
                <ScrollArea flex={1} p="md" style={{ zIndex: 1 }}>
                    <Stack gap="md">
                        <AnimatePresence>
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        duration: 0.4,
                                        delay: index === messages.length - 1 ? 0 : 0,
                                        type: 'spring',
                                        stiffness: 200,
                                    }}
                                >
                                    <Box
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <Paper
                                            p="md"
                                            radius="lg"
                                            maw="80%"
                                            style={{
                                                background: msg.role === 'user'
                                                    ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                                                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                                                border: msg.role === 'user'
                                                    ? 'none'
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                boxShadow: msg.role === 'user'
                                                    ? '0 4px 14px rgba(139, 92, 246, 0.35)'
                                                    : '0 2px 8px rgba(0, 0, 0, 0.15)',
                                            }}
                                        >
                                            <Group gap="xs" mb="xs">
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.1, type: 'spring' }}
                                                >
                                                    <ThemeIcon
                                                        size="sm"
                                                        variant={msg.role === 'user' ? 'filled' : 'light'}
                                                        color={msg.role === 'user' ? 'white' : 'blue'}
                                                        radius="xl"
                                                        style={{
                                                            background: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : undefined,
                                                        }}
                                                    >
                                                        {msg.role === 'user' ? <IconUser size={12} /> : <IconRobot size={12} />}
                                                    </ThemeIcon>
                                                </motion.div>
                                                <Text size="xs" c={msg.role === 'user' ? 'white' : 'dimmed'}>
                                                    {msg.role === 'user' ? 'Tú' : 'Asistente'}
                                                </Text>
                                                {msg.aiPowered && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: 0.2 }}
                                                    >
                                                        <Badge
                                                            size="xs"
                                                            variant="gradient"
                                                            gradient={{ from: 'violet', to: 'grape' }}
                                                            leftSection={<IconSparkles size={8} />}
                                                        >
                                                            AI
                                                        </Badge>
                                                    </motion.div>
                                                )}
                                            </Group>
                                            <Text
                                                size="sm"
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                    color: msg.role === 'user' ? 'white' : undefined,
                                                }}
                                            >
                                                {msg.content}
                                            </Text>
                                        </Paper>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        <AnimatePresence>
                            {chatMutation.isPending && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <Paper
                                            p="md"
                                            radius="lg"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                            }}
                                        >
                                            <Group gap="xs">
                                                <ThemeIcon size="sm" variant="light" color="blue" radius="xl">
                                                    <IconRobot size={12} />
                                                </ThemeIcon>
                                                <TypingDots />
                                                <Text size="xs" c="dimmed">Pensando...</Text>
                                            </Group>
                                        </Paper>
                                    </Box>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={scrollRef} />
                    </Stack>
                </ScrollArea>

                {/* Preguntas sugeridas */}
                <Transition mounted={showSuggestions && messages.length === 1} transition="slide-up" duration={300}>
                    {(styles) => (
                        <Box p="md" style={{ ...styles, zIndex: 1 }}>
                            <Group gap="xs" mb="sm">
                                <IconMessageCircle size={16} style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                                <Text size="sm" fw={500} c="dimmed">Preguntas rápidas</Text>
                            </Group>
                            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xs">
                                {SUGGESTED_QUESTIONS.map((q, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Tooltip label={q.text} multiline w={200} position="top">
                                            <Button
                                                variant="light"
                                                color={q.color}
                                                size="xs"
                                                fullWidth
                                                leftSection={q.icon}
                                                onClick={() => handleSend(q.text)}
                                                style={{
                                                    height: 'auto',
                                                    padding: '8px 10px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                                styles={{
                                                    inner: {
                                                        justifyContent: 'flex-start',
                                                    },
                                                }}
                                            >
                                                {q.category}
                                            </Button>
                                        </Tooltip>
                                    </motion.div>
                                ))}
                            </SimpleGrid>
                        </Box>
                    )}
                </Transition>

                {/* Input area */}
                <Paper
                    p="md"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
                        borderTop: `1px solid ${cssVariables.glassBorder}`,
                        zIndex: 1,
                    }}
                >
                    <Group gap="sm">
                        <TextInput
                            flex={1}
                            placeholder="Escribe tu pregunta sobre el sistema hospitalario..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={chatMutation.isPending}
                            size="md"
                            radius="xl"
                            leftSection={<IconMessageCircle size={18} style={{ color: 'rgba(139, 92, 246, 0.6)' }} />}
                            styles={{
                                input: {
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    transition: 'all 0.2s ease',
                                    '&:focus': {
                                        borderColor: 'rgba(139, 92, 246, 0.5)',
                                        boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)',
                                    },
                                },
                            }}
                        />
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <ActionIcon
                                size={44}
                                variant="gradient"
                                gradient={{ from: 'violet', to: 'grape' }}
                                radius="xl"
                                onClick={() => handleSend()}
                                loading={chatMutation.isPending}
                                style={{
                                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                                }}
                            >
                                <IconSend size={20} />
                            </ActionIcon>
                        </motion.div>
                    </Group>
                    <Text size="xs" c="dimmed" ta="center" mt="sm" style={{ opacity: 0.7 }}>
                        💡 Prueba: "Estado de saturación" • "Personal disponible" • "Predicciones de demanda"
                    </Text>
                </Paper>
            </Card>
        </Stack>
    );
}
