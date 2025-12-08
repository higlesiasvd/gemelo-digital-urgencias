// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CHAT WIDGET - ASISTENTE IA FLOTANTE
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
    Loader,
    Box,
    Tooltip,
    Transition,
    Button,
} from '@mantine/core';
import {
    IconRobot,
    IconSend,
    IconUser,
    IconX,
    IconSparkles,
    IconMessageCircle,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    aiPowered?: boolean;
}

const PREDEFINED_QUESTIONS = [
    { label: '¿Mejor hospital?', query: '¿Cuál es el mejor hospital para ir ahora?' },
    { label: 'Estado sistema', query: '¿Cuál es el estado actual del sistema?' },
    { label: 'Tiempos espera', query: '¿Cuáles son los tiempos de espera actuales?' },
    { label: 'Estado CHUAC', query: '¿Cuál es el estado del CHUAC?' },
    { label: 'Resumen', query: 'Dame un resumen del sistema' },
];

export function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            role: 'assistant',
            content: '¡Hola! Soy el **asistente del Gemelo Digital**. ¿En qué puedo ayudarte?',
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
                content: 'Error al comunicar con el asistente.',
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
        chatMutation.mutate(messageText);
        setInput('');
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <>
            {/* Floating Button */}
            <Tooltip label="Asistente IA" position="right">
                <ActionIcon
                    size={56}
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        left: 24,
                        zIndex: 1000,
                        boxShadow: '0 4px 20px rgba(34, 139, 230, 0.4)',
                    }}
                >
                    {isOpen ? <IconX size={24} /> : <IconMessageCircle size={24} />}
                </ActionIcon>
            </Tooltip>

            {/* Chat Window */}
            <Transition mounted={isOpen} transition="slide-up" duration={300}>
                {(styles) => (
                    <Paper
                        style={{
                            ...styles,
                            position: 'fixed',
                            bottom: 90,
                            left: 24,
                            width: 380,
                            height: 500,
                            zIndex: 999,
                            background: cssVariables.glassBg,
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${cssVariables.glassBorder}`,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                        radius="lg"
                        shadow="xl"
                    >
                        {/* Header */}
                        <Box
                            p="md"
                            style={{
                                background: 'linear-gradient(135deg, rgba(34, 139, 230, 0.2) 0%, rgba(21, 170, 191, 0.2) 100%)',
                                borderBottom: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <ActionIcon
                                        variant="gradient"
                                        gradient={{ from: 'blue', to: 'cyan' }}
                                        radius="xl"
                                        size="lg"
                                    >
                                        <IconRobot size={20} />
                                    </ActionIcon>
                                    <div>
                                        <Text fw={600} size="sm">Asistente IA</Text>
                                        <Badge size="xs" variant="light" color="cyan" leftSection={<IconSparkles size={10} />}>
                                            Groq Llama
                                        </Badge>
                                    </div>
                                </Group>
                                <ActionIcon variant="subtle" onClick={() => setIsOpen(false)}>
                                    <IconX size={18} />
                                </ActionIcon>
                            </Group>
                        </Box>

                        {/* Messages */}
                        <ScrollArea flex={1} p="sm">
                            <Stack gap="sm">
                                <AnimatePresence>
                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
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
                                                            : 'rgba(255, 255, 255, 0.1)',
                                                    }}
                                                >
                                                    <Group gap={4} mb={2}>
                                                        {msg.role === 'assistant' && <IconRobot size={12} />}
                                                        {msg.role === 'user' && <IconUser size={12} />}
                                                        <Text size="xs" c="dimmed">
                                                            {msg.role === 'user' ? 'Tú' : 'Asistente'}
                                                        </Text>
                                                    </Group>
                                                    <Box
                                                        className="markdown-content"
                                                        style={{ fontSize: '0.875rem', lineHeight: 1.5 }}
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
                                {chatMutation.isPending && (
                                    <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <Paper p="xs" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                            <Loader size="xs" />
                                        </Paper>
                                    </Box>
                                )}
                                <div ref={scrollRef} />
                            </Stack>
                        </ScrollArea>

                        {/* Predefined Questions */}
                        {messages.length <= 1 && (
                            <Box px="sm" pb="xs">
                                <Text size="xs" c="dimmed" mb="xs">Preguntas sugeridas:</Text>
                                <Group gap={4} wrap="wrap">
                                    {PREDEFINED_QUESTIONS.slice(0, 3).map((q) => (
                                        <Button
                                            key={q.label}
                                            size="xs"
                                            variant="light"
                                            radius="xl"
                                            onClick={() => handleSend(q.query)}
                                            disabled={chatMutation.isPending}
                                        >
                                            {q.label}
                                        </Button>
                                    ))}
                                </Group>
                            </Box>
                        )}

                        {/* Input */}
                        <Box p="sm" style={{ borderTop: `1px solid ${cssVariables.glassBorder}` }}>
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
                                    styles={{
                                        input: {
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                        },
                                    }}
                                />
                                <ActionIcon
                                    size="lg"
                                    radius="xl"
                                    variant="gradient"
                                    gradient={{ from: 'blue', to: 'cyan' }}
                                    onClick={() => handleSend()}
                                    loading={chatMutation.isPending}
                                >
                                    <IconSend size={16} />
                                </ActionIcon>
                            </Group>
                        </Box>
                    </Paper>
                )}
            </Transition>
        </>
    );
}
