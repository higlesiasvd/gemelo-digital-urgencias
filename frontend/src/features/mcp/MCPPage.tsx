// ═══════════════════════════════════════════════════════════════════════════════
// MCP PAGE - ASISTENTE IA
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
} from '@mantine/core';
import {
    IconRobot,
    IconSend,
    IconUser,
    IconSparkles,
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

export function MCPPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            role: 'assistant',
            content: '¡Hola! Soy el asistente del Gemelo Digital. Puedo ayudarte con información sobre:\n\n• Estado de los hospitales\n• Tiempos de espera\n• Mejor hospital para una urgencia\n• Resumen del sistema\n\n¿En qué puedo ayudarte?',
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
                content: 'Error al comunicar con el asistente. Por favor, intenta de nuevo.',
                timestamp: new Date(),
                aiPowered: false,
            };
            setMessages((prev) => [...prev, errorMessage]);
        },
    });

    const handleSend = () => {
        if (!input.trim() || chatMutation.isPending) return;

        const userMessage: Message = {
            id: messages.length,
            role: 'user',
            content: input,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        chatMutation.mutate(input);
        setInput('');
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <Stack h="calc(100vh - 140px)">
            <Group justify="space-between">
                <Title order={2}>MCP Asistente</Title>
                <Badge size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    <Group gap={4}>
                        <IconSparkles size={14} /> Groq Llama 70B
                    </Group>
                </Badge>
            </Group>

            <Card
                flex={1}
                className="glass-card"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <Group gap="md" mb="md" p="md" style={{ borderBottom: `1px solid ${cssVariables.glassBorder}` }}>
                    <ThemeIcon
                        size={50}
                        radius="xl"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                    >
                        <IconRobot size={28} />
                    </ThemeIcon>
                    <div>
                        <Title order={4}>Asistente de Urgencias</Title>
                        <Text size="sm" c="dimmed">Powered by MCP + Groq Llama 3.3 70B</Text>
                    </div>
                </Group>

                {/* Messages */}
                <ScrollArea flex={1} p="md">
                    <Stack gap="md">
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
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
                                                    ? 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)'
                                                    : 'rgba(255, 255, 255, 0.1)',
                                            }}
                                        >
                                            <Group gap="xs" mb="xs">
                                                <ThemeIcon size="sm" variant="light" radius="xl">
                                                    {msg.role === 'user' ? <IconUser size={12} /> : <IconRobot size={12} />}
                                                </ThemeIcon>
                                                <Text size="xs" c="dimmed">
                                                    {msg.role === 'user' ? 'Tú' : 'Asistente'}
                                                    {msg.aiPowered && (
                                                        <Badge size="xs" ml="xs" color="violet">AI</Badge>
                                                    )}
                                                </Text>
                                            </Group>
                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                                {msg.content}
                                            </Text>
                                        </Paper>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {chatMutation.isPending && (
                            <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <Paper p="md" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                    <Loader size="sm" />
                                </Paper>
                            </Box>
                        )}
                        <div ref={scrollRef} />
                    </Stack>
                </ScrollArea>

                {/* Input */}
                <Box p="md" style={{ borderTop: `1px solid ${cssVariables.glassBorder}` }}>
                    <Group gap="sm">
                        <TextInput
                            flex={1}
                            placeholder="Escribe tu pregunta..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={chatMutation.isPending}
                            styles={{
                                input: {
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        />
                        <ActionIcon
                            size="lg"
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                            onClick={handleSend}
                            loading={chatMutation.isPending}
                        >
                            <IconSend size={18} />
                        </ActionIcon>
                    </Group>
                    <Text size="xs" c="dimmed" ta="center" mt="xs">
                        Preguntas sugeridas: "¿Cuál es el mejor hospital ahora?" • "Estado del CHUAC" • "Tiempos de espera"
                    </Text>
                </Box>
            </Card>
        </Stack>
    );
}
