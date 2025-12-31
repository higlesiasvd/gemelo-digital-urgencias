// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY EMAIL PAGE - Página de verificación de email
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Text,
    Stack,
    ThemeIcon,
    Button,
    Alert,
    Loader,
} from '@mantine/core';
import {
    IconCheck,
    IconX,
    IconAlertCircle,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { cssVariables } from '@/shared/theme';

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token de verificación no proporcionado');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message || '¡Email verificado correctamente!');
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Error al verificar el email');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Error de conexión. Inténtalo de nuevo.');
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <Box
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #1a2744 100%)',
                padding: 20,
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: cssVariables.glassBg,
                        border: `1px solid ${cssVariables.glassBorder}`,
                        maxWidth: 420,
                        textAlign: 'center',
                    }}
                >
                    <Stack align="center" gap="lg">
                        {/* Loading */}
                        {status === 'loading' && (
                            <>
                                <Loader size="lg" color="cyan" />
                                <Text size="lg" fw={600}>
                                    Verificando email...
                                </Text>
                                <Text c="dimmed" size="sm">
                                    Por favor espera mientras verificamos tu cuenta
                                </Text>
                            </>
                        )}

                        {/* Success */}
                        {status === 'success' && (
                            <>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 10 }}
                                >
                                    <ThemeIcon size={80} radius="xl" color="green" variant="light">
                                        <IconCheck size={40} />
                                    </ThemeIcon>
                                </motion.div>
                                <Text size="xl" fw={700} style={{ color: '#22c55e' }}>
                                    ¡Email verificado!
                                </Text>
                                <Text c="dimmed">{message}</Text>
                                <Button
                                    size="lg"
                                    radius="xl"
                                    onClick={() => navigate('/login')}
                                    style={{
                                        background: cssVariables.gradientSuccess,
                                    }}
                                >
                                    Iniciar sesión
                                </Button>
                            </>
                        )}

                        {/* Error */}
                        {status === 'error' && (
                            <>
                                <ThemeIcon size={80} radius="xl" color="red" variant="light">
                                    <IconX size={40} />
                                </ThemeIcon>
                                <Text size="xl" fw={700} style={{ color: '#ef4444' }}>
                                    Error de verificación
                                </Text>
                                <Alert
                                    icon={<IconAlertCircle size={16} />}
                                    color="red"
                                    variant="light"
                                    w="100%"
                                    radius="lg"
                                >
                                    {message}
                                </Alert>
                                <Stack gap="sm" w="100%">
                                    <Button
                                        variant="light"
                                        radius="xl"
                                        onClick={() => navigate('/login')}
                                    >
                                        Volver al login
                                    </Button>
                                    <Text size="xs" c="dimmed">
                                        Si el enlace ha expirado, solicita un nuevo email de verificación desde el login
                                    </Text>
                                </Stack>
                            </>
                        )}
                    </Stack>
                </Paper>
            </motion.div>
        </Box>
    );
}
