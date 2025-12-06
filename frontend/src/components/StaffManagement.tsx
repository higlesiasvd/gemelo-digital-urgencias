import { useState, useEffect, useCallback } from 'react';
import {
  Paper, Stack, Text, Group, Badge, Card, SimpleGrid, ThemeIcon,
  Button, Table, Select, Loader, Center, Alert, Tabs, Modal, Divider,
} from '@mantine/core';
import {
  IconUsers, IconStethoscope, IconNurse, IconFirstAidKit,
  IconRefresh, IconPlus, IconMinus, IconAlertCircle, IconPhone,
  IconList, IconBuilding, IconUserPlus, IconArrowRight,
} from '@tabler/icons-react';

// ============= Tipos =============

interface Personal {
  id: string;
  numero_empleado: string;
  nombre: string;
  apellidos: string;
  rol: string;
  especialidad?: string;
  hospital_id: string;
  activo: boolean;
  en_lista_sergas?: boolean;
}

interface PersonalSergas {
  id: string;
  personal_id: string;
  nombre_completo: string;
  rol: string;
  especialidad?: string;
  telefono?: string;
  disponibilidad: Record<string, boolean>;
  hospitales_preferidos: string[];
  activo: boolean;
  dias_en_lista: number;
  fecha_entrada: string;
}

interface Hospital {
  id: string;
  codigo: string;
  nombre: string;
  numero_boxes_triaje: number;
  numero_consultas: number;
  num_camillas_observacion: number;
  capacidad_total: number;
}

interface StaffByRole {
  medico: Personal[];
  enfermero: Personal[];
  auxiliar: Personal[];
  celador: Personal[];
}

// ============= Configuración =============

const API_URL = '';

const ROLES_CONFIG = {
  medico: { label: 'Médicos', icon: IconStethoscope, color: 'blue' },
  enfermero: { label: 'Enfermeros', icon: IconNurse, color: 'teal' },
  auxiliar: { label: 'Auxiliares', icon: IconFirstAidKit, color: 'violet' },
  celador: { label: 'Celadores', icon: IconUsers, color: 'orange' },
};

// Ratios óptimos de personal por infraestructura hospitalaria
// Basado en: boxes triaje, consultas, camillas observación
const calcularCapacidadOptima = (hospital: Hospital | undefined) => {
  if (!hospital) return { medico: 0, enfermero: 0, auxiliar: 0, celador: 0, total: 0 };
  
  const { numero_boxes_triaje = 0, numero_consultas = 0, num_camillas_observacion = 0 } = hospital;
  
  // Ratios: personal necesario por infraestructura
  // Por cada 3 boxes de triaje: 1 médico, 2 enfermeros, 1 auxiliar
  // Por cada 4 consultas: 2 médicos, 1 enfermero, 0.5 auxiliar
  // Por cada 8 camillas: 1 médico, 2 enfermeros, 1 auxiliar, 1 celador
  
  const medico = Math.ceil(numero_boxes_triaje / 3 + numero_consultas / 2 + num_camillas_observacion / 8);
  const enfermero = Math.ceil(numero_boxes_triaje * 0.7 + numero_consultas / 4 + num_camillas_observacion / 4);
  const auxiliar = Math.ceil(numero_boxes_triaje / 3 + numero_consultas / 8 + num_camillas_observacion / 8);
  const celador = Math.ceil((numero_boxes_triaje + numero_consultas + num_camillas_observacion) / 15);
  
  return { medico, enfermero, auxiliar, celador, total: medico + enfermero + auxiliar + celador };
};

// Estado de saturación del personal
const getEstadoSaturacion = (actual: number, optimo: number): { estado: 'bajo' | 'optimo' | 'saturado'; color: string; icono: string } => {
  if (optimo === 0) return { estado: 'optimo', color: 'gray', icono: '—' };
  const ratio = actual / optimo;
  if (ratio < 0.7) return { estado: 'bajo', color: 'yellow', icono: '⚠️' };
  if (ratio > 1.3) return { estado: 'saturado', color: 'red', icono: '🔴' };
  return { estado: 'optimo', color: 'green', icono: '✅' };
};

