import { useState, useMemo } from 'react';
import { 
  Paper, Text, Group, Badge, Stack, Card, Title, 
  SimpleGrid, ThemeIcon, Box, ScrollArea, Divider,
  ActionIcon, Tooltip
} from '@mantine/core';
import { 
  IconChevronLeft, IconChevronRight, IconBallFootball, 
  IconMusic, IconConfetti, IconRun, IconCalendarEvent,
  IconMapPin, IconUsers, IconTrendingUp
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/es';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.locale('es');

interface EventData {
  nombre: string;
  fecha: string;
  tipo: string;
  ubicacion?: string;
  asistentes?: number;
  factorDemanda?: number;
  local?: string;
  visitante?: string;
  esLocal?: boolean;
  estadio?: string;
}

interface EventCalendarProps {
  partidos: EventData[];
  eventos: EventData[];
}

export function EventCalendar({ partidos, eventos }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  // Combinar partidos y eventos
  const allEvents = useMemo(() => [
    ...partidos.filter(p => p.esLocal).map(p => ({ ...p, tipo: 'futbol' })),
    ...eventos
  ], [partidos, eventos]);

  // Organizar eventos por día
  const eventsByDate = useMemo(() => {
    const result: Record<string, EventData[]> = {};
    allEvents.forEach(event => {
      const dateKey = dayjs(event.fecha, 'DD/MM/YYYY').format('YYYY-MM-DD');
      if (!result[dateKey]) {
        result[dateKey] = [];
      }
      result[dateKey].push(event);
    });
    return result;
  }, [allEvents]);

  // Generar días del mes
  const days = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDate = startOfMonth.startOf('isoWeek');
    const endDate = endOfMonth.endOf('isoWeek');

    const result: dayjs.Dayjs[] = [];
    let day = startDate;
    while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
      result.push(day);
      day = day.add(1, 'day');
    }
    return result;
  }, [currentMonth]);

  // Eventos del día seleccionado
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDate.format('YYYY-MM-DD')] || [];
  }, [selectedDate, eventsByDate]);

  const getEventIcon = (tipo: string, size = 16) => {
    if (tipo === 'futbol') return <IconBallFootball size={size} />;
    if (tipo === 'deportivo') return <IconRun size={size} />;
    if (tipo === 'musical') return <IconMusic size={size} />;
    if (tipo === 'festivo') return <IconConfetti size={size} />;
    return <IconCalendarEvent size={size} />;
  };

  const getEventColor = (tipo: string) => {
    if (tipo === 'futbol') return 'green';
    if (tipo === 'deportivo') return 'blue';
    if (tipo === 'musical') return 'grape';
    if (tipo === 'festivo') return 'pink';
    return 'orange';
  };

  const getEventName = (event: EventData) => {
    if (event.tipo === 'futbol') {
      return `${event.local} vs ${event.visitante}`;
    }
    return event.nombre;
  };

  return (
    <Box style={{ display: 'flex', gap: '16px', height: '100%' }}>
      {/* Calendario compacto a la izquierda */}
      <Paper p="md" withBorder style={{ flex: '0 0 320px' }}>
        <Stack gap="sm">
          {/* Navegación del mes */}
          <Group justify="space-between">
            <ActionIcon 
              variant="subtle" 
              onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text fw={600} size="sm">
              {currentMonth.format('MMMM YYYY').charAt(0).toUpperCase() + 
               currentMonth.format('MMMM YYYY').slice(1)}
            </Text>
            <ActionIcon 
              variant="subtle" 
              onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>

          {/* Días de la semana */}
          <SimpleGrid cols={7} spacing={4}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => (
              <Text key={dia} size="xs" fw={600} ta="center" c="dimmed">
                {dia}
              </Text>
            ))}
          </SimpleGrid>

          {/* Días del calendario */}
          <SimpleGrid cols={7} spacing={4}>
            {days.map((day) => {
              const dateKey = day.format('YYYY-MM-DD');
              const dayEvents = eventsByDate[dateKey] || [];
              const isCurrentMonth = day.month() === currentMonth.month();
              const isToday = day.isSame(dayjs(), 'day');
              const isSelected = day.isSame(selectedDate, 'day');
              const hasEvents = dayEvents.length > 0;

              return (
                <Tooltip 
                  key={dateKey}
                  label={hasEvents ? `${dayEvents.length} evento(s)` : ''}
                  disabled={!hasEvents}
                >
                  <Paper
                    p={4}
                    style={{
                      cursor: 'pointer',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      backgroundColor: isSelected 
                        ? 'var(--mantine-color-blue-6)' 
                        : isToday 
                          ? 'var(--mantine-color-blue-1)' 
                          : hasEvents 
                            ? 'var(--mantine-color-gray-1)'
                            : undefined,
                      borderRadius: '4px',
                      position: 'relative',
                    }}
                    onClick={() => setSelectedDate(day)}
                  >
                    <Text 
                      size="xs" 
                      ta="center"
                      fw={isToday || isSelected ? 700 : 400}
                      c={isSelected ? 'white' : undefined}
                    >
                      {day.date()}
                    </Text>
                    {hasEvents && (
                      <Box
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: 2,
                        }}
                      >
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <Box
                            key={idx}
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              backgroundColor: `var(--mantine-color-${getEventColor(event.tipo)}-5)`,
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Tooltip>
              );
            })}
          </SimpleGrid>

          {/* Leyenda */}
          <Divider my="xs" />
          <Group gap="xs" justify="center">
            <Badge size="xs" color="green" variant="dot">Fútbol</Badge>
            <Badge size="xs" color="grape" variant="dot">Musical</Badge>
            <Badge size="xs" color="pink" variant="dot">Festivo</Badge>
          </Group>
        </Stack>
      </Paper>

      {/* Lista de eventos del día seleccionado */}
      <Paper p="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>
                {selectedDate.format('dddd, D [de] MMMM').charAt(0).toUpperCase() + 
                 selectedDate.format('dddd, D [de] MMMM').slice(1)}
              </Title>
              <Text size="xs" c="dimmed">
                {selectedDayEvents.length === 0 
                  ? 'Sin eventos programados' 
                  : `${selectedDayEvents.length} evento(s)`}
              </Text>
            </div>
          </Group>
          {selectedDate.isSame(dayjs(), 'day') && (
            <Badge color="blue" variant="light">Hoy</Badge>
          )}
        </Group>

        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
          {selectedDayEvents.length === 0 ? (
            <Paper 
              p="xl" 
              withBorder 
              style={{ 
                textAlign: 'center',
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <IconCalendarEvent size={48} style={{ opacity: 0.3 }} />
              <Text c="dimmed" mt="md">
                No hay eventos para este día
              </Text>
              <Text size="xs" c="dimmed">
                Selecciona otro día en el calendario
              </Text>
            </Paper>
          ) : (
            <Stack gap="sm">
              {selectedDayEvents.map((event, idx) => (
                <Card 
                  key={idx} 
                  padding="md" 
                  radius="md" 
                  withBorder
                  style={{
                    borderLeft: `4px solid var(--mantine-color-${getEventColor(event.tipo)}-5)`,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" mb="sm">
                    <Group gap="sm">
                      <ThemeIcon 
                        size="lg" 
                        color={getEventColor(event.tipo)} 
                        variant="light"
                        radius="md"
                      >
                        {getEventIcon(event.tipo, 20)}
                      </ThemeIcon>
                      <div>
                        <Text fw={600} size="sm">
                          {getEventName(event)}
                        </Text>
                        <Group gap={4}>
                          <IconMapPin size={12} style={{ opacity: 0.5 }} />
                          <Text size="xs" c="dimmed">
                            {event.tipo === 'futbol' ? event.estadio : event.ubicacion}
                          </Text>
                        </Group>
                      </div>
                    </Group>
                    <Badge color={getEventColor(event.tipo)} variant="light">
                      {event.tipo}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={2} spacing="xs">
                    {event.asistentes && (
                      <Paper p="xs" radius="sm" bg="gray.0">
                        <Group gap={4}>
                          <IconUsers size={14} style={{ opacity: 0.6 }} />
                          <Text size="xs" c="dimmed">Asistentes</Text>
                        </Group>
                        <Text size="sm" fw={600}>
                          {event.asistentes >= 1000
                            ? `${(event.asistentes / 1000).toFixed(1)}k`
                            : event.asistentes.toLocaleString()}
                        </Text>
                      </Paper>
                    )}
                    {event.factorDemanda && (
                      <Paper p="xs" radius="sm" bg="gray.0">
                        <Group gap={4}>
                          <IconTrendingUp size={14} style={{ opacity: 0.6 }} />
                          <Text size="xs" c="dimmed">Impacto Demanda</Text>
                        </Group>
                        <Text size="sm" fw={600} c={event.factorDemanda > 1.3 ? 'red' : 'green'}>
                          x{event.factorDemanda.toFixed(2)}
                        </Text>
                      </Paper>
                    )}
                  </SimpleGrid>
                </Card>
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Paper>
    </Box>
  );
}
