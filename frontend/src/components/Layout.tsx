import { useState } from 'react';
import { AppShell, Burger, Group, Text, NavLink, Badge, Indicator, Button, Modal, Stack, Select, Slider, Box, Alert, SimpleGrid, Card } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconBrain,
  IconMapPin,
  IconActivity,
  IconFlame,
  IconInfoCircle,
  IconMapPinFilled,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useHospitalStore } from '@/store/hospitalStore';
import { notifications } from '@mantine/notifications';
import { Chatbot, ChatbotButton } from './Chatbot';

// Coordenadas de ubicaciones de incidentes
const UBICACIONES_COORDS: Record<string, [number, number]> = {
  'autopista': [43.33, -8.38],
  'riazor': [43.3623, -8.4115],
  'centro': [43.3713, -8.3960],
  'marineda': [43.3480, -8.4200],
};

const incidentTypes = [
  { value: 'ACCIDENTE_TRAFICO', label: '🚗 Accidente de Tráfico' },
  { value: 'INCENDIO', label: '🔥 Incendio en Edificio' },
  { value: 'INTOXICACION_MASIVA', label: '☢️ Intoxicación Alimentaria' },
  { value: 'EVENTO_DEPORTIVO', label: '⚽ Evento Deportivo' },
  { value: 'GRIPE_MASIVA', label: '🦠 Brote de Gripe' },
  { value: 'OLA_CALOR', label: '☀️ Ola de Calor' },
];

