// ═══════════════════════════════════════════════════════════════════════════════
// CSS3D HOSPITAL SCENE - Vista 3D Premium con Animaciones Avanzadas
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    Box,
    Text,
    Badge,
    Stack,
    Group,
    Paper,
    ThemeIcon,
    Tooltip,
    ActionIcon,
} from '@mantine/core';
import {
    IconUsers,
    IconDoor,
    IconHeartRateMonitor,
    IconStethoscope,
    IconBolt,
    IconActivity,
    IconZoomIn,
    IconZoomOut,
    IconRotate,
    IconHome,
    IconPlayerPause,
    IconPlayerPlay,
    IconClock,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useHospitals } from '@/shared/store';
import { fetchChuacConsultas, type ConsultaInfo } from '@/shared/api/client';

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: CHUAC CONSULTAS
// ═══════════════════════════════════════════════════════════════════════════════

export function useChuacConsultas() {
    return useQuery({
        queryKey: ['chuac-consultas'],
        queryFn: fetchChuacConsultas,
        refetchInterval: 5000,
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const cssStyles = `
@keyframes float {
    0%, 100% { transform: translateY(0) translateZ(0); }
    50% { transform: translateY(-10px) translateZ(20px); }
}

@keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(34,139,230,0.3); }
    50% { box-shadow: 0 0 40px rgba(34,139,230,0.6); }
}

@keyframes rotate-orbit {
    from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
    to { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
}

@keyframes flow-particle {
    0% { transform: translateY(0) scale(1); opacity: 0.8; }
    100% { transform: translateY(60px) scale(0.3); opacity: 0; }
}

@keyframes shine {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
}

@keyframes data-stream {
    0% { transform: translateY(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(100%); opacity: 0; }
}

.card-3d {
    transform-style: preserve-3d;
    transition: transform 0.4s ease-out;
}

.card-3d:hover {
    transform: translateZ(30px) rotateX(-2deg) rotateY(3deg);
}

.shine-effect {
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255,255,255,0.05) 50%,
        transparent 100%
    );
    background-size: 200% 100%;
    animation: shine 4s infinite;
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE HOSPITALES
// ═══════════════════════════════════════════════════════════════════════════════

const HOSPITAL_CONFIG = {
    chuac: {
        id: 'chuac',
        nombre: 'CHUAC',
        tipo: 'Referencia',
        ventanillas: 2,
        boxes: 5,
        consultas: 10,
        color: '#228be6',
        colorRgb: '34,139,230',
    },
    modelo: {
        id: 'modelo',
        nombre: 'HM Modelo',
        tipo: 'Privado',
        ventanillas: 1,
        boxes: 1,
        consultas: 4,
        color: '#fd7e14',
        colorRgb: '253,126,20',
    },
    san_rafael: {
        id: 'san_rafael',
        nombre: 'San Rafael',
        tipo: 'Comarcal',
        ventanillas: 1,
        boxes: 1,
        consultas: 4,
        color: '#40c057',
        colorRgb: '64,192,87',
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: PARTÍCULAS FLOTANTES
// ═══════════════════════════════════════════════════════════════════════════════

function FloatingParticles() {
    const particles = useMemo(() =>
        Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 2 + Math.random() * 4,
            duration: 8 + Math.random() * 8,
            delay: Math.random() * 5,
            color: ['#228be6', '#fd7e14', '#40c057'][Math.floor(Math.random() * 3)],
        })),
        []);

    return (
        <Box style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ x: `${p.x}%`, y: '110%', opacity: 0 }}
                    animate={{
                        y: [null, '-10%'],
                        opacity: [0, 0.8, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'linear',
                    }}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                        filter: 'blur(1px)',
                    }}
                />
            ))}
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: FLUJO DE PACIENTES ANIMADO
// ═══════════════════════════════════════════════════════════════════════════════

function PatientFlow({ count, color }: { count: number; color: string }) {
    if (count === 0) return null;

    return (
        <Box style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {/* Simple dots instead of animations */}
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: color,
                        opacity: 0.5,
                    }}
                />
            ))}
            {count > 3 && (
                <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    +{count - 3}
                </Text>
            )}
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CUBO SIMPLE ANIMADO
// ═══════════════════════════════════════════════════════════════════════════════

interface Cube3DProps {
    size: number;
    color: string;
    occupied: boolean;
    isAccelerated?: boolean;
    saturacion: number;
    label: string;
    index: number;
}

function Cube3D({ size, color, occupied, isAccelerated, saturacion, label, index }: Cube3DProps) {
    const [hovered, setHovered] = useState(false);

    const bgColor = useMemo(() => {
        if (!occupied) return 'rgba(50,50,65,0.8)';
        if (saturacion > 0.85) return 'linear-gradient(135deg, #ff6b6b 0%, #fa5252 100%)';
        if (saturacion > 0.7) return 'linear-gradient(135deg, #ff922b 0%, #fd7e14 100%)';
        if (saturacion > 0.5) return 'linear-gradient(135deg, #fcc419 0%, #fab005 100%)';
        return 'linear-gradient(135deg, #69db7c 0%, #40c057 100%)';
    }, [occupied, saturacion]);

    const glowColor = useMemo(() => {
        if (!occupied) return 'transparent';
        if (saturacion > 0.85) return 'rgba(250,82,82,0.3)';
        if (saturacion > 0.7) return 'rgba(253,126,20,0.25)';
        if (saturacion > 0.5) return 'rgba(250,176,5,0.2)';
        return 'rgba(64,192,87,0.2)';
    }, [occupied, saturacion]);

    return (
        <Tooltip
            label={
                <Stack gap={2}>
                    <Text size="sm" fw={700}>{label}</Text>
                    <Group gap="xs">
                        <Badge size="xs" color={occupied ? 'green' : 'gray'}>
                            {occupied ? 'Ocupado' : 'Libre'}
                        </Badge>
                        {isAccelerated && (
                            <Badge size="xs" color="yellow" leftSection={<IconBolt size={10} />}>
                                Rápido
                            </Badge>
                        )}
                    </Group>
                </Stack>
            }
            position="top"
            withArrow
        >
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                initial={{ opacity: 0 }}
                animate={{
                    opacity: 1,
                    scale: hovered ? 1.1 : 1,
                }}
                transition={{
                    duration: 0.2,
                    delay: index * 0.02,
                }}
                style={{
                    width: size,
                    height: size,
                    background: bgColor,
                    borderRadius: 8,
                    border: `2px solid ${occupied ? color : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: occupied
                        ? `0 4px 15px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.15)`
                        : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Efecto de brillo interior - solo CSS */}
                {occupied && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent 60%)',
                        }}
                    />
                )}

                {/* Indicador central simple */}
                {occupied && (
                    <div
                        style={{
                            width: size * 0.25,
                            height: size * 0.25,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.6)',
                        }}
                    />
                )}

                {/* Indicador de velocidad - sin rotación */}
                {isAccelerated && occupied && (
                    <div
                        style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #fab005, #fd7e14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <IconBolt size={10} style={{ color: '#000' }} />
                    </div>
                )}
            </motion.div>
        </Tooltip>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: ANILLO ORBITAL 3D
