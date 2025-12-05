import { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Card,
  SimpleGrid,
  ThemeIcon,
  Progress,
  Box,
  Avatar,
  Tooltip,
  Button,
  Modal,
  Select,
  NumberInput,
  Table,
  Divider,
  ActionIcon,
  RingProgress,
} from '@mantine/core';
import {
  IconUsers,
  IconUserPlus,
  IconUserMinus,
  IconClock,
  IconAlertTriangle,
  IconStethoscope,
  IconNurse,
  IconFirstAidKit,
  IconEdit,
  IconRefresh,
} from '@tabler/icons-react';
import { useHospitalStore } from '@/store/hospitalStore';
import { notifications } from '@mantine/notifications';

interface StaffMember {
  id: string;
  name: string;
  role: 'medico' | 'enfermero' | 'auxiliar' | 'administrativo';
  hospital: string;
  shift: 'morning' | 'afternoon' | 'night';
  status: 'active' | 'break' | 'off' | 'sick';
  startTime: string;
  endTime: string;
}

interface ShiftStats {
  total: number;
  active: number;
  onBreak: number;
  off: number;
  sick: number;
}

const SHIFTS = {
  morning: { label: 'Mañana', color: 'yellow', hours: '07:00 - 15:00' },
  afternoon: { label: 'Tarde', color: 'orange', hours: '15:00 - 23:00' },
  night: { label: 'Noche', color: 'indigo', hours: '23:00 - 07:00' },
};

const ROLES = {
  medico: { label: 'Médico', icon: IconStethoscope, color: 'blue' },
  enfermero: { label: 'Enfermero/a', icon: IconNurse, color: 'green' },
  auxiliar: { label: 'Auxiliar', icon: IconFirstAidKit, color: 'violet' },
  administrativo: { label: 'Administrativo', icon: IconUsers, color: 'gray' },
};

