import { useEffect, useState } from 'react';
import {
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  ThemeIcon,
  Timeline,
  Box,
  Transition,
  Tooltip,
  ActionIcon,
  Collapse,
  Divider,
} from '@mantine/core';
import {
  IconArrowRight,
  IconAmbulance,
  IconBuildingHospital,
  IconChevronDown,
  IconChevronUp,
  IconHeartbeat,
  IconClock,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';

// Colores de triaje Manchester
const TRIAJE_COLORS: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', label: 'Resucitación' },
  2: { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)', label: 'Emergencia' },
  3: { color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.1)', label: 'Urgente' },
  4: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', label: 'Menos urgente' },
  5: { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', label: 'No urgente' },
};

const HOSPITAL_NAMES: Record<string, { short: string; full: string; color: string }> = {
  chuac: { short: 'CHUAC', full: 'CHUAC - Hospital Universitario', color: '#228be6' },
  modelo: { short: 'Modelo', full: 'Hospital Modelo HM', color: '#40c057' },
  san_rafael: { short: 'San Rafael', full: 'Hospital San Rafael', color: '#fab005' },
};

interface Derivacion {
  id: number;
  timestamp: number;
  paciente_id: number;
  nivel_triaje: number;
  triaje_nombre: string;
  triaje_color: string;
  hospital_origen: string;
  hospital_destino: string;
  motivo: string;
  estado: 'en_curso' | 'completada';
}

interface DerivacionStats {
  total: number;
  porHospital: Record<string, { enviadas: number; recibidas: number }>;
  porTriaje: Record<number, number>;
}

export function DerivacionesPanel() {
  const { stats } = useHospitalStore();
  const [derivaciones, setDerivaciones] = useState<Derivacion[]>([]);
  const [estadisticas, setEstadisticas] = useState<DerivacionStats>({
    total: 0,
    porHospital: {},
    porTriaje: {},
  });
  const [expanded, setExpanded] = useState(true);
  const [animatingIds] = useState<Set<number>>(new Set());

  // Escuchar derivaciones por MQTT (simulado con polling del store)
  useEffect(() => {
    // Calcular estadísticas desde stats
    const newStats: DerivacionStats = {
      total: 0,
      porHospital: {},
      porTriaje: {},
    };

    Object.entries(stats).forEach(([hospitalId, hospitalStats]) => {
      const derivados = hospitalStats?.pacientes_derivados || 0;
      newStats.total += derivados;
      newStats.porHospital[hospitalId] = {
        enviadas: derivados,
        recibidas: 0, // Se actualizaría con MQTT
      };
    });

    setEstadisticas(newStats);
  }, [stats]);

  // Demo: generar derivaciones de ejemplo
  useEffect(() => {
    // Solo si no hay derivaciones reales
    if (derivaciones.length === 0) {
      const demoDerivaciones: Derivacion[] = [
        {
          id: 1,
          timestamp: Date.now() - 120000,
          paciente_id: 1042,
          nivel_triaje: 2,
          triaje_nombre: 'Emergencia',
          triaje_color: '#ea580c',
          hospital_origen: 'modelo',
          hospital_destino: 'chuac',
          motivo: 'Caso grave - derivación a hospital de referencia',
          estado: 'completada',
        },
        {
          id: 2,
          timestamp: Date.now() - 60000,
          paciente_id: 1089,
          nivel_triaje: 1,
          triaje_nombre: 'Resucitación',
          triaje_color: '#dc2626',
          hospital_origen: 'san_rafael',
          hospital_destino: 'chuac',
          motivo: 'Caso grave - derivación a hospital de referencia',
          estado: 'en_curso',
        },
      ];
      setDerivaciones(demoDerivaciones);
    }
  }, [derivaciones.length]);

  const derivacionesActivas = derivaciones.filter(d => d.estado === 'en_curso');
  const tieneDerivacionesActivas = derivacionesActivas.length > 0;

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="md"
      mb="lg"
      style={{
        background: tieneDerivacionesActivas 
          ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)'
          : undefined,
        border: tieneDerivacionesActivas ? '1px solid rgba(234, 88, 12, 0.3)' : undefined,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon
            size={40}
            radius="xl"
            variant={tieneDerivacionesActivas ? 'gradient' : 'light'}
            gradient={{ from: 'orange', to: 'red', deg: 135 }}
            color="orange"
            style={tieneDerivacionesActivas ? { animation: 'pulse 2s infinite' } : undefined}
          >
            <IconAmbulance size={22} />
          </ThemeIcon>
          <div>
            <Group gap="xs">
              <Text fw={700} size="lg">Derivaciones entre Hospitales</Text>
              {tieneDerivacionesActivas && (
                <Badge color="orange" variant="filled" size="sm">
                  {derivacionesActivas.length} en curso
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              Traslados de pacientes por gravedad o saturación
            </Text>
          </div>
        </Group>

        <Group gap="xs">
          <Badge variant="light" color="blue" size="lg">
            Total: {estadisticas.total}
          </Badge>
          <ActionIcon
            variant="subtle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <IconChevronUp /> : <IconChevronDown />}
          </ActionIcon>
        </Group>
      </Group>

      <Collapse in={expanded}>
        {/* Resumen visual de flujos */}
        <Box mb="lg">
          <Group grow gap="md">
            {Object.entries(HOSPITAL_NAMES).map(([id, info]) => {
              const hospitalStats = stats[id];
              const derivados = hospitalStats?.pacientes_derivados || 0;
              const saturacion = hospitalStats?.nivel_saturacion || 0;
              
              return (
                <Paper
                  key={id}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{
                    borderColor: info.color,
                    borderWidth: 2,
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm" style={{ color: info.color }}>
                      {info.short}
                    </Text>
                    <Badge
                      size="xs"
                      color={saturacion > 0.8 ? 'red' : saturacion > 0.6 ? 'orange' : 'green'}
                    >
                      {Math.round(saturacion * 100)}%
                    </Badge>
                  </Group>
                  
                  <Group gap="xs">
                    <Tooltip label="Derivaciones enviadas">
                      <Group gap={4}>
                        <IconArrowRight size={14} color="#888" />
                        <Text size="sm" fw={500}>{derivados}</Text>
                      </Group>
                    </Tooltip>
                    
                    {id === 'chuac' && (
                      <Tooltip label="Hospital de referencia">
                        <Badge size="xs" variant="dot" color="blue">
                          Referencia
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Paper>
              );
            })}
          </Group>
        </Box>

        {/* Flujo visual de derivaciones */}
        {tieneDerivacionesActivas && (
          <Box
            mb="lg"
            p="md"
            style={{
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 12,
            }}
          >
            <Text size="sm" fw={600} mb="sm" c="dimmed">
              🚑 DERIVACIONES EN CURSO
            </Text>
            
            <Stack gap="md">
              {derivacionesActivas.map((d) => {
                const origen = HOSPITAL_NAMES[d.hospital_origen];
                const destino = HOSPITAL_NAMES[d.hospital_destino];
                const triaje = TRIAJE_COLORS[d.nivel_triaje];
                const isAnimating = animatingIds.has(d.id);
                
                return (
                  <Transition
                    key={d.id}
                    mounted={true}
                    transition="slide-right"
                    duration={500}
                  >
                    {(styles) => (
                      <Paper
                        style={{
                          ...styles,
                          background: triaje?.bg || 'rgba(0,0,0,0.05)',
                          border: `2px solid ${triaje?.color || '#666'}`,
                        }}
                        p="sm"
                        radius="md"
                      >
                        <Group justify="space-between" wrap="nowrap">
                          {/* Origen */}
                          <Group gap="xs" style={{ flex: 1 }}>
                            <ThemeIcon
                              size={36}
                              radius="xl"
                              style={{ backgroundColor: origen?.color }}
                            >
                              <IconBuildingHospital size={20} />
                            </ThemeIcon>
                            <div>
                              <Text fw={600} size="sm">{origen?.short}</Text>
                              <Text size="xs" c="dimmed">Origen</Text>
                            </div>
                          </Group>

                          {/* Flecha animada */}
                          <Box
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            <Box
                              style={{
                                width: '80%',
                                height: 4,
                                background: `linear-gradient(90deg, ${origen?.color}, ${destino?.color})`,
                                borderRadius: 2,
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              {/* Punto animado */}
                              <Box
                                style={{
                                  position: 'absolute',
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background: triaje?.color || '#fff',
                                  top: -4,
                                  animation: 'ambulance-move 2s ease-in-out infinite',
                                  boxShadow: `0 0 10px ${triaje?.color}`,
                                }}
                              />
                            </Box>
                            
                            {/* Icono de ambulancia */}
                            <Box
                              style={{
                                position: 'absolute',
                                animation: isAnimating ? 'shake 0.5s ease-in-out' : undefined,
                              }}
                            >
                              <IconAmbulance
                                size={24}
                                color={triaje?.color}
                                style={{
                                  filter: `drop-shadow(0 0 4px ${triaje?.color})`,
                                }}
                              />
                            </Box>
                          </Box>

                          {/* Destino */}
                          <Group gap="xs" style={{ flex: 1 }} justify="flex-end">
                            <div style={{ textAlign: 'right' }}>
                              <Text fw={600} size="sm">{destino?.short}</Text>
                              <Text size="xs" c="dimmed">Destino</Text>
                            </div>
                            <ThemeIcon
                              size={36}
                              radius="xl"
                              style={{ backgroundColor: destino?.color }}
                            >
                              <IconBuildingHospital size={20} />
                            </ThemeIcon>
                          </Group>
                        </Group>

                        {/* Info del paciente */}
                        <Divider my="xs" />
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Badge
                              size="sm"
                              style={{
                                backgroundColor: triaje?.color,
                                color: 'white',
                              }}
                            >
                              {triaje?.label}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              Paciente #{d.paciente_id}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed" style={{ maxWidth: 200 }} lineClamp={1}>
                            {d.motivo}
                          </Text>
                        </Group>
                      </Paper>
                    )}
                  </Transition>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Timeline de derivaciones recientes */}
        <Text size="sm" fw={600} mb="sm" c="dimmed">
          📋 HISTORIAL RECIENTE
        </Text>
        
        <Timeline active={derivaciones.length - 1} bulletSize={24} lineWidth={2}>
          {derivaciones.slice(0, 5).map((d) => {
            const origen = HOSPITAL_NAMES[d.hospital_origen];
            const destino = HOSPITAL_NAMES[d.hospital_destino];
            const triaje = TRIAJE_COLORS[d.nivel_triaje];
            const tiempoAgo = Math.round((Date.now() - d.timestamp) / 60000);
            
            return (
              <Timeline.Item
                key={d.id}
                bullet={
                  <ThemeIcon
                    size={24}
                    radius="xl"
                    style={{ backgroundColor: triaje?.color }}
                  >
                    <IconHeartbeat size={12} />
                  </ThemeIcon>
                }
                title={
                  <Group gap="xs">
                    <Text size="sm" fw={500}>{origen?.short}</Text>
                    <IconArrowRight size={14} />
                    <Text size="sm" fw={500}>{destino?.short}</Text>
                    <Badge size="xs" variant="light" color={d.estado === 'en_curso' ? 'orange' : 'gray'}>
                      {d.estado === 'en_curso' ? 'En curso' : 'Completada'}
                    </Badge>
                  </Group>
                }
              >
                <Text c="dimmed" size="xs">
                  {d.motivo}
                </Text>
                <Text size="xs" mt={4} c="dimmed">
                  <IconClock size={12} style={{ verticalAlign: 'middle' }} /> Hace {tiempoAgo} min
                </Text>
              </Timeline.Item>
            );
          })}
        </Timeline>

        {derivaciones.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No hay derivaciones recientes
          </Text>
        )}
      </Collapse>

      {/* CSS para animaciones */}
      <style>{`
        @keyframes ambulance-move {
          0% { left: 0%; }
          50% { left: calc(100% - 12px); }
          100% { left: 0%; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-2deg); }
          75% { transform: translateX(2px) rotate(2deg); }
        }
      `}</style>
    </Paper>
  );
}
