// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION PAGE - GENERADOR DE INCIDENTES (MODERN UI)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    Button,
    ThemeIcon,
    Paper,
    SimpleGrid,
    Select,
    Box,
    Table,
    ActionIcon,
    Progress,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconFlame,
    IconCar,
    IconBallFootball,
    IconVirus,
    IconBuilding,
    IconTool,
    IconTrash,
    IconMapPin,
    IconAmbulance,
    IconRefresh,
    IconClock,
    IconBolt,
    IconSend,
    IconActivity,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';
import {
    generateIncident,
    fetchActiveIncidents,
    clearIncidents,
    type GenerateIncidentRequest,
    type IncidentResponse,
} from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const INCIDENT_TYPES = [
    { value: 'accidente_trafico', label: 'Accidente de tráfico', icon: IconCar, color: '#fd7e14', emoji: '🚗' },
    { value: 'incendio', label: 'Incendio', icon: IconFlame, color: '#fa5252', emoji: '🔥' },
    { value: 'evento_deportivo', label: 'Evento deportivo', icon: IconBallFootball, color: '#228be6', emoji: '⚽' },
    { value: 'intoxicacion_masiva', label: 'Intoxicación masiva', icon: IconVirus, color: '#be4bdb', emoji: '☠️' },
    { value: 'colapso_estructura', label: 'Colapso estructura', icon: IconBuilding, color: '#495057', emoji: '🏚️' },
    { value: 'accidente_laboral', label: 'Accidente laboral', icon: IconTool, color: '#fab005', emoji: '🏭' },
];

const SEVERITY_OPTIONS = [
    { value: 'leve', label: 'Leve', color: '#40c057', patients: '2-5' },
    { value: 'moderado', label: 'Moderado', color: '#fab005', patients: '5-10' },
    { value: 'grave', label: 'Grave', color: '#fd7e14', patients: '10-20' },
    { value: 'catastrofico', label: 'Catastrófico', color: '#fa5252', patients: '20+' },
];

