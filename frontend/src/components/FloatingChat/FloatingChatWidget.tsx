// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CHAT WIDGET - ASISTENTE IA FLOTANTE PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Paper,
    Text,
    Group,
    Stack,
    Badge,
    ActionIcon,
    TextInput,
    ScrollArea,
    Box,
    Tooltip,
    Transition,
    Button,
    ThemeIcon,
    SimpleGrid,
} from '@mantine/core';
import {
    IconRobot,
    IconSend,
    IconUser,
    IconX,
    IconSparkles,
    IconMessageCircle,
    IconBuildingHospital,
    IconClock,
    IconUsers,
    IconStethoscope,
    IconHeartbeat,
    IconChartBar,
    IconAlertTriangle,
    IconMapPin,
    IconBrain,
    IconMinimize,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '@/shared/api/client';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    aiPowered?: boolean;
}

interface QuickQuestion {
    label: string;
    query: string;
    icon: React.ReactNode;
    color: string;
}

const QUICK_QUESTIONS: QuickQuestion[] = [
    { label: 'Mejor hospital', query: '¿Cuál es el mejor hospital para ir ahora?', icon: <IconBuildingHospital size={12} />, color: 'blue' },
    { label: 'Tiempos espera', query: '¿Cuáles son los tiempos de espera actuales?', icon: <IconClock size={12} />, color: 'orange' },
    { label: 'Personal', query: '¿Cuántos médicos y enfermeras hay por hospital?', icon: <IconUsers size={12} />, color: 'teal' },
    { label: 'SERGAS', query: '¿Hay médicos SERGAS disponibles?', icon: <IconStethoscope size={12} />, color: 'violet' },
    { label: 'Resumen', query: 'Dame un resumen completo del estado actual', icon: <IconHeartbeat size={12} />, color: 'pink' },
    { label: 'Triaje', query: '¿Cómo está la distribución de triaje hoy?', icon: <IconChartBar size={12} />, color: 'green' },
    { label: 'Incidentes', query: '¿Ha habido algún incidente en la ciudad?', icon: <IconAlertTriangle size={12} />, color: 'red' },
    { label: 'Derivaciones', query: '¿Cuántas derivaciones se han hecho?', icon: <IconMapPin size={12} />, color: 'cyan' },
];

// Typing dots animation
const TypingDots = () => (
    <Group gap={3}>
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                animate={{
                    y: [-2, 2, -2],
                    opacity: [0.4, 1, 0.4],
                }}
                transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.12,
                }}
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #228be6, #15aabf)',
                }}
            />
        ))}
    </Group>
);

// Floating particles for the button
const ButtonParticles = () => (
    <Box
        style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            pointerEvents: 'none',
        }}
    >
        {[...Array(6)].map((_, i) => (
            <motion.div
                key={i}
                animate={{
                    y: [-20, -40],
                    x: [0, (i % 2 === 0 ? 1 : -1) * 10],
                    opacity: [0, 0.8, 0],
                    scale: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                }}
                style={{
                    position: 'absolute',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: `hsl(${190 + i * 10}, 80%, 50%)`,
                    left: 25 + Math.cos(i * 60 * Math.PI / 180) * 20,
                    bottom: 25,
                }}
            />
        ))}
    </Box>
);

