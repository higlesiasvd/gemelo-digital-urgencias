// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE - Página de inicio de sesión con Email y OAuth
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box,
    Button,
    Text,
    Stack,
    Paper,
    Group,
    ThemeIcon,
    TextInput,
    PasswordInput,
    Tabs,
    Alert,
    Anchor,
} from '@mantine/core';
import {
    IconBrandGoogle,
    IconActivity,
    IconMail,
    IconLock,
    IconAlertCircle,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import { cssVariables } from '@/shared/theme';

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LoginPage() {
    const { isAuthenticated, isLoading, login, devLogin, setAuth } = useAuth();
    const navigate = useNavigate();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/');
        }
    }, [isLoading, isAuthenticated, navigate]);

    const handleGoogleLogin = () => {
        login();
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoginLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error al iniciar sesión');
            }

            // Store token and set auth state
            localStorage.setItem('auth_token', data.access_token);
            setAuth(data.user, data.access_token);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleDevLogin = async () => {
        try {
            await devLogin();
            navigate('/');
        } catch (error) {
            console.error('Error en dev login:', error);
        }
    };

    if (isLoading) {
        return (
            <Box
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)',
                }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: 40,
                        height: 40,
                        border: '3px solid rgba(0, 196, 220, 0.3)',
                        borderTopColor: '#00c4dc',
                        borderRadius: '50%',
                    }}
                />
            </Box>
        );
    }

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
            {/* Background decorations */}
            <Box
                style={{
                    position: 'fixed',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.1, 0.15, 0.1],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        top: '10%',
                        right: '10%',
                        width: 400,
                        height: 400,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(0, 196, 220, 0.2) 0%, transparent 70%)',
                    }}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.08, 0.12, 0.08],
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 2 }}
                    style={{
                        position: 'absolute',
                        bottom: '5%',
                        left: '5%',
                        width: 500,
                        height: 500,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(0, 214, 143, 0.15) 0%, transparent 70%)',
                    }}
                />
            </Box>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: cssVariables.glassBg,
                        border: `1px solid ${cssVariables.glassBorder}`,
                        backdropFilter: 'blur(20px)',
                        maxWidth: 420,
                        width: '100%',
                    }}
                >
                    <Stack align="center" gap="lg">
                        {/* Logo */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            style={{
                                width: 70,
                                height: 70,
                                borderRadius: 18,
                                background: 'conic-gradient(from 0deg, #00c4dc, #0d6ebd, #00d68f, #8b6ce6, #00c4dc)',
                                padding: 3,
                            }}
                        >
                            <Box
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 16,
                                    background: '#0a1628',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                                    <defs>
                                        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#00c4dc" />
                                            <stop offset="100%" stopColor="#00d68f" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M4 6v12M20 6v12M4 12h4l2-3 4 6 2-3h4"
                                        stroke="url(#logoGrad)"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </Box>
                        </motion.div>

                        {/* Title */}
                        <Box ta="center">
                            <Text
                                fw={700}
                                style={{
                                    fontSize: '1.8rem',
                                    lineHeight: 1.2,
                                    letterSpacing: '-0.03em',
                                }}
                            >
                                <span style={{
                                    background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.9) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}>Health</span>
                                <span style={{
                                    background: 'linear-gradient(135deg, #00c4dc 0%, #00d68f 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}>Verse</span>
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                Inicia sesión para continuar
                            </Text>
                        </Box>

                        {/* Error alert */}
                        {error && (
                            <Alert
                                icon={<IconAlertCircle size={16} />}
                                color="red"
                                variant="light"
                                w="100%"
                                radius="lg"
                            >
                                {error}
                            </Alert>
                        )}

                        {/* Login tabs */}
                        <Tabs defaultValue="email" w="100%" radius="lg">
                            <Tabs.List grow mb="md">
                                <Tabs.Tab value="email" leftSection={<IconMail size={16} />}>
                                    Email
                                </Tabs.Tab>
                                <Tabs.Tab value="google" leftSection={<IconBrandGoogle size={16} />}>
                                    Google
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="email">
                                <form onSubmit={handleEmailLogin}>
                                    <Stack gap="md">
                                        <TextInput
                                            label="Email"
                                            placeholder="tu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            leftSection={<IconMail size={16} />}
                                            required
                                            radius="lg"
                                            size="md"
                                        />
                                        <PasswordInput
                                            label="Contraseña"
                                            placeholder="Tu contraseña"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            leftSection={<IconLock size={16} />}
                                            required
                                            radius="lg"
                                            size="md"
                                        />
                                        <Button
                                            type="submit"
                                            fullWidth
                                            size="lg"
                                            radius="xl"
                                            loading={loginLoading}
                                            style={{
                                                background: cssVariables.gradientPrimary,
                                                height: 48,
                                            }}
                                        >
                                            Iniciar sesión
                                        </Button>
                                    </Stack>
                                </form>

                                <Text size="sm" ta="center" mt="md" c="dimmed">
                                    ¿No tienes cuenta?{' '}
                                    <Anchor component={Link} to="/register" fw={600} c="cyan">
                                        Regístrate
                                    </Anchor>
                                </Text>
                            </Tabs.Panel>

                            <Tabs.Panel value="google">
                                <Stack gap="md">
                                    <Button
                                        fullWidth
                                        size="lg"
                                        radius="xl"
                                        variant="filled"
                                        leftSection={<IconBrandGoogle size={20} />}
                                        onClick={handleGoogleLogin}
                                        style={{
                                            background: 'linear-gradient(135deg, #4285F4 0%, #3367D6 100%)',
                                            border: 'none',
                                            height: 48,
                                        }}
                                    >
                                        Continuar con Google
                                    </Button>
                                    <Text size="xs" c="dimmed" ta="center">
                                        Inicia sesión de forma segura con tu cuenta de Google
                                    </Text>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>

                        {/* Dev login (solo en desarrollo) */}
                        {import.meta.env.DEV && (
                            <Button
                                fullWidth
                                size="sm"
                                radius="xl"
                                variant="subtle"
                                color="gray"
                                onClick={handleDevLogin}
                            >
                                Login de desarrollo
                            </Button>
                        )}

                        {/* Footer */}
                        <Group gap="xs" mt="sm">
                            <ThemeIcon size="xs" variant="light" color="cyan" radius="xl">
                                <IconActivity size={10} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">
                                Formación y gestión hospitalaria
                            </Text>
                        </Group>
                    </Stack>
                </Paper>
            </motion.div>
        </Box>
    );
}
