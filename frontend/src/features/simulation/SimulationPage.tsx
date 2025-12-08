// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION PAGE - SIMULADOR Y GENERADOR DE INCIDENTES
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
    Slider,
    Switch,
    Select,
    Box,
    Tabs,
    Table,
    ActionIcon,
    Progress,
    Alert,
} from '@mantine/core';
import {
    IconPlayerPlay,
    IconPlayerStop,
    IconTestPipe,
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
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    startSimulation,
    stopSimulation,
    generateIncident,
    fetchActiveIncidents,
    clearIncidents,
    type GenerateIncidentRequest,
    type IncidentResponse,
} from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

const INCIDENT_TYPES = [
    { value: 'accidente_trafico', label: '🚗 Accidente de tráfico', icon: IconCar, color: 'orange' },
    { value: 'incendio', label: '🔥 Incendio', icon: IconFlame, color: 'red' },
    { value: 'evento_deportivo', label: '⚽ Incidente en evento deportivo', icon: IconBallFootball, color: 'blue' },
    { value: 'intoxicacion_masiva', label: '☠️ Intoxicación masiva', icon: IconVirus, color: 'grape' },
    { value: 'colapso_estructura', label: '🏚️ Colapso de estructura', icon: IconBuilding, color: 'dark' },
    { value: 'accidente_laboral', label: '🏭 Accidente laboral', icon: IconTool, color: 'yellow' },
];

const SEVERITY_OPTIONS = [
    { value: 'leve', label: '🟢 Leve (2-5 pacientes)' },
    { value: 'moderado', label: '🟡 Moderado (5-10 pacientes)' },
    { value: 'grave', label: '🟠 Grave (10-20 pacientes)' },
    { value: 'catastrofico', label: '🔴 Catastrófico (20+ pacientes)' },
];

const LOCATIONS = [
    { value: 'centro', label: '📍 Centro ciudad', lat: 43.3623, lon: -8.4115 },
    { value: 'riazor', label: '⚽ Estadio Riazor', lat: 43.36755, lon: -8.41085 },
    { value: 'coliseum', label: '🎵 Coliseum', lat: 43.33537, lon: -8.41171 },
    { value: 'puerto', label: '⚓ Puerto', lat: 43.3667, lon: -8.3967 },
    { value: 'industrial', label: '🏭 Zona industrial', lat: 43.3350, lon: -8.4200 },
    { value: 'autopista', label: '🛣️ Autopista AP-9', lat: 43.3450, lon: -8.4050 },
];

