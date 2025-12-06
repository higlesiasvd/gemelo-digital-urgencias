import { useState } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Select,
  NumberInput,
  Badge,
  Card,
  SimpleGrid,
  ThemeIcon,
  Divider,
  Alert,
  Tabs,
  Progress,
  Box,
  Modal,
} from '@mantine/core';
import {
  IconFlask,
  IconUsers,
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconPlayerPlay,
  IconChartBar,
  IconCalendarEvent,
  IconSun,
  IconVirus,
  IconStethoscope,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';
import { notifications } from '@mantine/notifications';

interface Scenario {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  params: Record<string, any>;
}

interface SimulationResult {
  hospital: string;
  currentOccupancy: number;
  projectedOccupancy: number;
  currentWaitTime: number;
  projectedWaitTime: number;
  impact: 'positive' | 'negative' | 'neutral';
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'add_boxes',
    name: 'Añadir Boxes',
    description: 'Simular apertura de nuevos boxes de atención',
    icon: <IconPlus size={20} />,
    color: 'green',
    params: { hospital: 'chuac', boxes: 5 },
  },
  {
    id: 'close_hospital',
    name: 'Cerrar Hospital',
    description: 'Simular cierre temporal de un hospital',
    icon: <IconX size={20} />,
    color: 'red',
    params: { hospital: 'san_rafael', duration: 24 },
  },
  {
    id: 'mass_event',
    name: 'Evento Masivo',
    description: 'Partido de fútbol + concierto en la ciudad',
    icon: <IconCalendarEvent size={20} />,
    color: 'violet',
    params: { attendees: 30000, incidentRate: 0.002 },
  },
  {
    id: 'flu_outbreak',
    name: 'Brote de Gripe',
    description: 'Aumento de casos de gripe estacional',
    icon: <IconVirus size={20} />,
    color: 'orange',
    params: { multiplier: 1.5, duration: 7 },
  },
  {
    id: 'heatwave',
    name: 'Ola de Calor',
    description: 'Temperaturas extremas afectando población',
    icon: <IconSun size={20} />,
    color: 'yellow',
    params: { temperature: 38, duration: 3 },
  },
  {
    id: 'staff_reduction',
    name: 'Reducción Personal',
    description: 'Bajas laborales o huelga parcial',
    icon: <IconUsers size={20} />,
    color: 'pink',
    params: { reduction: 0.2, hospital: 'all' },
  },
];

interface WhatIfSimulatorProps {
  selectedHospital?: string;
}