// Generar personal simulado
const generateStaff = (): StaffMember[] => {
  const names = [
    'Dr. García López', 'Dra. Martínez Ruiz', 'Dr. Fernández Vidal',
    'Enf. López Torres', 'Enf. Rodríguez Silva', 'Enf. Pérez Gómez',
    'Aux. Sánchez Díaz', 'Aux. González Paz', 'Adm. Castro Ríos',
    'Dr. Vázquez Blanco', 'Dra. Iglesias Conde', 'Enf. Núñez Rey',
  ];
  
  const hospitals = ['chuac', 'hm_modelo', 'san_rafael'];
  const roles: Array<'medico' | 'enfermero' | 'auxiliar' | 'administrativo'> = 
    ['medico', 'enfermero', 'enfermero', 'auxiliar', 'auxiliar', 'administrativo'];
  const shifts: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night'];
  const statuses: Array<'active' | 'break' | 'off' | 'sick'> = ['active', 'active', 'active', 'break', 'off', 'sick'];
  
  return names.map((name, i) => ({
    id: `staff-${i}`,
    name,
    role: roles[i % roles.length],
    hospital: hospitals[i % hospitals.length],
    shift: shifts[i % shifts.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    startTime: SHIFTS[shifts[i % shifts.length]].hours.split(' - ')[0],
    endTime: SHIFTS[shifts[i % shifts.length]].hours.split(' - ')[1],
  }));
};

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [simulatingChange, setSimulatingChange] = useState(false);
  const [staffReduction, setStaffReduction] = useState(0);
  
  const { publishMessage } = useHospitalStore();

  useEffect(() => {
    setStaff(generateStaff());
  }, []);

  // Filtrar personal
  const filteredStaff = staff.filter(s => {
    if (selectedHospital !== 'all' && s.hospital !== selectedHospital) return false;
    if (selectedShift !== 'all' && s.shift !== selectedShift) return false;
    return true;
  });

  // Calcular estadísticas por rol
  const getStatsForRole = (role: string): ShiftStats => {
    const roleStaff = filteredStaff.filter(s => s.role === role);
    return {
      total: roleStaff.length,
      active: roleStaff.filter(s => s.status === 'active').length,
      onBreak: roleStaff.filter(s => s.status === 'break').length,
      off: roleStaff.filter(s => s.status === 'off').length,
      sick: roleStaff.filter(s => s.status === 'sick').length,
    };
  };

  // Calcular turno actual
  const getCurrentShift = (): 'morning' | 'afternoon' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 15) return 'morning';
    if (hour >= 15 && hour < 23) return 'afternoon';
    return 'night';
  };

  const currentShift = getCurrentShift();

  // Simular cambio de personal
  const simulateStaffChange = async () => {
    setSimulatingChange(true);
    
    // Simular proceso
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (publishMessage) {
      publishMessage('simulador/staff', {
        action: 'reduce',
        reduction: staffReduction / 100,
        hospital: selectedHospital,
        timestamp: new Date().toISOString(),
      });
    }
    
    notifications.show({
      title: '👥 Cambio de Personal Aplicado',
      message: `Reducción de ${staffReduction}% simulada`,
      color: 'blue',
    });
    
    setSimulatingChange(false);
    setModalOpen(false);
  };

  // Cambiar estado de un empleado
  const toggleStaffStatus = (staffId: string) => {
    setStaff(prev => prev.map(s => {
      if (s.id === staffId) {
        const newStatus = s.status === 'active' ? 'sick' : 'active';
        return { ...s, status: newStatus };
      }
      return s;
    }));
  };

  const totalActive = filteredStaff.filter(s => s.status === 'active').length;
  const totalStaff = filteredStaff.length;
  const availabilityRate = totalStaff > 0 ? (totalActive / totalStaff) * 100 : 0;

  return (
    <Paper shadow="sm" radius="lg" p="lg" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}>
            <IconUsers size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={600} size="lg">Gestión de Personal</Text>
            <Text size="xs" c="dimmed">Turnos y disponibilidad</Text>
          </Box>
        </Group>
        
        <Group gap="xs">
          <Badge
            size="lg"
            variant="light"
            color={SHIFTS[currentShift].color}
            leftSection={<IconClock size={12} />}
          >
            Turno {SHIFTS[currentShift].label}
          </Badge>
        </Group>
      </Group>

      {/* Filtros */}
      <Group gap="md" mb="lg">
        <Select
          size="xs"
          placeholder="Hospital"
          value={selectedHospital}
          onChange={(value) => setSelectedHospital(value || 'all')}
          data={[
            { value: 'all', label: 'Todos los hospitales' },
            { value: 'chuac', label: 'CHUAC' },
            { value: 'hm_modelo', label: 'HM Modelo' },
            { value: 'san_rafael', label: 'San Rafael' },
          ]}
          style={{ width: 180 }}
        />
        <Select
          size="xs"
          placeholder="Turno"
          value={selectedShift}
          onChange={(value) => setSelectedShift(value || 'all')}
          data={[
            { value: 'all', label: 'Todos los turnos' },
            { value: 'morning', label: '🌅 Mañana' },
            { value: 'afternoon', label: '🌇 Tarde' },
            { value: 'night', label: '🌙 Noche' },
          ]}
          style={{ width: 150 }}
        />
        <Button
          size="xs"
          variant="light"
          leftSection={<IconEdit size={14} />}
          onClick={() => setModalOpen(true)}
        >
          Simular Cambio
        </Button>
      </Group>

      {/* Resumen de disponibilidad */}
      <Card withBorder p="md" radius="md" mb="md">
        <Group justify="space-between">
          <Box>
            <Text size="xs" c="dimmed">Disponibilidad Global</Text>
            <Group gap="xs" align="baseline">
              <Text size="xl" fw={700}>{totalActive}</Text>
              <Text size="sm" c="dimmed">/ {totalStaff} activos</Text>
            </Group>
          </Box>
          <RingProgress
            size={80}
            thickness={8}
            roundCaps
            sections={[
              { value: availabilityRate, color: availabilityRate > 70 ? 'teal' : availabilityRate > 50 ? 'yellow' : 'red' }
            ]}
            label={
              <Text size="xs" fw={700} ta="center">{Math.round(availabilityRate)}%</Text>
            }
          />
        </Group>
        <Progress.Root size="sm" mt="md">
          <Tooltip label={`Activos: ${filteredStaff.filter(s => s.status === 'active').length}`}>
            <Progress.Section value={(filteredStaff.filter(s => s.status === 'active').length / totalStaff) * 100} color="teal" />
          </Tooltip>
          <Tooltip label={`En descanso: ${filteredStaff.filter(s => s.status === 'break').length}`}>
            <Progress.Section value={(filteredStaff.filter(s => s.status === 'break').length / totalStaff) * 100} color="yellow" />
          </Tooltip>
          <Tooltip label={`Libres: ${filteredStaff.filter(s => s.status === 'off').length}`}>
            <Progress.Section value={(filteredStaff.filter(s => s.status === 'off').length / totalStaff) * 100} color="gray" />
          </Tooltip>
          <Tooltip label={`Bajas: ${filteredStaff.filter(s => s.status === 'sick').length}`}>
            <Progress.Section value={(filteredStaff.filter(s => s.status === 'sick').length / totalStaff) * 100} color="red" />
          </Tooltip>
        </Progress.Root>
        <Group justify="center" gap="lg" mt="xs">
          <Group gap={4}><Box w={8} h={8} bg="teal" style={{ borderRadius: '50%' }} /><Text size="xs">Activo</Text></Group>
          <Group gap={4}><Box w={8} h={8} bg="yellow" style={{ borderRadius: '50%' }} /><Text size="xs">Descanso</Text></Group>
          <Group gap={4}><Box w={8} h={8} bg="gray" style={{ borderRadius: '50%' }} /><Text size="xs">Libre</Text></Group>
          <Group gap={4}><Box w={8} h={8} bg="red" style={{ borderRadius: '50%' }} /><Text size="xs">Baja</Text></Group>
        </Group>
      </Card>

      {/* Estadísticas por rol */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm" mb="md">
        {Object.entries(ROLES).map(([role, config]) => {
          const stats = getStatsForRole(role);
          const Icon = config.icon;
          return (
            <Card key={role} withBorder p="sm" radius="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" radius="xl" color={config.color} variant="light">
                  <Icon size={14} />
                </ThemeIcon>
                <Text size="xs" fw={500}>{config.label}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="lg" fw={700}>{stats.active}</Text>
                <Text size="xs" c="dimmed">/ {stats.total}</Text>
              </Group>
              {stats.sick > 0 && (
                <Badge size="xs" color="red" variant="light" mt="xs">
                  {stats.sick} baja(s)
                </Badge>
              )}
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Lista de personal */}
      <Divider my="md" label="Personal en turno actual" labelPosition="center" />
      
      <Box style={{ maxHeight: 300, overflow: 'auto' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Rol</Table.Th>
              <Table.Th>Hospital</Table.Th>
              <Table.Th>Turno</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acción</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredStaff.filter(s => s.shift === currentShift).slice(0, 6).map(member => {
              const roleConfig = ROLES[member.role];
              const RoleIcon = roleConfig.icon;
              return (
                <Table.Tr key={member.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar size="sm" color={roleConfig.color} radius="xl">
                        <RoleIcon size={14} />
                      </Avatar>
                      <Text size="sm">{member.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="light" color={roleConfig.color}>
                      {roleConfig.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {member.hospital === 'chuac' ? 'CHUAC' : 
                       member.hospital === 'hm_modelo' ? 'HM Modelo' : 'San Rafael'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="outline" color={SHIFTS[member.shift].color}>
                      {member.startTime} - {member.endTime}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="xs"
                      color={member.status === 'active' ? 'green' : 
                             member.status === 'break' ? 'yellow' :
                             member.status === 'sick' ? 'red' : 'gray'}
                    >
                      {member.status === 'active' ? 'Activo' :
                       member.status === 'break' ? 'Descanso' :
                       member.status === 'sick' ? 'Baja' : 'Libre'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={member.status === 'active' ? 'Dar de baja' : 'Reincorporar'}>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color={member.status === 'active' ? 'red' : 'green'}
                        onClick={() => toggleStaffStatus(member.id)}
                      >
                        {member.status === 'active' ? <IconUserMinus size={14} /> : <IconUserPlus size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Modal de simulación */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Group gap="sm">
            <IconUsers size={20} />
            <Text fw={600}>Simular Cambio de Personal</Text>
          </Group>
        }
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Simula el impacto de una reducción de personal en el sistema de urgencias.
          </Text>
          
          <NumberInput
            label="Porcentaje de Reducción"
            description="Simular bajas o huelga parcial"
            value={staffReduction}
            onChange={(value) => setStaffReduction(Number(value) || 0)}
            min={0}
            max={50}
            suffix="%"
          />
          
          {staffReduction > 0 && (
            <Card withBorder p="sm" bg="orange.0">
              <Group gap="xs">
                <IconAlertTriangle size={16} color="#fd7e14" />
                <Text size="sm">
                  Una reducción del {staffReduction}% afectará los tiempos de espera
                  aproximadamente un +{Math.round(staffReduction * 1.5)}%
                </Text>
              </Group>
            </Card>
          )}
          
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: 'orange', to: 'red' }}
              leftSection={<IconRefresh size={16} />}
              onClick={simulateStaffChange}
              loading={simulatingChange}
              disabled={staffReduction === 0}
            >
              Aplicar Simulación
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