// ═══════════════════════════════════════════════════════════════════════════════

function OrbitalRing({ color, size = 100 }: { color: string; size?: number }) {
    return (
        <div
            style={{
                position: 'absolute',
                width: size,
                height: size,
                border: `1px solid ${color}20`,
                borderRadius: '50%',
                transform: 'rotateX(75deg)',
            }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: HOSPITAL CARD 3D
// ═══════════════════════════════════════════════════════════════════════════════

interface Hospital3DCardProps {
    config: typeof HOSPITAL_CONFIG.chuac;
    consultasInfo?: ConsultaInfo[];
    delay: number;
    onFlowClick?: (hospitalId: string, area: 'ventanilla' | 'triaje' | 'consulta') => void;
}

function Hospital3DCard({ config, consultasInfo, delay, onFlowClick }: Hospital3DCardProps) {
    const hospitals = useHospitals();
    const state = hospitals[config.id];
    const [isHovered, setIsHovered] = useState(false);

    const saturacion = state?.nivel_saturacion ?? 0;
    const saturationPercent = Math.round(saturacion * 100);
    const ventanillasOcupadas = state?.ventanillas_ocupadas ?? 0;
    const boxesOcupados = state?.boxes_ocupados ?? 0;
    const consultasOcupadas = state?.consultas_ocupadas ?? 0;
    const colaTriaje = state?.cola_triaje ?? 0;
    const colaConsulta = state?.cola_consulta ?? 0;

    const getStatusColor = useCallback(() => {
        if (saturationPercent > 85) return 'red';
        if (saturationPercent > 70) return 'orange';
        if (saturationPercent > 50) return 'yellow';
        return 'green';
    }, [saturationPercent]);

    const getConsultaSpeed = useCallback((num: number) => {
        if (!consultasInfo) return 1;
        return consultasInfo.find(c => c.numero_consulta === num)?.velocidad_factor ?? 1;
    }, [consultasInfo]);

    const cubeSize = { ventanilla: 34, box: 38, consulta: 32 };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, rotateY: -30 }}
            animate={{
                opacity: 1,
                y: 0,
                rotateY: 0,
                z: isHovered ? 40 : 0,
                scale: isHovered ? 1.02 : 1,
            }}
            transition={{
                duration: 0.8,
                delay,
                type: 'spring',
                stiffness: 100,
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="card-3d"
            style={{
                flex: 1,
                minWidth: 300,
                maxWidth: 380,
                transformStyle: 'preserve-3d',
            }}
        >
            <Paper
                p="lg"
                radius="xl"
                style={{
                    background: `linear-gradient(145deg, rgba(${config.colorRgb},0.2) 0%, rgba(15,15,25,0.98) 100%)`,
                    border: `2px solid rgba(${config.colorRgb},0.5)`,
                    boxShadow: isHovered
                        ? `0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(${config.colorRgb},0.3)`
                        : `0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(${config.colorRgb},0.15)`,
                    backdropFilter: 'blur(20px)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.3s ease',
                }}
            >
                {/* Efecto de brillo */}
                <div className="shine-effect" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

                {/* Anillo orbital decorativo */}
                <Box style={{ position: 'absolute', top: -20, right: -20, opacity: 0.3 }}>
                    <OrbitalRing color={config.color} size={80} />
                </Box>

                {/* Header */}
                <Group justify="space-between" mb="lg" style={{ position: 'relative', zIndex: 1 }}>
                    <Group gap="sm">
                        <motion.div
                            animate={{
                                rotateY: [0, 360],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <ThemeIcon size={48} radius="xl" style={{ background: config.color, boxShadow: `0 0 20px ${config.color}80` }}>
                                <IconUsers size={24} />
                            </ThemeIcon>
                        </motion.div>
                        <Box>
                            <Text size="lg" fw={800} c="white">{config.nombre}</Text>
                            <Text size="xs" c="dimmed">{config.tipo}</Text>
                        </Box>
                    </Group>
                    <motion.div
                        animate={saturationPercent > 70 ? {
                            scale: [1, 1.1, 1],
                            boxShadow: [
                                `0 4px 15px rgba(${config.colorRgb},0.3)`,
                                `0 4px 25px rgba(${config.colorRgb},0.6)`,
                                `0 4px 15px rgba(${config.colorRgb},0.3)`,
                            ]
                        } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <Badge
                            size="xl"
                            color={getStatusColor()}
                            variant="filled"
                            style={{ boxShadow: `0 4px 20px rgba(${config.colorRgb},0.4)` }}
                        >
                            {saturationPercent}%
                        </Badge>
                    </motion.div>
                </Group>

                {/* Estadísticas con animación */}
                <Group justify="space-around" mb="lg">
                    <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Box ta="center">
                            <Text size="xl" fw={800} c={config.color}>
                                {colaTriaje + colaConsulta}
                            </Text>
                            <Text size="xs" c="dimmed">En cola</Text>
                        </Box>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    >
                        <Box ta="center">
                            <Text size="xl" fw={800} c="teal">
                                {state?.pacientes_atendidos_hora ?? 0}/h
                            </Text>
                            <Text size="xs" c="dimmed">Atendidos</Text>
                        </Box>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                    >
                        <Box ta="center">
                            <Group gap={2} justify="center">
                                <IconClock size={14} style={{ color: '#868e96' }} />
                                <Text size="xl" fw={800} c={getStatusColor()}>
                                    {state?.tiempo_medio_total?.toFixed(0) ?? 0}
                                </Text>
                            </Group>
                            <Text size="xs" c="dimmed">min</Text>
                        </Box>
                    </motion.div>
                </Group>

                {/* Secciones del hospital con cubos 3D */}
                <Stack gap="sm">
                    {/* Ventanillas */}
                    <Box>
                        <Group
                            gap={4}
                            mb={8}
                            style={{ cursor: onFlowClick ? 'pointer' : 'default' }}
                            onClick={() => onFlowClick?.(config.id, 'ventanilla')}
                        >
                            <IconDoor size={14} style={{ color: config.color }} />
                            <Text size="xs" fw={600} c={config.color}>
                                Ventanillas {ventanillasOcupadas}/{config.ventanillas}
                            </Text>
                            {onFlowClick && <Text size="xs" c="dimmed">(ver pacientes)</Text>}
                        </Group>
                        <Group gap={10} style={{ perspective: '500px' }}>
                            {Array.from({ length: config.ventanillas }).map((_, i) => (
                                <Cube3D
                                    key={`vent-${i}`}
                                    size={cubeSize.ventanilla}
                                    color={config.color}
                                    occupied={i < ventanillasOcupadas}
                                    saturacion={saturacion}
                                    label={`Ventanilla ${i + 1}`}
                                    index={i}
                                />
                            ))}
                        </Group>
                    </Box>

                    {/* Flujo hacia triaje */}
                    <PatientFlow count={colaTriaje} color={config.color} />

                    {/* Boxes Triaje */}
                    <Box>
                        <Group
                            gap={4}
                            mb={8}
                            style={{ cursor: onFlowClick ? 'pointer' : 'default' }}
                            onClick={() => onFlowClick?.(config.id, 'triaje')}
                        >
                            <IconHeartRateMonitor size={14} style={{ color: config.color }} />
                            <Text size="xs" fw={600} c={config.color}>
                                Triaje {boxesOcupados}/{config.boxes}
                            </Text>
                            {onFlowClick && <Text size="xs" c="dimmed">(ver pacientes)</Text>}
                        </Group>
                        <Group gap={10} wrap="wrap" style={{ perspective: '500px' }}>
                            {Array.from({ length: config.boxes }).map((_, i) => (
                                <Cube3D
                                    key={`box-${i}`}
                                    size={cubeSize.box}
                                    color={config.color}
                                    occupied={i < boxesOcupados}
                                    saturacion={saturacion}
                                    label={`Box ${i + 1}`}
                                    index={i}
                                />
                            ))}
                        </Group>
                    </Box>

                    {/* Flujo hacia consulta */}
                    <PatientFlow count={colaConsulta} color={config.color} />

                    {/* Consultas */}
                    <Box>
                        <Group
                            gap={4}
                            mb={8}
                            style={{ cursor: onFlowClick ? 'pointer' : 'default' }}
                            onClick={() => onFlowClick?.(config.id, 'consulta')}
                        >
                            <IconStethoscope size={14} style={{ color: config.color }} />
                            <Text size="xs" fw={600} c={config.color}>
                                Consultas {consultasOcupadas}/{config.consultas}
                            </Text>
                            {onFlowClick && <Text size="xs" c="dimmed">(ver pacientes)</Text>}
                        </Group>
                        <Group gap={8} wrap="wrap" style={{ perspective: '500px' }}>
                            {Array.from({ length: config.consultas }).map((_, i) => {
                                const speed = config.id === 'chuac' ? getConsultaSpeed(i + 1) : 1;
                                return (
                                    <Cube3D
                                        key={`cons-${i}`}
                                        size={cubeSize.consulta}
                                        color={config.color}
                                        occupied={i < consultasOcupadas}
                                        isAccelerated={speed > 1}
                                        saturacion={saturacion}
                                        label={`Consulta ${i + 1}${speed > 1 ? ` (${speed}x)` : ''}`}
                                        index={i}
                                    />
                                );
                            })}
                        </Group>
                    </Box>
                </Stack>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI MAPA
// ═══════════════════════════════════════════════════════════════════════════════

function MiniMap() {
    const hospitals = useHospitals();

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
        >
            <Paper
                p="sm"
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    background: 'rgba(10,10,15,0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    zIndex: 100,
                    minWidth: 160,
                }}
            >
                <Group gap="xs" mb="sm">
                    <IconActivity size={16} style={{ color: '#228be6' }} />
                    <Text size="xs" fw={700}>Saturación</Text>
                </Group>
                <Stack gap={6}>
                    {Object.entries(HOSPITAL_CONFIG).map(([id, cfg]) => {
                        const sat = hospitals[id]?.nivel_saturacion ?? 0;
                        const satPercent = Math.round(sat * 100);
                        const statusColor = sat > 0.85 ? 'red' : sat > 0.7 ? 'orange' : sat > 0.5 ? 'yellow' : 'green';
                        return (
                            <Group key={id} justify="space-between" gap="xs">
                                <Group gap={6}>
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: cfg.color,
                                            boxShadow: `0 0 8px ${cfg.color}`,
                                        }}
                                    />
                                    <Text size="xs">{cfg.nombre}</Text>
                                </Group>
                                <Badge size="sm" color={statusColor} variant="filled">
                                    {satPercent}%
                                </Badge>
                            </Group>
                        );
                    })}
                </Stack>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLES DE CÁMARA
// ═══════════════════════════════════════════════════════════════════════════════

interface CameraControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRotateLeft: () => void;
    onRotateRight: () => void;
    onReset: () => void;
    isAutoRotating: boolean;
    onToggleAutoRotate: () => void;
}

function CameraControls({
    onZoomIn, onZoomOut, onRotateLeft, onRotateRight, onReset,
    isAutoRotating, onToggleAutoRotate
}: CameraControlsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
        >
            <Paper
                p="xs"
                style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    background: 'rgba(10,10,15,0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    zIndex: 100,
                }}
            >
                <Group gap={6}>
                    <Tooltip label={isAutoRotating ? "Pausar" : "Auto-rotar"}>
                        <ActionIcon
                            variant={isAutoRotating ? "filled" : "subtle"}
                            color={isAutoRotating ? "blue" : "gray"}
                            onClick={onToggleAutoRotate}
                            size="md"
                        >
                            {isAutoRotating ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                        </ActionIcon>
                    </Tooltip>
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                    <Tooltip label="Zoom +">
                        <ActionIcon variant="subtle" color="gray" onClick={onZoomIn} size="md">
                            <IconZoomIn size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Zoom -">
                        <ActionIcon variant="subtle" color="gray" onClick={onZoomOut} size="md">
                            <IconZoomOut size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="← Rotar">
                        <ActionIcon variant="subtle" color="gray" onClick={onRotateLeft} size="md">
                            <IconRotate size={16} style={{ transform: 'scaleX(-1)' }} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Rotar →">
                        <ActionIcon variant="subtle" color="gray" onClick={onRotateRight} size="md">
                            <IconRotate size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Reset">
                        <ActionIcon variant="subtle" color="gray" onClick={onReset} size="md">
                            <IconHome size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Paper>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface CSS3DHospitalSceneProps {
    consultasInfo?: ConsultaInfo[];
    onFlowClick?: (hospitalId: string, area: 'ventanilla' | 'triaje' | 'consulta') => void;
}

export function CSS3DHospitalScene({ consultasInfo, onFlowClick }: CSS3DHospitalSceneProps) {
    const [camera, setCamera] = useState({ rotateX: 10, rotateY: -8, scale: 0.95 });
    const [isAutoRotating, setIsAutoRotating] = useState(false);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const animationRef = useRef<number>();

    // Auto-rotación suave
    useEffect(() => {
        if (!isAutoRotating) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        let lastTime = performance.now();
        const speed = 4;

        const animate = (now: number) => {
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            setCamera(prev => ({ ...prev, rotateY: prev.rotateY - dt * speed }));
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [isAutoRotating]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setIsAutoRotating(false);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setCamera(prev => ({
            ...prev,
            rotateY: prev.rotateY + dx * 0.4,
            rotateX: Math.max(0, Math.min(30, prev.rotateX - dy * 0.3)),
        }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setCamera(prev => ({
            ...prev,
            scale: Math.max(0.5, Math.min(1.3, prev.scale - e.deltaY * 0.001)),
        }));
    }, []);

    const handleZoomIn = useCallback(() => setCamera(p => ({ ...p, scale: Math.min(1.3, p.scale + 0.1) })), []);
    const handleZoomOut = useCallback(() => setCamera(p => ({ ...p, scale: Math.max(0.5, p.scale - 0.1) })), []);
    const handleRotateLeft = useCallback(() => setCamera(p => ({ ...p, rotateY: p.rotateY + 25 })), []);
    const handleRotateRight = useCallback(() => setCamera(p => ({ ...p, rotateY: p.rotateY - 25 })), []);
    const handleReset = useCallback(() => {
        setCamera({ rotateX: 10, rotateY: -8, scale: 0.95 });
        setIsAutoRotating(true);
    }, []);

    return (
        <>
            <style>{cssStyles}</style>
            <Box
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{
                    width: '100%',
                    height: 680,
                    borderRadius: 24,
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, #080810 0%, #101018 50%, #080810 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    cursor: isDragging.current ? 'grabbing' : 'grab',
                    perspective: '2000px',
                }}
            >
                {/* Partículas flotantes */}
                <FloatingParticles />

                {/* Fondo con gradientes */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `
                            radial-gradient(ellipse at 15% 50%, rgba(34,139,230,0.12) 0%, transparent 45%),
                            radial-gradient(ellipse at 50% 50%, rgba(253,126,20,0.1) 0%, transparent 40%),
                            radial-gradient(ellipse at 85% 50%, rgba(64,192,87,0.12) 0%, transparent 45%)
                        `,
                        pointerEvents: 'none',
                    }}
                />

                {/* Grid */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        pointerEvents: 'none',
                    }}
                />

                {/* Contenedor 3D */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${camera.rotateX}deg) rotateY(${camera.rotateY}deg) scale(${camera.scale})`,
                        transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
                    }}
                >
                    {/* Hospitales */}
                    <Group
                        gap={40}
                        align="flex-start"
                        wrap="nowrap"
                        style={{
                            padding: '30px',
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        {Object.entries(HOSPITAL_CONFIG).map(([id, config], index) => (
                            <Hospital3DCard
                                key={id}
                                config={config}
                                consultasInfo={id === 'chuac' ? consultasInfo : undefined}
                                delay={index * 0.2}
                                onFlowClick={onFlowClick}
                            />
                        ))}
                    </Group>
                </div>

                <MiniMap />
                <CameraControls
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onRotateLeft={handleRotateLeft}
                    onRotateRight={handleRotateRight}
                    onReset={handleReset}
                    isAutoRotating={isAutoRotating}
                    onToggleAutoRotate={() => setIsAutoRotating(p => !p)}
                />

                <Text
                    size="xs"
                    c="dimmed"
                    style={{
                        position: 'absolute',
                        bottom: 18,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        opacity: 0.5,
                    }}
                >
                    Arrastra para rotar • Scroll para zoom • Hover en cubos para detalles
                </Text>
            </Box>
        </>
    );
}
