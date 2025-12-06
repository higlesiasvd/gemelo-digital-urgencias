import { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Text,
  Group,
  Badge,
  Card,
  ThemeIcon,
  Box,
  ActionIcon,
  Tooltip,
  Slider,
  Button,
  Timeline as MantineTimeline,
  Divider,
  ScrollArea,
  Select,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconClock,
  IconAmbulance,
  IconUsers,
  IconActivity,
  IconFlame,
  IconBuildingHospital,
  IconRefresh,
  IconDownload,
  IconHistory,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Para futuras funciones de control remoto
// import { useHospitalStore } from '@/store/hospitalStore';

interface HistoricalEvent {
  id: string;
  timestamp: Date;
  type: 'arrival' | 'departure' | 'emergency' | 'saturation' | 'incident' | 'staff';
  hospital?: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  data?: Record<string, any>;
}

// Generar eventos históricos simulados
const generateHistoricalEvents = (hoursBack: number = 24): HistoricalEvent[] => {
  const events: HistoricalEvent[] = [];
  const hospitals = ['chuac', 'modelo', 'san_rafael'];
  const eventTypes: Array<'arrival' | 'departure' | 'emergency' | 'saturation' | 'incident' | 'staff'> = 
    ['arrival', 'arrival', 'arrival', 'departure', 'departure', 'emergency', 'saturation', 'incident', 'staff'];
  
  const hospitalNames: Record<string, string> = {
    chuac: 'CHUAC',
    modelo: 'HM Modelo',
    san_rafael: 'San Rafael',
  };
  
  for (let h = hoursBack; h >= 0; h--) {
    // Generar entre 2-8 eventos por hora
    const numEvents = Math.floor(Math.random() * 6) + 2;
    
    for (let i = 0; i < numEvents; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - h);
      timestamp.setMinutes(Math.floor(Math.random() * 60));
      
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const hospital = hospitals[Math.floor(Math.random() * hospitals.length)];
      
      let description = '';
      let impact: 'high' | 'medium' | 'low' = 'low';
      
      switch (type) {
        case 'arrival':
          const numArrivals = Math.floor(Math.random() * 5) + 1;
          description = `${numArrivals} paciente(s) llegaron a ${hospitalNames[hospital]}`;
          impact = numArrivals > 3 ? 'medium' : 'low';
          break;
        case 'departure':
          const numDepartures = Math.floor(Math.random() * 4) + 1;
          description = `${numDepartures} paciente(s) dados de alta en ${hospitalNames[hospital]}`;
          impact = 'low';
          break;
        case 'emergency':
          description = `Emergencia atendida en ${hospitalNames[hospital]}`;
          impact = 'high';
          break;
        case 'saturation':
          const satLevel = Math.floor(Math.random() * 20) + 80;
          description = `${hospitalNames[hospital]} alcanzó ${satLevel}% de saturación`;
          impact = satLevel > 90 ? 'high' : 'medium';
          break;
        case 'incident':
          const incidentTypes = ['Accidente de tráfico', 'Incendio', 'Intoxicación'];
          description = `${incidentTypes[Math.floor(Math.random() * incidentTypes.length)]} reportado`;
          impact = 'high';
          break;
        case 'staff':
          const staffEvents = ['Cambio de turno', 'Personal de refuerzo activado', 'Baja médica registrada'];
          description = `${staffEvents[Math.floor(Math.random() * staffEvents.length)]} en ${hospitalNames[hospital]}`;
          impact = 'medium';
          break;
      }
      
      events.push({
        id: `event-${h}-${i}`,
        timestamp,
        type,
        hospital,
        description,
        impact,
      });
    }
  }
  
  // Ordenar por timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  return events;
};

