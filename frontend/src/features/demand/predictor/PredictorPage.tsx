// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTOR PAGE - PREDICCIONES DE DEMANDA EXTENDIDAS
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    Button,
    ThemeIcon,
    SimpleGrid,
    Select,
    Paper,
    Box,
    Tabs,
    Slider,
    Switch,
    Progress,
    Alert,
} from '@mantine/core';
import {
    IconChartLine,
    IconUsers,
    IconClock,
    IconAlertTriangle,
    IconActivity,
    IconArrowsExchange,
    IconCloudRain,
    IconBallFootball,
    IconFlame,
    IconVirus,
} from '@tabler/icons-react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
} from 'recharts';
import {
    fetchExtendedPrediction,
    type ExtendedPredictionResponse,
    type WhatIfScenario
} from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

const HOSPITAL_OPTIONS = [
    { value: 'chuac', label: 'CHUAC' },
    { value: 'modelo', label: 'HM Modelo' },
    { value: 'san_rafael', label: 'San Rafael' },
];


export function PredictorPage() {
    const [hospitalId, setHospitalId] = useState('chuac');
    const [hoursAhead] = useState('24');
    const [data, setData] = useState<ExtendedPredictionResponse | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>('llegadas');

    // What-if scenario state
    const [scenario, setScenario] = useState<WhatIfScenario>({
        lluvia: false,
        evento_masivo: false,
        personal_reducido: 0,
        temperatura_extrema: false,
        partido_futbol: false,
        incidente_grave: false,
        epidemia: false,
    });

    const mutation = useMutation({
        mutationFn: () => fetchExtendedPrediction(
            hospitalId,
            parseInt(hoursAhead),
            Object.values(scenario).some(v => v) ? scenario : undefined
        ),
        onSuccess: (result) => {
            setData(result);
        },
    });

    const getHourLabel = (hora: number) => `${hora}:00`;

    const getSaturationColor = (sat: number) => {
        if (sat > 85) return '#fa5252';
        if (sat > 70) return '#fd7e14';
        if (sat > 50) return '#fab005';
        return '#40c057';
    };

    const getAlertColor = (nivel: string) => {
        switch (nivel) {
            case 'CRITICO': return 'red';
            case 'ALERTA': return 'orange';
            case 'ATENCION': return 'yellow';
            default: return 'green';
        }
    };

    // Format data for Recharts
    const chartData = data?.graficos?.llegadas?.map((item, i) => ({
        hora: getHourLabel(item.x),
        llegadas: item.y,
        llegadasMin: item.min,
        llegadasMax: item.max,
        saturacion: data.graficos.saturacion[i]?.y || 0,
        tiempoTriaje: data.graficos.tiempos[i]?.triaje || 0,
        tiempoConsulta: data.graficos.tiempos[i]?.consulta || 0,
        tiempoTotal: data.graficos.tiempos[i]?.total || 0,
        derivaciones: data.graficos.derivaciones[i]?.y || 0,
    })) || [];

    return (
        <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between" align="flex-end">
                <Box>
                    <Title order={2}>Predictor de Demanda</Title>
                    <Text c="dimmed" size="sm">
                        Predicciones avanzadas con múltiples métricas y escenarios what-if
                    </Text>
                </Box>
                {data && (
                    <Badge size="lg" variant="light" color="blue">
                        {data.hospital_nombre}
                    </Badge>
                )}
            </Group>

            {/* Controls Card */}
            <Card
                padding="lg"
                radius="lg"
                style={{
                    background: cssVariables.glassBg,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${cssVariables.glassBorder}`,
                }}
            >
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                    {/* Left: Basic controls */}
                    <Stack gap="md">
                        <Text fw={600} size="lg">Configuración</Text>
                        <Group grow>
                            <Select
                                label="Hospital"
                                data={HOSPITAL_OPTIONS}
                                value={hospitalId}
                                onChange={(v) => v && setHospitalId(v)}
                            />
                        </Group>
                        <Button
                            size="lg"
                            leftSection={<IconChartLine size={20} />}
                            onClick={() => mutation.mutate()}
                            loading={mutation.isPending}
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                        >
                            Generar Predicción
                        </Button>
                    </Stack>

                    {/* Right: What-if scenario */}
                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text fw={600} mb="md">🔮 Escenario What-If</Text>
                        <SimpleGrid cols={2} spacing="xs">
                            <Switch
                                label={<Group gap={4}><IconCloudRain size={14} /> Lluvia</Group>}
                                checked={scenario.lluvia}
                                onChange={(e) => setScenario(s => ({ ...s, lluvia: e.target.checked }))}
                                size="sm"
                            />
                            <Switch
                                label={<Group gap={4}><IconBallFootball size={14} /> Partido</Group>}
                                checked={scenario.partido_futbol}
                                onChange={(e) => setScenario(s => ({ ...s, partido_futbol: e.target.checked }))}
                                size="sm"
                            />
                            <Switch
                                label={<Group gap={4}><IconFlame size={14} /> Temp. Extrema</Group>}
                                checked={scenario.temperatura_extrema}
                                onChange={(e) => setScenario(s => ({ ...s, temperatura_extrema: e.target.checked }))}
                                size="sm"
                            />
                            <Switch
                                label={<Group gap={4}><IconUsers size={14} /> Evento Masivo</Group>}
                                checked={scenario.evento_masivo}
                                onChange={(e) => setScenario(s => ({ ...s, evento_masivo: e.target.checked }))}
                                size="sm"
                            />
                            <Switch
                                label={<Group gap={4}><IconAlertTriangle size={14} /> Incidente Grave</Group>}
                                checked={scenario.incidente_grave}
                                onChange={(e) => setScenario(s => ({ ...s, incidente_grave: e.target.checked }))}
                                size="sm"
                                color="red"
                            />
                            <Switch
                                label={<Group gap={4}><IconVirus size={14} /> Epidemia</Group>}
                                checked={scenario.epidemia}
                                onChange={(e) => setScenario(s => ({ ...s, epidemia: e.target.checked }))}
                                size="sm"
                                color="red"
                            />
                        </SimpleGrid>
                        <Box mt="sm">
                            <Text size="sm" mb={4}>Personal reducido: {Math.round((scenario.personal_reducido || 0) * 100)}%</Text>
                            <Slider
                                value={(scenario.personal_reducido || 0) * 100}
                                onChange={(v) => setScenario(s => ({ ...s, personal_reducido: v / 100 }))}
                                min={0}
                                max={50}
                                step={5}
                                marks={[{ value: 0, label: '0%' }, { value: 25, label: '25%' }, { value: 50, label: '50%' }]}
                            />
                        </Box>
                    </Paper>
                </SimpleGrid>
            </Card>

            {/* Results */}
            {data && (
                <>
                    {/* Alerts */}
                    {data.alertas.length > 0 && (
                        <Stack gap="xs">
                            {data.alertas.map((alerta, i) => (
                                <Alert
                                    key={i}
                                    color="red"
                                    title={alerta.tipo.replace(/_/g, ' ')}
                                    icon={<IconAlertTriangle />}
                                >
                                    {alerta.mensaje} - <strong>{alerta.recomendacion}</strong>
                                </Alert>
                            ))}
                        </Stack>
                    )}

                    {/* Summary Cards */}
                    <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }}>
                        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, rgba(34,139,230,0.2) 0%, rgba(34,139,230,0.1) 100%)', border: '1px solid rgba(34,139,230,0.3)' }}>
                            <Group gap="xs">
                                <ThemeIcon size={36} radius="xl" color="blue" variant="light">
                                    <IconUsers size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xl" fw={700}>{data.resumen.total_llegadas}</Text>
                                    <Text size="xs" c="dimmed">Llegadas totales</Text>
                                </Box>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: `linear-gradient(135deg, ${getSaturationColor(data.resumen.saturacion_maxima)}30 0%, ${getSaturationColor(data.resumen.saturacion_maxima)}15 100%)`, border: `1px solid ${getSaturationColor(data.resumen.saturacion_maxima)}50` }}>
                            <Group gap="xs">
                                <ThemeIcon size={36} radius="xl" color={data.resumen.saturacion_maxima > 85 ? 'red' : data.resumen.saturacion_maxima > 70 ? 'orange' : 'green'} variant="light">
                                    <IconActivity size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xl" fw={700}>{data.resumen.saturacion_maxima}%</Text>
                                    <Text size="xs" c="dimmed">Saturación máx.</Text>
                                </Box>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, rgba(250,176,5,0.2) 0%, rgba(250,176,5,0.1) 100%)', border: '1px solid rgba(250,176,5,0.3)' }}>
                            <Group gap="xs">
                                <ThemeIcon size={36} radius="xl" color="yellow" variant="light">
                                    <IconClock size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xl" fw={700}>{data.resumen.tiempo_espera_maximo}m</Text>
                                    <Text size="xs" c="dimmed">Espera máxima</Text>
                                </Box>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, rgba(253,126,20,0.2) 0%, rgba(253,126,20,0.1) 100%)', border: '1px solid rgba(253,126,20,0.3)' }}>
                            <Group gap="xs">
                                <ThemeIcon size={36} radius="xl" color="orange" variant="light">
                                    <IconArrowsExchange size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xl" fw={700}>{data.resumen.derivaciones_totales}</Text>
                                    <Text size="xs" c="dimmed">Derivaciones est.</Text>
                                </Box>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: data.resumen.horas_criticas > 0 ? 'linear-gradient(135deg, rgba(250,82,82,0.2) 0%, rgba(250,82,82,0.1) 100%)' : 'linear-gradient(135deg, rgba(64,192,87,0.2) 0%, rgba(64,192,87,0.1) 100%)', border: `1px solid ${data.resumen.horas_criticas > 0 ? 'rgba(250,82,82,0.3)' : 'rgba(64,192,87,0.3)'}` }}>
                            <Group gap="xs">
                                <ThemeIcon size={36} radius="xl" color={data.resumen.horas_criticas > 0 ? 'red' : 'green'} variant="light">
                                    <IconAlertTriangle size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xl" fw={700}>{data.resumen.horas_criticas}</Text>
                                    <Text size="xs" c="dimmed">Horas críticas</Text>
                                </Box>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, rgba(156,39,176,0.2) 0%, rgba(156,39,176,0.1) 100%)', border: '1px solid rgba(156,39,176,0.3)' }}>
                            <Group gap="xs">
                                <ThemeIcon size={36} radius="xl" color="grape" variant="light">
                                    <IconChartLine size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xl" fw={700}>x{data.resumen.factor_demanda}</Text>
                                    <Text size="xs" c="dimmed">Factor escenario</Text>
                                </Box>
                            </Group>
                        </Paper>
                    </SimpleGrid>

                    {/* Charts with Tabs */}
                    <Card
                        padding="lg"
                        radius="lg"
                        style={{
                            background: cssVariables.glassBg,
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${cssVariables.glassBorder}`,
                        }}
                    >
                        <Tabs value={activeTab} onChange={setActiveTab}>
                            <Tabs.List mb="lg">
                                <Tabs.Tab value="llegadas" leftSection={<IconUsers size={16} />}>
                                    Llegadas
                                </Tabs.Tab>
                                <Tabs.Tab value="saturacion" leftSection={<IconActivity size={16} />}>
                                    Saturación
                                </Tabs.Tab>
                                <Tabs.Tab value="tiempos" leftSection={<IconClock size={16} />}>
                                    Tiempos Espera
                                </Tabs.Tab>
                                <Tabs.Tab value="derivaciones" leftSection={<IconArrowsExchange size={16} />}>
                                    Derivaciones
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="llegadas">
                                <Box h={350}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="gradLlegadas" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#228be6" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#228be6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="hora" stroke="#888" fontSize={12} />
                                            <YAxis stroke="#888" fontSize={12} />
                                            <RechartsTooltip
                                                contentStyle={{ background: '#1a1b1e', border: '1px solid #333', borderRadius: 8 }}
                                                labelStyle={{ color: '#fff' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="llegadasMax"
                                                stroke="#228be6"
                                                fill="url(#gradLlegadas)"
                                                strokeWidth={0}
                                                name="Máximo"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="llegadas"
                                                stroke="#228be6"
                                                fill="url(#gradLlegadas)"
                                                strokeWidth={2}
                                                name="Esperadas"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="llegadasMin"
                                                stroke="#228be6"
                                                strokeDasharray="5 5"
                                                strokeWidth={1}
                                                dot={false}
                                                name="Mínimo"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Tabs.Panel>

                            <Tabs.Panel value="saturacion">
                                <Box h={350}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="gradSat" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#fa5252" stopOpacity={0.4} />
                                                    <stop offset="50%" stopColor="#fd7e14" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#40c057" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="hora" stroke="#888" fontSize={12} />
                                            <YAxis stroke="#888" fontSize={12} domain={[0, 100]} />
                                            <RechartsTooltip
                                                contentStyle={{ background: '#1a1b1e', border: '1px solid #333', borderRadius: 8 }}
                                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Saturación']}
                                            />
                                            <ReferenceLine y={70} stroke="#fd7e14" strokeDasharray="3 3" label={{ value: 'Alerta', fill: '#fd7e14', fontSize: 10 }} />
                                            <ReferenceLine y={85} stroke="#fa5252" strokeDasharray="3 3" label={{ value: 'Crítico', fill: '#fa5252', fontSize: 10 }} />
                                            <Area
                                                type="monotone"
                                                dataKey="saturacion"
                                                stroke="#fd7e14"
                                                fill="url(#gradSat)"
                                                strokeWidth={2}
                                                name="Saturación %"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Tabs.Panel>

                            <Tabs.Panel value="tiempos">
                                <Box h={350}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="hora" stroke="#888" fontSize={12} />
                                            <YAxis stroke="#888" fontSize={12} />
                                            <RechartsTooltip
                                                contentStyle={{ background: '#1a1b1e', border: '1px solid #333', borderRadius: 8 }}
                                                formatter={(value: number) => [`${value.toFixed(0)} min`]}
                                            />
                                            <Legend />
                                            <Bar dataKey="tiempoTriaje" stackId="a" fill="#228be6" name="Triaje" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="tiempoConsulta" stackId="a" fill="#40c057" name="Consulta" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Tabs.Panel>

                            <Tabs.Panel value="derivaciones">
                                <Box h={350}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="hora" stroke="#888" fontSize={12} />
                                            <YAxis stroke="#888" fontSize={12} />
                                            <RechartsTooltip
                                                contentStyle={{ background: '#1a1b1e', border: '1px solid #333', borderRadius: 8 }}
                                                formatter={(value: number) => [`${value.toFixed(1)} pacientes`]}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="derivaciones"
                                                stroke="#fd7e14"
                                                strokeWidth={2}
                                                dot={{ fill: '#fd7e14', r: 3 }}
                                                name="Derivaciones estimadas"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Tabs.Panel>
                        </Tabs>
                    </Card>

                    {/* Hourly Detail Table */}
                    <Card
                        padding="lg"
                        radius="lg"
                        style={{
                            background: cssVariables.glassBg,
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${cssVariables.glassBorder}`,
                        }}
                    >
                        <Text fw={600} mb="md">Detalle por Hora (primeras 12h)</Text>
                        <SimpleGrid cols={{ base: 2, sm: 4, lg: 6 }}>
                            {data.predicciones.slice(0, 12).map((p) => (
                                <Paper
                                    key={p.hora}
                                    p="sm"
                                    radius="md"
                                    style={{
                                        background: p.nivel_alerta === 'CRITICO'
                                            ? 'rgba(250,82,82,0.1)'
                                            : p.nivel_alerta === 'ALERTA'
                                                ? 'rgba(253,126,20,0.1)'
                                                : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${p.nivel_alerta === 'CRITICO' ? 'rgba(250,82,82,0.3)'
                                            : p.nivel_alerta === 'ALERTA' ? 'rgba(253,126,20,0.3)'
                                                : 'rgba(255,255,255,0.05)'
                                            }`,
                                    }}
                                >
                                    <Group justify="space-between" mb={4}>
                                        <Text fw={700}>{p.hora}:00</Text>
                                        <Badge size="xs" color={getAlertColor(p.nivel_alerta)}>
                                            {p.nivel_alerta}
                                        </Badge>
                                    </Group>
                                    <Stack gap={2}>
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed">Llegadas</Text>
                                            <Text size="xs" fw={600}>{p.llegadas_esperadas}</Text>
                                        </Group>
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed">Saturación</Text>
                                            <Text size="xs" fw={600}>{(p.saturacion_estimada * 100).toFixed(0)}%</Text>
                                        </Group>
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed">Espera</Text>
                                            <Text size="xs" fw={600}>{p.tiempo_total_estimado}m</Text>
                                        </Group>
                                    </Stack>
                                    <Progress
                                        value={p.saturacion_estimada * 100}
                                        color={getSaturationColor(p.saturacion_estimada * 100)}
                                        size="xs"
                                        mt="xs"
                                    />
                                </Paper>
                            ))}
                        </SimpleGrid>
                    </Card>
                </>
            )}

            {/* Empty state */}
            {!data && !mutation.isPending && (
                <Card
                    padding="xl"
                    radius="lg"
                    style={{
                        background: cssVariables.glassBg,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${cssVariables.glassBorder}`,
                        textAlign: 'center',
                    }}
                >
                    <ThemeIcon size={80} radius="xl" variant="light" color="blue" mx="auto" mb="md">
                        <IconChartLine size={40} />
                    </ThemeIcon>
                    <Title order={3}>Predicciones de Demanda</Title>
                    <Text c="dimmed" maw={400} mx="auto" mt="sm">
                        Selecciona un hospital, configura el escenario what-if y genera predicciones
                        con múltiples métricas: llegadas, saturación, tiempos de espera y derivaciones.
                    </Text>
                </Card>
            )}
        </Stack>
    );
}
