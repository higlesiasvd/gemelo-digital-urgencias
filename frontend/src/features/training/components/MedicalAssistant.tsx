// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL ASSISTANT - Chat flotante con RAG para ayuda con triaje
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
    Paper,
    Text,
    TextInput,
    ActionIcon,
    Stack,
    Group,
    ScrollArea,
    Loader,
    Badge,
    Tooltip,
    Box,
} from '@mantine/core';
import {
    IconRobot,
    IconSend,
    IconX,
    IconBook,
    IconSparkles,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cssVariables } from '@/shared/theme';

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MedicalAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/rag/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: userMessage.content,
                    context_docs: 3,
                }),
            });

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer || 'No pude encontrar información relevante.',
                sources: data.sources || [],
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: 'Error al conectar con el asistente. Inténtalo de nuevo.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <Tooltip label="Profesor IA" position="left">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1000,
                    }}
                >
                    <ActionIcon
                        size={60}
                        radius="xl"
                        onClick={() => setIsOpen(!isOpen)}
                        style={{
                            background: isOpen
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                            border: 'none',
                        }}
                    >
                        {isOpen ? <IconX size={28} /> : <IconRobot size={28} />}
                    </ActionIcon>
                </motion.div>
            </Tooltip>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            bottom: 100,
                            right: 24,
                            width: 380,
                            maxHeight: 520,
                            zIndex: 999,
                        }}
                    >
                        <Paper
                            shadow="xl"
                            radius="xl"
                            style={{
                                background: 'linear-gradient(180deg, #0d1f3c 0%, #0a1628 100%)',
                                border: `1px solid ${cssVariables.glassBorder}`,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <Box
                                p="md"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                                    borderBottom: `1px solid ${cssVariables.glassBorder}`,
                                }}
                            >
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <IconSparkles size={20} color="#a78bfa" />
                                        <Text fw={700} size="sm">
                                            Profesor IA - Triaje Manchester
                                        </Text>
                                    </Group>
                                    <Badge size="sm" color="violet" variant="light">
                                        RAG + Groq
                                    </Badge>
                                </Group>
                            </Box>

                            {/* Messages */}
                            <ScrollArea h={340} viewportRef={scrollRef} p="md">
                                <Stack gap="md">
                                    {messages.length === 0 && (
                                        <Box ta="center" py="xl">
                                            <IconBook size={40} color="#6b7280" style={{ marginBottom: 12 }} />
                                            <Text size="sm" c="dimmed">
                                                Pregúntame sobre el Sistema de Triaje Manchester
                                            </Text>
                                            <Text size="xs" c="dimmed" mt={4}>
                                                Niveles, discriminadores, casos clínicos...
                                            </Text>
                                        </Box>
                                    )}

                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <Box
                                                p="sm"
                                                style={{
                                                    background:
                                                        msg.role === 'user'
                                                            ? 'linear-gradient(135deg, rgba(0, 196, 220, 0.15) 0%, rgba(0, 214, 143, 0.15) 100%)'
                                                            : 'rgba(255, 255, 255, 0.05)',
                                                    borderRadius: 12,
                                                    marginLeft: msg.role === 'user' ? 40 : 0,
                                                    marginRight: msg.role === 'assistant' ? 40 : 0,
                                                }}
                                            >
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {msg.content}
                                                </Text>
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <Group gap={4} mt="xs">
                                                        {msg.sources.map((src, i) => (
                                                            <Badge key={i} size="xs" variant="outline" color="gray">
                                                                {src}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                )}
                                            </Box>
                                        </motion.div>
                                    ))}

                                    {loading && (
                                        <Group gap="xs" pl="xs">
                                            <Loader size="xs" color="violet" />
                                            <Text size="xs" c="dimmed">
                                                Consultando base de conocimientos...
                                            </Text>
                                        </Group>
                                    )}
                                </Stack>
                            </ScrollArea>

                            {/* Input */}
                            <Box
                                p="md"
                                style={{
                                    borderTop: `1px solid ${cssVariables.glassBorder}`,
                                }}
                            >
                                <Group gap="xs">
                                    <TextInput
                                        placeholder="Escribe tu pregunta..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        disabled={loading}
                                        radius="xl"
                                        style={{ flex: 1 }}
                                        styles={{
                                            input: {
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                            },
                                        }}
                                    />
                                    <ActionIcon
                                        size={36}
                                        radius="xl"
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading}
                                        style={{
                                            background: cssVariables.gradientSuccess,
                                        }}
                                    >
                                        <IconSend size={18} />
                                    </ActionIcon>
                                </Group>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
