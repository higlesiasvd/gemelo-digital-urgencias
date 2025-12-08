// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTOR PAGE
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
    Select,
    NumberInput,
    ThemeIcon,
    Paper,
    SimpleGrid,
    Code,
} from '@mantine/core';
import { IconChartLine, IconRocket } from '@tabler/icons-react';
import { fetchPrediction } from '@/shared/api/client';
import { cssVariables } from '@/shared/theme';

export function PredictorPage() {
    const [hospital, setHospital] = useState<string | null>('chuac');
    const [hours, setHours] = useState<number>(24);
    const [result, setResult] = useState<string | null>(null);

    const predictionMutation = useMutation({
        mutationFn: () => fetchPrediction(hospital || 'chuac', hours),
        onSuccess: (data) => {
            setResult(JSON.stringify(data, null, 2));
        },
    });

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Predicción de Demanda</Title>
                <Badge size="lg" color="violet" leftSection={<IconChartLine size={14} />}>AI Prophet</Badge>
            </Group>

            <Card className="glass-card" style={{ background: cssVariables.glassBg, border: `1px solid ${cssVariables.glassBorder}` }}>
                <Group gap="md" mb="lg">
                    <ThemeIcon size={50} variant="gradient" gradient={{ from: 'violet', to: 'grape' }} radius="xl">
                        <IconChartLine size={28} />
                    </ThemeIcon>
                    <div>
                        <Title order={3}>Configurar Predicción</Title>
                        <Text c="dimmed">Predice la demanda futura basada en patrones históricos</Text>
                    </div>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="lg">
                    <Select
                        label="Hospital"
                        value={hospital}
                        onChange={setHospital}
                        data={[
                            { value: 'chuac', label: 'CHUAC' },
                            { value: 'modelo', label: 'HM Modelo' },
                            { value: 'san_rafael', label: 'San Rafael' },
                        ]}
                    />
                    <NumberInput
                        label="Horas a predecir"
                        value={hours}
                        onChange={(v) => setHours(typeof v === 'number' ? v : 24)}
                        min={1}
                        max={168}
                    />
                    <Stack justify="end">
                        <Button
                            leftSection={<IconRocket size={16} />}
                            onClick={() => predictionMutation.mutate()}
                            loading={predictionMutation.isPending}
                        >
                            Generar Predicción
                        </Button>
                    </Stack>
                </SimpleGrid>

                {result && (
                    <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Text fw={600} mb="sm">Resultado de Predicción</Text>
                        <Code block style={{ whiteSpace: 'pre-wrap' }}>{result}</Code>
                    </Paper>
                )}
            </Card>
        </Stack>
    );
}
