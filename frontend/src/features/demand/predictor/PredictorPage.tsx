// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTOR PAGE - PREDICCIÓN DE DEMANDA (24 HORAS)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Card,
    Text,
    Title,
    Group,
    Stack,
    Badge,
    Button,
    Select,
    ThemeIcon,
    Paper,
    SimpleGrid,
    Progress,
    Loader,
    Alert,
} from '@mantine/core';
import {
    IconChartLine,
    IconRocket,
    IconClock,
    IconTrendingUp,
    IconTrendingDown,
    IconAlertCircle,
} from '@tabler/icons-react';
import { fetchPrediction, type PredictionResponse } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

const HOSPITAL_NAMES: Record<string, string> = {
    chuac: 'CHUAC',
    modelo: 'HM Modelo',
    san_rafael: 'San Rafael',
};

export function PredictorPage() {
    const [hospital, setHospital] = useState<string>('chuac');
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

    const predictionMutation = useMutation({
        mutationFn: async (hospitalId: string) => {
            console.log('[Predictor] Llamando API con hospital_id:', hospitalId);
            const result = await fetchPrediction(hospitalId, 24);
            console.log('[Predictor] Respuesta recibida:', result);
            console.log('[Predictor] hospital_id en respuesta:', result.hospital_id);
            console.log('[Predictor] Total esperado:', result.resumen.total_esperado);
            return result;
        },
        onSuccess: (data) => {
            console.log('[Predictor] Guardando predicción para:', data.hospital_id);
            setPrediction(data);
        },
    });

    // Limpiar predicción cuando cambia el hospital
    useEffect(() => {
        console.log('[Predictor] Hospital cambiado a:', hospital);
        setPrediction(null);
    }, [hospital]);

    const handleGenerate = () => {
        console.log('[Predictor] Generando predicción para:', hospital);
        predictionMutation.mutate(hospital);
    };

    const getHourLabel = (hora: number) => `${hora.toString().padStart(2, '0')}:00`;

    const getBarColor = (llegadas: number, max: number) => {
        const ratio = llegadas / max;
        if (ratio > 0.8) return 'red';
        if (ratio > 0.6) return 'orange';
        if (ratio > 0.4) return 'yellow';
        return 'green';
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Predicción de Demanda</Title>
                <Badge size="lg" color="violet" leftSection={<IconChartLine size={14} />}>
                    Prophet AI - Próximas 24h
                </Badge>
            </Group>

            {/* Configuración */}
            <Card
                className="glass-card"
                style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}
            >
                <Group gap="md" mb="lg">
                    <ThemeIcon size={50} variant="gradient" gradient={{ from: 'violet', to: 'grape' }} radius="xl">
                        <IconChartLine size={28} />
                    </ThemeIcon>
                    <div>
                        <Title order={3}>Predicción 24 Horas</Title>
                        <Text c="dimmed">Predicción de llegadas basada en patrones históricos</Text>
                    </div>
                </Group>

                <Group gap="md" align="end">
                    <Select
                        label="Hospital"
                        value={hospital}
                        onChange={(value) => {
                            console.log('[Predictor] Select onChange:', value);
                            setHospital(value || 'chuac');
                        }}
                        data={[
                            { value: 'chuac', label: 'CHUAC' },
                            { value: 'modelo', label: 'HM Modelo' },
                            { value: 'san_rafael', label: 'San Rafael' },
                        ]}
                        style={{ minWidth: 200 }}
                    />
                    <Button
                        leftSection={<IconRocket size={16} />}
                        onClick={handleGenerate}
                        loading={predictionMutation.isPending}
                        size="md"
                    >
                        Generar Predicción
                    </Button>
                </Group>

                {predictionMutation.error && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mt="md">
                        Error al generar predicción: {predictionMutation.error.message}
                    </Alert>
                )}
            </Card>

            {/* Cargando */}
            {predictionMutation.isPending && (
                <Card style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                    <Group justify="center" py="xl">
                        <Loader size="lg" />
                        <Text>Generando predicción para {HOSPITAL_NAMES[hospital]}...</Text>
                    </Group>
                </Card>
            )}

            {/* Resultados */}
            {prediction && (
                <>
                    {/* Badge del hospital */}
                    <Alert variant="light" color="blue" title={`Predicción para ${HOSPITAL_NAMES[prediction.hospital_id] || prediction.hospital_id}`}>
                        Próximas 24 horas - Total esperado: <strong>{Math.round(prediction.resumen.total_esperado)} pacientes</strong>
                    </Alert>

                    {/* Resumen */}
                    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                        <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <Group gap="xs">
                                <ThemeIcon color="blue" variant="light"><IconClock size={18} /></ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed">Total Esperado</Text>
                                    <Text size="xl" fw={700}>{Math.round(prediction.resumen.total_esperado)}</Text>
                                    <Text size="xs" c="dimmed">pacientes</Text>
                                </div>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <Group gap="xs">
                                <ThemeIcon color="green" variant="light"><IconTrendingUp size={18} /></ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed">Promedio/Hora</Text>
                                    <Text size="xl" fw={700}>{prediction.resumen.promedio_hora.toFixed(1)}</Text>
                                    <Text size="xs" c="dimmed">pacientes</Text>
                                </div>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: 'rgba(250, 82, 82, 0.1)' }}>
                            <Group gap="xs">
                                <ThemeIcon color="red" variant="light"><IconTrendingUp size={18} /></ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed">Hora Pico</Text>
                                    <Text size="xl" fw={700}>{getHourLabel(prediction.resumen.hora_pico)}</Text>
                                    <Text size="xs" c="dimmed">{prediction.resumen.llegadas_pico.toFixed(0)} llegadas</Text>
                                </div>
                            </Group>
                        </Paper>

                        <Paper p="md" radius="md" style={{ background: 'rgba(64, 192, 87, 0.1)' }}>
                            <Group gap="xs">
                                <ThemeIcon color="green" variant="light"><IconTrendingDown size={18} /></ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed">Hora Valle</Text>
                                    <Text size="xl" fw={700}>{getHourLabel(prediction.resumen.hora_valle)}</Text>
                                    <Text size="xs" c="dimmed">{prediction.resumen.llegadas_valle.toFixed(0)} llegadas</Text>
                                </div>
                            </Group>
                        </Paper>
                    </SimpleGrid>

                    {/* Gráfico de barras */}
                    <Card style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Predicción por Hora - {HOSPITAL_NAMES[prediction.hospital_id] || prediction.hospital_id}</Title>
                            <Badge color="violet">{prediction.predicciones.length} horas</Badge>
                        </Group>
                        <Stack gap="xs">
                            {prediction.predicciones.map((p) => {
                                const maxLlegadas = Math.max(...prediction.predicciones.map((x) => x.llegadas_esperadas));
                                const percentage = (p.llegadas_esperadas / maxLlegadas) * 100;
                                const color = getBarColor(p.llegadas_esperadas, maxLlegadas);

                                return (
                                    <Group key={p.hora} gap="sm" wrap="nowrap">
                                        <Text size="sm" w={50} ta="right" ff="monospace">{getHourLabel(p.hora)}</Text>
                                        <Progress value={percentage} color={color} size="xl" radius="sm" style={{ flex: 1 }} />
                                        <Text size="sm" w={50} ta="right" fw={500}>{p.llegadas_esperadas.toFixed(0)}</Text>
                                    </Group>
                                );
                            })}
                        </Stack>
                        <Text size="xs" c="dimmed" mt="md" ta="right">
                            Generado: {new Date(prediction.generado_en).toLocaleString()}
                        </Text>
                    </Card>
                </>
            )}
        </Stack>
    );
}