// ============= Componente Principal =============

interface StaffManagementProps {
  selectedHospital?: string;
}

export function StaffManagement(_props: StaffManagementProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [listaSergas, setListaSergas] = useState<PersonalSergas[]>([]);
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [filterHospital, setFilterHospital] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPersonSergas, setSelectedPersonSergas] = useState<PersonalSergas | null>(null);
  const [assigningHospital, setAssigningHospital] = useState<string>('');
  const [assigningTurno, setAssigningTurno] = useState<string>('manana');

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [hospitalRes, personalRes, sergasRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/hospitales`),
        fetch(`${API_URL}/api/v1/personal`),
        fetch(`${API_URL}/api/v1/lista-sergas`)
      ]);
      
      if (!hospitalRes.ok || !personalRes.ok || !sergasRes.ok) {
        throw new Error('Error cargando datos');
      }
      
      const [hospitalData, personalData, sergasData] = await Promise.all([
        hospitalRes.json(),
        personalRes.json(),
        sergasRes.json()
      ]);
      
      setHospitales(hospitalData.hospitales || []);
      setPersonal(personalData.personal || []);
      setListaSergas(sergasData.personal || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helpers
  const getHospitalUUID = (codigo: string): string | null => {
    const h = hospitales.find(hosp => hosp.codigo === codigo);
    return h?.id || null;
  };

  const getHospitalNombre = (id: string): string => {
    const h = hospitales.find(hosp => hosp.id === id || hosp.codigo === id);
    return h?.codigo?.toUpperCase() || '—';
  };

  // Filtrar personal por hospital
  const filteredPersonal = filterHospital 
    ? personal.filter(p => {
        const h = hospitales.find(hosp => hosp.codigo === filterHospital);
        return p.hospital_id === filterHospital || p.hospital_id === h?.id;
      })
    : personal;

  // Agrupar por rol
  const staffByRole: StaffByRole = {
    medico: filteredPersonal.filter(p => p.rol === 'medico'),
    enfermero: filteredPersonal.filter(p => p.rol === 'enfermero'),
    auxiliar: filteredPersonal.filter(p => p.rol === 'auxiliar'),
    celador: filteredPersonal.filter(p => p.rol === 'celador'),
  };

  // Generar datos para nuevo personal
  const generarDatosPersonal = (rolKey: string) => {
    const nombres = ['Carlos', 'María', 'Pedro', 'Ana', 'Luis', 'Elena', 'Jorge', 'Laura'];
    const apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'Fernández', 'González'];
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido1 = apellidos[Math.floor(Math.random() * apellidos.length)];
    const apellido2 = apellidos[Math.floor(Math.random() * apellidos.length)];
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    
    return {
      numero_empleado: `REF${ts.toString().slice(-8)}`,
      nombre,
      apellidos: `${apellido1} ${apellido2}`,
      dni: `${ts.toString().slice(-8)}${String.fromCharCode(65 + rand % 26)}`,
      email: `refuerzo.${ts}.${rand}@sergas.es`,
      rol: rolKey,
      especialidad: rolKey === 'medico' ? 'Urgencias' : null,
      acepta_refuerzos: true,
    };
  };

  // Añadir personal directo al hospital
  const handleAddStaff = async (rol: string, rolKey: string) => {
    if (!filterHospital) {
      alert('⚠️ Selecciona un hospital específico primero');
      return;
    }
    
    const hospitalUUID = getHospitalUUID(filterHospital);
    if (!hospitalUUID) {
      alert('❌ Hospital no encontrado');
      return;
    }
    
    try {
      const nuevoPersonal = { ...generarDatosPersonal(rolKey), hospital_id: hospitalUUID };
      
      const response = await fetch(`${API_URL}/api/v1/personal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoPersonal)
      });
      
      if (response.ok) {
        alert(`✅ ${rol} añadido: ${nuevoPersonal.nombre} ${nuevoPersonal.apellidos}`);
        await loadData();
      } else {
        const err = await response.json();
        alert(`❌ Error: ${typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)}`);
      }
    } catch (err) {
      alert(`❌ Error de conexión`);
    }
  };

  // Liberar personal (eliminar)
  const handleRemoveStaff = async (rol: string, rolKey: string) => {
    const staffOfRole = staffByRole[rolKey as keyof StaffByRole] || [];
    if (staffOfRole.length === 0) {
      alert(`⚠️ No hay ${rol} para liberar`);
      return;
    }
    
    // Preferir refuerzos
    const toRemove = staffOfRole.find(p => p.numero_empleado.startsWith('REF')) || staffOfRole[staffOfRole.length - 1];
    
    if (!confirm(`¿Eliminar a ${toRemove.nombre} ${toRemove.apellidos}?`)) return;
    
    try {
      const response = await fetch(`${API_URL}/api/v1/personal/${toRemove.id}`, { method: 'DELETE' });
      if (response.ok) {
        alert(`✅ Personal eliminado`);
        await loadData();
      } else {
        alert(`❌ Error al eliminar`);
      }
    } catch {
      alert(`❌ Error de conexión`);
    }
  };

  // Abrir modal para asignar personal de lista SERGAS
  const openAssignModal = (person: PersonalSergas) => {
    setSelectedPersonSergas(person);
    setAssigningHospital(filterHospital || hospitales[0]?.codigo || '');
    setAssigningTurno('manana');
    setAssignModalOpen(true);
  };

  // Asignar personal de lista SERGAS a hospital
  const handleAssignToHospital = async () => {
    if (!selectedPersonSergas || !assigningHospital) return;
    
    const hospitalUUID = getHospitalUUID(assigningHospital);
    if (!hospitalUUID) {
      alert('❌ Hospital no válido');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/v1/lista-sergas/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal_id: selectedPersonSergas.personal_id,
          hospital_id: hospitalUUID,
          turno: assigningTurno,
          fecha_inicio: new Date().toISOString().split('T')[0],
          motivo: 'Llamada desde panel de gestión'
        })
      });
      
      if (response.ok) {
        alert(`✅ ${selectedPersonSergas.nombre_completo} asignado a ${assigningHospital.toUpperCase()}`);
        setAssignModalOpen(false);
        await loadData();
      } else {
        const err = await response.json();
        alert(`❌ Error: ${typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)}`);
      }
    } catch {
      alert(`❌ Error de conexión`);
    }
  };

  // Añadir personal existente a lista SERGAS
  const handleAddToSergas = async (p: Personal) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/lista-sergas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal_id: p.id,
          motivo_entrada: 'voluntario',
          disponible_turno_manana: true,
          disponible_turno_tarde: true,
          disponible_turno_noche: true,
        })
      });
      
      if (response.ok) {
        alert(`✅ ${p.nombre} ${p.apellidos} añadido a lista SERGAS`);
        await loadData();
      } else {
        const err = await response.json();
        alert(`❌ Error: ${typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)}`);
      }
    } catch {
      alert(`❌ Error de conexión`);
    }
  };

  // Mover un empleado de un rol específico a lista SERGAS
  const handleMoveToSergasByRole = async (rolLabel: string, rolKey: string) => {
    const staffOfRole = staffByRole[rolKey as keyof StaffByRole] || [];
    if (staffOfRole.length === 0) {
      alert(`⚠️ No hay ${rolLabel} para mover a lista SERGAS`);
      return;
    }
    
    // Preferir personal temporal/refuerzos
    const toMove = staffOfRole.find(p => p.numero_empleado.startsWith('REF') || p.numero_empleado.startsWith('SRG')) 
                   || staffOfRole[staffOfRole.length - 1];
    
    if (!confirm(`¿Mover a ${toMove.nombre} ${toMove.apellidos} a la lista SERGAS?`)) return;
    
    await handleAddToSergas(toMove);
  };

  // ============= Render =============

  if (loading) {
    return (
      <Paper shadow="sm" radius="lg" p="xl" withBorder>
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Cargando personal...</Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper shadow="sm" radius="lg" p="xl" withBorder>
        <Alert icon={<IconAlertCircle size={20} />} title="Error" color="red" variant="light">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={loadData} mt="sm">
            Reintentar
          </Button>
        </Alert>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Paper shadow="sm" radius="md" p="md" withBorder>
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}>
              <IconUsers size={22} />
            </ThemeIcon>
            <div>
              <Text size="lg" fw={600}>Gestión de Personal</Text>
              <Text size="sm" c="dimmed">
                {personal.length} en plantilla · {listaSergas.length} en lista SERGAS
              </Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <Select
              size="sm"
              w={250}
              data={[
                { value: '', label: 'Todos los hospitales' },
                ...hospitales.map(h => ({ value: h.codigo, label: h.nombre }))
              ]}
              value={filterHospital}
              onChange={(v) => setFilterHospital(v || '')}
              placeholder="Filtrar hospital"
            />
            <Button size="sm" variant="light" leftSection={<IconRefresh size={16} />} onClick={loadData}>
              Actualizar
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Tabs: Plantilla Activa / Lista SERGAS */}
      <Tabs defaultValue="plantilla" variant="outline">
        <Tabs.List>
          <Tabs.Tab value="plantilla" leftSection={<IconBuilding size={16} />}>
            Plantilla Activa ({filteredPersonal.length})
          </Tabs.Tab>
          <Tabs.Tab value="sergas" leftSection={<IconList size={16} />}>
            Lista SERGAS Reserva ({listaSergas.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* ========== TAB: Plantilla Activa ========== */}
        <Tabs.Panel value="plantilla" pt="md">
          <Stack gap="md">
            {/* Info de capacidad del hospital seleccionado */}
            {filterHospital && (() => {
              const hospital = hospitales.find(h => h.codigo === filterHospital);
              const capacidad = calcularCapacidadOptima(hospital);
              const totalActual = filteredPersonal.length;
              const estadoGeneral = getEstadoSaturacion(totalActual, capacidad.total);
              
              return (
                <Paper shadow="xs" radius="md" p="sm" withBorder style={{ borderColor: estadoGeneral.color === 'green' ? '#40c057' : estadoGeneral.color === 'yellow' ? '#fab005' : estadoGeneral.color === 'red' ? '#fa5252' : undefined }}>
                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconBuilding size={20} />
                      <div>
                        <Text size="sm" fw={600}>{hospital?.nombre}</Text>
                        <Text size="xs" c="dimmed">
                          {hospital?.numero_boxes_triaje} boxes · {hospital?.numero_consultas} consultas · {hospital?.num_camillas_observacion} camillas
                        </Text>
                      </div>
                    </Group>
                    <Group gap="md">
                      <div style={{ textAlign: 'center' }}>
                        <Text size="xs" c="dimmed">Personal</Text>
                        <Text size="lg" fw={700}>{totalActual}</Text>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Text size="xs" c="dimmed">Óptimo</Text>
                        <Text size="lg" fw={700} c="dimmed">{capacidad.total}</Text>
                      </div>
                      <Badge size="lg" color={estadoGeneral.color} variant="light">
                        {estadoGeneral.icono} {estadoGeneral.estado === 'bajo' ? 'Falta personal' : estadoGeneral.estado === 'saturado' ? 'Saturado' : 'Óptimo'}
                      </Badge>
                    </Group>
                  </Group>
                </Paper>
              );
            })()}
            
            {/* Resumen por rol con indicadores de capacidad */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              {(Object.entries(ROLES_CONFIG) as [keyof typeof ROLES_CONFIG, typeof ROLES_CONFIG.medico][]).map(([rol, config]) => {
                const Icon = config.icon;
                const count = staffByRole[rol]?.length || 0;
                const hospital = hospitales.find(h => h.codigo === filterHospital);
                const capacidad = calcularCapacidadOptima(hospital);
                const optimo = capacidad[rol as keyof typeof capacidad] as number || 0;
                const estado = filterHospital ? getEstadoSaturacion(count, optimo) : { estado: 'optimo' as const, color: 'gray', icono: '' };
                
                return (
                  <Card key={rol} shadow="sm" padding="md" radius="md" withBorder 
                    style={{ borderColor: filterHospital ? (estado.color === 'green' ? '#40c057' : estado.color === 'yellow' ? '#fab005' : estado.color === 'red' ? '#fa5252' : undefined) : undefined }}>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <ThemeIcon size={28} radius="md" variant="light" color={config.color}>
                          <Icon size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>{config.label}</Text>
                      </Group>
                      <Group gap={4}>
                        <Text size="xl" fw={700} c={config.color}>{count}</Text>
                        {filterHospital && optimo > 0 && (
                          <Text size="sm" c="dimmed">/{optimo}</Text>
                        )}
                      </Group>
                    </Group>
                    
                    {filterHospital && optimo > 0 && (
                      <Text size="xs" c={estado.color} ta="right" mb="xs">
                        {estado.icono} {estado.estado === 'bajo' ? 'Necesita más' : estado.estado === 'saturado' ? 'Exceso' : 'Bien'}
                      </Text>
                    )}
                    
                    <Group gap="xs" mt="sm">
                      <Button 
                        size="compact-xs" variant="light" color="green"
                        leftSection={<IconPlus size={12} />}
                        onClick={() => handleAddStaff(config.label, rol)}
                        disabled={!filterHospital}
                        style={{ flex: 1 }}
                      >
                        Añadir
                      </Button>
                      <Button 
                        size="compact-xs" variant="light" color="red"
                        leftSection={<IconMinus size={12} />}
                        onClick={() => handleRemoveStaff(config.label, rol)}
                        disabled={count === 0}
                        style={{ flex: 1 }}
                      >
                        Liberar
                      </Button>
                    </Group>
                    <Button 
                      size="compact-xs" variant="subtle" color="orange" mt="xs" fullWidth
                      leftSection={<IconList size={12} />}
                      onClick={() => handleMoveToSergasByRole(config.label, rol)}
                      disabled={count === 0}
                    >
                      → Lista SERGAS
                    </Button>
                  </Card>
                );
              })}
            </SimpleGrid>

            {!filterHospital && (
              <Alert color="blue" variant="light" icon={<IconBuilding size={16} />}>
                Selecciona un hospital en el filtro superior para ver la relación personal/boxes
              </Alert>
            )}

            {/* Tabla de plantilla */}
            <Paper shadow="sm" radius="md" p="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={600}>Personal en Plantilla</Text>
                <Badge size="sm" variant="light">{filteredPersonal.length} empleados</Badge>
              </Group>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nº Empleado</Table.Th>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Hospital</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Acción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredPersonal.slice(0, 12).map((p) => {
                    const rolConfig = ROLES_CONFIG[p.rol as keyof typeof ROLES_CONFIG];
                    return (
                      <Table.Tr key={p.id}>
                        <Table.Td><Text size="xs" ff="monospace" c="dimmed">{p.numero_empleado}</Text></Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {p.nombre} {p.apellidos}
                            {p.especialidad && <Text component="span" size="xs" c="dimmed" ml={4}>({p.especialidad})</Text>}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="light" color={rolConfig?.color || 'gray'}>
                            {rolConfig?.label || p.rol}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="outline">{getHospitalNombre(p.hospital_id)}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="dot" color={p.activo ? 'green' : 'red'}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Button 
                            size="compact-xs" variant="subtle" color="orange"
                            leftSection={<IconUserPlus size={12} />}
                            onClick={() => handleAddToSergas(p)}
                          >
                            A Lista
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
              {filteredPersonal.length > 12 && (
                <Text size="xs" c="dimmed" ta="center" mt="sm">
                  Mostrando 12 de {filteredPersonal.length}
                </Text>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ========== TAB: Lista SERGAS ========== */}
        <Tabs.Panel value="sergas" pt="md">
          <Paper shadow="sm" radius="md" p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <ThemeIcon size={32} variant="light" color="orange">
                  <IconList size={18} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600}>Lista SERGAS - Personal de Reserva</Text>
                  <Text size="xs" c="dimmed">Personal disponible para llamar y asignar a hospitales</Text>
                </div>
              </Group>
              <Badge size="lg" variant="light" color="orange">{listaSergas.length} disponibles</Badge>
            </Group>

            {listaSergas.length === 0 ? (
              <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">No hay personal en la lista SERGAS.</Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Puedes añadir personal desde la pestaña "Plantilla Activa" usando el botón "A Lista".
                </Text>
              </Alert>
            ) : (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Días en lista</Table.Th>
                    <Table.Th>Disponibilidad</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Llamar y Asignar</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {listaSergas.map((p) => {
                    const rolConfig = ROLES_CONFIG[p.rol as keyof typeof ROLES_CONFIG];
                    return (
                      <Table.Tr key={p.id}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {p.nombre_completo}
                            {p.especialidad && <Text component="span" size="xs" c="dimmed" ml={4}>({p.especialidad})</Text>}
                          </Text>
                          {p.telefono && <Text size="xs" c="dimmed">{p.telefono}</Text>}
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="light" color={rolConfig?.color || 'gray'}>
                            {rolConfig?.label || p.rol}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="outline" color={p.dias_en_lista > 30 ? 'red' : 'gray'}>
                            {p.dias_en_lista} días
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {p.disponibilidad?.manana && <Badge size="xs" color="yellow">M</Badge>}
                            {p.disponibilidad?.tarde && <Badge size="xs" color="orange">T</Badge>}
                            {p.disponibilidad?.noche && <Badge size="xs" color="indigo">N</Badge>}
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Button 
                            size="compact-xs" variant="filled" color="teal"
                            leftSection={<IconPhone size={12} />}
                            rightSection={<IconArrowRight size={12} />}
                            onClick={() => openAssignModal(p)}
                          >
                            Llamar
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Modal de asignación */}
      <Modal 
        opened={assignModalOpen} 
        onClose={() => setAssignModalOpen(false)} 
        title="Asignar Personal a Hospital"
        centered
      >
        {selectedPersonSergas && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">Personal seleccionado:</Text>
              <Text fw={600}>{selectedPersonSergas.nombre_completo}</Text>
              <Badge size="sm" variant="light" mt={4}>
                {ROLES_CONFIG[selectedPersonSergas.rol as keyof typeof ROLES_CONFIG]?.label || selectedPersonSergas.rol}
              </Badge>
            </div>
            
            <Divider />
            
            <Select
              label="Hospital destino"
              placeholder="Selecciona hospital"
              data={hospitales.map(h => ({ value: h.codigo, label: h.nombre }))}
              value={assigningHospital}
              onChange={(v) => setAssigningHospital(v || '')}
            />
            
            <Select
              label="Turno"
              placeholder="Selecciona turno"
              data={[
                { value: 'manana', label: '🌅 Mañana (8:00 - 15:00)' },
                { value: 'tarde', label: '🌇 Tarde (15:00 - 22:00)' },
                { value: 'noche', label: '🌙 Noche (22:00 - 8:00)' },
              ]}
              value={assigningTurno}
              onChange={(v) => setAssigningTurno(v || 'manana')}
            />
            
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => setAssignModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                color="teal" 
                leftSection={<IconPhone size={16} />}
                onClick={handleAssignToHospital}
                disabled={!assigningHospital}
              >
                Confirmar Llamada y Asignar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

export default StaffManagement;
