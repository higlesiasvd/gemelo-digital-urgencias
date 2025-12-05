import { useState, useEffect, useCallback } from 'react';
import {
  Paper, Stack, Text, Group, Badge, Card, SimpleGrid, ThemeIcon,
  Progress, Box, Avatar, Button, Modal, Select, NumberInput,
  Table, Divider, RingProgress, Tabs, Alert, TextInput,
  SegmentedControl, ScrollArea, Skeleton,
} from '@mantine/core';
import {
  IconUsers, IconUserPlus, IconUserMinus, IconClock, IconAlertTriangle,
  IconStethoscope, IconNurse, IconFirstAidKit, IconEdit, IconRefresh,
  IconAlertCircle, IconCheck, IconX, IconBell, IconCalendar,
  IconBriefcase, IconActivity, IconPlus, IconSearch,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';
import { notifications } from '@mantine/notifications';
import {
  staffApi, Personal, Turno, SolicitudRefuerzo, ResumenDashboard,
  SolicitudRefuerzoCreate, RolPersonal, TipoTurno, PrioridadRefuerzo,
} from '@/services/staffApi';

const SHIFTS = {
  manana: { label: 'Mañana', color: 'yellow', hours: '07:00 - 15:00', icon: '🌅' },
  tarde: { label: 'Tarde', color: 'orange', hours: '15:00 - 23:00', icon: '🌇' },
  noche: { label: 'Noche', color: 'indigo', hours: '23:00 - 07:00', icon: '🌙' },
  guardia_24h: { label: 'Guardia 24h', color: 'red', hours: '08:00 - 08:00', icon: '⏰' },
};

const ROLES = {
  medico: { label: 'Médico', icon: IconStethoscope, color: 'blue' },
  enfermero: { label: 'Enfermero/a', icon: IconNurse, color: 'green' },
  auxiliar: { label: 'Auxiliar', icon: IconFirstAidKit, color: 'violet' },
  administrativo: { label: 'Administrativo', icon: IconUsers, color: 'gray' },
};

const PRIORIDADES = {
  baja: { label: 'Baja', color: 'gray' },
  media: { label: 'Media', color: 'blue' },
  alta: { label: 'Alta', color: 'yellow' },
  urgente: { label: 'Urgente', color: 'orange' },
  critica: { label: 'Crítica', color: 'red' },
};

const MOTIVOS = [
  { value: 'alta_demanda_predicha', label: 'Alta demanda predicha' },
  { value: 'emergencia_masiva', label: 'Emergencia masiva' },
  { value: 'baja_inesperada', label: 'Baja inesperada' },
  { value: 'evento_especial', label: 'Evento especial' },
  { value: 'cobertura_vacaciones', label: 'Cobertura vacaciones' },
  { value: 'saturacion_actual', label: 'Saturación actual' },
];

const HOSPITALES = [
  { value: 'all', label: 'Todos los hospitales' },
  { value: 'chuac', label: 'CHUAC - Complexo Hospitalario A Coruña' },
  { value: 'modelo', label: 'HM Modelo - A Coruña' },
  { value: 'san_rafael', label: 'Hospital San Rafael - A Coruña' },
];

export function StaffManagement() {
  const [activeTab, setActiveTab] = useState<string | null>('dashboard');
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudRefuerzo[]>([]);

  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [selectedRol, setSelectedRol] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [solicitudModalOpen, setSolicitudModalOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [staffReduction, setStaffReduction] = useState(0);
  const [simulatingChange, setSimulatingChange] = useState(false);

  const [newSolicitud, setNewSolicitud] = useState<Partial<SolicitudRefuerzoCreate>>({
    hospital_id: 'chuac',
    turno_necesario: 'manana',
    rol_requerido: 'medico',
    cantidad_personal: 1,
    prioridad: 'media',
    motivo: 'alta_demanda_predicha',
  });

  const { publishMessage } = useHospitalStore();

  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        await staffApi.healthCheck();
        setApiConnected(true);
      } catch {
        setApiConnected(false);
      }
    };
    checkApiConnection();
  }, []);

  useEffect(() => {
    if (apiConnected) loadAllData();
  }, [apiConnected]);

  useEffect(() => {
    if (!apiConnected) return;
    const interval = setInterval(() => loadSolicitudes(), 30000);
    return () => clearInterval(interval);
  }, [apiConnected]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadResumen(), loadPersonal(), loadTurnos(), loadSolicitudes()]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResumen = async () => {
    try {
      const data = await staffApi.getResumenDashboard();
      setResumen(data);
    } catch (err) { console.error('Error loading resumen:', err); }
  };

  const loadPersonal = async () => {
    try {
      const params: { hospital?: string; rol?: RolPersonal } = {};
      if (selectedHospital !== 'all') params.hospital = selectedHospital;
      if (selectedRol !== 'all') params.rol = selectedRol as RolPersonal;
      const data = await staffApi.getPersonal(params);
      setPersonal(data);
    } catch (err) { console.error('Error loading personal:', err); }
  };

  const loadTurnos = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const params: { hospital?: string; fecha?: string } = { fecha: today };
      if (selectedHospital !== 'all') params.hospital = selectedHospital;
      const data = await staffApi.getTurnos(params);
      setTurnos(data);
    } catch (err) { console.error('Error loading turnos:', err); }
  };

  const loadSolicitudes = async () => {
    try {
      const params: { hospital?: string } = {};
      if (selectedHospital !== 'all') params.hospital = selectedHospital;
      const data = await staffApi.getSolicitudesRefuerzo(params);
      setSolicitudes(data);
    } catch (err) { console.error('Error loading solicitudes:', err); }
  };

  useEffect(() => {
    if (apiConnected) {
      loadPersonal();
      loadTurnos();
      loadSolicitudes();
    }
  }, [selectedHospital, selectedRol, apiConnected]);

  const handleCreateSolicitud = async () => {
    if (!newSolicitud.hospital_id || !newSolicitud.rol_requerido) {
      notifications.show({ title: 'Error', message: 'Complete todos los campos requeridos', color: 'red' });
      return;
    }
    try {
      const fechaNecesidad = new Date();
      fechaNecesidad.setDate(fechaNecesidad.getDate() + 1);
      await staffApi.createSolicitudRefuerzo({
        hospital_id: newSolicitud.hospital_id,
        fecha_necesidad: fechaNecesidad.toISOString().split('T')[0],
        turno_necesario: newSolicitud.turno_necesario || 'manana',
        rol_requerido: newSolicitud.rol_requerido,
        cantidad_personal: newSolicitud.cantidad_personal || 1,
        prioridad: newSolicitud.prioridad || 'media',
        motivo: newSolicitud.motivo || 'alta_demanda_predicha',
      });
      notifications.show({ title: '✅ Solicitud Creada', message: 'La solicitud ha sido registrada', color: 'green' });
      setSolicitudModalOpen(false);
      setNewSolicitud({ hospital_id: 'chuac', turno_necesario: 'manana', rol_requerido: 'medico', cantidad_personal: 1, prioridad: 'media', motivo: '' });
      loadSolicitudes();
    } catch {
      notifications.show({ title: 'Error', message: 'No se pudo crear la solicitud', color: 'red' });
    }
  };

  const handleResponderSolicitud = async (solicitudId: string, aprobar: boolean) => {
    try {
      await staffApi.responderSolicitud(solicitudId, {
        estado: aprobar ? 'aprobada' : 'rechazada',
        notas_respuesta: aprobar ? 'Aprobado por coordinador' : 'Rechazado - recursos insuficientes',
      });
      notifications.show({
        title: aprobar ? '✅ Aprobada' : '❌ Rechazada',
        message: aprobar ? 'Personal asignado' : 'Solicitud rechazada',
        color: aprobar ? 'green' : 'orange',
      });
      loadSolicitudes();
      loadResumen();
    } catch {
      notifications.show({ title: 'Error', message: 'No se pudo procesar la solicitud', color: 'red' });
    }
  };

  const simulateStaffChange = async () => {
    setSimulatingChange(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (publishMessage) {
      publishMessage('simulador/staff', {
        action: 'reduce', reduction: staffReduction / 100, hospital: selectedHospital, timestamp: new Date().toISOString(),
      });
    }
    notifications.show({ title: '👥 Cambio Aplicado', message: `Reducción de ${staffReduction}% simulada`, color: 'blue' });
    setSimulatingChange(false);
    setSimulationModalOpen(false);
  };

  const getCurrentShift = (): TipoTurno => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 15) return 'manana';
    if (hour >= 15 && hour < 23) return 'tarde';
    return 'noche';
  };

  const currentShift = getCurrentShift();
  const filteredPersonal = personal.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.nombre.toLowerCase().includes(query) || p.apellidos.toLowerCase().includes(query) || p.numero_empleado.toLowerCase().includes(query);
  });
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');

  if (apiConnected === false) {
    return (
      <Paper shadow="sm" radius="lg" p="lg" withBorder>
        <Alert icon={<IconAlertCircle size={16} />} title="API no disponible" color="orange" variant="light">
          <Stack gap="sm">
            <Text size="sm">No se puede conectar con el servicio de gestión de personal (http://localhost:8000)</Text>
            <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={() => window.location.reload()}>Reintentar</Button>
          </Stack>
        </Alert>
        <Divider my="md" label="Modo sin conexión" />
        <StaffManagementOffline selectedHospital={selectedHospital} setSelectedHospital={setSelectedHospital} />
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}><IconUsers size={20} /></ThemeIcon>
          <Box>
            <Text fw={600} size="lg">Gestión de Personal</Text>
            <Text size="xs" c="dimmed">Turnos, disponibilidad y refuerzos</Text>
          </Box>
        </Group>
        <Group gap="xs">
          {solicitudesPendientes.length > 0 && (
            <Badge size="lg" variant="filled" color="red" leftSection={<IconBell size={12} />}>{solicitudesPendientes.length} pendientes</Badge>
          )}
          <Badge size="lg" variant="light" color={SHIFTS[currentShift].color} leftSection={<IconClock size={12} />}>Turno {SHIFTS[currentShift].label}</Badge>
          <Badge size="sm" variant="dot" color={apiConnected ? 'green' : 'red'}>{apiConnected ? 'Conectado' : 'Desconectado'}</Badge>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="dashboard" leftSection={<IconActivity size={14} />}>Dashboard</Tabs.Tab>
          <Tabs.Tab value="personal" leftSection={<IconUsers size={14} />}>Personal</Tabs.Tab>
          <Tabs.Tab value="turnos" leftSection={<IconCalendar size={14} />}>Turnos</Tabs.Tab>
          <Tabs.Tab value="solicitudes" leftSection={<IconBriefcase size={14} />} rightSection={solicitudesPendientes.length > 0 && <Badge size="xs" color="red" circle>{solicitudesPendientes.length}</Badge>}>Solicitudes</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard"><DashboardPanel resumen={resumen} loading={loading} onRefresh={loadAllData} /></Tabs.Panel>
        <Tabs.Panel value="personal"><PersonalPanel personal={filteredPersonal} loading={loading} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedHospital={selectedHospital} setSelectedHospital={setSelectedHospital} selectedRol={selectedRol} setSelectedRol={setSelectedRol} onSimulation={() => setSimulationModalOpen(true)} /></Tabs.Panel>
        <Tabs.Panel value="turnos"><TurnosPanel turnos={turnos} personal={personal} loading={loading} currentShift={currentShift} /></Tabs.Panel>
        <Tabs.Panel value="solicitudes"><SolicitudesPanel solicitudes={solicitudes} loading={loading} onNewSolicitud={() => setSolicitudModalOpen(true)} onResponder={handleResponderSolicitud} /></Tabs.Panel>
      </Tabs>

      <Modal opened={solicitudModalOpen} onClose={() => setSolicitudModalOpen(false)} title={<Group gap="sm"><IconUserPlus size={20} /><Text fw={600}>Nueva Solicitud de Refuerzo</Text></Group>} size="lg">
        <Stack gap="md">
          <Select label="Hospital" placeholder="Selecciona un hospital" required data={HOSPITALES.filter(h => h.value !== 'all')} value={newSolicitud.hospital_id} onChange={(value) => setNewSolicitud(prev => ({ ...prev, hospital_id: value || '' }))} />
          <Group grow>
            <Select label="Turno Necesario" data={Object.entries(SHIFTS).map(([value, config]) => ({ value, label: `${config.icon} ${config.label}` }))} value={newSolicitud.turno_necesario} onChange={(value) => setNewSolicitud(prev => ({ ...prev, turno_necesario: value || 'manana' }))} />
            <NumberInput label="Cantidad de Personal" min={1} max={20} value={newSolicitud.cantidad_personal} onChange={(value) => setNewSolicitud(prev => ({ ...prev, cantidad_personal: Number(value) || 1 }))} />
          </Group>
          <Select label="Rol Requerido" placeholder="Selecciona el rol" required data={Object.entries(ROLES).map(([value, config]) => ({ value, label: config.label }))} value={newSolicitud.rol_requerido} onChange={(value) => setNewSolicitud(prev => ({ ...prev, rol_requerido: value as RolPersonal || 'medico' }))} />
          <Select label="Prioridad" data={Object.entries(PRIORIDADES).map(([value, config]) => ({ value, label: config.label }))} value={newSolicitud.prioridad} onChange={(value) => setNewSolicitud(prev => ({ ...prev, prioridad: value as PrioridadRefuerzo || 'media' }))} />
          <Select label="Motivo de la Solicitud" placeholder="Selecciona el motivo" required data={MOTIVOS} value={newSolicitud.motivo} onChange={(value) => setNewSolicitud(prev => ({ ...prev, motivo: value || 'alta_demanda_predicha' }))} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setSolicitudModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" gradient={{ from: 'teal', to: 'cyan' }} leftSection={<IconPlus size={16} />} onClick={handleCreateSolicitud}>Crear Solicitud</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={simulationModalOpen} onClose={() => setSimulationModalOpen(false)} title={<Group gap="sm"><IconUsers size={20} /><Text fw={600}>Simular Cambio de Personal</Text></Group>}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">Simula el impacto de una reducción de personal en el sistema de urgencias.</Text>
          <NumberInput label="Porcentaje de Reducción" description="Simular bajas o huelga parcial" value={staffReduction} onChange={(value) => setStaffReduction(Number(value) || 0)} min={0} max={50} suffix="%" />
          {staffReduction > 0 && (
            <Card withBorder p="sm" bg="orange.0">
              <Group gap="xs"><IconAlertTriangle size={16} color="#fd7e14" /><Text size="sm">Una reducción del {staffReduction}% afectará los tiempos de espera aproximadamente un +{Math.round(staffReduction * 1.5)}%</Text></Group>
            </Card>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setSimulationModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" gradient={{ from: 'orange', to: 'red' }} leftSection={<IconRefresh size={16} />} onClick={simulateStaffChange} loading={simulatingChange} disabled={staffReduction === 0}>Aplicar Simulación</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}

interface DashboardPanelProps {
  resumen: ResumenDashboard | null;
  loading: boolean;
  onRefresh: () => void;
}

function DashboardPanel({ resumen, loading, onRefresh }: DashboardPanelProps) {
  if (loading || !resumen) {
    return (
      <Stack gap="md">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={100} radius="md" />)}
        </SimpleGrid>
        <Skeleton height={200} radius="md" />
      </Stack>
    );
  }

  const availabilityRate = resumen.total_personal > 0 ? (resumen.activos_hoy / resumen.total_personal) * 100 : 0;

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Box><Text size="xs" c="dimmed">Total Personal</Text><Text size="xl" fw={700}>{resumen.total_personal}</Text></Box>
            <ThemeIcon size="lg" variant="light" color="blue"><IconUsers size={20} /></ThemeIcon>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Box><Text size="xs" c="dimmed">En Turno Actual</Text><Text size="xl" fw={700} c="green">{resumen.en_turno_actual}</Text></Box>
            <ThemeIcon size="lg" variant="light" color="green"><IconClock size={20} /></ThemeIcon>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Box><Text size="xs" c="dimmed">De Baja / Vacaciones</Text><Text size="xl" fw={700} c="red">{resumen.de_baja + resumen.de_vacaciones}</Text></Box>
            <ThemeIcon size="lg" variant="light" color="red"><IconUserMinus size={20} /></ThemeIcon>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Box><Text size="xs" c="dimmed">Solicitudes Pendientes</Text><Text size="xl" fw={700} c={resumen.solicitudes_pendientes > 0 ? 'orange' : 'gray'}>{resumen.solicitudes_pendientes}</Text></Box>
            <ThemeIcon size="lg" variant="light" color="orange"><IconBell size={20} /></ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Disponibilidad Global</Text>
          <Button size="xs" variant="subtle" leftSection={<IconRefresh size={14} />} onClick={onRefresh}>Actualizar</Button>
        </Group>
        <Group justify="space-between">
          <Box>
            <Group gap="xs" align="baseline">
              <Text size="xl" fw={700}>{resumen.activos_hoy}</Text>
              <Text size="sm" c="dimmed">/ {resumen.total_personal} activos hoy</Text>
            </Group>
          </Box>
          <RingProgress size={100} thickness={10} roundCaps sections={[{ value: availabilityRate, color: availabilityRate > 70 ? 'teal' : availabilityRate > 50 ? 'yellow' : 'red' }]} label={<Text size="sm" fw={700} ta="center">{Math.round(availabilityRate)}%</Text>} />
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
        {Object.entries(resumen.por_hospital || {}).map(([hospital, stats]) => (
          <Card key={hospital} withBorder p="sm" radius="md">
            <Text size="sm" fw={600} mb="xs">{hospital === 'chuac' ? 'CHUAC' : hospital === 'hm_modelo' ? 'HM Modelo' : 'San Rafael'}</Text>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">En turno: {stats.en_turno}</Text>
              <Text size="xs" c="dimmed">Total: {stats.total}</Text>
            </Group>
            <Progress value={(stats.en_turno / Math.max(stats.total, 1)) * 100} size="sm" mt="xs" color="teal" />
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder p="md" radius="md">
        <Text fw={600} mb="md">Distribución por Rol</Text>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
          {Object.entries(resumen.por_rol || {}).map(([rol, count]) => {
            const roleConfig = ROLES[rol as keyof typeof ROLES] || { label: rol, color: 'gray', icon: IconUsers };
            const Icon = roleConfig.icon;
            return (
              <Group key={rol} gap="xs">
                <ThemeIcon size="sm" variant="light" color={roleConfig.color}><Icon size={14} /></ThemeIcon>
                <Box><Text size="xs">{roleConfig.label}</Text><Text size="sm" fw={700}>{count}</Text></Box>
              </Group>
            );
          })}
        </SimpleGrid>
      </Card>
    </Stack>
  );
}

interface PersonalPanelProps {
  personal: Personal[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedHospital: string;
  setSelectedHospital: (hospital: string) => void;
  selectedRol: string;
  setSelectedRol: (rol: string) => void;
  onSimulation: () => void;
}

function PersonalPanel({ personal, loading, searchQuery, setSearchQuery, selectedHospital, setSelectedHospital, selectedRol, setSelectedRol, onSimulation }: PersonalPanelProps) {
  return (
    <Stack gap="md">
      <Group gap="md">
        <TextInput size="xs" placeholder="Buscar por nombre o número..." leftSection={<IconSearch size={14} />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, maxWidth: 250 }} />
        <Select size="xs" placeholder="Hospital" value={selectedHospital} onChange={(value) => setSelectedHospital(value || 'all')} data={HOSPITALES} style={{ width: 180 }} />
        <Select size="xs" placeholder="Rol" value={selectedRol} onChange={(value) => setSelectedRol(value || 'all')} data={[{ value: 'all', label: 'Todos los roles' }, ...Object.entries(ROLES).map(([value, config]) => ({ value, label: config.label }))]} style={{ width: 150 }} />
        <Button size="xs" variant="light" leftSection={<IconEdit size={14} />} onClick={onSimulation}>Simular Cambio</Button>
      </Group>

      <ScrollArea h={400}>
        {loading ? (
          <Stack gap="sm">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={50} />)}</Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Empleado</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th>Hospital</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Guardias</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {personal.map(member => {
                const roleConfig = ROLES[member.rol] || { label: member.rol, color: 'gray', icon: IconUsers };
                const RoleIcon = roleConfig.icon;
                return (
                  <Table.Tr key={member.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Avatar size="sm" color={roleConfig.color} radius="xl"><RoleIcon size={14} /></Avatar>
                        <Box>
                          <Text size="sm">{member.nombre} {member.apellidos}</Text>
                          <Text size="xs" c="dimmed">{member.numero_empleado}</Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td><Badge size="xs" variant="light" color={roleConfig.color}>{roleConfig.label}</Badge></Table.Td>
                    <Table.Td><Text size="xs">{member.hospital_asignado === 'chuac' ? 'CHUAC' : member.hospital_asignado === 'hm_modelo' ? 'HM Modelo' : 'San Rafael'}</Text></Table.Td>
                    <Table.Td><Badge size="xs" color={member.activo ? 'green' : 'red'}>{member.activo ? 'Activo' : 'Inactivo'}</Badge></Table.Td>
                    <Table.Td>{member.puede_hacer_guardias && <Badge size="xs" variant="outline" color="violet">Guardias</Badge>}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </ScrollArea>
      <Text size="xs" c="dimmed" ta="center">Mostrando {personal.length} empleados</Text>
    </Stack>
  );
}

interface TurnosPanelProps {
  turnos: Turno[];
  personal: Personal[];
  loading: boolean;
  currentShift: TipoTurno;
}

function TurnosPanel({ turnos, personal, loading, currentShift }: TurnosPanelProps) {
  const getPersonalName = (personalId: string) => {
    const p = personal.find(m => m.id === personalId);
    return p ? `${p.nombre} ${p.apellidos}` : 'Desconocido';
  };

  const turnosByShift: Record<string, Turno[]> = {
    manana: turnos.filter(t => t.tipo_turno === 'manana'),
    tarde: turnos.filter(t => t.tipo_turno === 'tarde'),
    noche: turnos.filter(t => t.tipo_turno === 'noche'),
  };

  const currentShiftKey = currentShift === 'guardia_24h' ? 'manana' : currentShift;

  return (
    <Stack gap="md">
      <Card withBorder p="md" radius="md" bg={`${SHIFTS[currentShift].color}.0`}>
        <Group gap="sm">
          <Text size="lg">{SHIFTS[currentShift].icon}</Text>
          <Box>
            <Text fw={600}>Turno Actual: {SHIFTS[currentShift].label}</Text>
            <Text size="xs" c="dimmed">{SHIFTS[currentShift].hours}</Text>
          </Box>
          <Badge ml="auto" color={SHIFTS[currentShift].color}>{turnosByShift[currentShiftKey]?.length || 0} en turno</Badge>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {Object.entries(turnosByShift).map(([shift, shiftTurnos]) => (
          <Card key={shift} withBorder p="sm" radius="md">
            <Group mb="sm">
              <Text fw={600}>{SHIFTS[shift as keyof typeof SHIFTS]?.icon} {SHIFTS[shift as keyof typeof SHIFTS]?.label}</Text>
              <Badge size="sm" color={SHIFTS[shift as keyof typeof SHIFTS]?.color}>{shiftTurnos.length}</Badge>
            </Group>
            {loading ? (
              <Stack gap="xs">{[1, 2, 3].map(i => <Skeleton key={i} height={30} />)}</Stack>
            ) : shiftTurnos.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="sm">Sin turnos asignados</Text>
            ) : (
              <Stack gap="xs">
                {shiftTurnos.slice(0, 5).map(turno => (
                  <Group key={turno.id} justify="space-between">
                    <Text size="xs">{getPersonalName(turno.personal_id)}</Text>
                    {turno.es_guardia && <Badge size="xs" variant="outline" color="red">Guardia</Badge>}
                  </Group>
                ))}
                {shiftTurnos.length > 5 && <Text size="xs" c="dimmed" ta="center">+{shiftTurnos.length - 5} más</Text>}
              </Stack>
            )}
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

interface SolicitudesPanelProps {
  solicitudes: SolicitudRefuerzo[];
  loading: boolean;
  onNewSolicitud: () => void;
  onResponder: (id: string, aprobar: boolean) => void;
}

function SolicitudesPanel({ solicitudes, loading, onNewSolicitud, onResponder }: SolicitudesPanelProps) {
  const [filter, setFilter] = useState<string>('todas');

  const filteredSolicitudes = solicitudes.filter(s => {
    if (filter === 'todas') return true;
    if (filter === 'pendientes') return s.estado === 'pendiente';
    if (filter === 'aprobadas') return s.estado === 'aprobada';
    if (filter === 'rechazadas') return s.estado === 'rechazada';
    return true;
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <SegmentedControl size="xs" value={filter} onChange={setFilter} data={[
          { value: 'todas', label: 'Todas' },
          { value: 'pendientes', label: 'Pendientes' },
          { value: 'aprobadas', label: 'Aprobadas' },
          { value: 'rechazadas', label: 'Rechazadas' },
        ]} />
        <Button size="xs" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }} leftSection={<IconPlus size={14} />} onClick={onNewSolicitud}>Nueva Solicitud</Button>
      </Group>

      {loading ? (
        <Stack gap="sm">{[1, 2, 3].map(i => <Skeleton key={i} height={100} />)}</Stack>
      ) : filteredSolicitudes.length === 0 ? (
        <Card withBorder p="xl" radius="md"><Text ta="center" c="dimmed">No hay solicitudes {filter !== 'todas' ? filter : ''}</Text></Card>
      ) : (
        <Stack gap="sm">
          {filteredSolicitudes.map(solicitud => {
            const hospitalLabel = HOSPITALES.find(h => h.value === solicitud.hospital_id)?.label || solicitud.hospital_id;
            return (
            <Card key={solicitud.id} withBorder p="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Badge color={PRIORIDADES[solicitud.prioridad]?.color || 'gray'}>{PRIORIDADES[solicitud.prioridad]?.label || solicitud.prioridad}</Badge>
                  <Text size="sm" fw={600}>{hospitalLabel}</Text>
                </Group>
                <Badge color={solicitud.estado === 'pendiente' ? 'yellow' : solicitud.estado === 'aprobada' ? 'green' : 'red'}>{solicitud.estado}</Badge>
              </Group>

              <Text size="sm" mb="sm">{solicitud.motivo}</Text>

              <Group gap="xs" mb="sm">
                <Badge size="xs" variant="outline">{SHIFTS[solicitud.turno_necesario as keyof typeof SHIFTS]?.label || solicitud.turno_necesario}</Badge>
                <Badge size="xs" variant="outline">{solicitud.cantidad_personal} persona(s)</Badge>
                <Badge size="xs" variant="light" color={ROLES[solicitud.rol_requerido]?.color || 'gray'}>{ROLES[solicitud.rol_requerido]?.label || solicitud.rol_requerido}</Badge>
              </Group>

              {solicitud.saturacion_predicha && (
                <Group gap="xs" mb="sm">
                  <Text size="xs" c="dimmed">Saturación predicha:</Text>
                  <Progress value={solicitud.saturacion_predicha * 100} size="sm" color={solicitud.saturacion_predicha > 0.9 ? 'red' : solicitud.saturacion_predicha > 0.75 ? 'orange' : 'green'} style={{ flex: 1 }} />
                  <Text size="xs">{Math.round(solicitud.saturacion_predicha * 100)}%</Text>
                </Group>
              )}

              {solicitud.estado === 'pendiente' && (
                <Group justify="flex-end" gap="xs">
                  <Button size="xs" variant="light" color="red" leftSection={<IconX size={14} />} onClick={() => onResponder(solicitud.id, false)}>Rechazar</Button>
                  <Button size="xs" variant="filled" color="green" leftSection={<IconCheck size={14} />} onClick={() => onResponder(solicitud.id, true)}>Aprobar</Button>
                </Group>
              )}

              <Text size="xs" c="dimmed" mt="sm">Creado: {solicitud.created_at ? new Date(solicitud.created_at).toLocaleString('es-ES') : 'Desconocido'}</Text>
            </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

interface StaffManagementOfflineProps {
  selectedHospital: string;
  setSelectedHospital: (hospital: string) => void;
}

function StaffManagementOffline({ selectedHospital, setSelectedHospital }: StaffManagementOfflineProps) {
  const mockStaff = [
    { id: '1', name: 'Dr. García López', role: 'medico', hospital: 'chuac', status: 'active' },
    { id: '2', name: 'Enf. González Vázquez', role: 'enfermero', hospital: 'chuac', status: 'active' },
    { id: '3', name: 'Dr. Suárez Neira', role: 'medico', hospital: 'chus', status: 'break' },
    { id: '4', name: 'Aux. Insua Porto', role: 'auxiliar', hospital: 'povisa', status: 'active' },
    { id: '5', name: 'Enf. Fidalgo Nogueira', role: 'enfermero', hospital: 'chuo', status: 'active' },
  ];

  const filteredStaff = selectedHospital === 'all' ? mockStaff : mockStaff.filter(s => s.hospital === selectedHospital);

  return (
    <Stack gap="md">
      <Select size="xs" placeholder="Hospital" value={selectedHospital} onChange={(value) => setSelectedHospital(value || 'all')} data={HOSPITALES} style={{ width: 180 }} />
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        {filteredStaff.map(member => {
          const roleConfig = ROLES[member.role as keyof typeof ROLES] || { label: member.role, color: 'gray', icon: IconUsers };
          const RoleIcon = roleConfig.icon;
          return (
            <Card key={member.id} withBorder p="sm" radius="md">
              <Group gap="xs" mb="xs">
                <Avatar size="sm" color={roleConfig.color} radius="xl"><RoleIcon size={14} /></Avatar>
                <Text size="sm" fw={500}>{member.name}</Text>
              </Group>
              <Badge size="xs" color={member.status === 'active' ? 'green' : member.status === 'break' ? 'yellow' : 'red'}>
                {member.status === 'active' ? 'Activo' : member.status === 'break' ? 'Descanso' : 'Baja'}
              </Badge>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