export function WhatIfSimulator({ selectedHospital = 'chuac' }: WhatIfSimulatorProps) {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [customParams, setCustomParams] = useState<Record<string, any>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const { stats, publishMessage } = useHospitalStore();

  const selectScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    // Usar el hospital seleccionado del padre si el escenario tiene hospital
    const params = { ...scenario.params };
    if (params.hospital && params.hospital !== 'all') {
      params.hospital = selectedHospital;
    }
    setCustomParams(params);
    setResults(null);
  };

  const runSimulation = async () => {
    if (!activeScenario) return;
    
    setIsSimulating(true);
    
    // Simular el procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generar resultados simulados basados en el escenario
    const simulatedResults: SimulationResult[] = Object.keys(stats).map(hospitalId => {
      const current = stats[hospitalId];
      const currentOccupancy = (current?.boxes_ocupados || 0) / (current?.boxes_totales || 1) * 100;
      const currentWaitTime = current?.tiempo_medio_espera || 0;
      
      let projectedOccupancy = currentOccupancy;
      let projectedWaitTime = currentWaitTime;
      
      // Calcular proyecciones según el escenario
      switch (activeScenario.id) {
        case 'add_boxes':
          if (customParams.hospital === hospitalId || customParams.hospital === 'all') {
            const newBoxes = customParams.boxes || 5;
            const newTotal = (current?.boxes_totales || 20) + newBoxes;
            projectedOccupancy = (current?.boxes_ocupados || 0) / newTotal * 100;
            projectedWaitTime = currentWaitTime * 0.8;
          }
          break;
        case 'close_hospital':
          if (customParams.hospital === hospitalId) {
            projectedOccupancy = 0;
            projectedWaitTime = 0;
          } else {
            projectedOccupancy = Math.min(100, currentOccupancy * 1.3);
            projectedWaitTime = currentWaitTime * 1.4;
          }
          break;
        case 'mass_event':
          projectedOccupancy = Math.min(100, currentOccupancy + 15);
          projectedWaitTime = currentWaitTime * 1.3;
          break;
        case 'flu_outbreak':
          projectedOccupancy = Math.min(100, currentOccupancy * (customParams.multiplier || 1.5));
          projectedWaitTime = currentWaitTime * 1.5;
          break;
        case 'heatwave':
          projectedOccupancy = Math.min(100, currentOccupancy + 20);
          projectedWaitTime = currentWaitTime * 1.4;
          break;
        case 'staff_reduction':
          projectedOccupancy = currentOccupancy;
          projectedWaitTime = currentWaitTime * (1 + (customParams.reduction || 0.2));
          break;
      }
      
      return {
        hospital: hospitalId === 'chuac' ? 'CHUAC' : 
                 hospitalId === 'modelo' ? 'HM Modelo' : 'San Rafael',
        currentOccupancy: Math.round(currentOccupancy),
        projectedOccupancy: Math.round(projectedOccupancy),
        currentWaitTime: Math.round(currentWaitTime),
        projectedWaitTime: Math.round(projectedWaitTime),
        impact: projectedOccupancy < currentOccupancy ? 'positive' : 
               projectedOccupancy > currentOccupancy ? 'negative' : 'neutral',
      };
    });
    
    setResults(simulatedResults);
    setIsSimulating(false);
    setShowResultsModal(true);
    
    notifications.show({
      title: '✅ Simulación Completada',
      message: `Escenario "${activeScenario.name}" simulado correctamente`,
      color: 'green',
    });
  };

  const applyScenario = () => {
    if (!activeScenario || !publishMessage) return;
    
    publishMessage('simulador/scenario', {
      scenario: activeScenario.id,
      params: customParams,
      timestamp: new Date().toISOString(),
    });
    
    notifications.show({
      title: '🎯 Escenario Aplicado',
      message: `El escenario "${activeScenario.name}" se está aplicando a la simulación`,
      color: 'blue',
    });
    
    setShowResultsModal(false);
  };

  return (
    <Paper shadow="sm" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
            <IconFlask size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={600} size="lg">Simulador What-If</Text>
            <Text size="xs" c="dimmed">Explora escenarios hipotéticos</Text>
          </Box>
        </Group>
        {activeScenario && (
          <Badge size="lg" variant="light" color={activeScenario.color}>
            {activeScenario.name}
          </Badge>
        )}
      </Group>

      <Tabs defaultValue="presets">
        <Tabs.List>
          <Tabs.Tab value="presets" leftSection={<IconFlask size={14} />}>
            Escenarios Predefinidos
          </Tabs.Tab>
          <Tabs.Tab value="custom" leftSection={<IconStethoscope size={14} />}>
            Personalizado
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="presets" pt="md">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {PRESET_SCENARIOS.map(scenario => (
              <Card
                key={scenario.id}
                padding="sm"
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  borderColor: activeScenario?.id === scenario.id ? 
                    `var(--mantine-color-${scenario.color}-5)` : undefined,
                  borderWidth: activeScenario?.id === scenario.id ? 2 : 1,
                  background: activeScenario?.id === scenario.id ? 
                    `var(--mantine-color-${scenario.color}-0)` : undefined,
                }}
                onClick={() => selectScenario(scenario)}
              >
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size="lg" radius="md" color={scenario.color} variant="light">
                    {scenario.icon}
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={500}>{scenario.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>{scenario.description}</Text>
                  </Box>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="custom" pt="md">
          <Stack gap="md">
            <Select
              label="Hospital Afectado"
              placeholder="Selecciona un hospital"
              value={customParams.hospital || 'all'}
              onChange={(value) => setCustomParams(prev => ({ ...prev, hospital: value }))}
              data={[
                { value: 'all', label: 'Todos los hospitales' },
                { value: 'chuac', label: 'CHUAC' },
                { value: 'modelo', label: 'HM Modelo' },
                { value: 'san_rafael', label: 'San Rafael' },
              ]}
            />
            
            <NumberInput
              label="Cambio en Boxes"
              description="Positivo para añadir, negativo para quitar"
              value={customParams.boxes || 0}
              onChange={(value) => setCustomParams(prev => ({ ...prev, boxes: value }))}
              min={-10}
              max={20}
            />
            
            <NumberInput
              label="Multiplicador de Demanda"
              description="1.0 = normal, 1.5 = +50%"
              value={customParams.multiplier || 1.0}
              onChange={(value) => setCustomParams(prev => ({ ...prev, multiplier: value }))}
              min={0.5}
              max={3.0}
              step={0.1}
              decimalScale={1}
            />
            
            <NumberInput
              label="Duración (horas)"
              value={customParams.duration || 24}
              onChange={(value) => setCustomParams(prev => ({ ...prev, duration: value }))}
              min={1}
              max={168}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Parámetros del escenario seleccionado */}
      {activeScenario && (
        <>
          <Divider my="md" />
          
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Parámetros del Escenario"
            color={activeScenario.color}
            variant="light"
          >
            <Stack gap="xs">
              {Object.entries(customParams).map(([key, value]) => (
                <Group key={key} justify="space-between">
                  <Text size="sm" tt="capitalize">{key.replace(/_/g, ' ')}</Text>
                  <Badge variant="outline">{String(value)}</Badge>
                </Group>
              ))}
            </Stack>
          </Alert>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                setActiveScenario(null);
                setCustomParams({});
                setResults(null);
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: 'violet', to: 'grape' }}
              leftSection={<IconPlayerPlay size={16} />}
              onClick={runSimulation}
              loading={isSimulating}
            >
              Ejecutar Simulación
            </Button>
          </Group>
        </>
      )}

      {/* Modal de resultados */}
      <Modal
        opened={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        title={
          <Group gap="sm">
            <IconChartBar size={20} />
            <Text fw={600}>Resultados de la Simulación</Text>
          </Group>
        }
        size="lg"
      >
        {results && (
          <Stack gap="md">
            <Alert icon={<IconFlask size={16} />} color="blue" variant="light">
              <Text size="sm">
                <strong>Escenario:</strong> {activeScenario?.name}
              </Text>
              <Text size="xs" c="dimmed">{activeScenario?.description}</Text>
            </Alert>

            {results.map((result, idx) => (
              <Card key={idx} padding="md" radius="md" withBorder>
                <Group justify="space-between" mb="sm">
                  <Text fw={500}>{result.hospital}</Text>
                  <Badge
                    color={result.impact === 'positive' ? 'green' : 
                           result.impact === 'negative' ? 'red' : 'gray'}
                    leftSection={result.impact === 'positive' ? 
                      <IconTrendingDown size={12} /> : 
                      <IconTrendingUp size={12} />}
                  >
                    {result.impact === 'positive' ? 'Mejora' : 
                     result.impact === 'negative' ? 'Empeora' : 'Sin cambios'}
                  </Badge>
                </Group>

                <SimpleGrid cols={2} spacing="md">
                  <Box>
                    <Text size="xs" c="dimmed" mb="xs">Ocupación</Text>
                    <Group gap="xs" align="center">
                      <Progress
                        value={result.currentOccupancy}
                        size="sm"
                        color="blue"
                        style={{ flex: 1 }}
                      />
                      <Text size="xs">{result.currentOccupancy}%</Text>
                      <Text size="xs" c="dimmed">→</Text>
                      <Progress
                        value={result.projectedOccupancy}
                        size="sm"
                        color={result.projectedOccupancy > result.currentOccupancy ? 'red' : 'green'}
                        style={{ flex: 1 }}
                      />
                      <Text size="xs">{result.projectedOccupancy}%</Text>
                    </Group>
                  </Box>
                  
                  <Box>
                    <Text size="xs" c="dimmed" mb="xs">Tiempo de Espera</Text>
                    <Group gap="xs" align="center">
                      <Badge variant="light" color="blue" size="sm">
                        {result.currentWaitTime} min
                      </Badge>
                      <Text size="xs" c="dimmed">→</Text>
                      <Badge
                        variant="light"
                        color={result.projectedWaitTime > result.currentWaitTime ? 'red' : 'green'}
                        size="sm"
                      >
                        {result.projectedWaitTime} min
                      </Badge>
                    </Group>
                  </Box>
                </SimpleGrid>
              </Card>
            ))}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setShowResultsModal(false)}>
                Cerrar
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: 'green', to: 'teal' }}
                leftSection={<IconCheck size={16} />}
                onClick={applyScenario}
              >
                Aplicar a Simulación
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Paper>
  );
}
