// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER PAGE - Página de registro con email
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Text,
    Stack,
    Paper,
    TextInput,
    PasswordInput,
    Alert,
    Anchor,
    Progress,
    List,
    ThemeIcon,
} from '@mantine/core';
import {
    IconMail,
    IconLock,
    IconUser,
    IconAlertCircle,
    IconCheck,
    IconX,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { cssVariables } from '@/shared/theme';

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD STRENGTH
// ═══════════════════════════════════════════════════════════════════════════════

function getPasswordStrength(password: string): number {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
}

function getStrengthColor(strength: number): string {
    if (strength < 50) return 'red';
    if (strength < 75) return 'yellow';
    if (strength < 100) return 'cyan';
    return 'green';
}

interface PasswordRequirement {
    label: string;
    met: boolean;
}

function getPasswordRequirements(password: string): PasswordRequirement[] {
    return [
        { label: 'Al menos 8 caracteres', met: password.length >= 8 },
        { label: 'Al menos una mayúscula', met: /[A-Z]/.test(password) },
        { label: 'Al menos una minúscula', met: /[a-z]/.test(password) },
        { label: 'Al menos un número', met: /[0-9]/.test(password) },
    ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function RegisterPage() {
    const navigate = useNavigate();

    // Form state
    const [nombre, setNombre] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const passwordStrength = getPasswordStrength(password);
    const passwordRequirements = getPasswordRequirements(password);
    const allRequirementsMet = passwordRequirements.every((r) => r.met);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validations
        if (!allRequirementsMet) {
            setError('La contraseña no cumple con los requisitos');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    nombre,
                    apellidos: apellidos || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error al registrarse');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    // Success screen
    if (success) {
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
                            <ThemeIcon size={80} radius="xl" color="green" variant="light">
                                <IconCheck size={40} />
                            </ThemeIcon>
                            <Text size="xl" fw={700}>
                                ¡Cuenta creada!
                            </Text>
                            <Text c="dimmed">
                                Tu cuenta ha sido creada correctamente.
                                Ya puedes iniciar sesión.
                            </Text>
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
                        </Stack>
                    </Paper>
                </motion.div>
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
                        top: '5%',
                        left: '15%',
                        width: 400,
                        height: 400,
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
                    <Stack gap="lg">
                        {/* Header */}
                        <Box ta="center">
                            <Text
                                fw={700}
                                style={{
                                    fontSize: '1.6rem',
                                    background: 'linear-gradient(135deg, #00c4dc 0%, #00d68f 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Crear cuenta
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                Únete a HealthVerse
                            </Text>
                        </Box>

                        {/* Error */}
                        {error && (
                            <Alert
                                icon={<IconAlertCircle size={16} />}
                                color="red"
                                variant="light"
                                radius="lg"
                            >
                                {error}
                            </Alert>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <Stack gap="md">
                                <TextInput
                                    label="Nombre"
                                    placeholder="Tu nombre"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    leftSection={<IconUser size={16} />}
                                    required
                                    radius="lg"
                                />
                                <TextInput
                                    label="Apellidos"
                                    placeholder="Tus apellidos (opcional)"
                                    value={apellidos}
                                    onChange={(e) => setApellidos(e.target.value)}
                                    leftSection={<IconUser size={16} />}
                                    radius="lg"
                                />
                                <TextInput
                                    label="Email"
                                    placeholder="tu@email.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    leftSection={<IconMail size={16} />}
                                    required
                                    radius="lg"
                                />
                                <Box>
                                    <PasswordInput
                                        label="Contraseña"
                                        placeholder="Crea una contraseña segura"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        leftSection={<IconLock size={16} />}
                                        required
                                        radius="lg"
                                    />
                                    {password && (
                                        <Box mt="xs">
                                            <Progress
                                                value={passwordStrength}
                                                color={getStrengthColor(passwordStrength)}
                                                size="xs"
                                                radius="xl"
                                            />
                                            <List size="xs" mt="xs" spacing={2}>
                                                {passwordRequirements.map((req, i) => (
                                                    <List.Item
                                                        key={i}
                                                        icon={
                                                            req.met ? (
                                                                <ThemeIcon size={14} radius="xl" color="green">
                                                                    <IconCheck size={10} />
                                                                </ThemeIcon>
                                                            ) : (
                                                                <ThemeIcon size={14} radius="xl" color="red" variant="light">
                                                                    <IconX size={10} />
                                                                </ThemeIcon>
                                                            )
                                                        }
                                                        style={{ color: req.met ? '#22c55e' : '#a0aec0' }}
                                                    >
                                                        {req.label}
                                                    </List.Item>
                                                ))}
                                            </List>
                                        </Box>
                                    )}
                                </Box>
                                <PasswordInput
                                    label="Confirmar contraseña"
                                    placeholder="Repite la contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    leftSection={<IconLock size={16} />}
                                    required
                                    radius="lg"
                                    error={
                                        confirmPassword && password !== confirmPassword
                                            ? 'Las contraseñas no coinciden'
                                            : null
                                    }
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    size="lg"
                                    radius="xl"
                                    loading={loading}
                                    disabled={!allRequirementsMet || password !== confirmPassword}
                                    style={{
                                        background: cssVariables.gradientSuccess,
                                        height: 48,
                                    }}
                                >
                                    Crear cuenta
                                </Button>
                            </Stack>
                        </form>

                        {/* Link to login */}
                        <Text size="sm" ta="center" c="dimmed">
                            ¿Ya tienes cuenta?{' '}
                            <Anchor component={Link} to="/login" fw={600} c="cyan">
                                Inicia sesión
                            </Anchor>
                        </Text>
                    </Stack>
                </Paper>
            </motion.div>
        </Box>
    );
}
