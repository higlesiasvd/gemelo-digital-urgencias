import { useState, useEffect } from 'react';
import {
  Paper,
  Group,
  Text,
  ActionIcon,
  Badge,
  Tooltip,
  Stack,
  Divider,
  SegmentedControl,
  Button,
  Collapse,
  Box,
  ThemeIcon,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';

interface SimulationState {
  isRunning: boolean;
  speed: number;
  currentTime: Date;
  elapsedHours: number;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function SimulationControl() {
  const [expanded, setExpanded] = useState(false);
  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: true,
    speed: 1,
    currentTime: new Date(),
    elapsedHours: 0,
    dayOfWeek: DAYS_ES[new Date().getDay()],
    timeOfDay: 'morning',
  });
  
  const { isConnected, publishMessage } = useHospitalStore();

  // Actualizar tiempo cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulation.isRunning) {
        setSimulation(prev => {
          const newTime = new Date(prev.currentTime.getTime() + (1000 * prev.speed));
          const hour = newTime.getHours();
          let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
          if (hour >= 6 && hour < 12) timeOfDay = 'morning';
          else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
          else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
          else timeOfDay = 'night';
          
          return {
            ...prev,
            currentTime: newTime,
            elapsedHours: prev.elapsedHours + (prev.speed / 3600),
            dayOfWeek: DAYS_ES[newTime.getDay()],
            timeOfDay,
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.speed]);

  const toggleSimulation = () => {
    setSimulation(prev => ({ ...prev, isRunning: !prev.isRunning }));
    
    // Enviar comando al simulador via MQTT
    if (publishMessage) {
      publishMessage('simulador/control', {
        action: simulation.isRunning ? 'pause' : 'resume',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const changeSpeed = (newSpeed: number) => {
    setSimulation(prev => ({ ...prev, speed: newSpeed }));
    
    if (publishMessage) {
      publishMessage('simulador/control', {
        action: 'set_speed',
        speed: newSpeed,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const skipTime = (hours: number) => {
    setSimulation(prev => ({
      ...prev,
      currentTime: new Date(prev.currentTime.getTime() + (hours * 3600000)),
      elapsedHours: prev.elapsedHours + hours,
    }));
    
    if (publishMessage) {
      publishMessage('simulador/control', {
        action: 'skip_time',
        hours,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const resetSimulation = () => {
    setSimulation({
      isRunning: true,
      speed: 1,
      currentTime: new Date(),
      elapsedHours: 0,
      dayOfWeek: DAYS_ES[new Date().getDay()],
      timeOfDay: 'morning',
    });
    
    if (publishMessage) {
      publishMessage('simulador/control', {
        action: 'reset',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const getTimeIcon = () => {
    switch (simulation.timeOfDay) {
      case 'morning': return <IconSun size={16} color="#fbbf24" />;
      case 'afternoon': return <IconSun size={16} color="#f59e0b" />;
      case 'evening': return <IconMoon size={16} color="#8b5cf6" />;
      case 'night': return <IconMoon size={16} color="#3b82f6" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="md"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header compacto */}
      <Group justify="space-between" mb={expanded ? 'md' : 0}>
        <Group gap="sm">
          <ThemeIcon
            size="lg"
            radius="xl"
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan' }}
          >
            <IconClock size={18} />
          </ThemeIcon>
          <Box>
            <Text size="xs" c="dimmed">Simulación</Text>
            <Group gap="xs">
              <Text size="lg" fw={700} c="white">
                {formatTime(simulation.currentTime)}
              </Text>
              {getTimeIcon()}
            </Group>
          </Box>
        </Group>

        <Group gap="xs">
          {/* Estado y velocidad */}
          <Badge
            size="lg"
            variant="gradient"
            gradient={simulation.isRunning ? { from: 'green', to: 'teal' } : { from: 'red', to: 'orange' }}
          >
            {simulation.isRunning ? `${simulation.speed}x` : 'PAUSADO'}
          </Badge>

          {/* Controles principales */}
          <Tooltip label="Retroceder 1h">
            <ActionIcon
              variant="subtle"
              color="white"
              onClick={() => skipTime(-1)}
              disabled={!isConnected}
            >
              <IconPlayerSkipBack size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={simulation.isRunning ? 'Pausar' : 'Reanudar'}>
            <ActionIcon
              size="lg"
              variant="gradient"
              gradient={simulation.isRunning ? { from: 'orange', to: 'red' } : { from: 'green', to: 'teal' }}
              onClick={toggleSimulation}
            >
              {simulation.isRunning ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Avanzar 1h">
            <ActionIcon
              variant="subtle"
              color="white"
              onClick={() => skipTime(1)}
              disabled={!isConnected}
            >
              <IconPlayerSkipForward size={18} />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" color="gray.7" />

          <Tooltip label={expanded ? 'Contraer' : 'Expandir'}>
            <ActionIcon
              variant="subtle"
              color="white"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Panel expandido */}
      <Collapse in={expanded}>
        <Divider my="md" color="gray.7" />
        
        <Stack gap="md">
          {/* Fecha y día */}
          <Group justify="space-between">
            <Group gap="xs">
              <IconCalendar size={16} color="#94a3b8" />
              <Text size="sm" c="dimmed">{formatDate(simulation.currentTime)}</Text>
              <Badge size="sm" variant="light" color="blue">
                {simulation.dayOfWeek}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Simulación: {simulation.elapsedHours.toFixed(1)}h
            </Text>
          </Group>

          {/* Control de velocidad */}
          <Box>
            <Text size="xs" c="dimmed" mb="xs">Velocidad de Simulación</Text>
            <SegmentedControl
              fullWidth
              value={String(simulation.speed)}
              onChange={(value) => changeSpeed(Number(value))}
              data={[
                { label: '1x', value: '1' },
                { label: '5x', value: '5' },
                { label: '10x', value: '10' },
                { label: '30x', value: '30' },
                { label: '60x', value: '60' },
              ]}
              styles={{
                root: { background: 'rgba(255,255,255,0.1)' },
                label: { color: 'white' },
              }}
            />
          </Box>

          {/* Saltos rápidos */}
          <Box>
            <Text size="xs" c="dimmed" mb="xs">Salto Rápido</Text>
            <Group gap="xs">
              <Button size="xs" variant="light" color="gray" onClick={() => skipTime(-6)}>
                -6h
              </Button>
              <Button size="xs" variant="light" color="gray" onClick={() => skipTime(-1)}>
                -1h
              </Button>
              <Button size="xs" variant="light" color="gray" onClick={() => skipTime(1)}>
                +1h
              </Button>
              <Button size="xs" variant="light" color="gray" onClick={() => skipTime(6)}>
                +6h
              </Button>
              <Button size="xs" variant="light" color="gray" onClick={() => skipTime(24)}>
                +1 día
              </Button>
            </Group>
          </Box>

          {/* Indicadores de contexto */}
          <Box>
            <Text size="xs" c="dimmed" mb="xs">Contexto Actual</Text>
            <Group gap="xs">
              <Badge
                leftSection={getTimeIcon()}
                variant="light"
                color={simulation.timeOfDay === 'night' ? 'blue' : 'yellow'}
              >
                {simulation.timeOfDay === 'morning' ? 'Mañana' :
                 simulation.timeOfDay === 'afternoon' ? 'Tarde' :
                 simulation.timeOfDay === 'evening' ? 'Noche temprana' : 'Noche'}
              </Badge>
              {simulation.currentTime.getDay() === 0 || simulation.currentTime.getDay() === 6 ? (
                <Badge variant="light" color="violet">Fin de semana</Badge>
              ) : (
                <Badge variant="light" color="green">Día laboral</Badge>
              )}
            </Group>
          </Box>

          {/* Botón reset */}
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={resetSimulation}
          >
            Reiniciar Simulación
          </Button>
        </Stack>
      </Collapse>
    </Paper>
  );
}
