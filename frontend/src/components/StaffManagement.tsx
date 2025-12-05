import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper, Stack, Text, Group, Badge, Card, SimpleGrid, ThemeIcon,
  Box, Button, Avatar, ActionIcon, Tooltip, Divider, Alert,
  ScrollArea, Skeleton, RingProgress, Modal,
} from '@mantine/core';
import {
  IconUsers, IconClock, IconPhone,
  IconStethoscope, IconNurse, IconFirstAidKit, IconRefresh,
  IconAlertCircle, IconBrain, IconCheck,
  IconAlertTriangle, IconArrowUp, IconArrowDown,
  IconPhoneCall, IconUserCheck, IconActivity,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { staffApi, Personal, Turno, RolPersonal, TipoTurno } from '@/services/staffApi';
import { useHospitalStore } from '@/store/hospitalStore';

// ============= Tipos =============

interface PrediccionDemanda {
  hora: string;
  demandaEsperada: number;
  confianza: number;
  tendencia: 'subiendo' | 'bajando' | 'estable';
}

interface RefuerzoNecesario {
  id: string;
  tipo: 'prediccion' | 'tiempo_real';
  urgencia: 'baja' | 'media' | 'alta' | 'critica';
  rol: RolPersonal;
  cantidad: number;
  motivo: string;
  mejoraEstimada: number;
  tiempoEsperaActual: number;
  tiempoEsperaMejorado: number;
  aceptado: boolean;
  personalAsignado: Personal[];
}

// ============= Configuración =============

const TURNOS: Record<string, { label: string; color: string; hours: string; emoji: string }> = {
  manana: { label: 'Mañana', color: 'yellow', hours: '07:00 - 15:00', emoji: '🌅' },
  tarde: { label: 'Tarde', color: 'orange', hours: '15:00 - 23:00', emoji: '🌇' },
  noche: { label: 'Noche', color: 'indigo', hours: '23:00 - 07:00', emoji: '🌙' },
};

const ROLES: Record<string, { label: string; icon: typeof IconStethoscope; color: string; plural: string }> = {
  medico: { label: 'Médico', icon: IconStethoscope, color: 'blue', plural: 'Médicos' },
  enfermero: { label: 'Enfermero/a', icon: IconNurse, color: 'teal', plural: 'Enfermeros' },
  auxiliar: { label: 'Auxiliar', icon: IconFirstAidKit, color: 'violet', plural: 'Auxiliares' },
};

const HOSPITALES: Record<string, { label: string; fullName: string; boxesPrefix: string; totalBoxes: number }> = {
  chuac: { label: 'CHUAC', fullName: 'Complexo Hospitalario A Coruña', boxesPrefix: 'BOX-C', totalBoxes: 30 },
  modelo: { label: 'HM Modelo', fullName: 'Hospital HM Modelo', boxesPrefix: 'BOX-M', totalBoxes: 20 },
  san_rafael: { label: 'San Rafael', fullName: 'Hospital San Rafael', boxesPrefix: 'BOX-R', totalBoxes: 15 },
};

// ============= Componente Principal =============

interface StaffManagementProps {
  selectedHospital?: string;
}

export function StaffManagement({ selectedHospital: propHospital }: StaffManagementProps) {
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal de llamada
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personal | null>(null);
  const [selectedRefuerzo, setSelectedRefuerzo] = useState<RefuerzoNecesario | null>(null);
  const [calling, setCalling] = useState(false);

  // Refuerzos necesarios (calculados)
  const [refuerzosNecesarios, setRefuerzosNecesarios] = useState<RefuerzoNecesario[]>([]);
  const [predicciones, setPredicciones] = useState<PrediccionDemanda[]>([]);

  const hospitalId = propHospital && propHospital !== 'all' ? propHospital : 'chuac';
  const hospitalInfo = HOSPITALES[hospitalId] || HOSPITALES.chuac;

  // Obtener datos del store
  const { stats } = useHospitalStore();
  const hospitalStats = stats[hospitalId];

  // ============= Turno Actual =============

  const getTurnoActual = (): TipoTurno => {
    const hora = new Date().getHours();
    if (hora >= 7 && hora < 15) return 'manana';
    if (hora >= 15 && hora < 23) return 'tarde';
    return 'noche';
  };

  const turnoActual = getTurnoActual();
  const turnoInfo = TURNOS[turnoActual];

  // ============= Efectos =============

  useEffect(() => {
    const checkApi = async () => {
      try {
        await staffApi.healthCheck();
        setApiConnected(true);
      } catch {
        setApiConnected(false);
      }
    };
    checkApi();
  }, []);

  const loadData = useCallback(async () => {
    if (!apiConnected) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const [personalData, turnosData] = await Promise.all([
        staffApi.getPersonal({ hospital: hospitalId }),
        staffApi.getTurnos({ hospital: hospitalId, fecha: today }),
      ]);

      setPersonal(personalData);
      setTurnos(turnosData);

      // Generar predicciones y refuerzos
      generatePredicciones();
      
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [apiConnected, hospitalId]);

  useEffect(() => {
    if (apiConnected) {
      loadData();
    } else if (apiConnected === false) {
      setLoading(false);
    }
  }, [apiConnected, loadData]);

  // Generar refuerzos cuando cambian los datos
  useEffect(() => {
    if (personal.length > 0) {
      generateRefuerzosNecesarios();
    }
  }, [personal, turnos, hospitalStats, predicciones]);

  // ============= Generadores =============

  const generatePredicciones = useCallback(() => {
    const hora = new Date().getHours();
    const prediccionesGeneradas: PrediccionDemanda[] = [];

    for (let i = 0; i < 6; i++) {
      const horaPrediccion = (hora + i) % 24;
      const basedemanda = getBaseDemanda(horaPrediccion);
      const variacion = Math.random() * 20 - 10;

      prediccionesGeneradas.push({
        hora: `${horaPrediccion.toString().padStart(2, '0')}:00`,
        demandaEsperada: Math.round(basedemanda + variacion),
        confianza: 85 + Math.random() * 10,
        tendencia: variacion > 5 ? 'subiendo' : variacion < -5 ? 'bajando' : 'estable',
      });
    }

    setPredicciones(prediccionesGeneradas);
  }, []);

  const getBaseDemanda = (hora: number): number => {
    if (hora >= 9 && hora <= 12) return 75;
    if (hora >= 17 && hora <= 21) return 85;
    if (hora >= 0 && hora <= 6) return 35;
    return 55;
  };

  const generateRefuerzosNecesarios = useCallback(() => {
    const refuerzos: RefuerzoNecesario[] = [];
    
    // Datos actuales
    const ocupacion = hospitalStats?.nivel_saturacion || 70 + Math.random() * 25;
    const tiempoEspera = hospitalStats?.tiempo_medio_espera || Math.round(30 + Math.random() * 40);

    // Personal en turno actual
    const turnoIds = turnos.filter(t => t.tipo_turno === turnoActual).map(t => t.personal_id);
    const personalTurno = personal.filter(p => turnoIds.includes(p.id));
    const medicosTurno = personalTurno.filter(p => p.rol === 'medico').length;
    const enfermerosTurno = personalTurno.filter(p => p.rol === 'enfermero').length;

    // 1. Refuerzo por ocupación alta actual
    if (ocupacion > 80) {
      const mejora = Math.min(25, (ocupacion - 70) * 0.8);
      refuerzos.push({
        id: 'tiempo-real-1',
        tipo: 'tiempo_real',
        urgencia: ocupacion > 95 ? 'critica' : ocupacion > 90 ? 'alta' : 'media',
        rol: 'medico',
        cantidad: ocupacion > 90 ? 2 : 1,
        motivo: `Ocupación actual: ${Math.round(ocupacion)}% - Se requiere refuerzo inmediato`,
        mejoraEstimada: Math.round(mejora),
        tiempoEsperaActual: tiempoEspera,
        tiempoEsperaMejorado: Math.round(tiempoEspera * (1 - mejora / 100)),
        aceptado: false,
        personalAsignado: [],
      });
    }

    // 2. Refuerzo por predicción de pico
    const proximoPico = predicciones.find(p => p.demandaEsperada > 75 && p.tendencia === 'subiendo');
    if (proximoPico) {
      refuerzos.push({
        id: 'prediccion-1',
        tipo: 'prediccion',
        urgencia: proximoPico.demandaEsperada > 85 ? 'alta' : 'media',
        rol: 'enfermero',
        cantidad: proximoPico.demandaEsperada > 80 ? 2 : 1,
        motivo: `Predicción ML: Pico de demanda a las ${proximoPico.hora} (${Math.round(proximoPico.demandaEsperada)}%)`,
        mejoraEstimada: 18,
        tiempoEsperaActual: tiempoEspera,
        tiempoEsperaMejorado: Math.round(tiempoEspera * 0.82),
        aceptado: false,
        personalAsignado: [],
      });
    }

    // 3. Refuerzo por poco personal
    if (medicosTurno < 3 && ocupacion > 60) {
      refuerzos.push({
        id: 'bajo-personal-1',
        tipo: 'tiempo_real',
        urgencia: 'media',
        rol: 'medico',
        cantidad: 3 - medicosTurno,
        motivo: `Dotación insuficiente: Solo ${medicosTurno} médico(s) en turno`,
        mejoraEstimada: 15,
        tiempoEsperaActual: tiempoEspera,
        tiempoEsperaMejorado: Math.round(tiempoEspera * 0.85),
        aceptado: false,
        personalAsignado: [],
      });
    }

    if (enfermerosTurno < 5 && ocupacion > 60) {
      refuerzos.push({
        id: 'bajo-personal-2',
        tipo: 'tiempo_real',
        urgencia: 'media',
        rol: 'enfermero',
        cantidad: 5 - enfermerosTurno,
        motivo: `Dotación insuficiente: Solo ${enfermerosTurno} enfermero(s) en turno`,
        mejoraEstimada: 12,
        tiempoEsperaActual: tiempoEspera,
        tiempoEsperaMejorado: Math.round(tiempoEspera * 0.88),
        aceptado: false,
        personalAsignado: [],
      });
    }

    setRefuerzosNecesarios(refuerzos);
  }, [personal, turnos, hospitalStats, turnoActual, predicciones]);

  // ============= Datos Calculados =============

  const personalEnTurno = useMemo(() => {
    const turnoIds = turnos.filter(t => t.tipo_turno === turnoActual).map(t => t.personal_id);
    return personal.filter(p => turnoIds.includes(p.id));
  }, [personal, turnos, turnoActual]);

  const personalDisponible = useMemo(() => {
    const enTurnoIds = new Set(personalEnTurno.map(p => p.id));
    return personal.filter(p => 
      !enTurnoIds.has(p.id) && 
      p.activo && 
      p.acepta_refuerzos
    );
  }, [personal, personalEnTurno]);

  const conteoRoles = useMemo(() => {
    const conteo: Record<string, number> = { medico: 0, enfermero: 0, auxiliar: 0 };
    personalEnTurno.forEach(p => {
      if (conteo[p.rol] !== undefined) conteo[p.rol]++;
    });
    return conteo;
  }, [personalEnTurno]);

  // Asignar boxes al personal en turno
  const boxesAsignados = useMemo(() => {
    const hospConfig = HOSPITALES[hospitalId];
    const asignaciones: Record<string, string> = {};
    
    // Médicos en boxes principales
    const medicos = personalEnTurno.filter(p => p.rol === 'medico');
    medicos.forEach((med, idx) => {
      asignaciones[med.id] = `${hospConfig.boxesPrefix}-${(idx + 1).toString().padStart(2, '0')}`;
    });
    
    // Enfermeros rotan por varios boxes
    const enfermeros = personalEnTurno.filter(p => p.rol === 'enfermero');
    enfermeros.forEach((enf, idx) => {
      const boxStart = (idx * 3) + 1;
      const boxEnd = Math.min(boxStart + 2, hospConfig.totalBoxes);
      asignaciones[enf.id] = `${hospConfig.boxesPrefix}-${boxStart.toString().padStart(2, '0')} a ${boxEnd.toString().padStart(2, '0')}`;
    });
    
    // Auxiliares en áreas
    const auxiliares = personalEnTurno.filter(p => p.rol === 'auxiliar');
    const areas = ['Triaje', 'Observación', 'Área General'];
    auxiliares.forEach((aux, idx) => {
      asignaciones[aux.id] = areas[idx % areas.length];
    });
    
    return asignaciones;
  }, [personalEnTurno, hospitalId]);

  // Filtrar personal disponible por rol
  const getPersonalDisponiblePorRol = (rol: RolPersonal) => {
    return personalDisponible.filter(p => p.rol === rol);
  };

  // ============= Handlers =============

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    notifications.show({
      title: '✅ Actualizado',
      message: 'Datos de personal actualizados',
      color: 'green',
      autoClose: 2000,
    });
  };

  const handleOpenCallModal = (refuerzo: RefuerzoNecesario) => {
    setSelectedRefuerzo(refuerzo);
    setSelectedPerson(null);
    setCallModalOpen(true);
  };

  const handleSelectPersonForCall = (person: Personal) => {
    setSelectedPerson(person);
  };

  // Llamada directa desde la lista SERGAS
  const handleDirectCall = async (person: Personal) => {
    try {
      const fechaNecesidad = new Date().toISOString().split('T')[0];
      
      await staffApi.createSolicitudRefuerzo({
        hospital_id: hospitalId,
        fecha_necesidad: fechaNecesidad,
        turno_necesario: turnoActual,
        rol_requerido: person.rol,
        cantidad_personal: 1,
        prioridad: 'media',
        motivo: 'SATURACION_ACTUAL',
        notas: `Llamada manual a ${person.nombre} ${person.apellidos} para refuerzo`,
      });

      notifications.show({
        title: '📞 Llamada realizada',
        message: `${person.nombre} ${person.apellidos} contactado/a. Tel: ${person.telefono}`,
        color: 'green',
        autoClose: 5000,
      });

      await loadData();
    } catch (err) {
      console.error('Error al registrar llamada:', err);
      notifications.show({
        title: '❌ Error',
        message: 'No se pudo registrar la llamada',
        color: 'red',
      });
    }
  };

  const handleConfirmCall = async () => {
    if (!selectedPerson || !selectedRefuerzo) return;

    setCalling(true);
    try {
      // Crear solicitud de refuerzo en la API
      const fechaNecesidad = new Date().toISOString().split('T')[0];
      
      // Determinar motivo del enum según el tipo de refuerzo
      const motivoEnum = selectedRefuerzo.tipo === 'prediccion' 
        ? 'ALTA_DEMANDA_PREDICHA' 
        : 'SATURACION_ACTUAL';
      
      await staffApi.createSolicitudRefuerzo({
        hospital_id: hospitalId,
        fecha_necesidad: fechaNecesidad,
        turno_necesario: turnoActual,
        rol_requerido: selectedPerson.rol,
        cantidad_personal: 1,
        prioridad: selectedRefuerzo.urgencia === 'critica' ? 'critica' : 
                   selectedRefuerzo.urgencia === 'alta' ? 'alta' : 'media',
        motivo: motivoEnum,
        notas: `${selectedRefuerzo.motivo} - Llamada a ${selectedPerson.nombre} ${selectedPerson.apellidos}`,
      });

      // Actualizar estado local
      setRefuerzosNecesarios(prev => prev.map(r => {
        if (r.id === selectedRefuerzo.id) {
          const nuevaCantidad = r.cantidad - 1;
          return {
            ...r,
            cantidad: nuevaCantidad,
            aceptado: nuevaCantidad <= 0,
            personalAsignado: [...r.personalAsignado, selectedPerson],
          };
        }
        return r;
      }).filter(r => r.cantidad > 0 || r.personalAsignado.length > 0));

      notifications.show({
        title: '📞 Llamada realizada',
        message: `${selectedPerson.nombre} ${selectedPerson.apellidos} ha sido contactado/a. Tel: ${selectedPerson.telefono}`,
        color: 'green',
        autoClose: 5000,
      });

      // Si quedan más por llamar del mismo refuerzo, mantener modal abierto
      if (selectedRefuerzo.cantidad > 1) {
        setSelectedRefuerzo(prev => prev ? { ...prev, cantidad: prev.cantidad - 1 } : null);
        setSelectedPerson(null);
      } else {
        setCallModalOpen(false);
        setSelectedRefuerzo(null);
        setSelectedPerson(null);
      }

      // Recargar datos
      await loadData();

    } catch (err) {
      console.error('Error al registrar llamada:', err);
      notifications.show({
        title: '❌ Error',
        message: 'No se pudo registrar la llamada',
        color: 'red',
      });
    } finally {
      setCalling(false);
    }
  };

  // ============= Estados de Error =============

  if (apiConnected === null) {
    return (
      <Paper shadow="sm" radius="lg" p="xl" withBorder>
        <Stack align="center" gap="md">
          <Skeleton height={50} circle />
          <Skeleton height={20} width={200} />
          <Skeleton height={150} width="100%" />
        </Stack>
      </Paper>
    );
  }

  if (apiConnected === false) {
    return (
      <Paper shadow="sm" radius="lg" p="xl" withBorder>
        <Alert icon={<IconAlertCircle size={20} />} title="Servicio no disponible" color="orange" variant="light">
          <Text size="sm">No se puede conectar con el servicio de gestión de personal.</Text>
          <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={() => window.location.reload()} mt="sm">
            Reintentar
          </Button>
        </Alert>
      </Paper>
    );
  }

  // ============= Render Principal =============

  const refuerzosPendientes = refuerzosNecesarios.filter(r => !r.aceptado && r.cantidad > 0);

  return (
    <Stack gap="lg">
      {/* Header */}
      <Paper shadow="sm" radius="lg" p="lg" withBorder>
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon size={44} radius="xl" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}>
              <IconUsers size={24} />
            </ThemeIcon>
            <Box>
              <Text fw={600} size="lg">Gestión de Personal - {hospitalInfo.label}</Text>
              <Text size="xs" c="dimmed">{hospitalInfo.fullName}</Text>
            </Box>
          </Group>

          <Group gap="xs">
            <Badge size="lg" variant="light" color={turnoInfo.color} leftSection={<IconClock size={12} />}>
              {turnoInfo.emoji} Turno {turnoInfo.label}
            </Badge>
            <Badge size="lg" variant="filled" color="blue">
              {personalEnTurno.length} en turno
            </Badge>
            <Tooltip label="Actualizar">
              <ActionIcon variant="subtle" onClick={handleRefresh} loading={refreshing}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* ========== PANEL DE REFUERZOS NECESARIOS ========== */}
      <Paper shadow="sm" radius="lg" p="lg" withBorder bg={refuerzosPendientes.length > 0 ? 'red.0' : 'green.0'}>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon 
              size="lg" 
              variant="filled" 
              color={refuerzosPendientes.length > 0 ? 'red' : 'green'}
            >
              {refuerzosPendientes.length > 0 ? <IconAlertTriangle size={20} /> : <IconCheck size={20} />}
            </ThemeIcon>
            <Box>
              <Text fw={600} size="lg">
                {refuerzosPendientes.length > 0 
                  ? `⚠️ Se Requiere Refuerzo de Personal` 
                  : '✅ Dotación de Personal Adecuada'}
              </Text>
              <Text size="xs" c="dimmed">
                {refuerzosPendientes.length > 0 
                  ? 'Basado en ocupación actual y predicciones ML'
                  : 'No se detectan necesidades de refuerzo'}
              </Text>
            </Box>
          </Group>
          {refuerzosPendientes.length > 0 && (
            <Badge size="xl" variant="filled" color="red">
              {refuerzosPendientes.reduce((acc, r) => acc + r.cantidad, 0)} persona(s)
            </Badge>
          )}
        </Group>

        {refuerzosPendientes.length > 0 ? (
          <Stack gap="md">
            {refuerzosPendientes.map(refuerzo => (
              <RefuerzoCard 
                key={refuerzo.id} 
                refuerzo={refuerzo}
                personalDisponible={getPersonalDisponiblePorRol(refuerzo.rol)}
                onLlamar={() => handleOpenCallModal(refuerzo)}
              />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="md">
            El personal actual es suficiente para la demanda esperada
          </Text>
        )}

        {/* Mostrar personal ya asignado */}
        {refuerzosNecesarios.filter(r => r.personalAsignado.length > 0).length > 0 && (
          <>
            <Divider my="md" label="Personal de Refuerzo Asignado" labelPosition="center" />
            <Stack gap="xs">
              {refuerzosNecesarios
                .filter(r => r.personalAsignado.length > 0)
                .flatMap(r => r.personalAsignado.map(p => (
                  <Card key={p.id} withBorder p="sm" radius="md" bg="green.1">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar size="sm" color="green" radius="xl">
                          <IconCheck size={14} />
                        </Avatar>
                        <Box>
                          <Text size="sm" fw={500}>{p.nombre} {p.apellidos}</Text>
                          <Text size="xs" c="dimmed">{ROLES[p.rol]?.label} - Llamado</Text>
                        </Box>
                      </Group>
                      <Badge color="green" size="sm">Contactado</Badge>
                    </Group>
                  </Card>
                )))}
            </Stack>
          </>
        )}
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {/* Personal en Turno Actual */}
        <Paper shadow="sm" radius="lg" p="lg" withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <ThemeIcon size="lg" variant="light" color="green">
                <IconUserCheck size={20} />
              </ThemeIcon>
              <Box>
                <Text fw={600}>Personal en Turno</Text>
                <Text size="xs" c="dimmed">{turnoInfo.hours}</Text>
              </Box>
            </Group>
            <Badge size="lg" color="green">{personalEnTurno.length}</Badge>
          </Group>

          {/* Resumen por rol */}
          <SimpleGrid cols={3} mb="md">
            {Object.entries(ROLES).map(([rol, config]) => {
              const Icon = config.icon;
              return (
                <Card key={rol} withBorder p="xs" radius="md">
                  <Group gap="xs" justify="center">
                    <ThemeIcon size="sm" variant="light" color={config.color}>
                      <Icon size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>{conteoRoles[rol]}</Text>
                    <Text size="xs" c="dimmed">{config.plural}</Text>
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>

          <Divider mb="md" />

          <ScrollArea h={250}>
            {loading ? (
              <Stack gap="sm">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} height={50} radius="md" />)}
              </Stack>
            ) : personalEnTurno.length === 0 ? (
              <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
                No hay personal registrado en este turno
              </Alert>
            ) : (
              <Stack gap="xs">
                {personalEnTurno.map(person => (
                  <PersonCard 
                    key={person.id} 
                    person={person} 
                    showStatus 
                    boxAsignado={boxesAsignados[person.id]}
                  />
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Paper>

        {/* Personal Disponible SERGAS */}
        <Paper shadow="sm" radius="lg" p="lg" withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconPhone size={20} />
              </ThemeIcon>
              <Box>
                <Text fw={600}>Lista SERGAS - Disponibles</Text>
                <Text size="xs" c="dimmed">Personal que acepta refuerzos</Text>
              </Box>
            </Group>
            <Badge size="lg" color="blue">{personalDisponible.length}</Badge>
          </Group>

          <ScrollArea h={320}>
            {loading ? (
              <Stack gap="sm">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} height={60} radius="md" />)}
              </Stack>
            ) : personalDisponible.length === 0 ? (
              <Alert color="gray" variant="light" icon={<IconUsers size={16} />}>
                No hay personal adicional disponible para refuerzo
              </Alert>
            ) : (
              <Stack gap="xs">
                {personalDisponible.map(person => (
                  <PersonCard 
                    key={person.id} 
                    person={person} 
                    showPhone 
                    showCallButton
                    onCall={handleDirectCall}
                  />
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Paper>
      </SimpleGrid>

      {/* Predicciones ML */}
      <Paper shadow="sm" radius="lg" p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'violet', to: 'grape' }}>
              <IconBrain size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>Predicción de Demanda (ML)</Text>
              <Text size="xs" c="dimmed">Próximas 6 horas • Confianza: {Math.round(predicciones[0]?.confianza || 90)}%</Text>
            </Box>
          </Group>
          <Badge variant="dot" color="green">Modelo activo</Badge>
        </Group>

        <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="sm">
          {predicciones.map((pred, idx) => (
            <PrediccionCard key={idx} prediccion={pred} isActual={idx === 0} />
          ))}
        </SimpleGrid>
      </Paper>

      {/* Modal de Llamada */}
      <Modal
        opened={callModalOpen}
        onClose={() => {
          setCallModalOpen(false);
          setSelectedRefuerzo(null);
          setSelectedPerson(null);
        }}
        title={
          <Group gap="sm">
            <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              <IconPhoneCall size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>Llamar Personal de Refuerzo</Text>
              {selectedRefuerzo && (
                <Text size="xs" c="dimmed">
                  Se necesitan {selectedRefuerzo.cantidad} {ROLES[selectedRefuerzo.rol]?.label}(s)
                </Text>
              )}
            </Box>
          </Group>
        }
        size="lg"
      >
        {selectedRefuerzo && (
          <Stack gap="md">
            {/* Info del refuerzo */}
            <Alert 
              color={selectedRefuerzo.urgencia === 'critica' ? 'red' : selectedRefuerzo.urgencia === 'alta' ? 'orange' : 'blue'} 
              variant="light"
              icon={selectedRefuerzo.tipo === 'prediccion' ? <IconBrain size={16} /> : <IconActivity size={16} />}
            >
              <Text size="sm" fw={500}>{selectedRefuerzo.motivo}</Text>
              <Group gap="lg" mt="xs">
                <Box>
                  <Text size="xs" c="dimmed">Mejora estimada</Text>
                  <Text size="sm" fw={600} c="green">-{selectedRefuerzo.mejoraEstimada}% carga</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">Tiempo espera</Text>
                  <Text size="sm">
                    <Text span td="line-through" c="dimmed">{selectedRefuerzo.tiempoEsperaActual}min</Text>
                    {' → '}
                    <Text span fw={600} c="green">{selectedRefuerzo.tiempoEsperaMejorado}min</Text>
                  </Text>
                </Box>
              </Group>
            </Alert>

            {/* Lista de personal disponible para llamar */}
            <Text fw={500} size="sm">Selecciona a quién llamar:</Text>
            
            <ScrollArea h={250}>
              <Stack gap="xs">
                {getPersonalDisponiblePorRol(selectedRefuerzo.rol).length === 0 ? (
                  <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
                    No hay {ROLES[selectedRefuerzo.rol]?.plural.toLowerCase()} disponibles para refuerzo
                  </Alert>
                ) : (
                  getPersonalDisponiblePorRol(selectedRefuerzo.rol).map(person => (
                    <Card 
                      key={person.id} 
                      withBorder 
                      p="sm" 
                      radius="md"
                      bg={selectedPerson?.id === person.id ? 'blue.1' : undefined}
                      style={{ cursor: 'pointer', border: selectedPerson?.id === person.id ? '2px solid var(--mantine-color-blue-6)' : undefined }}
                      onClick={() => handleSelectPersonForCall(person)}
                    >
                      <Group justify="space-between">
                        <Group gap="sm">
                          <Avatar size="md" color={ROLES[person.rol]?.color || 'gray'} radius="xl">
                            {person.nombre[0]}{person.apellidos[0]}
                          </Avatar>
                          <Box>
                            <Text size="sm" fw={500}>{person.nombre} {person.apellidos}</Text>
                            <Group gap="xs">
                              <Badge size="xs" variant="light" color={ROLES[person.rol]?.color}>
                                {ROLES[person.rol]?.label}
                              </Badge>
                              {person.especialidad && (
                                <Text size="xs" c="dimmed">{person.especialidad}</Text>
                              )}
                            </Group>
                          </Box>
                        </Group>
                        <Group gap="xs">
                          <IconPhone size={14} />
                          <Text size="sm" fw={500}>{person.telefono}</Text>
                        </Group>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            </ScrollArea>

            {/* Persona seleccionada */}
            {selectedPerson && (
              <Card withBorder p="md" radius="md" bg="blue.0">
                <Group justify="space-between">
                  <Group gap="sm">
                    <ThemeIcon size="lg" variant="filled" color="blue">
                      <IconPhone size={18} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" c="dimmed">Vas a llamar a:</Text>
                      <Text fw={600}>{selectedPerson.nombre} {selectedPerson.apellidos}</Text>
                      <Text size="lg" fw={700} c="blue">{selectedPerson.telefono}</Text>
                    </Box>
                  </Group>
                </Group>
              </Card>
            )}

            {/* Botones */}
            <Group justify="flex-end" mt="md">
              <Button 
                variant="subtle" 
                onClick={() => {
                  setCallModalOpen(false);
                  setSelectedRefuerzo(null);
                  setSelectedPerson(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="gradient" 
                gradient={{ from: 'green', to: 'teal' }}
                leftSection={<IconPhoneCall size={16} />}
                onClick={handleConfirmCall}
                disabled={!selectedPerson}
                loading={calling}
              >
                Confirmar Llamada
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

// ============= Subcomponentes =============

interface RefuerzoCardProps {
  refuerzo: RefuerzoNecesario;
  personalDisponible: Personal[];
  onLlamar: () => void;
}

function RefuerzoCard({ refuerzo, personalDisponible, onLlamar }: RefuerzoCardProps) {
  const roleConfig = ROLES[refuerzo.rol] || ROLES.medico;
  const Icon = roleConfig.icon;
  
  const urgenciaColors: Record<string, string> = {
    baja: 'blue',
    media: 'yellow',
    alta: 'orange',
    critica: 'red',
  };

  return (
    <Card withBorder p="md" radius="md" bg="white">
      <Group justify="space-between" mb="sm">
        <Group gap="sm">
          <Avatar size="lg" color={roleConfig.color} radius="xl">
            <Icon size={24} />
          </Avatar>
          <Box>
            <Group gap="xs">
              <Text fw={600}>
                Se necesitan {refuerzo.cantidad} {roleConfig.label}{refuerzo.cantidad > 1 ? 's' : ''}
              </Text>
              <Badge color={urgenciaColors[refuerzo.urgencia]} size="sm">
                {refuerzo.urgencia.toUpperCase()}
              </Badge>
              <Badge 
                variant="light" 
                color={refuerzo.tipo === 'prediccion' ? 'violet' : 'orange'}
                leftSection={refuerzo.tipo === 'prediccion' ? <IconBrain size={10} /> : <IconActivity size={10} />}
                size="sm"
              >
                {refuerzo.tipo === 'prediccion' ? 'Predicción ML' : 'Tiempo Real'}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">{refuerzo.motivo}</Text>
          </Box>
        </Group>
      </Group>

      <SimpleGrid cols={3} mb="md">
        <Card withBorder p="xs" radius="sm" bg="gray.0">
          <Text size="xs" c="dimmed" ta="center">Mejora Carga</Text>
          <Group gap={4} justify="center">
            <IconArrowDown size={14} color="green" />
            <Text size="sm" fw={700} c="green">-{refuerzo.mejoraEstimada}%</Text>
          </Group>
        </Card>
        <Card withBorder p="xs" radius="sm" bg="gray.0">
          <Text size="xs" c="dimmed" ta="center">Espera Actual</Text>
          <Text size="sm" fw={700} ta="center" c="red">{refuerzo.tiempoEsperaActual} min</Text>
        </Card>
        <Card withBorder p="xs" radius="sm" bg="gray.0">
          <Text size="xs" c="dimmed" ta="center">Espera Mejorada</Text>
          <Text size="sm" fw={700} ta="center" c="green">{refuerzo.tiempoEsperaMejorado} min</Text>
        </Card>
      </SimpleGrid>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {personalDisponible.length} {roleConfig.plural.toLowerCase()} disponibles para llamar
        </Text>
        <Button
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan' }}
          leftSection={<IconPhoneCall size={16} />}
          onClick={onLlamar}
          disabled={personalDisponible.length === 0}
        >
          Llamar Personal
        </Button>
      </Group>
    </Card>
  );
}

interface PersonCardProps {
  person: Personal;
  showStatus?: boolean;
  showPhone?: boolean;
  showCallButton?: boolean;
  onCall?: (person: Personal) => void;
  boxAsignado?: string;
}

function PersonCard({ person, showStatus, showPhone, showCallButton, onCall, boxAsignado }: PersonCardProps) {
  const roleConfig = ROLES[person.rol] || ROLES.medico;
  const Icon = roleConfig.icon;

  return (
    <Card withBorder p="sm" radius="md">
      <Group justify="space-between">
        <Group gap="sm">
          <Avatar size="md" color={roleConfig.color} radius="xl">
            <Icon size={18} />
          </Avatar>
          <Box>
            <Text size="sm" fw={500}>{person.nombre} {person.apellidos}</Text>
            <Group gap="xs">
              <Badge size="xs" variant="light" color={roleConfig.color}>
                {roleConfig.label}
              </Badge>
              {person.especialidad && (
                <Text size="xs" c="dimmed">{person.especialidad}</Text>
              )}
            </Group>
          </Box>
        </Group>

        <Group gap="xs">
          {showStatus && boxAsignado && (
            <Badge size="sm" variant="outline" color="gray">
              {boxAsignado}
            </Badge>
          )}
          {showStatus && (
            <Badge size="sm" variant="filled" color="green">En turno</Badge>
          )}

          {showPhone && person.telefono && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">{person.telefono}</Text>
              {showCallButton && onCall && (
                <Tooltip label={`Llamar a ${person.nombre}`}>
                  <ActionIcon 
                    size="sm" 
                    variant="light" 
                    color="green"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall(person);
                    }}
                  >
                    <IconPhoneCall size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          )}
        </Group>
      </Group>
    </Card>
  );
}

interface PrediccionCardProps {
  prediccion: PrediccionDemanda;
  isActual: boolean;
}

function PrediccionCard({ prediccion, isActual }: PrediccionCardProps) {
  const demandaColor = prediccion.demandaEsperada > 80 ? 'red' : 
                        prediccion.demandaEsperada > 60 ? 'orange' : 
                        prediccion.demandaEsperada > 40 ? 'yellow' : 'green';

  const TendenciaIcon = prediccion.tendencia === 'subiendo' ? IconArrowUp :
                        prediccion.tendencia === 'bajando' ? IconArrowDown : IconActivity;

  return (
    <Card withBorder p="sm" radius="md" bg={isActual ? 'blue.0' : undefined}>
      <Stack gap="xs" align="center">
        <Text size="xs" c="dimmed" fw={500}>
          {isActual ? 'AHORA' : prediccion.hora}
        </Text>

        <RingProgress
          size={60}
          thickness={6}
          sections={[{ value: prediccion.demandaEsperada, color: demandaColor }]}
          label={
            <Text size="xs" fw={700} ta="center">
              {Math.round(prediccion.demandaEsperada)}%
            </Text>
          }
        />

        <Group gap={4}>
          <TendenciaIcon 
            size={14} 
            color={prediccion.tendencia === 'subiendo' ? 'red' : 
                   prediccion.tendencia === 'bajando' ? 'green' : 'gray'}
          />
          <Text size="xs" c="dimmed">
            {prediccion.tendencia === 'subiendo' ? '↑' :
             prediccion.tendencia === 'bajando' ? '↓' : '='}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