export function TimelineReplay() {
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('today');
  const [filterType, setFilterType] = useState<string>('all');
  const [sliderValue, setSliderValue] = useState(100);
  
  const playbackRef = useRef<NodeJS.Timeout | null>(null);
  
  // Para futuras funciones de control remoto
  // const { publishMessage } = useHospitalStore();

  useEffect(() => {
    // Cargar eventos históricos
    const historicalEvents = generateHistoricalEvents(24);
    setEvents(historicalEvents);
    
    if (historicalEvents.length > 0) {
      setCurrentTime(historicalEvents[0].timestamp);
    }
  }, []);

  // Manejar reproducción
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      playbackRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = new Date(prev.getTime() + (60000 * playbackSpeed)); // Avanzar minutos
          const maxTime = events[events.length - 1]?.timestamp;
          
          if (maxTime && newTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          
          // Actualizar slider
          const minTime = events[0]?.timestamp.getTime() || 0;
          const range = (maxTime?.getTime() || 0) - minTime;
          const progress = ((newTime.getTime() - minTime) / range) * 100;
          setSliderValue(progress);
          
          return newTime;
        });
      }, 100);
    } else if (playbackRef.current) {
      clearInterval(playbackRef.current);
    }
    
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, playbackSpeed, events]);

  // Eventos filtrados hasta el tiempo actual
  const visibleEvents = events.filter(e => {
    const timeMatch = e.timestamp <= currentTime;
    const typeMatch = filterType === 'all' || e.type === filterType;
    return timeMatch && typeMatch;
  }).reverse().slice(0, 20);

  // Navegar a un momento específico
  const seekTo = (value: number) => {
    if (events.length === 0) return;
    
    const minTime = events[0].timestamp.getTime();
    const maxTime = events[events.length - 1].timestamp.getTime();
    const targetTime = minTime + ((maxTime - minTime) * value / 100);
    
    setCurrentTime(new Date(targetTime));
    setSliderValue(value);
  };

  // Ir al inicio
  const goToStart = () => {
    if (events.length > 0) {
      setCurrentTime(events[0].timestamp);
      setSliderValue(0);
    }
  };

  // Ir al final (tiempo real)
  const goToEnd = () => {
    if (events.length > 0) {
      setCurrentTime(events[events.length - 1].timestamp);
      setSliderValue(100);
    }
  };

  // Reproducir escenario
  const replayScenario = () => {
    goToStart();
    setIsPlaying(true);
    
    notifications.show({
      title: '▶️ Reproducción Iniciada',
      message: 'Reproduciendo eventos históricos',
      color: 'blue',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'arrival': return <IconUsers size={14} />;
      case 'departure': return <IconBuildingHospital size={14} />;
      case 'emergency': return <IconAmbulance size={14} />;
      case 'saturation': return <IconActivity size={14} />;
      case 'incident': return <IconFlame size={14} />;
      case 'staff': return <IconUsers size={14} />;
      default: return <IconClock size={14} />;
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'arrival': return 'blue';
      case 'departure': return 'green';
      case 'emergency': return 'red';
      case 'saturation': return 'orange';
      case 'incident': return 'red';
      case 'staff': return 'violet';
      default: return 'gray';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Paper shadow="sm" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'cyan', to: 'teal' }}>
            <IconHistory size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={600} size="lg">Timeline / Replay</Text>
            <Text size="xs" c="dimmed">Reproducir eventos históricos</Text>
          </Box>
        </Group>
        
        <Group gap="xs">
          <Badge
            size="lg"
            variant={isPlaying ? 'gradient' : 'light'}
            gradient={{ from: 'blue', to: 'cyan' }}
          >
            {isPlaying ? `▶ ${playbackSpeed}x` : '⏸ Pausado'}
          </Badge>
        </Group>
      </Group>

      {/* Controles de reproducción */}
      <Card withBorder p="md" radius="md" mb="md">
        <Group justify="space-between" mb="md">
          <Box>
            <Text size="xs" c="dimmed">Tiempo de reproducción</Text>
            <Text size="lg" fw={700}>{formatTime(currentTime)}</Text>
            <Text size="xs" c="dimmed">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </Box>
          
          <Group gap="xs">
            <Select
              size="xs"
              value={selectedDate}
              onChange={(v) => setSelectedDate(v || 'today')}
              data={[
                { value: 'today', label: 'Hoy' },
                { value: 'yesterday', label: 'Ayer' },
                { value: 'week', label: 'Última semana' },
              ]}
              style={{ width: 130 }}
            />
          </Group>
        </Group>

        {/* Barra de progreso */}
        <Box mb="md">
          <Slider
            value={sliderValue}
            onChange={seekTo}
            marks={[
              { value: 0, label: '00:00' },
              { value: 25, label: '06:00' },
              { value: 50, label: '12:00' },
              { value: 75, label: '18:00' },
              { value: 100, label: '24:00' },
            ]}
            size="md"
            color="cyan"
          />
        </Box>

        {/* Botones de control */}
        <Group justify="center" gap="md">
          <Tooltip label="Ir al inicio">
            <ActionIcon size="lg" variant="light" onClick={goToStart}>
              <IconPlayerSkipBack size={18} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label={isPlaying ? 'Pausar' : 'Reproducir'}>
            <ActionIcon
              size="xl"
              variant="gradient"
              gradient={isPlaying ? { from: 'orange', to: 'red' } : { from: 'blue', to: 'cyan' }}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <IconPlayerPause size={24} /> : <IconPlayerPlay size={24} />}
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Ir al final">
            <ActionIcon size="lg" variant="light" onClick={goToEnd}>
              <IconPlayerSkipForward size={18} />
            </ActionIcon>
          </Tooltip>
          
          <Divider orientation="vertical" />
          
          <Group gap={4}>
            <Text size="xs" c="dimmed">Velocidad:</Text>
            {[1, 5, 10, 30].map(speed => (
              <Button
                key={speed}
                size="xs"
                variant={playbackSpeed === speed ? 'filled' : 'light'}
                color="cyan"
                onClick={() => setPlaybackSpeed(speed)}
              >
                {speed}x
              </Button>
            ))}
          </Group>
        </Group>
      </Card>

      {/* Filtros */}
      <Group gap="xs" mb="md">
        <Text size="xs" c="dimmed">Filtrar:</Text>
        <Badge
          variant={filterType === 'all' ? 'filled' : 'light'}
          color="gray"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterType('all')}
        >
          Todos
        </Badge>
        <Badge
          variant={filterType === 'emergency' ? 'filled' : 'light'}
          color="red"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterType('emergency')}
        >
          Emergencias
        </Badge>
        <Badge
          variant={filterType === 'incident' ? 'filled' : 'light'}
          color="orange"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterType('incident')}
        >
          Incidentes
        </Badge>
        <Badge
          variant={filterType === 'saturation' ? 'filled' : 'light'}
          color="yellow"
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterType('saturation')}
        >
          Saturación
        </Badge>
      </Group>

      {/* Timeline de eventos */}
      <ScrollArea h={350}>
        <MantineTimeline active={0} bulletSize={28} lineWidth={2}>
          {visibleEvents.map((event, index) => (
            <MantineTimeline.Item
              key={event.id}
              bullet={
                <ThemeIcon
                  size={24}
                  radius="xl"
                  color={getEventColor(event.type)}
                  variant={index === 0 ? 'filled' : 'light'}
                >
                  {getEventIcon(event.type)}
                </ThemeIcon>
              }
              title={
                <Group gap="xs">
                  <Text size="sm" fw={500}>{event.description}</Text>
                  {event.impact === 'high' && (
                    <Badge size="xs" color="red" variant="light">
                      Alto impacto
                    </Badge>
                  )}
                </Group>
              }
            >
              <Text size="xs" c="dimmed" mt={4}>
                {formatTime(event.timestamp)} - {event.timestamp.toLocaleDateString('es-ES')}
              </Text>
            </MantineTimeline.Item>
          ))}
        </MantineTimeline>
        
        {visibleEvents.length === 0 && (
          <Box ta="center" py="xl">
            <IconClock size={40} color="#adb5bd" />
            <Text size="sm" c="dimmed" mt="sm">
              No hay eventos para mostrar
            </Text>
          </Box>
        )}
      </ScrollArea>

      {/* Acciones */}
      <Divider my="md" />
      
      <Group justify="space-between">
        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={replayScenario}
        >
          Reproducir desde inicio
        </Button>
        
        <Button
          variant="subtle"
          leftSection={<IconDownload size={16} />}
          onClick={() => {
            notifications.show({
              title: '📥 Exportar Datos',
              message: 'Función de exportación disponible próximamente',
              color: 'blue',
            });
          }}
        >
          Exportar eventos
        </Button>
      </Group>
    </Paper>
  );
}