const LOCATIONS = [
    { value: 'centro', label: '📍 Centro ciudad', lat: 43.3623, lon: -8.4115 },
    { value: 'riazor', label: '⚽ Estadio Riazor', lat: 43.36755, lon: -8.41085 },
    { value: 'coliseum', label: '🎵 Coliseum', lat: 43.33537, lon: -8.41171 },
    { value: 'puerto', label: '⚓ Puerto', lat: 43.3667, lon: -8.3967 },
    { value: 'industrial', label: '🏭 Zona industrial', lat: 43.3350, lon: -8.4200 },
    { value: 'autopista', label: '🛣️ Autopista AP-9', lat: 43.3450, lon: -8.4050 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENT TYPE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

interface IncidentTypeSelectorProps {
    value: string | null;
    onChange: (value: string) => void;
}

function IncidentTypeSelector({ value, onChange }: IncidentTypeSelectorProps) {
    return (
        <Box>
            <Text size="xs" c="dimmed" mb={8} fw={500}>Tipo de incidente</Text>
            <SimpleGrid cols={3} spacing={8}>
                {INCIDENT_TYPES.map((type, index) => (
                    <motion.div
                        key={type.value}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Paper
                            p="sm"
                            radius="md"
                            onClick={() => onChange(type.value)}
                            style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                background: value === type.value
                                    ? `linear-gradient(135deg, ${type.color}30 0%, ${type.color}15 100%)`
                                    : 'rgba(255,255,255,0.03)',
                                border: value === type.value
                                    ? `2px solid ${type.color}`
                                    : '2px solid rgba(255,255,255,0.08)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Text size="xl" mb={4}>{type.emoji}</Text>
                            <Text size="xs" fw={500} lineClamp={1}>{type.label}</Text>
                        </Paper>
                    </motion.div>
                ))}
            </SimpleGrid>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

interface SeveritySelectorProps {
    value: string | null;
    onChange: (value: string) => void;
}

function SeveritySelector({ value, onChange }: SeveritySelectorProps) {
    return (
        <Box>
            <Text size="xs" c="dimmed" mb={8} fw={500}>Gravedad</Text>
            <Group gap={8}>
                {SEVERITY_OPTIONS.map((sev) => (
                    <motion.div
                        key={sev.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Paper
                            px="md"
                            py="xs"
                            radius="xl"
                            onClick={() => onChange(sev.value)}
                            style={{
                                cursor: 'pointer',
                                background: value === sev.value
                                    ? sev.color
                                    : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${value === sev.value ? sev.color : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Group gap={6}>
                                <Text size="sm" fw={600}>{sev.label}</Text>
                                <Text size="xs" c={value === sev.value ? 'white' : 'dimmed'}>
                                    ({sev.patients})
                                </Text>
                            </Group>
                        </Paper>
                    </motion.div>
                ))}
            </Group>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENT CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface IncidentCardProps {
    incident: IncidentResponse;
    index: number;
}

function IncidentCard({ incident, index }: IncidentCardProps) {
    const timeAgo = getTimeAgo(incident.timestamp);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Paper
                p="md"
                radius="md"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    borderLeft: '3px solid #fa5252',
                }}
            >
                <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                        <Text size="xl">{incident.icono}</Text>
                        <Box>
                            <Text fw={600} size="sm">{incident.nombre}</Text>
                            <Text size="xs" c="dimmed">{timeAgo}</Text>
                        </Box>
                    </Group>
                    <Badge size="lg" color="red" variant="filled">
                        {incident.pacientes_generados} pac.
                    </Badge>
                </Group>

                <Paper p="xs" radius="sm" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <Group justify="space-between">
                        <Group gap={6}>
                            <IconAmbulance size={14} style={{ color: '#868e96' }} />
                            <Text size="xs" c="dimmed">Hospital:</Text>
                        </Group>
                        <Text size="xs" fw={500}>{incident.hospital_nombre}</Text>
                    </Group>
                    <Group justify="space-between" mt={4}>
                        <Group gap={6}>
                            <IconMapPin size={14} style={{ color: '#868e96' }} />
                            <Text size="xs" c="dimmed">Distancia:</Text>
                        </Group>
                        <Text size="xs">{incident.distancia_km} km</Text>
                    </Group>
                </Paper>

                <Progress
                    size={3}
                    value={100}
                    color="red"
                    mt="sm"
                    radius="xl"
                    animated
                />
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface ResultPanelProps {
    incident: IncidentResponse | null;
}

function ResultPanel({ incident }: ResultPanelProps) {
    const getTriageColor = (nivel: string) => {
        switch (nivel) {
            case 'rojo': return 'red';
            case 'naranja': return 'orange';
            case 'amarillo': return 'yellow';
            case 'verde': return 'green';
            default: return 'blue';
        }
    };

    if (!incident) {
        return (
            <Paper
                p="xl"
                radius="lg"
                style={{
                    background: cssVariables.glassBg,
                    border: `1px solid ${cssVariables.glassBorder}`,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Stack align="center" gap="sm">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <ThemeIcon size={70} radius="xl" variant="light" color="gray">
                            <IconAmbulance size={35} />
                        </ThemeIcon>
                    </motion.div>
                    <Text c="dimmed" size="sm" ta="center">
                        Genera un incidente para<br />ver los pacientes enviados
                    </Text>
                </Stack>
            </Paper>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                p="lg"
                radius="lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(250, 82, 82, 0.12) 0%, rgba(253, 126, 20, 0.08) 100%)',
                    border: '1px solid rgba(250, 82, 82, 0.25)',
                }}
            >
                <Stack gap="md">
                    <Group justify="space-between">
                        <Group gap="sm">
                            <Text size="2rem">{incident.icono}</Text>
                            <Box>
                                <Text fw={700}>{incident.nombre}</Text>
                                <Text size="xs" c="dimmed">{incident.incident_id}</Text>
                            </Box>
                        </Group>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            <Badge size="xl" color="red" variant="filled">
                                {incident.pacientes_generados} pacientes
                            </Badge>
                        </motion.div>
                    </Group>

                    <Paper p="sm" radius="md" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <SimpleGrid cols={2} spacing="xs">
                            <Group gap={6}>
                                <IconAmbulance size={16} style={{ color: '#868e96' }} />
                                <Text size="sm" c="dimmed">Hospital:</Text>
                            </Group>
                            <Text size="sm" fw={600} ta="right">{incident.hospital_nombre}</Text>

                            <Group gap={6}>
                                <IconMapPin size={16} style={{ color: '#868e96' }} />
                                <Text size="sm" c="dimmed">Distancia:</Text>
                            </Group>
                            <Text size="sm" ta="right">{incident.distancia_km} km</Text>
                        </SimpleGrid>
                    </Paper>

                    <Box>
                        <Text size="xs" fw={500} mb="xs">Pacientes generados:</Text>
                        <Box style={{ maxHeight: 180, overflowY: 'auto' }}>
                            <Table striped highlightOnHover withTableBorder>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Triaje</Table.Th>
                                        <Table.Th>Paciente</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {incident.pacientes_detalle.slice(0, 8).map((p, i) => (
                                        <motion.tr
                                            key={p.patient_id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <Table.Td>
                                                <Badge color={getTriageColor(p.nivel_triaje)} size="sm">
                                                    {p.nivel_triaje.toUpperCase()}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{p.nombre}</Text>
                                            </Table.Td>
                                        </motion.tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Box>
                        {incident.pacientes_detalle.length > 8 && (
                            <Text size="xs" c="dimmed" ta="center" mt="xs">
                                +{incident.pacientes_detalle.length - 8} pacientes más
                            </Text>
                        )}
                    </Box>
                </Stack>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getTimeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SimulationPage() {
    const [incidentType, setIncidentType] = useState<string | null>('accidente_trafico');
    const [severity, setSeverity] = useState<string | null>('moderado');
    const [location, setLocation] = useState<string | null>('centro');
    const [lastIncident, setLastIncident] = useState<IncidentResponse | null>(null);

    // Queries
    const activeIncidentsQuery = useQuery({
        queryKey: ['active-incidents'],
        queryFn: fetchActiveIncidents,
        refetchInterval: 5000,
    });

    // Mutations
    const incidentMutation = useMutation({
        mutationFn: (request: GenerateIncidentRequest) => generateIncident(request),
        onSuccess: (data) => {
            notifications.show({
                title: `🚨 ${data.nombre}`,
                message: `${data.pacientes_generados} pacientes → ${data.hospital_nombre}`,
                color: 'red',
                autoClose: 5000,
            });
            setLastIncident(data);
            activeIncidentsQuery.refetch();
        },
        onError: (error) => {
            notifications.show({
                title: 'Error de conexión',
                message: 'Backend no disponible. Verifica que esté corriendo en localhost:8000',
                color: 'red',
            });
            console.error('Incident error:', error);
        },
    });

    const clearMutation = useMutation({
        mutationFn: clearIncidents,
        onSuccess: (data) => {
            notifications.show({
                title: 'Limpiado',
                message: `${data.cleared} incidentes eliminados`,
                color: 'blue',
            });
            setLastIncident(null);
            activeIncidentsQuery.refetch();
        },
    });

    const handleGenerateIncident = () => {
        if (!incidentType || !severity || !location) return;

        const loc = LOCATIONS.find(l => l.value === location);
        if (!loc) return;

        const lat = loc.lat + (Math.random() - 0.5) * 0.01;
        const lon = loc.lon + (Math.random() - 0.5) * 0.01;

        const request: GenerateIncidentRequest = {
            tipo: incidentType as GenerateIncidentRequest['tipo'],
            gravedad: severity as GenerateIncidentRequest['gravedad'],
            ubicacion: { lat, lon },
        };

        incidentMutation.mutate(request);
    };

    const incidentCount = activeIncidentsQuery.data?.total || 0;

    return (
        <Stack gap="md">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Group justify="space-between">
                    <Group gap="md">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <ThemeIcon
                                size={50}
                                variant="gradient"
                                gradient={{ from: 'red', to: 'orange', deg: 135 }}
                                radius="xl"
                            >
                                <IconAlertTriangle size={28} />
                            </ThemeIcon>
                        </motion.div>
                        <Box>
                            <Title order={2} size="h3">Simulador de Incidentes</Title>
                            <Text size="xs" c="dimmed">Genera incidentes y simula llegadas de pacientes</Text>
                        </Box>
                    </Group>

                    <Group gap="sm">
                        {incidentCount > 0 && (
                            <>
                                <Badge
                                    size="lg"
                                    color="red"
                                    variant="filled"
                                    leftSection={<IconActivity size={14} />}
                                >
                                    {incidentCount} activo{incidentCount !== 1 ? 's' : ''}
                                </Badge>
                                <Tooltip label="Limpiar incidentes">
                                    <ActionIcon
                                        variant="light"
                                        color="red"
                                        size="lg"
                                        onClick={() => clearMutation.mutate()}
                                        loading={clearMutation.isPending}
                                    >
                                        <IconTrash size={18} />
                                    </ActionIcon>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip label="Actualizar">
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="lg"
                                onClick={() => activeIncidentsQuery.refetch()}
                                loading={activeIncidentsQuery.isRefetching}
                            >
                                <IconRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </motion.div>

            {/* Main Content */}
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                {/* Generator Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card
                        p="lg"
                        radius="lg"
                        style={{
                            background: cssVariables.glassBg,
                            border: `1px solid ${cssVariables.glassBorder}`,
                        }}
                    >
                        <Stack gap="lg">
                            <Group gap="xs">
                                <ThemeIcon
                                    size="md"
                                    variant="gradient"
                                    gradient={{ from: 'red', to: 'orange' }}
                                    radius="md"
                                >
                                    <IconBolt size={16} />
                                </ThemeIcon>
                                <Text fw={600}>Configurar Incidente</Text>
                            </Group>

                            <IncidentTypeSelector
                                value={incidentType}
                                onChange={setIncidentType}
                            />

                            <SeveritySelector
                                value={severity}
                                onChange={setSeverity}
                            />

                            <Box>
                                <Text size="xs" c="dimmed" mb={8} fw={500}>Ubicación</Text>
                                <Select
                                    placeholder="Selecciona ubicación"
                                    data={LOCATIONS}
                                    value={location}
                                    onChange={setLocation}
                                    leftSection={<IconMapPin size={16} />}
                                    size="md"
                                    radius="md"
                                />
                            </Box>

                            <Button
                                size="lg"
                                fullWidth
                                variant="gradient"
                                gradient={{ from: 'red', to: 'orange' }}
                                leftSection={<IconSend size={20} />}
                                onClick={handleGenerateIncident}
                                loading={incidentMutation.isPending}
                                radius="md"
                            >
                                Generar Incidente
                            </Button>
                        </Stack>
                    </Card>
                </motion.div>

                {/* Result Panel */}
                <ResultPanel incident={lastIncident} />
            </SimpleGrid>

            {/* History */}
            <AnimatePresence>
                {incidentCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card
                            p="md"
                            radius="lg"
                            style={{
                                background: cssVariables.glassBg,
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Group justify="space-between" mb="md">
                                <Group gap="xs">
                                    <IconClock size={18} style={{ color: '#fd7e14' }} />
                                    <Text fw={600}>Incidentes Activos</Text>
                                </Group>
                                <Badge variant="light" color="orange">
                                    {incidentCount} total
                                </Badge>
                            </Group>

                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="sm">
                                {activeIncidentsQuery.data?.incidentes?.map((inc: IncidentResponse, i: number) => (
                                    <IncidentCard key={inc.incident_id} incident={inc} index={i} />
                                ))}
                            </SimpleGrid>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </Stack>
    );
}
