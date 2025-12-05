import { useState, useEffect } from 'react';
import { Grid, Title, Text, Card, Group, Stack, Badge, Button, Modal, Select, SimpleGrid, Progress, RingProgress, ThemeIcon, Box, Slider, Alert } from '@mantine/core';
import { useHospitalStore } from '@/store/hospitalStore';
import { HOSPITALES } from '@/types/hospital';
import { IconFlame, IconAmbulance, IconBed, IconUsers, IconActivity, IconMapPin, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import dayjs from 'dayjs';

export function Dashboard() {
  const { stats, lastUpdate, alerts, publishMessage } = useHospitalStore();
  const [incidentModalOpened, setIncidentModalOpened] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('ACCIDENTE_TRAFICO');
  const [selectedLocation, setSelectedLocation] = useState<string>('centro');
  const [numPacientes, setNumPacientes] = useState<number>(15);
  const [simulatingIncident, setSimulatingIncident] = useState(false);
  const [historicalData, setHistoricalData] = useState<Array<{
    timestamp: string;
    chuac: number;
    hm_modelo: number;
    san_rafael: number;
    total_queue: number;
  }>>([]);

  const hospitalIds = Object.keys(HOSPITALES);

  // Recopilar datos históricos para gráficos
  useEffect(() => {
    const now = dayjs();
    const newDataPoint = {
      timestamp: now.format('HH:mm:ss'),
      chuac: stats['chuac']?.boxes_ocupados || 0,
      hm_modelo: stats['hm_modelo']?.boxes_ocupados || 0,
      san_rafael: stats['san_rafael']?.boxes_ocupados || 0,
      total_queue: Object.values(stats).reduce((acc, s) => acc + (s.pacientes_en_espera_atencion || 0), 0),
    };

    setHistoricalData(prev => {
      const updated = [...prev, newDataPoint];
      // Mantener solo los últimos 20 puntos
      return updated.slice(-20);
    });
  }, [stats]);

  const incidentTypes = [
    { value: 'ACCIDENTE_TRAFICO', label: '🚗 Accidente de Tráfico (múltiples víctimas)' },
    { value: 'INCENDIO', label: '🔥 Incendio en Edificio' },
    { value: 'INTOXICACION_MASIVA', label: '☢️ Intoxicación Alimentaria Masiva' },
    { value: 'EVENTO_DEPORTIVO', label: '⚽ Evento Deportivo (altercados)' },
    { value: 'GRIPE_MASIVA', label: '🦠 Brote de Gripe' },
    { value: 'OLA_CALOR', label: '☀️ Ola de Calor' },
  ];

  const ubicaciones = [
    { value: 'autopista', label: '�️ Autopista A6/AP9 (norte)' },
    { value: 'riazor', label: '⚽ Zona Riazor/Estadio' },
    { value: 'centro', label: '🏙️ Centro de A Coruña' },
    { value: 'marineda', label: '🛒 Marineda City/Polígono' },
  ];

  const handleSimulateIncident = async () => {
    setSimulatingIncident(true);
    try {
      // Publicar comando MQTT al coordinador central para distribución inteligente
      if (publishMessage) {
        const success = publishMessage('urgencias/coordinador/incidente', {
          tipo_emergencia: selectedIncidentType,
          ubicacion: selectedLocation,
          num_pacientes: numPacientes,
          timestamp: new Date().toISOString(),
        });

        if (success) {
          notifications.show({
            title: '🚨 Incidente Activado - Coordinador Inteligente',
            message: `${incidentTypes.find(t => t.value === selectedIncidentType)?.label} con ${numPacientes} pacientes. El coordinador distribuirá automáticamente entre hospitales.`,
            color: 'red',
            autoClose: 8000,
          });
          setIncidentModalOpened(false);
        } else {
          throw new Error('No conectado a MQTT');
        }
      } else {
        throw new Error('Función MQTT no disponible');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'No se pudo simular el incidente. Verifica que el backend esté conectado.',
        color: 'red',
      });
    } finally {
      setSimulatingIncident(false);
    }
  };
  const totalStats = hospitalIds.reduce(
    (acc, id) => {
      const hospitalStats = stats[id];
      if (hospitalStats) {
        acc.totalBoxes += hospitalStats.boxes_ocupados || 0;
        acc.totalBoxesCapacity += hospitalStats.boxes_totales || HOSPITALES[id].num_boxes;
        acc.totalQueue += hospitalStats.pacientes_en_espera_atencion || 0;
        acc.emergencies += hospitalStats.emergencia_activa ? 1 : 0;
      }
      return acc;
    },
    { totalBoxes: 0, totalBoxesCapacity: 0, totalQueue: 0, emergencies: 0 }
  );

  const avgOccupation = totalStats.totalBoxesCapacity > 0
    ? (totalStats.totalBoxes / totalStats.totalBoxesCapacity) * 100
    : 0;

  const recentAlerts = alerts.slice(0, 5);
  const criticalAlerts = alerts.filter((a) => a.nivel === 'critical');

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={1}>Vista General del Sistema</Title>
          <Text c="dimmed" size="sm">
            {lastUpdate ? `Última actualización: ${dayjs(lastUpdate).format('HH:mm:ss')}` : 'Esperando datos...'}
          </Text>
        </div>
        <Button
          leftSection={<IconFlame size={20} />}
          size="lg"
          variant="gradient"
          gradient={{ from: 'red.6', to: 'red.8', deg: 135 }}
          onClick={() => setIncidentModalOpened(true)}
          style={{
            boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.4)',
          }}
        >
          Simular Incidente
        </Button>
      </Group>

      {/* Modal de simulación de incidentes con Coordinador Inteligente */}
      <Modal
        opened={incidentModalOpened}
        onClose={() => setIncidentModalOpened(false)}
        title={<Text fw={600} size="lg">🚨 Simular Incidente de Emergencia</Text>}
        size="lg"
      >
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
            <Text size="sm">
              <strong>Coordinador Inteligente:</strong> El sistema distribuirá automáticamente los pacientes 
              entre los hospitales basándose en proximidad al incidente, nivel de saturación, 
              tiempos de espera y capacidad disponible.
            </Text>
          </Alert>

          <Select
            label="Tipo de Incidente"
            description="Selecciona el tipo de emergencia"
            placeholder="Selecciona un tipo de incidente"
            value={selectedIncidentType}
            onChange={(value) => setSelectedIncidentType(value || 'ACCIDENTE_TRAFICO')}
            data={incidentTypes}
            leftSection={<IconFlame size={16} />}
          />

          <Select
            label="Ubicación del Incidente"
            description="El coordinador considerará la distancia a cada hospital"
            placeholder="Selecciona la ubicación"
            value={selectedLocation}
            onChange={(value) => setSelectedLocation(value || 'centro')}
            data={ubicaciones}
            leftSection={<IconMapPin size={16} />}
          />

          <Box>
            <Text size="sm" fw={500} mb="xs">Número de Pacientes: {numPacientes}</Text>
            <Slider
              value={numPacientes}
              onChange={setNumPacientes}
              min={5}
              max={50}
              step={5}
              marks={[
                { value: 5, label: '5' },
                { value: 15, label: '15' },
                { value: 30, label: '30' },
                { value: 50, label: '50' },
              ]}
              color="red"
            />
          </Box>

          <Card withBorder p="sm" bg="gray.0">
            <Text size="sm" fw={500} mb="xs">📊 Previsión de Distribución</Text>
            <Text size="xs" c="dimmed">
              Los pacientes se distribuirán automáticamente considerando:
            </Text>
            <SimpleGrid cols={2} spacing="xs" mt="xs">
              <Badge variant="light" color="blue" size="sm">📍 Distancia al incidente (30%)</Badge>
              <Badge variant="light" color="orange" size="sm">📈 Saturación actual (35%)</Badge>
              <Badge variant="light" color="green" size="sm">⏱️ Tiempo de espera (25%)</Badge>
              <Badge variant="light" color="violet" size="sm">🛏️ Capacidad libre (10%)</Badge>
            </SimpleGrid>
          </Card>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setIncidentModalOpened(false)}>
              Cancelar
            </Button>
            <Button
              color="red"
              leftSection={<IconFlame size={16} />}
              onClick={handleSimulateIncident}
              loading={simulatingIncident}
            >
              Activar Incidente ({numPacientes} pacientes)
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="md" padding="lg" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Stack gap="md" align="center">
              <RingProgress
                size={120}
                thickness={12}
                sections={[{ value: avgOccupation, color: avgOccupation > 80 ? 'red' : avgOccupation > 60 ? 'orange' : 'teal' }]}
                label={
                  <Text c="white" fw={700} ta="center" size="xl">
                    {avgOccupation.toFixed(0)}%
                  </Text>
                }
              />
              <Box>
                <Text size="xs" c="rgba(255,255,255,0.8)" tt="uppercase" fw={700} ta="center">
                  Ocupación Media
                </Text>
                <Text size="sm" c="white" ta="center" mt={4}>
                  {totalStats.totalBoxes}/{totalStats.totalBoxesCapacity} boxes
                </Text>
              </Box>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="md" padding="lg" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Stack gap="md" align="center">
              <ThemeIcon size={80} radius="xl" variant="white" color="rgba(255,255,255,0.9)">
                <IconUsers size={40} color="#f5576c" />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="rgba(255,255,255,0.8)" tt="uppercase" fw={700} ta="center">
                  Pacientes en Cola
                </Text>
                <Text size="2xl" c="white" ta="center" fw={900} mt={4}>
                  {totalStats.totalQueue}
                </Text>
              </Box>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="md" padding="lg" radius="md" withBorder style={{ background: totalStats.emergencies > 0 ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
            <Stack gap="md" align="center">
              <ThemeIcon size={80} radius="xl" variant="white" color="rgba(255,255,255,0.9)">
                <IconAmbulance size={40} color={totalStats.emergencies > 0 ? '#fa709a' : '#30cfd0'} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="rgba(255,255,255,0.8)" tt="uppercase" fw={700} ta="center">
                  Emergencias Activas
                </Text>
                <Text size="2xl" c="white" ta="center" fw={900} mt={4}>
                  {totalStats.emergencies}
                </Text>
              </Box>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="md" padding="lg" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Stack gap="md" align="center">
              <ThemeIcon size={80} radius="xl" variant="white" color="rgba(255,255,255,0.9)">
                <IconActivity size={40} color="#4facfe" />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="rgba(255,255,255,0.8)" tt="uppercase" fw={700} ta="center">
                  Alertas Críticas
                </Text>
                <Text size="2xl" c="white" ta="center" fw={900} mt={4}>
                  {criticalAlerts.length}
                </Text>
              </Box>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Gráfico de ocupación en tiempo real */}
      {historicalData.length > 1 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">📈 Ocupación en Tiempo Real</Title>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="colorChuac" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorHM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ffc658" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="chuac" stroke="#8884d8" fillOpacity={1} fill="url(#colorChuac)" name="CHUAC" />
              <Area type="monotone" dataKey="hm_modelo" stroke="#82ca9d" fillOpacity={1} fill="url(#colorHM)" name="HM Modelo" />
              <Area type="monotone" dataKey="san_rafael" stroke="#ffc658" fillOpacity={1} fill="url(#colorSR)" name="San Rafael" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={2}>Estado de Hospitales</Title>
          <Text size="sm" c="dimmed">Ver detalles en la pestaña "Operacional"</Text>
        </Group>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {hospitalIds.map((id) => {
            const hospitalStats = stats[id];
            const hospital = HOSPITALES[id];
            if (!hospitalStats) return null;

            const saturacion = (hospitalStats.nivel_saturacion || 0) * 100;
            const getSaturationColor = () => {
              if (saturacion > 85) return 'red';
              if (saturacion > 70) return 'orange';
              if (saturacion > 50) return 'yellow';
              return 'green';
            };

            return (
              <Card key={id} padding="lg" radius="md" withBorder shadow="md" style={{
                background: saturacion > 85
                  ? 'linear-gradient(135deg, rgba(250,82,82,0.1) 0%, rgba(250,82,82,0.05) 100%)'
                  : saturacion > 70
                  ? 'linear-gradient(135deg, rgba(253,126,20,0.1) 0%, rgba(253,126,20,0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(81,207,102,0.1) 0%, rgba(81,207,102,0.05) 100%)',
                border: saturacion > 85 ? '2px solid #fa5252' : saturacion > 70 ? '2px solid #fd7e14' : '2px solid #51cf66'
              }}>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ThemeIcon size={36} radius="md" color={getSaturationColor()}>
                        <IconBed size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={700} size="sm">{hospital.nombre.split(' - ')[0]}</Text>
                        <Text size="xs" c="dimmed">Hospital</Text>
                      </div>
                    </Group>
                    <RingProgress
                      size={60}
                      thickness={6}
                      sections={[{ value: saturacion, color: getSaturationColor() }]}
                      label={
                        <Text size="xs" fw={700} ta="center">
                          {saturacion.toFixed(0)}%
                        </Text>
                      }
                    />
                  </Group>

                  <Progress
                    value={saturacion}
                    color={getSaturationColor()}
                    size="md"
                    radius="xl"
                    animated={saturacion > 85}
                    striped={saturacion > 70}
                  />

                  <SimpleGrid cols={3} spacing="xs">
                    <Box style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' }}>
                      <Text size="xl" fw={900} c={getSaturationColor()}>{hospitalStats.boxes_ocupados}</Text>
                      <Text size="xs" c="dimmed" mt={2}>/{hospitalStats.boxes_totales || hospital.num_boxes} Boxes</Text>
                    </Box>
                    <Box style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' }}>
                      <Text size="xl" fw={900} c="blue">{hospitalStats.pacientes_en_espera_atencion || 0}</Text>
                      <Text size="xs" c="dimmed" mt={2}>En Cola</Text>
                    </Box>
                    <Box style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' }}>
                      <Text size="xl" fw={900} c="orange">{(hospitalStats.tiempo_medio_espera || 0).toFixed(0)}'</Text>
                      <Text size="xs" c="dimmed" mt={2}>Espera</Text>
                    </Box>
                  </SimpleGrid>

                  {hospitalStats.emergencia_activa && (
                    <Badge color="red" size="lg" variant="filled" leftSection="🚨">
                      EMERGENCIA ACTIVA
                    </Badge>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Card>

      {recentAlerts.length > 0 && (
        <>
          <Title order={2} mt="md">Alertas Recientes</Title>
          <Stack gap="xs">
            {recentAlerts.map((alert, idx) => (
              <Card key={idx} padding="sm" withBorder>
                <Group justify="space-between">
                  <Group>
                    <Badge
                      color={alert.nivel === 'critical' ? 'red' : alert.nivel === 'warning' ? 'orange' : 'blue'}
                      variant="filled"
                    >
                      {alert.nivel}
                    </Badge>
                    <Text size="sm" fw={500}>
                      {alert.mensaje}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {dayjs(alert.timestamp).format('HH:mm:ss')}
                  </Text>
                </Group>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