export function SimulationPage() {
    const [activeTab, setActiveTab] = useState<string | null>('control');
    const [speed, setSpeed] = useState(1.0);
    const [autoDerivation, setAutoDerivation] = useState(true);
    const [isRunning, setIsRunning] = useState(false);

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
    const startMutation = useMutation({
        mutationFn: startSimulation,
        onSuccess: () => {
            notifications.show({ title: 'Simulación', message: 'Iniciada correctamente', color: 'green' });
            setIsRunning(true);
        },
    });

    const stopMutation = useMutation({
        mutationFn: stopSimulation,
        onSuccess: () => {
            notifications.show({ title: 'Simulación', message: 'Detenida', color: 'orange' });
            setIsRunning(false);
        },
    });

    const incidentMutation = useMutation({
        mutationFn: (request: GenerateIncidentRequest) => generateIncident(request),
        onSuccess: (data) => {
            notifications.show({
                title: `🚨 ${data.nombre}`,
                message: `${data.pacientes_generados} pacientes enviados a ${data.hospital_nombre}`,
                color: 'red',
                autoClose: 5000,
            });
            setLastIncident(data);
            activeIncidentsQuery.refetch();
        },
        onError: (error) => {
            notifications.show({
                title: 'Error',
                message: `No se pudo generar el incidente: ${error}`,
                color: 'red',
            });
        },
    });

    const clearMutation = useMutation({
        mutationFn: clearIncidents,
        onSuccess: (data) => {
            notifications.show({
                title: 'Incidentes limpiados',
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

        // Add some randomness to location
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

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Box>
                    <Title order={2}>Simulador y Control de Incidentes</Title>
                    <Text c="dimmed" size="sm">Gestiona la simulación y genera incidentes en la ciudad</Text>
                </Box>
                <Group>
                    <Badge size="lg" color={isRunning ? 'green' : 'gray'}>
                        {isRunning ? '▶ Simulación activa' : '⏹ Detenida'}
                    </Badge>
                    <Badge size="lg" color="orange" variant="light">
                        {activeIncidentsQuery.data?.total || 0} incidentes
                    </Badge>
                </Group>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="control" leftSection={<IconTestPipe size={16} />}>
                        Control Simulación
                    </Tabs.Tab>
                    <Tabs.Tab value="incidents" leftSection={<IconAlertTriangle size={16} />}>
                        Generador de Incidentes
                    </Tabs.Tab>
                    <Tabs.Tab value="history" leftSection={<IconAmbulance size={16} />}>
                        Historial ({activeIncidentsQuery.data?.total || 0})
                    </Tabs.Tab>
                </Tabs.List>

                {/* TAB: Control de Simulación */}
                <Tabs.Panel value="control" pt="lg">
                    <Card
                        padding="lg"
                        radius="lg"
                        style={{
                            background: cssVariables.glassBg,
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${cssVariables.glassBorder}`,
                        }}
                    >
                        <Group gap="md" mb="lg">
                            <ThemeIcon size={50} variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} radius="xl">
                                <IconTestPipe size={28} />
                            </ThemeIcon>
                            <div>
                                <Title order={3}>Control de Simulación</Title>
                                <Text c="dimmed">Gestiona la simulación del sistema de urgencias</Text>
                            </div>
                        </Group>

                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                            <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <Text fw={500} mb="md">Velocidad de simulación</Text>
                                <Slider
                                    value={speed}
                                    onChange={setSpeed}
                                    min={0.1}
                                    max={10}
                                    step={0.1}
                                    marks={[{ value: 1, label: '1x' }, { value: 5, label: '5x' }, { value: 10, label: '10x' }]}
                                    label={(v) => `${v}x`}
                                />
                            </Paper>

                            <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <Text fw={500} mb="md">Opciones</Text>
                                <Stack gap="sm">
                                    <Switch
                                        label="Derivación automática"
                                        checked={autoDerivation}
                                        onChange={(e) => setAutoDerivation(e.currentTarget.checked)}
                                    />
                                    <Switch
                                        label="Mostrar alertas en tiempo real"
                                        defaultChecked
                                    />
                                </Stack>
                            </Paper>
                        </SimpleGrid>

                        <Group mt="lg" justify="center">
                            {isRunning ? (
                                <Button
                                    size="lg"
                                    color="red"
                                    leftSection={<IconPlayerStop size={20} />}
                                    onClick={() => stopMutation.mutate()}
                                    loading={stopMutation.isPending}
                                >
                                    Detener Simulación
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    color="green"
                                    leftSection={<IconPlayerPlay size={20} />}
                                    onClick={() => startMutation.mutate()}
                                    loading={startMutation.isPending}
                                >
                                    Iniciar Simulación
                                </Button>
                            )}
                        </Group>
                    </Card>
                </Tabs.Panel>

                {/* TAB: Generador de Incidentes */}
                <Tabs.Panel value="incidents" pt="lg">
                    <SimpleGrid cols={{ base: 1, lg: 2 }}>
                        {/* Generator */}
                        <Card
                            padding="lg"
                            radius="lg"
                            style={{
                                background: cssVariables.glassBg,
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${cssVariables.glassBorder}`,
                            }}
                        >
                            <Group gap="md" mb="lg">
                                <ThemeIcon size={50} variant="gradient" gradient={{ from: 'red', to: 'orange' }} radius="xl">
                                    <IconAlertTriangle size={28} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3}>Generar Incidente</Title>
                                    <Text c="dimmed">Simula un incidente en la ciudad</Text>
                                </div>
                            </Group>

                            <Stack gap="md">
                                <Select
                                    label="Tipo de incidente"
                                    placeholder="Selecciona tipo"
                                    data={INCIDENT_TYPES}
                                    value={incidentType}
                                    onChange={setIncidentType}
                                    leftSection={<IconAlertTriangle size={16} />}
                                />

                                <Select
                                    label="Gravedad"
                                    placeholder="Selecciona gravedad"
                                    data={SEVERITY_OPTIONS}
                                    value={severity}
                                    onChange={setSeverity}
                                />

                                <Select
                                    label="Ubicación"
                                    placeholder="Selecciona ubicación"
                                    data={LOCATIONS}
                                    value={location}
                                    onChange={setLocation}
                                    leftSection={<IconMapPin size={16} />}
                                />

                                <Alert color="orange" variant="light" icon={<IconAmbulance />}>
                                    Los pacientes serán enviados automáticamente al hospital más cercano
                                </Alert>

                                <Button
                                    size="lg"
                                    color="red"
                                    leftSection={<IconAlertTriangle size={20} />}
                                    onClick={handleGenerateIncident}
                                    loading={incidentMutation.isPending}
                                    fullWidth
                                >
                                    🚨 Generar Incidente
                                </Button>
                            </Stack>
                        </Card>

                        {/* Last Incident Result */}
                        {lastIncident && (
                            <Card
                                padding="lg"
                                radius="lg"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(250, 82, 82, 0.15) 0%, rgba(253, 126, 20, 0.1) 100%)',
                                    border: '1px solid rgba(250, 82, 82, 0.3)',
                                }}
                            >
                                <Group justify="space-between" mb="md">
                                    <Group>
                                        <Text size="xl">{lastIncident.icono}</Text>
                                        <div>
                                            <Text fw={700}>{lastIncident.nombre}</Text>
                                            <Text size="xs" c="dimmed">{lastIncident.incident_id}</Text>
                                        </div>
                                    </Group>
                                    <Badge color="red" size="lg" variant="filled">
                                        {lastIncident.pacientes_generados} pacientes
                                    </Badge>
                                </Group>

                                <Paper p="sm" radius="md" style={{ background: 'rgba(0,0,0,0.2)' }} mb="md">
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <IconMapPin size={14} />
                                            <Text size="sm">Hospital destino:</Text>
                                        </Group>
                                        <Text size="sm" fw={700}>{lastIncident.hospital_nombre}</Text>
                                    </Group>
                                    <Group justify="space-between" mt={4}>
                                        <Text size="sm" c="dimmed">Distancia:</Text>
                                        <Text size="sm">{lastIncident.distancia_km} km</Text>
                                    </Group>
                                </Paper>

                                <Text size="sm" fw={600} mb="xs">Pacientes generados:</Text>
                                <Table striped highlightOnHover withTableBorder>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Triaje</Table.Th>
                                            <Table.Th>Nombre</Table.Th>
                                            <Table.Th>Patología</Table.Th>
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
                                                <Table.Td>{p.nombre}</Table.Td>
                                                <Table.Td>{p.patologia}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                                {lastIncident.pacientes_detalle.length > 5 && (
                                    <Text size="xs" c="dimmed" mt="xs" ta="center">
                                        +{lastIncident.pacientes_detalle.length - 5} pacientes más
                                    </Text>
                                )}
                            </Card>
                        )}

                        {!lastIncident && (
                            <Card
                                padding="xl"
                                radius="lg"
                                style={{
                                    background: cssVariables.glassBg,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${cssVariables.glassBorder}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                }}
                            >
                                <Stack align="center">
                                    <ThemeIcon size={80} radius="xl" variant="light" color="gray">
                                        <IconAmbulance size={40} />
                                    </ThemeIcon>
                                    <Text c="dimmed">
                                        Genera un incidente para ver los pacientes enviados
                                    </Text>
                                </Stack>
                            </Card>
                        )}
                    </SimpleGrid>
                </Tabs.Panel>

                {/* TAB: Historial */}
                <Tabs.Panel value="history" pt="lg">
                    <Card
                        padding="lg"
                        radius="lg"
                        style={{
                            background: cssVariables.glassBg,
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${cssVariables.glassBorder}`,
                        }}
                    >
                        <Group justify="space-between" mb="lg">
                            <Title order={4}>Historial de Incidentes</Title>
                            <Group>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    onClick={() => activeIncidentsQuery.refetch()}
                                    loading={activeIncidentsQuery.isRefetching}
                                >
                                    <IconRefresh size={16} />
                                </ActionIcon>
                                <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => clearMutation.mutate()}
                                    loading={clearMutation.isPending}
                                    disabled={!activeIncidentsQuery.data?.total}
                                >
                                    Limpiar todo
                                </Button>
                            </Group>
                        </Group>

                        {activeIncidentsQuery.data?.incidentes?.length ? (
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                                {activeIncidentsQuery.data.incidentes.map((inc: IncidentResponse) => (
                                    <Paper
                                        key={inc.incident_id}
                                        p="md"
                                        radius="md"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                        }}
                                    >
                                        <Group justify="space-between" mb="xs">
                                            <Group gap="xs">
                                                <Text size="lg">{inc.icono}</Text>
                                                <Text fw={600} size="sm">{inc.nombre}</Text>
                                            </Group>
                                            <Badge size="sm">{inc.pacientes_generados} pac.</Badge>
                                        </Group>
                                        <Stack gap={4}>
                                            <Group justify="space-between">
                                                <Text size="xs" c="dimmed">Hospital:</Text>
                                                <Text size="xs">{inc.hospital_nombre}</Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Text size="xs" c="dimmed">Distancia:</Text>
                                                <Text size="xs">{inc.distancia_km} km</Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Text size="xs" c="dimmed">Hora:</Text>
                                                <Text size="xs">{new Date(inc.timestamp).toLocaleTimeString()}</Text>
                                            </Group>
                                        </Stack>
                                        <Progress
                                            size="xs"
                                            value={100}
                                            color="red"
                                            mt="xs"
                                            animated
                                        />
                                    </Paper>
                                ))}
                            </SimpleGrid>
                        ) : (
                            <Paper p="xl" radius="md" style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                                <ThemeIcon size={60} radius="xl" variant="light" color="gray" mx="auto" mb="md">
                                    <IconAlertTriangle size={30} />
                                </ThemeIcon>
                                <Text c="dimmed">No hay incidentes registrados</Text>
                                <Text size="xs" c="dimmed">Genera un incidente desde la pestaña anterior</Text>
                            </Paper>
                        )}
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
