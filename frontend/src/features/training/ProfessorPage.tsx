// ═══════════════════════════════════════════════════════════════════════════════
// PROFESSOR PAGE - Página del Profesor de Urgencias con RAG y fuentes académicas
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    Text,
    TextInput,
    ActionIcon,
    Stack,
    Group,
    ScrollArea,
    Loader,
    Badge,
    SimpleGrid,
    ThemeIcon,
    Accordion,
    Divider,
} from '@mantine/core';
import {
    IconSend,
    IconBook,
    IconSparkles,
    IconStethoscope,
    IconHeartbeat,
    IconUsers,
    IconAlertTriangle,
    IconQuote,
    IconBookmark,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { cssVariables } from '@/shared/theme';

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Source {
    title: string;
    authors: string;
    edition: string;
    pages: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    excerpts?: string[];
}

interface TopicCard {
    icon: React.ReactNode;
    title: string;
    description: string;
    query: string;
    color: string;
}

const QUICK_TOPICS: TopicCard[] = [
    {
        icon: <IconAlertTriangle size={24} />,
        title: "Niveles de Triaje",
        description: "Los 5 colores y tiempos",
        query: "Explica los 5 niveles del triaje Manchester con sus tiempos máximos",
        color: "#ef4444"
    },
    {
        icon: <IconHeartbeat size={24} />,
        title: "Constantes Vitales",
        description: "Valores normales y críticos",
        query: "Cuáles son los valores normales de constantes vitales en adultos",
        color: "#f97316"
    },
    {
        icon: <IconStethoscope size={24} />,
        title: "Dolor Torácico",
        description: "Algoritmo de triaje",
        query: "Cómo se clasifica el dolor torácico en triaje según el protocolo",
        color: "#eab308"
    },
    {
        icon: <IconUsers size={24} />,
        title: "Triaje Pediátrico",
        description: "TEP y valores por edad",
        query: "Explica el triángulo de evaluación pediátrica y los valores por edad",
        color: "#22c55e"
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ProfessorPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = async (query?: string) => {
        const question = query || input.trim();
        if (!question || loading) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: question };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/rag/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, context_docs: 3 }),
            });
            const data = await response.json();

            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer || 'No encontré información relevante.',
                sources: data.sources || [],
                excerpts: data.excerpts || [],
            }]);
        } catch {
            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Error al conectar. Inténtalo de nuevo.',
            }]);
        } finally {
            setLoading(false);
        }
    };

    // Format text: convert markdown-like to clean text
    const formatContent = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markers
            .replace(/\*(.*?)\*/g, '$1')       // Remove italic markers
            .replace(/#{1,3}\s/g, '')          // Remove headers
            .split('\n')
            .map((line, i) => {
                if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                    return <Text key={i} size="sm" pl="md" style={{ lineHeight: 1.7 }}>{line}</Text>;
                }
                if (line.trim() === '') return <Box key={i} h={8} />;
                return <Text key={i} size="sm" style={{ lineHeight: 1.7 }}>{line}</Text>;
            });
    };

    return (
        <Stack gap="lg">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        border: `1px solid ${cssVariables.glassBorder}`,
                    }}
                >
                    <Group gap="lg">
                        <ThemeIcon size={70} radius="xl" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                            <IconSparkles size={35} />
                        </ThemeIcon>
                        <Box style={{ flex: 1 }}>
                            <Text fw={700} size="xl">🩺 Profesor de Urgencias</Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                Asistente IA basado en literatura médica del Sistema de Triaje Manchester
                            </Text>
                            <Group gap="xs" mt="sm">
                                <Badge color="violet" variant="light" size="sm">Groq Llama-3</Badge>
                                <Badge color="blue" variant="light" size="sm">8 documentos indexados</Badge>
                                <Badge color="teal" variant="light" size="sm">Fuentes verificadas</Badge>
                            </Group>
                        </Box>
                    </Group>
                </Paper>
            </motion.div>

            {/* Quick Topics */}
            {messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                    <Text size="sm" fw={500} mb="sm">Consultas frecuentes:</Text>
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                        {QUICK_TOPICS.map((topic, i) => (
                            <Paper
                                key={i}
                                p="md"
                                radius="lg"
                                onClick={() => handleSend(topic.query)}
                                style={{
                                    background: `${topic.color}10`,
                                    border: `1px solid ${topic.color}30`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Stack gap="xs" align="center" ta="center">
                                    <ThemeIcon size={44} radius="xl" style={{ background: `${topic.color}20`, color: topic.color }}>
                                        {topic.icon}
                                    </ThemeIcon>
                                    <Text size="sm" fw={600}>{topic.title}</Text>
                                    <Text size="xs" c="dimmed">{topic.description}</Text>
                                </Stack>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </motion.div>
            )}

            {/* Chat Area */}
            <Paper
                radius="xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(13, 31, 60, 0.9) 0%, rgba(10, 22, 40, 0.9) 100%)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                    overflow: 'hidden',
                }}
            >
                <ScrollArea h={450} viewportRef={scrollRef} p="lg">
                    <Stack gap="lg">
                        {messages.length === 0 && (
                            <Box ta="center" py="xl">
                                <IconBook size={50} color="#6b7280" style={{ marginBottom: 16 }} />
                                <Text size="lg" fw={500}>¿Qué quieres aprender hoy?</Text>
                                <Text size="sm" c="dimmed" mt={4}>Pregunta sobre el Sistema de Triaje Manchester</Text>
                            </Box>
                        )}

                        {messages.map((msg) => (
                            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Box
                                    p="md"
                                    style={{
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, rgba(0, 196, 220, 0.12) 0%, rgba(0, 214, 143, 0.12) 100%)'
                                            : 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: 16,
                                        marginLeft: msg.role === 'user' ? 50 : 0,
                                        marginRight: msg.role === 'assistant' ? 50 : 0,
                                    }}
                                >
                                    {/* Content */}
                                    <Box>{formatContent(msg.content)}</Box>

                                    {/* Sources */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <Box mt="md">
                                            <Divider my="sm" color="rgba(255,255,255,0.1)" />
                                            <Accordion variant="contained" radius="md" styles={{
                                                item: { background: 'rgba(139, 92, 246, 0.08)', border: 'none' },
                                                control: { padding: '8px 12px' },
                                                content: { padding: '0 12px 12px' },
                                            }}>
                                                <Accordion.Item value="sources">
                                                    <Accordion.Control>
                                                        <Group gap="xs">
                                                            <IconBookmark size={16} color="#a78bfa" />
                                                            <Text size="xs" fw={500}>
                                                                {msg.sources.length} fuente{msg.sources.length > 1 ? 's' : ''} bibliográfica{msg.sources.length > 1 ? 's' : ''}
                                                            </Text>
                                                        </Group>
                                                    </Accordion.Control>
                                                    <Accordion.Panel>
                                                        <Stack gap="sm">
                                                            {msg.sources.map((src, i) => (
                                                                <Box key={i} p="sm" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                                                    <Text size="xs" fw={600} c="white">{src.title}</Text>
                                                                    <Text size="xs" c="dimmed">{src.authors}</Text>
                                                                    <Text size="xs" c="dimmed">{src.edition} • {src.pages}</Text>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Accordion.Panel>
                                                </Accordion.Item>
                                            </Accordion>

                                            {/* Excerpts */}
                                            {msg.excerpts && msg.excerpts.length > 0 && (
                                                <Box mt="sm">
                                                    {msg.excerpts.map((excerpt, i) => (
                                                        <Box key={i} p="sm" my="xs" style={{
                                                            background: 'rgba(99, 102, 241, 0.08)',
                                                            borderLeft: '3px solid #6366f1',
                                                            borderRadius: '0 8px 8px 0',
                                                        }}>
                                                            <Group gap="xs" mb={4}>
                                                                <IconQuote size={14} color="#a78bfa" />
                                                                <Text size="xs" c="dimmed">Cita textual</Text>
                                                            </Group>
                                                            <Text size="xs" fs="italic" c="gray.4">{excerpt}</Text>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            </motion.div>
                        ))}

                        {loading && (
                            <Group gap="sm" pl="md">
                                <Loader size="sm" color="violet" />
                                <Text size="sm" c="dimmed">Consultando literatura médica...</Text>
                            </Group>
                        )}
                    </Stack>
                </ScrollArea>

                {/* Input */}
                <Box p="lg" style={{ borderTop: `1px solid ${cssVariables.glassBorder}` }}>
                    <Group gap="sm">
                        <TextInput
                            placeholder="Escribe tu pregunta sobre triaje..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={loading}
                            radius="xl"
                            size="md"
                            style={{ flex: 1 }}
                            styles={{ input: { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' } }}
                        />
                        <ActionIcon size={44} radius="xl" onClick={() => handleSend()} disabled={!input.trim() || loading}
                            style={{ background: cssVariables.gradientSuccess }}>
                            <IconSend size={20} />
                        </ActionIcon>
                    </Group>
                </Box>
            </Paper>
        </Stack>
    );
}
