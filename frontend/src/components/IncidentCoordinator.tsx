import { useEffect, useState } from 'react';
import {
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Progress,
  ThemeIcon,
  SimpleGrid,
  Box,
  Transition,
  Divider,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconAmbulance,
  IconArrowRight,
  IconBuildingHospital,
  IconClock,
  IconMapPin,
  IconUsers,
  IconX,
  IconActivity,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';

// Coordenadas de hospitales para calcular distancias
const HOSPITAL_COORDS: Record<string, { lat: number; lon: number; nombre: string; color: string }> = {
  chuac: { lat: 43.34427, lon: -8.38932, nombre: 'CHUAC', color: '#228be6' },
  modelo: { lat: 43.3651, lon: -8.4016, nombre: 'HM Modelo', color: '#40c057' },
  san_rafael: { lat: 43.34521, lon: -8.3879, nombre: 'San Rafael', color: '#fab005' },
};

const UBICACIONES_COORDS: Record<string, { lat: number; lon: number; nombre: string }> = {
  autopista: { lat: 43.33, lon: -8.38, nombre: 'Autopista A6/AP9' },
  riazor: { lat: 43.3623, lon: -8.4115, nombre: 'Zona Riazor' },
  centro: { lat: 43.3713, lon: -8.396, nombre: 'Centro Ciudad' },
  marineda: { lat: 43.348, lon: -8.42, nombre: 'Marineda City' },
};

// Calcular distancia aproximada en km
const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface HospitalDistribution {
  hospitalId: string;
  nombre: string;
  color: string;
  pacientes: number;
  porcentaje: number;
  distancia: number;
  saturacionActual: number;
  tiempoEstimado: number;
}

export function IncidentCoordinator() {
  const { incidenteActivo, setIncidenteActivo, stats } = useHospitalStore();
  const [distribucion, setDistribucion] = useState<HospitalDistribution[]>([]);
  const [animatedPacientes, setAnimatedPacientes] = useState<Record<string, number>>({});
  const [showAmbulances, setShowAmbulances] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Calcular distribución cuando hay incidente
  useEffect(() => {
    if (!incidenteActivo) {
      setDistribucion([]);
      setAnimatedPacientes({});
      setElapsedTime(0);
      return;
    }

    const ubicacion = UBICACIONES_COORDS[incidenteActivo.ubicacion];
    if (!ubicacion) return;

    // Calcular distribución inteligente
    const hospitales = Object.entries(HOSPITAL_COORDS).map(([id, coords]) => {
      const distancia = calcularDistancia(ubicacion.lat, ubicacion.lon, coords.lat, coords.lon);
      const hospitalStats = stats[id];
      const saturacion = hospitalStats?.nivel_saturacion || 0.5;
      const tiempoEspera = hospitalStats?.tiempo_medio_espera || 30;

      // Score: menor distancia y menor saturación = mejor
      const scoreDistancia = 1 / (1 + distancia);
      const scoreSaturacion = 1 - saturacion;
      const scoreEspera = 1 / (1 + tiempoEspera / 60);

      const scoreFinal = scoreDistancia * 0.35 + scoreSaturacion * 0.40 + scoreEspera * 0.25;

      return {
        hospitalId: id,
        nombre: coords.nombre,
        color: coords.color,
        distancia,
        saturacionActual: saturacion,
        score: scoreFinal,
        tiempoEstimado: Math.round((distancia / 50) * 60 + tiempoEspera), // minutos
      };
    });

    // Ordenar por score y distribuir pacientes
    hospitales.sort((a, b) => b.score - a.score);
    const totalScore = hospitales.reduce((sum, h) => sum + h.score, 0);
    
    let pacientesRestantes = incidenteActivo.numPacientes;
    const dist: HospitalDistribution[] = hospitales.map((h, idx) => {
      let pacientes: number;
      if (idx === hospitales.length - 1) {
        pacientes = pacientesRestantes;
      } else {
        pacientes = Math.round((h.score / totalScore) * incidenteActivo.numPacientes);
        pacientes = Math.min(pacientes, pacientesRestantes);
      }
      pacientesRestantes -= pacientes;
      
      return {
        ...h,
        pacientes,
        porcentaje: (pacientes / incidenteActivo.numPacientes) * 100,
      };
    });

    setDistribucion(dist.filter(d => d.pacientes > 0));

    // Animación de entrada de pacientes
    const animated: Record<string, number> = {};
    dist.forEach(d => {
      animated[d.hospitalId] = 0;
    });
    setAnimatedPacientes(animated);

    // Animar conteo de pacientes
    let step = 0;
    const maxSteps = 20;
    const interval = setInterval(() => {
      step++;
      const progress = step / maxSteps;
      const newAnimated: Record<string, number> = {};
      dist.forEach(d => {
        newAnimated[d.hospitalId] = Math.round(d.pacientes * progress);
      });
      setAnimatedPacientes(newAnimated);

      if (step >= maxSteps) {
        clearInterval(interval);
        setShowAmbulances(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [incidenteActivo, stats]);

  // Timer del incidente
  useEffect(() => {
    if (!incidenteActivo) return;

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [incidenteActivo]);

  if (!incidenteActivo) return null;

  const ubicacionInfo = UBICACIONES_COORDS[incidenteActivo.ubicacion];
  const tipoLabel = incidenteActivo.tipo.replace(/_/g, ' ');
  const tipoEmoji = incidenteActivo.tipo.includes('INCENDIO') ? '🔥' :
                   incidenteActivo.tipo.includes('TRAFICO') ? '🚗' :
                   incidenteActivo.tipo.includes('INTOXICACION') ? '☢️' :
                   incidenteActivo.tipo.includes('DEPORTIVO') ? '⚽' :
                   incidenteActivo.tipo.includes('GRIPE') ? '🦠' : '🚨';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Transition mounted={!!incidenteActivo} transition="slide-down" duration={400}>
      {(styles) => (
        <Paper
          style={{
            ...styles,
            background: 'linear-gradient(135deg, rgba(255,0,0,0.05) 0%, rgba(255,100,0,0.05) 100%)',
            border: '2px solid #ff4444',
            position: 'relative',
            overflow: 'hidden',
          }}
          shadow="lg"
          radius="lg"
          p="lg"
          mb="lg"
        >
          {/* Animación de fondo pulsante */}
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at center, rgba(255,0,0,0.1) 0%, transparent 70%)',
              animation: 'pulse-bg 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Header del incidente */}
          <Group justify="space-between" mb="md" style={{ position: 'relative' }}>
            <Group gap="md">
              <ThemeIcon
                size={50}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'red', to: 'orange', deg: 135 }}
                style={{ animation: 'pulse 1.5s infinite' }}
              >
                <IconAlertTriangle size={28} />
              </ThemeIcon>
              <div>
                <Text size="xl" fw={700} c="red.7">
                  {tipoEmoji} INCIDENTE ACTIVO
                </Text>
                <Text size="sm" c="dimmed">
                  {tipoLabel} • {ubicacionInfo?.nombre || incidenteActivo.ubicacion}
                </Text>
              </div>
            </Group>

            <Group gap="md">
              {/* Timer */}
              <Badge
                size="xl"
                variant="light"
                color="red"
                leftSection={<IconClock size={16} />}
                style={{ fontFamily: 'monospace' }}
              >
                {formatTime(elapsedTime)}
              </Badge>

              <Tooltip label="Cerrar incidente">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  onClick={() => setIncidenteActivo(null)}
                >
                  <IconX size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Info rápida */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
            <Paper p="sm" radius="md" withBorder bg="red.0">
              <Group gap="xs">
                <IconUsers size={20} color="#e03131" />
                <div>
                  <Text size="xs" c="dimmed">Pacientes</Text>
                  <Text size="lg" fw={700} c="red.7">{incidenteActivo.numPacientes}</Text>
                </div>
              </Group>
            </Paper>
            <Paper p="sm" radius="md" withBorder bg="blue.0">
              <Group gap="xs">
                <IconMapPin size={20} color="#1971c2" />
                <div>
                  <Text size="xs" c="dimmed">Ubicación</Text>
                  <Text size="sm" fw={600}>{ubicacionInfo?.nombre}</Text>
                </div>
              </Group>
            </Paper>
            <Paper p="sm" radius="md" withBorder bg="green.0">
              <Group gap="xs">
                <IconBuildingHospital size={20} color="#2f9e44" />
                <div>
                  <Text size="xs" c="dimmed">Hospitales</Text>
                  <Text size="lg" fw={700} c="green.7">{distribucion.length}</Text>
                </div>
              </Group>
            </Paper>
            <Paper p="sm" radius="md" withBorder bg="orange.0">
              <Group gap="xs">
                <IconActivity size={20} color="#e8590c" />
                <div>
                  <Text size="xs" c="dimmed">Estado</Text>
                  <Badge color="orange" variant="filled" size="sm">
                    Distribuyendo
                  </Badge>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>

          <Divider mb="md" label="Distribución Inteligente de Pacientes" labelPosition="center" />

          {/* Visualización de distribución */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            {distribucion.map((hosp, idx) => (
              <Paper
                key={hosp.hospitalId}
                p="md"
                radius="md"
                withBorder
                style={{
                  borderColor: hosp.color,
                  borderWidth: 2,
                  background: `linear-gradient(135deg, ${hosp.color}10 0%, transparent 100%)`,
                  animation: `fadeIn 0.5s ease-out ${idx * 0.2}s both`,
                }}
              >
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon size="md" color={hosp.color} variant="light" radius="xl">
                      <IconBuildingHospital size={16} />
                    </ThemeIcon>
                    <Text fw={600}>{hosp.nombre}</Text>
                  </Group>
                  <Badge color={hosp.color} variant="filled" size="lg">
                    {animatedPacientes[hosp.hospitalId] || 0}
                  </Badge>
                </Group>

                {/* Barra de progreso animada */}
                <Progress
                  value={hosp.porcentaje}
                  color={hosp.color}
                  size="xl"
                  radius="xl"
                  mb="sm"
                  animated
                  striped
                />

                {/* Detalles */}
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="xs" c="dimmed">Distancia</Text>
                    <Text size="sm" fw={500}>{hosp.distancia.toFixed(1)} km</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Saturación</Text>
                    <Badge
                      size="sm"
                      color={hosp.saturacionActual > 0.8 ? 'red' : hosp.saturacionActual > 0.6 ? 'yellow' : 'green'}
                    >
                      {(hosp.saturacionActual * 100).toFixed(0)}%
                    </Badge>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Tiempo est.</Text>
                    <Text size="sm" fw={500}>{hosp.tiempoEstimado} min</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">% Asignado</Text>
                    <Text size="sm" fw={500}>{hosp.porcentaje.toFixed(0)}%</Text>
                  </Box>
                </SimpleGrid>

                {/* Animación de ambulancias */}
                <Transition mounted={showAmbulances && hosp.pacientes > 0} transition="slide-up" duration={300}>
                  {(styles) => (
                    <Group gap="xs" mt="sm" style={styles}>
                      {Array.from({ length: Math.min(hosp.pacientes, 5) }).map((_, i) => (
                        <ThemeIcon
                          key={i}
                          size="sm"
                          variant="light"
                          color="red"
                          radius="xl"
                          style={{
                            animation: `bounce 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                          }}
                        >
                          <IconAmbulance size={12} />
                        </ThemeIcon>
                      ))}
                      {hosp.pacientes > 5 && (
                        <Text size="xs" c="dimmed">+{hosp.pacientes - 5} más</Text>
                      )}
                    </Group>
                  )}
                </Transition>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Flujo visual */}
          <Box mt="lg">
            <Group justify="center" gap="xl">
              <Paper p="md" radius="xl" withBorder bg="red.1">
                <Group gap="xs">
                  <Text size="xl">{tipoEmoji}</Text>
                  <div>
                    <Text size="xs" c="dimmed">Origen</Text>
                    <Text size="sm" fw={600}>{ubicacionInfo?.nombre}</Text>
                  </div>
                </Group>
              </Paper>

              <Group gap="xs" style={{ animation: 'slideRight 1s ease-in-out infinite' }}>
                <IconArrowRight size={24} color="#666" />
                <IconAmbulance size={28} color="#e03131" style={{ animation: 'shake 0.5s ease-in-out infinite' }} />
                <IconArrowRight size={24} color="#666" />
              </Group>

              <Stack gap="xs">
                {distribucion.slice(0, 3).map((hosp) => (
                  <Badge
                    key={hosp.hospitalId}
                    color={hosp.color}
                    variant="filled"
                    size="md"
                    leftSection={<IconBuildingHospital size={12} />}
                  >
                    {hosp.nombre}: {hosp.pacientes}
                  </Badge>
                ))}
              </Stack>
            </Group>
          </Box>

          {/* CSS animations */}
          <style>{`
            @keyframes pulse-bg {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes bounce {
              from { transform: translateY(0); }
              to { transform: translateY(-5px); }
            }
            @keyframes slideRight {
              0%, 100% { transform: translateX(0); opacity: 1; }
              50% { transform: translateX(10px); opacity: 0.7; }
            }
            @keyframes shake {
              0%, 100% { transform: rotate(-5deg); }
              50% { transform: rotate(5deg); }
            }
          `}</style>
        </Paper>
      )}
    </Transition>
  );
}