const ubicaciones = [
  { value: 'autopista', label: '🛣️ Autopista A6/AP9' },
  { value: 'riazor', label: '⚽ Zona Riazor/Estadio' },
  { value: 'centro', label: '🏙️ Centro de A Coruña' },
  { value: 'marineda', label: '🛒 Marineda City' },
];

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const [incidentModalOpened, setIncidentModalOpened] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('ACCIDENTE_TRAFICO');
  const [selectedLocation, setSelectedLocation] = useState<string>('centro');
  const [numPacientes, setNumPacientes] = useState<number>(15);
  const [simulatingIncident, setSimulatingIncident] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, stats, publishMessage, incidenteActivo, setIncidenteActivo } = useHospitalStore();

  // Calcular alertas basadas en saturación
  const hospitalIds = Object.keys(stats);
  const criticalAlerts = hospitalIds.filter(id => {
    const s = stats[id];
    return s && (s.nivel_saturacion > 0.85 || s.pacientes_en_espera_atencion > 15);
  }).length;

  const navItems = [
    { icon: IconDashboard, label: 'Vista General', path: '/' },
    { icon: IconActivity, label: 'Operacional', path: '/operacional' },
    { icon: IconBrain, label: 'Gemelo Digital & Predicciones', path: '/predicciones' },
    { icon: IconMapPin, label: 'Mapa y Eventos', path: '/mapa', badge: criticalAlerts },
  ];

  const handleSimulateIncident = async () => {
    setSimulatingIncident(true);
    try {
      if (publishMessage) {
        const success = publishMessage('urgencias/coordinador/incidente', {
          tipo_emergencia: selectedIncidentType,
          ubicacion: selectedLocation,
          num_pacientes: numPacientes,
          timestamp: new Date().toISOString(),
        });

        if (success) {
          // Guardar el incidente activo en el store
          setIncidenteActivo({
            tipo: selectedIncidentType,
            ubicacion: selectedLocation,
            ubicacionCoords: UBICACIONES_COORDS[selectedLocation],
            numPacientes: numPacientes,
            timestamp: new Date(),
            distribucion: [],
          });

          notifications.show({
            title: '🚨 Incidente Activado',
            message: `${incidentTypes.find(t => t.value === selectedIncidentType)?.label} en ${ubicaciones.find(u => u.value === selectedLocation)?.label} con ${numPacientes} pacientes`,
            color: 'red',
            autoClose: 8000,
          });
          setIncidentModalOpened(false);
          
          // Navegar al mapa para ver el incidente
          navigate('/mapa');
        } else {
          throw new Error('No conectado a MQTT');
        }
      } else {
        throw new Error('Función MQTT no disponible');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'No se pudo simular el incidente',
        color: 'red',
      });
    } finally {
      setSimulatingIncident(false);
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="xl" fw={700} c="blue">
              🏥 Gemelo Digital Urgencias
            </Text>
          </Group>
          <Group>
            {/* Botón de Simular Incidente - Siempre visible */}
            <Button
              leftSection={<IconFlame size={18} />}
              variant="gradient"
              gradient={{ from: 'red.6', to: 'orange.5', deg: 135 }}
              onClick={() => setIncidentModalOpened(true)}
              size="sm"
              style={{ boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)' }}
            >
              Simular Incidente
            </Button>
            
            <Indicator
              inline
              size={12}
              offset={7}
              position="middle-end"
              color={isConnected ? 'green' : 'red'}
              withBorder
            >
              <Badge
                variant="light"
                color={isConnected ? 'green' : 'red'}
                size="lg"
              >
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </Indicator>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Modal de Simular Incidente */}
      <Modal
        opened={incidentModalOpened}
        onClose={() => setIncidentModalOpened(false)}
        title={<Text fw={600} size="lg">🚨 Simular Incidente de Emergencia</Text>}
        size="lg"
      >
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
            <Text size="sm">
              <strong>Coordinador Inteligente:</strong> Los pacientes se distribuirán automáticamente 
              entre hospitales según proximidad, saturación y capacidad.
            </Text>
          </Alert>

          <Select
            label="Tipo de Incidente"
            placeholder="Selecciona tipo"
            value={selectedIncidentType}
            onChange={(value) => setSelectedIncidentType(value || 'ACCIDENTE_TRAFICO')}
            data={incidentTypes}
            leftSection={<IconFlame size={16} />}
          />

          <Select
            label="Ubicación del Incidente"
            placeholder="Selecciona ubicación"
            value={selectedLocation}
            onChange={(value) => setSelectedLocation(value || 'centro')}
            data={ubicaciones}
            leftSection={<IconMapPinFilled size={16} />}
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
            <Text size="sm" fw={500} mb="xs">📊 Criterios de Distribución</Text>
            <SimpleGrid cols={2} spacing="xs">
              <Badge variant="light" color="blue" size="sm">📍 Distancia (30%)</Badge>
              <Badge variant="light" color="orange" size="sm">📈 Saturación (35%)</Badge>
              <Badge variant="light" color="green" size="sm">⏱️ Tiempo espera (25%)</Badge>
              <Badge variant="light" color="violet" size="sm">🛏️ Capacidad (10%)</Badge>
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

      {/* Indicador de incidente activo */}
      {incidenteActivo && (
        <Box
          style={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            zIndex: 1000,
          }}
        >
          <Card
            shadow="lg"
            padding="sm"
            radius="md"
            withBorder
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
              color: 'white',
              animation: 'pulse 2s infinite',
            }}
          >
            <Group gap="xs">
              <IconFlame size={20} />
              <Box>
                <Text size="xs" fw={700}>INCIDENTE ACTIVO</Text>
                <Text size="xs">{incidentTypes.find(t => t.value === incidenteActivo.tipo)?.label}</Text>
                <Text size="xs">{ubicaciones.find(u => u.value === incidenteActivo.ubicacion)?.label}</Text>
              </Box>
              <Button 
                size="xs" 
                variant="white" 
                color="red"
                onClick={() => setIncidenteActivo(null)}
              >
                ✕
              </Button>
            </Group>
          </Card>
        </Box>
      )}

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              active={location.pathname === item.path}
              label={item.label}
              leftSection={<item.icon size={20} stroke={1.5} />}
              rightSection={
                item.badge && item.badge > 0 ? (
                  <Badge size="sm" color="red" variant="filled">
                    {item.badge}
                  </Badge>
                ) : null
              }
              onClick={() => {
                navigate(item.path);
                if (opened) toggle();
              }}
              style={{ borderRadius: '8px', marginBottom: '4px' }}
            />
          ))}
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed" ta="center">
            Versión 1.0.0
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {/* Chatbot flotante */}
      <Chatbot isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />
      {!chatbotOpen && <ChatbotButton onClick={() => setChatbotOpen(true)} />}
    </AppShell>
  );
}