export function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showQuestions, setShowQuestions] = useState(true);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            role: 'assistant',
            content: '¡Hola! 👋 Soy el **asistente inteligente** del Gemelo Digital.\n\nTengo acceso a **12 fuentes de datos** en tiempo real:\n\n🏥 Hospitales • 👨‍⚕️ Personal • 🚨 Incidentes • 📊 Predicciones\n\n¿Qué necesitas saber?',
            timestamp: new Date(),
            aiPowered: true,
        },
    ]);
    const [input, setInput] = useState('');
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
        setShowQuestions(false);
        chatMutation.mutate(messageText);
        setInput('');
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <>
            {/* Floating Button with animations */}
            <motion.div
                style={{
                    position: 'fixed',
                    bottom: 24,
                    left: 24,
                    zIndex: 1000,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <ButtonParticles />
                <Tooltip label={isOpen ? 'Cerrar asistente' : '💬 Asistente IA'} position="left">
                    <ActionIcon
                        size={60}
                        radius="xl"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                        onClick={() => {
                            setIsOpen(!isOpen);
                            setIsMinimized(false);
                        }}
                        style={{
                            boxShadow: '0 4px 24px rgba(34, 139, 230, 0.5)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isOpen ? 'close' : 'open'}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isOpen ? <IconX size={26} /> : <IconBrain size={26} />}
                            </motion.div>
                        </AnimatePresence>
                    </ActionIcon>
                </Tooltip>

                {/* Pulsing ring effect */}
                {!isOpen && (
                    <motion.div
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderRadius: '50%',
                            border: '2px solid rgba(34, 139, 230, 0.6)',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </motion.div>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        style={{
                            position: 'fixed',
                            bottom: 100,
                            left: 24,
                            width: 400,
                            height: 550,
                            zIndex: 999,
                        }}
                    >
                        <Paper
                            style={{
                                height: '100%',
                                background: 'linear-gradient(180deg, rgba(30, 30, 46, 0.98) 0%, rgba(24, 24, 37, 0.98) 100%)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(34, 139, 230, 0.3)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                            radius="lg"
                            shadow="xl"
                        >
                            {/* Header with gradient */}
                            <Box
                                p="md"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(34, 139, 230, 0.25) 0%, rgba(21, 170, 191, 0.15) 100%)',
                                    borderBottom: '1px solid rgba(34, 139, 230, 0.2)',
                                }}
                            >
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <motion.div
                                            animate={{
                                                rotate: [0, 5, -5, 0],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                            }}
                                        >
                                            <ThemeIcon
                                                variant="gradient"
                                                gradient={{ from: 'blue', to: 'cyan' }}
                                                radius="xl"
                                                size="lg"
                                                style={{ boxShadow: '0 2px 12px rgba(34, 139, 230, 0.4)' }}
                                            >
                                                <IconRobot size={20} />
                                            </ThemeIcon>
                                        </motion.div>
                                        <Box>
                                            <Group gap="xs">
                                                <Text fw={600} size="sm">Asistente IA</Text>
                                                <Badge size="xs" variant="dot" color="green">Online</Badge>
                                            </Group>
                                            <Badge
                                                size="xs"
                                                variant="light"
                                                color="cyan"
                                                leftSection={<IconSparkles size={8} />}
                                            >
                                                Groq Llama 3.3 70B
                                            </Badge>
                                        </Box>
                                    </Group>
                                    <Group gap={4}>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            onClick={() => setIsMinimized(true)}
                                            size="sm"
                                        >
                                            <IconMinimize size={14} />
                                        </ActionIcon>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            onClick={() => setIsOpen(false)}
                                            size="sm"
                                        >
                                            <IconX size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Box>

                            {/* Messages */}
                            <ScrollArea flex={1} p="sm">
                                <Stack gap="sm">
                                    <AnimatePresence>
                                        {messages.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 300 }}
                                            >
                                                <Box
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    }}
                                                >
                                                    <Paper
                                                        p="xs"
                                                        px="sm"
                                                        radius="lg"
                                                        maw="85%"
                                                        style={{
                                                            background: msg.role === 'user'
                                                                ? 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)'
                                                                : 'rgba(255, 255, 255, 0.08)',
                                                            border: msg.role === 'user'
                                                                ? 'none'
                                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                                            boxShadow: msg.role === 'user'
                                                                ? '0 2px 12px rgba(34, 139, 230, 0.3)'
                                                                : 'none',
                                                        }}
                                                    >
                                                        <Group gap={4} mb={2}>
                                                            {msg.role === 'assistant' && <IconRobot size={12} style={{ color: '#228be6' }} />}
                                                            {msg.role === 'user' && <IconUser size={12} />}
                                                            <Text size="xs" c={msg.role === 'user' ? 'white' : 'dimmed'}>
                                                                {msg.role === 'user' ? 'Tú' : 'Asistente'}
                                                            </Text>
                                                            {msg.aiPowered && (
                                                                <Badge size="xs" variant="light" color="cyan">AI</Badge>
                                                            )}
                                                        </Group>
                                                        <Box
                                                            className="markdown-content"
                                                            style={{
                                                                fontSize: '0.85rem',
                                                                lineHeight: 1.5,
                                                                color: msg.role === 'user' ? 'white' : undefined,
                                                            }}
                                                        >
                                                            <ReactMarkdown
                                                                components={{
                                                                    p: ({ children }) => <Text size="sm" mb={4}>{children}</Text>,
                                                                    strong: ({ children }) => <Text span fw={700} inherit>{children}</Text>,
                                                                    em: ({ children }) => <Text span fs="italic" inherit>{children}</Text>,
                                                                    ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ul>,
                                                                    ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ol>,
                                                                    li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                                                                    code: ({ children }) => (
                                                                        <Text span ff="monospace" size="xs" bg="rgba(0,0,0,0.2)" px={4} style={{ borderRadius: 4 }}>
                                                                            {children}
                                                                        </Text>
                                                                    ),
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </Box>
                                                    </Paper>
                                                </Box>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Typing indicator */}
                                    <AnimatePresence>
                                        {chatMutation.isPending && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                            >
                                                <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                    <Paper
                                                        p="xs"
                                                        px="sm"
                                                        radius="lg"
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.08)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        }}
                                                    >
                                                        <Group gap="xs">
                                                            <IconRobot size={12} style={{ color: '#228be6' }} />
                                                            <TypingDots />
                                                        </Group>
                                                    </Paper>
                                                </Box>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div ref={scrollRef} />
                                </Stack>
                            </ScrollArea>

                            {/* Quick Questions Grid */}
                            <Transition mounted={showQuestions && messages.length <= 1} transition="slide-up" duration={200}>
                                {(styles) => (
                                    <Box px="sm" pb="xs" style={styles}>
                                        <Text size="xs" c="dimmed" mb={8}>
                                            <IconMessageCircle size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                            Preguntas rápidas
                                        </Text>
                                        <SimpleGrid cols={2} spacing={6}>
                                            {QUICK_QUESTIONS.map((q, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <Tooltip label={q.query} multiline w={180}>
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            color={q.color}
                                                            fullWidth
                                                            leftSection={q.icon}
                                                            onClick={() => handleSend(q.query)}
                                                            disabled={chatMutation.isPending}
                                                            styles={{
                                                                root: {
                                                                    height: 32,
                                                                    padding: '4px 10px',
                                                                },
                                                                label: {
                                                                    fontSize: 11,
                                                                    whiteSpace: 'normal', // Allow text to wrap
                                                                    textAlign: 'left', // Align text to the left
                                                                },
                                                            }}
                                                        >
                                                            {q.label}
                                                        </Button>
                                                    </Tooltip>
                                                </motion.div>
                                            ))}
                                        </SimpleGrid>
                                    </Box>
                                )}
                            </Transition>

                            {/* Input with gradient border */}
                            <Box
                                p="sm"
                                style={{
                                    borderTop: '1px solid rgba(34, 139, 230, 0.2)',
                                    background: 'rgba(34, 139, 230, 0.05)',
                                }}
                            >
                                <Group gap="xs">
                                    <TextInput
                                        flex={1}
                                        placeholder="Escribe tu pregunta..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        disabled={chatMutation.isPending}
                                        size="sm"
                                        radius="xl"
                                        leftSection={<IconMessageCircle size={14} style={{ color: 'rgba(34, 139, 230, 0.6)' }} />}
                                        styles={{
                                            input: {
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(34, 139, 230, 0.2)',
                                                transition: 'all 0.2s',
                                                '&:focus': {
                                                    borderColor: 'rgba(34, 139, 230, 0.5)',
                                                },
                                            },
                                        }}
                                    />
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <ActionIcon
                                            size="lg"
                                            radius="xl"
                                            variant="gradient"
                                            gradient={{ from: 'blue', to: 'cyan' }}
                                            onClick={() => handleSend()}
                                            loading={chatMutation.isPending}
                                            style={{ boxShadow: '0 2px 10px rgba(34, 139, 230, 0.3)' }}
                                        >
                                            <IconSend size={16} />
                                        </ActionIcon>
                                    </motion.div>
                                </Group>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minimized state - just shows a small badge */}
            <AnimatePresence>
                {isOpen && isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: 100,
                            left: 24,
                            zIndex: 999,
                        }}
                    >
                        <Paper
                            p="sm"
                            radius="lg"
                            style={{
                                background: 'linear-gradient(135deg, rgba(34, 139, 230, 0.9) 0%, rgba(21, 170, 191, 0.9) 100%)',
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(34, 139, 230, 0.4)',
                            }}
                            onClick={() => setIsMinimized(false)}
                        >
                            <Group gap="xs">
                                <IconRobot size={16} />
                                <Text size="sm" fw={500}>Asistente IA</Text>
                                {chatMutation.isPending && <TypingDots />}
                            </Group>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
