// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION PAGE - GENERADOR DE INCIDENTES (SIMPLIFIED)
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
    Tabs,
    Table,
    ActionIcon,
    Progress,
    Tooltip,
    Transition,
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
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    generateIncident,
    fetchActiveIncidents,
    clearIncidents,
    type GenerateIncidentRequest,
    type IncidentResponse,
} from '@/shared/api/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const INCIDENT_TYPES = [
    { value: 'accidente_trafico', label: '🚗 Accidente de tráfico', icon: IconCar, color: 'orange', emoji: '🚗' },
    { value: 'incendio', label: '🔥 Incendio', icon: IconFlame, color: 'red', emoji: '🔥' },
    { value: 'evento_deportivo', label: '⚽ Evento deportivo', icon: IconBallFootball, color: 'blue', emoji: '⚽' },
    { value: 'intoxicacion_masiva', label: '☠️ Intoxicación masiva', icon: IconVirus, color: 'grape', emoji: '☠️' },
    { value: 'colapso_estructura', label: '🏚️ Colapso estructura', icon: IconBuilding, color: 'dark', emoji: '🏚️' },
    { value: 'accidente_laboral', label: '🏭 Accidente laboral', icon: IconTool, color: 'yellow', emoji: '🏭' },
];

const SEVERITY_OPTIONS = [
    { value: 'leve', label: 'Leve', color: 'green', patients: '2-5' },
    { value: 'moderado', label: 'Moderado', color: 'yellow', patients: '5-10' },
    { value: 'grave', label: 'Grave', color: 'orange', patients: '10-20' },
    { value: 'catastrofico', label: 'Catastrófico', color: 'red', patients: '20+' },
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
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const glassCard = {
    background: 'rgba(30, 30, 46, 0.6)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SimulationPage() {
    const [activeTab, setActiveTab] = useState<string | null>('incidents');

    // Incident generation state
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
                message: `Backend no disponible. Verifica que esté corriendo en localhost:8000`,
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

    const getTriageColor = (nivel: string) => {
        switch (nivel) {
            case 'rojo': return 'red';
            case 'naranja': return 'orange';
            case 'amarillo': return 'yellow';
            case 'verde': return 'green';
            default: return 'blue';
        }
    };

    const incidentCount = activeIncidentsQuery.data?.total || 0;

    return (
        <Stack gap="md">
            {/* ══════════════════════════════════════════════════════════════ */}
            {/* COMPACT HEADER */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Paper
                p="sm"
                radius="lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(250, 82, 82, 0.15) 0%, rgba(253, 126, 20, 0.1) 100%)',
                    border: '1px solid rgba(250, 82, 82, 0.2)',
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <ThemeIcon
                            size={40}
                            variant="gradient"
                            gradient={{ from: 'red', to: 'orange' }}
                            radius="xl"
                        >
                            <IconAlertTriangle size={22} />
                        </ThemeIcon>
                        <div>
                            <Title order={4} style={{ lineHeight: 1.2 }}>Generador de Incidentes</Title>
                            <Text size="xs" c="dimmed">Simula incidentes y gestiona llegadas al hospital</Text>
                        </div>
                    </Group>
                    {incidentCount > 0 && (
                        <Badge size="lg" color="red" variant="filled">
                            {incidentCount} activo{incidentCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </Group>
            </Paper>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TABS */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Tabs
                value={activeTab}
                onChange={setActiveTab}
                variant="pills"
                radius="xl"
                styles={{
                    list: {
                        background: 'rgba(0,0,0,0.2)',
                        padding: '4px',
                        borderRadius: '24px',
                        gap: '4px',
                    },
                    tab: {
                        fontWeight: 500,
                        fontSize: '13px',
                        padding: '8px 16px',
                        transition: 'all 0.2s ease',
                    },
                }}
            >
                <Tabs.List grow>
                    <Tabs.Tab value="incidents" leftSection={<IconBolt size={16} />}>
                        Generar Incidente
                    </Tabs.Tab>
                    <Tabs.Tab value="history" leftSection={<IconClock size={16} />}>
                        Historial {incidentCount > 0 && `(${incidentCount})`}
                    </Tabs.Tab>
                </Tabs.List>

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* TAB: Generador de Incidentes */}
                {/* ══════════════════════════════════════════════════════════════ */}
                <Tabs.Panel value="incidents" pt="md">
                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                        {/* Generator */}
                        <Card padding="lg" radius="lg" style={glassCard}>
                            <Stack gap="md">
                                <Group gap="xs">
                                    <ThemeIcon size={28} variant="gradient" gradient={{ from: 'red', to: 'orange' }} radius="md">
                                        <IconBolt size={16} />
                                    </ThemeIcon>
                                    <Text fw={600} size="sm">Configurar Incidente</Text>
                                </Group>

                                {/* Incident Type Chips */}
                                <div>
                                    <Text size="xs" c="dimmed" mb={6}>Tipo de incidente</Text>
                                    <SimpleGrid cols={3} spacing={6}>
                                        {INCIDENT_TYPES.map((type) => (
                                            <Tooltip key={type.value} label={type.label} position="top">
                                                <Paper
                                                    p="xs"
                                                    radius="md"
                                                    onClick={() => setIncidentType(type.value)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        background: incidentType === type.value
                                                            ? `var(--mantine-color-${type.color}-filled)`
                                                            : 'rgba(255,255,255,0.05)',
                                                        border: incidentType === type.value
                                                            ? `2px solid var(--mantine-color-${type.color}-filled)`
                                                            : '2px solid transparent',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    <Text size="xl">{type.emoji}</Text>
                                                </Paper>
                                            </Tooltip>
                                        ))}
                                    </SimpleGrid>
                                </div>

                                {/* Severity Chips */}
                                <div>
                                    <Text size="xs" c="dimmed" mb={6}>Gravedad</Text>
                                    <Group gap={6}>
                                        {SEVERITY_OPTIONS.map((sev) => (
                                            <Badge
                                                key={sev.value}
                                                size="lg"
                                                variant={severity === sev.value ? 'filled' : 'light'}
                                                color={sev.color}
                                                onClick={() => setSeverity(sev.value)}
                                                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                            >
                                                {sev.label}
                                            </Badge>
                                        ))}
                                    </Group>
                                </div>

                                <Select
                                    label="Ubicación"
                                    placeholder="Selecciona ubicación"
                                    data={LOCATIONS}
                                    value={location}
                                    onChange={setLocation}
                                    leftSection={<IconMapPin size={14} />}
                                    size="sm"
                                    styles={{ label: { fontSize: 12, color: 'var(--mantine-color-dimmed)' } }}
                                />

                                <Button
                                    size="md"
                                    fullWidth
                                    variant="gradient"
                                    gradient={{ from: 'red', to: 'orange' }}
                                    leftSection={<IconAlertTriangle size={18} />}
                                    onClick={handleGenerateIncident}
                                    loading={incidentMutation.isPending}
                                >
                                    🚨 Generar Incidente
                                </Button>
                            </Stack>
                        </Card>

                        {/* Result Card */}
                        <Transition mounted={!!lastIncident} transition="slide-left" duration={300}>
                            {(styles) => (
                                <Card
                                    padding="lg"
                                    radius="lg"
                                    style={{
                                        ...styles,
                                        background: 'linear-gradient(135deg, rgba(250, 82, 82, 0.12) 0%, rgba(253, 126, 20, 0.08) 100%)',
                                        border: '1px solid rgba(250, 82, 82, 0.25)',
                                    }}
                                >
                                    {lastIncident && (
                                        <Stack gap="sm">
                                            <Group justify="space-between">
                                                <Group gap="xs">
                                                    <Text size="xl">{lastIncident.icono}</Text>
                                                    <div>
                                                        <Text fw={700} size="sm">{lastIncident.nombre}</Text>
                                                        <Text size="xs" c="dimmed">{lastIncident.incident_id}</Text>
                                                    </div>
                                                </Group>
                                                <Badge color="red" size="lg" variant="filled">
                                                    {lastIncident.pacientes_generados} pac.
                                                </Badge>
                                            </Group>

                                            <Paper p="xs" radius="md" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                                <Group justify="space-between">
                                                    <Text size="xs" c="dimmed">Hospital:</Text>
                                                    <Text size="xs" fw={600}>{lastIncident.hospital_nombre}</Text>
                                                </Group>
                                                <Group justify="space-between">
                                                    <Text size="xs" c="dimmed">Distancia:</Text>
                                                    <Text size="xs">{lastIncident.distancia_km} km</Text>
                                                </Group>
                                            </Paper>

                                            <Box style={{ maxHeight: 150, overflowY: 'auto' }}>
                                                <Table striped highlightOnHover withTableBorder fz="xs">
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Triaje</Table.Th>
                                                            <Table.Th>Paciente</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {lastIncident.pacientes_detalle.slice(0, 5).map((p) => (
                                                            <Table.Tr key={p.patient_id}>
                                                                <Table.Td>
                                                                    <Badge color={getTriageColor(p.nivel_triaje)} size="xs">
                                                                        {p.nivel_triaje.toUpperCase()}
                                                                    </Badge>
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    <Text size="xs">{p.nombre}</Text>
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            </Box>
                                            {lastIncident.pacientes_detalle.length > 5 && (
                                                <Text size="xs" c="dimmed" ta="center">
                                                    +{lastIncident.pacientes_detalle.length - 5} más
                                                </Text>
                                            )}
                                        </Stack>
                                    )}
                                </Card>
                            )}
                        </Transition>

                        {!lastIncident && (
                            <Card
                                padding="xl"
                                radius="lg"
                                style={{
                                    ...glassCard,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Stack align="center" gap="xs">
                                    <ThemeIcon size={60} radius="xl" variant="light" color="gray">
                                        <IconAmbulance size={30} />
                                    </ThemeIcon>
                                    <Text c="dimmed" size="sm" ta="center">
                                        Genera un incidente para<br />ver los pacientes enviados
                                    </Text>
                                </Stack>
                            </Card>
                        )}
                    </SimpleGrid>
                </Tabs.Panel>

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* TAB: Historial */}
                {/* ══════════════════════════════════════════════════════════════ */}
                <Tabs.Panel value="history" pt="md">
                    <Card padding="md" radius="lg" style={glassCard}>
                        <Group justify="space-between" mb="md">
                            <Text fw={600} size="sm">Historial de Incidentes</Text>
                            <Group gap="xs">
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    onClick={() => activeIncidentsQuery.refetch()}
                                    loading={activeIncidentsQuery.isRefetching}
                                >
                                    <IconRefresh size={14} />
                                </ActionIcon>
                                <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    leftSection={<IconTrash size={12} />}
                                    onClick={() => clearMutation.mutate()}
                                    loading={clearMutation.isPending}
                                    disabled={!incidentCount}
                                >
                                    Limpiar
                                </Button>
                            </Group>
                        </Group>

                        {incidentCount > 0 ? (
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="sm">
                                {activeIncidentsQuery.data?.incidentes?.map((inc: IncidentResponse) => (
                                    <Paper
                                        key={inc.incident_id}
                                        p="sm"
                                        radius="md"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            transition: 'all 0.2s ease',
                                        }}
                                        className="hover-lift"
                                    >
                                        <Group justify="space-between" mb={4}>
                                            <Group gap={6}>
                                                <Text size="md">{inc.icono}</Text>
                                                <Text fw={600} size="xs" lineClamp={1}>{inc.nombre}</Text>
                                            </Group>
                                            <Badge size="xs" color="red">{inc.pacientes_generados}</Badge>
                                        </Group>
                                        <Stack gap={2}>
                                            <Group justify="space-between">
                                                <Text size="xs" c="dimmed">Hospital:</Text>
                                                <Text size="xs" fw={500}>{inc.hospital_nombre}</Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Text size="xs" c="dimmed">Hora:</Text>
                                                <Text size="xs">{new Date(inc.timestamp).toLocaleTimeString()}</Text>
                                            </Group>
                                        </Stack>
                                        <Progress
                                            size={3}
                                            value={100}
                                            color="red"
                                            mt={8}
                                            radius="xl"
                                            animated
                                        />
                                    </Paper>
                                ))}
                            </SimpleGrid>
                        ) : (
                            <Paper p="xl" radius="md" style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                                <ThemeIcon size={50} radius="xl" variant="light" color="gray" mx="auto" mb="sm">
                                    <IconAlertTriangle size={24} />
                                </ThemeIcon>
                                <Text c="dimmed" size="sm">No hay incidentes registrados</Text>
                                <Text size="xs" c="dimmed">Genera uno desde la pestaña anterior</Text>
                            </Paper>
                        )}
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
