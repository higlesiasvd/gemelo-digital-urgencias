import { useState, useRef, useEffect } from 'react';
import {
  Paper,
  TextInput,
  ActionIcon,
  ScrollArea,
  Stack,
  Text,
  Group,
  Badge,
  ThemeIcon,
  Loader,
  Transition,
  Box,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  IconSend,
  IconRobot,
  IconUser,
  IconX,
  IconMessageCircle,
  IconBuildingHospital,
  IconActivity,
  IconClock,
  IconAlertTriangle,
  IconSparkles,
} from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

// URL del servidor MCP (usa el proxy de nginx en producción)
const MCP_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : '/api/mcp';

// Sugerencias rápidas
const QUICK_SUGGESTIONS = [
  { text: '¿Cómo está el sistema?', icon: IconActivity },
  { text: '¿Cuál hospital tiene menos espera?', icon: IconClock },
  { text: '¿Dónde hay más boxes libres?', icon: IconBuildingHospital },
  { text: '¿Hay alguna emergencia activa?', icon: IconAlertTriangle },
];

export function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! 👋 Soy el asistente del sistema de urgencias. Puedo ayudarte con:\n\n' +
        '• **Estado de hospitales** - ocupación, tiempos de espera\n' +
        '• **Comparaciones** - cuál está más/menos saturado\n' +
        '• **Recomendaciones** - mejor hospital para emergencias\n' +
        '• **Resumen general** - estado del sistema\n\n' +
        '¿En qué puedo ayudarte?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${MCP_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No pude obtener una respuesta.',
        timestamp: new Date(),
        toolsUsed: data.tools_used,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error en chat:', error);
      
      // Mensaje de error amigable
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Lo siento, no pude conectar con el servidor MCP. ' +
          'Asegúrate de que el servicio esté ejecutándose.\n\n' +
          `Error: ${error instanceof Error ? error.message : 'Desconocido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickSuggestion = (text: string) => {
    sendMessage(text);
  };

  return (
    <Transition mounted={isOpen} transition="slide-up" duration={300}>
      {(styles) => (
        <Paper
          shadow="xl"
          radius="lg"
          style={{
            ...styles,
            position: 'fixed',
            bottom: 90,
            left: 20,
            width: 420,
            height: 600,
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            border: '1px solid var(--mantine-color-gray-3)',
          }}
        >
          {/* Header */}
          <Box
            p="md"
            style={{
              background: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)',
              color: 'white',
            }}
          >
            <Group justify="space-between">
              <Group gap="sm">
                <ThemeIcon size="lg" radius="xl" variant="white" color="blue">
                  <IconRobot size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="md">Asistente de Urgencias</Text>
                  <Text size="xs" opacity={0.8}>Powered by MCP</Text>
                </div>
              </Group>
              <Tooltip label="Cerrar">
                <ActionIcon
                  variant="subtle"
                  color="white"
                  onClick={onClose}
                  size="lg"
                >
                  <IconX size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Box>

          {/* Messages */}
          <ScrollArea
            flex={1}
            p="md"
            viewportRef={scrollRef}
            style={{ background: '#f8f9fa' }}
          >
            <Stack gap="md">
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    p="sm"
                    radius="lg"
                    style={{
                      maxWidth: '85%',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #228be6 0%, #1c7ed6 100%)'
                        : 'white',
                      color: msg.role === 'user' ? 'white' : 'inherit',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Group gap="xs" mb={4}>
                      <ThemeIcon
                        size="sm"
                        radius="xl"
                        variant={msg.role === 'user' ? 'white' : 'light'}
                        color={msg.role === 'user' ? 'blue' : 'cyan'}
                      >
                        {msg.role === 'user' ? <IconUser size={12} /> : <IconRobot size={12} />}
                      </ThemeIcon>
                      <Text size="xs" c={msg.role === 'user' ? 'white' : 'dimmed'}>
                        {msg.role === 'user' ? 'Tú' : 'Asistente'}
                      </Text>
                      <Text size="xs" c={msg.role === 'user' ? 'white' : 'dimmed'} opacity={0.7}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Group>

                    <Box
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        '& p': { margin: 0 },
                        '& strong': { fontWeight: 600 },
                        '& ul, & ol': { paddingLeft: 20, margin: '8px 0' },
                        '& li': { marginBottom: 4 },
                      }}
                      className="markdown-content"
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </Box>

                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <Group gap={4} mt="xs">
                        <IconSparkles size={12} color="#868e96" />
                        {msg.toolsUsed.map((tool, idx) => (
                          <Badge key={idx} size="xs" variant="light" color="gray">
                            {tool.replace('get_', '').replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </Group>
                    )}
                  </Paper>
                </Box>
              ))}

              {isLoading && (
                <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper p="sm" radius="lg" style={{ background: 'white' }}>
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="sm" c="dimmed">Consultando información...</Text>
                    </Group>
                  </Paper>
                </Box>
              )}
            </Stack>
          </ScrollArea>

          {/* Quick suggestions */}
          {messages.length <= 2 && (
            <Box px="md" pb="xs">
              <Divider mb="xs" label="Sugerencias rápidas" labelPosition="center" />
              <Group gap="xs">
                {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                  <Badge
                    key={idx}
                    variant="light"
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    leftSection={<suggestion.icon size={12} />}
                    onClick={() => handleQuickSuggestion(suggestion.text)}
                  >
                    {suggestion.text}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}

          {/* Input */}
          <Box p="md" style={{ borderTop: '1px solid #e9ecef', background: 'white' }}>
            <Group gap="xs">
              <TextInput
                ref={inputRef}
                flex={1}
                placeholder="Escribe tu pregunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                radius="xl"
                size="md"
                styles={{
                  input: {
                    border: '1px solid #dee2e6',
                    '&:focus': {
                      borderColor: '#228be6',
                    },
                  },
                }}
              />
              <Tooltip label="Enviar">
                <ActionIcon
                  size="xl"
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                >
                  <IconSend size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Box>
        </Paper>
      )}
    </Transition>
  );
}

// Botón flotante para abrir el chatbot
export function ChatbotButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip label="Asistente de Urgencias" position="right">
      <ActionIcon
        size={60}
        radius="xl"
        variant="gradient"
        gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
        onClick={onClick}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          boxShadow: '0 4px 20px rgba(34, 139, 230, 0.4)',
          zIndex: 999,
          transition: 'transform 0.2s ease',
        }}
        className="chatbot-button"
      >
        <IconMessageCircle size={28} />
      </ActionIcon>
    </Tooltip>
  );
}
