// ═══════════════════════════════════════════════════════════════════════════════
// CSS3D HOSPITAL SCENE - Vista 3D Premium con Layout Horizontal
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
// COMPONENTE: CUBO 3D MEJORADO
// ═══════════════════════════════════════════════════════════════════════════════

interface Cube3DProps {
    size: number;
    color: string;
    occupied: boolean;
    isAccelerated?: boolean;
    saturacion: number;
    label: string;
}

function Cube3D({ size, color, occupied, isAccelerated, saturacion, label }: Cube3DProps) {
    const [hovered, setHovered] = useState(false);

    const bgColor = useMemo(() => {
        if (!occupied) return 'rgba(60,60,80,0.6)';
        if (saturacion > 0.85) return 'rgba(250,82,82,0.9)';
        if (saturacion > 0.7) return 'rgba(253,126,20,0.9)';
        if (saturacion > 0.5) return 'rgba(250,176,5,0.9)';
        return 'rgba(64,192,87,0.9)';
    }, [occupied, saturacion]);

    const glowColor = useMemo(() => {
        if (!occupied) return 'transparent';
        if (saturacion > 0.85) return 'rgba(250,82,82,0.6)';
        if (saturacion > 0.7) return 'rgba(253,126,20,0.5)';
        if (saturacion > 0.5) return 'rgba(250,176,5,0.4)';
        return 'rgba(64,192,87,0.4)';
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
                animate={{
                    scale: hovered ? 1.15 : 1,
                    y: hovered ? -5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{
                    width: size,
                    height: size,
                    background: bgColor,
                    borderRadius: 6,
                    border: `2px solid ${occupied ? color : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: occupied ? `0 4px 20px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                {occupied && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                            duration: isAccelerated ? 0.4 : 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{
                            width: size * 0.5,
                            height: size * 0.5,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 30% 30%, white, ${color})`,
                            boxShadow: `0 0 10px ${color}`,
                        }}
                    />
                )}
                {isAccelerated && occupied && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #fab005, #fd7e14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 8px #fab005',
                        }}
                    >
                        <IconBolt size={10} style={{ color: '#000' }} />
                    </motion.div>
                )}
            </motion.div>
        </Tooltip>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: HOSPITAL CARD 3D
// ═══════════════════════════════════════════════════════════════════════════════

interface Hospital3DCardProps {
    config: typeof HOSPITAL_CONFIG.chuac;
    consultasInfo?: ConsultaInfo[];
}

function Hospital3DCard({ config, consultasInfo }: Hospital3DCardProps) {
    const hospitals = useHospitals();
    const state = hospitals[config.id];

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

    const cubeSize = { ventanilla: 32, box: 36, consulta: 30 };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ flex: 1, minWidth: 280, maxWidth: 400 }}
        >
            <Paper
                p="lg"
                radius="xl"
                style={{
                    background: `linear-gradient(145deg, rgba(${config.colorRgb},0.15) 0%, rgba(20,20,30,0.95) 100%)`,
                    border: `2px solid rgba(${config.colorRgb},0.4)`,
                    boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(${config.colorRgb},0.15)`,
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Header */}
                <Group justify="space-between" mb="lg">
                    <Group gap="sm">
                        <ThemeIcon size={44} radius="xl" style={{ background: config.color }}>
                            <IconUsers size={22} />
                        </ThemeIcon>
                        <Box>
                            <Text size="lg" fw={800} c="white">{config.nombre}</Text>
                            <Text size="xs" c="dimmed">{config.tipo}</Text>
                        </Box>
                    </Group>
                    <motion.div
                        animate={saturationPercent > 70 ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity }}
                    >
                        <Badge
                            size="xl"
                            color={getStatusColor()}
                            variant="filled"
                            style={{ boxShadow: `0 4px 15px rgba(${config.colorRgb},0.3)` }}
                        >
                            {saturationPercent}%
                        </Badge>
                    </motion.div>
                </Group>

                {/* Estadísticas rápidas */}
                <Group justify="space-around" mb="lg">
                    <Box ta="center">
                        <Text size="xl" fw={800} c={config.color}>
                            {colaTriaje + colaConsulta}
                        </Text>
                        <Text size="xs" c="dimmed">En cola</Text>
                    </Box>
                    <Box ta="center">
                        <Text size="xl" fw={800} c="teal">
                            {state?.pacientes_atendidos_hora ?? 0}/h
                        </Text>
                        <Text size="xs" c="dimmed">Atendidos</Text>
                    </Box>
                    <Box ta="center">
                        <Group gap={2} justify="center">
                            <IconClock size={14} style={{ color: '#868e96' }} />
                            <Text size="xl" fw={800} c={getStatusColor()}>
                                {state?.tiempo_medio_total?.toFixed(0) ?? 0}
                            </Text>
                        </Group>
                        <Text size="xs" c="dimmed">min</Text>
                    </Box>
                </Group>

                {/* Secciones del hospital */}
                <Stack gap="md">
                    {/* Ventanillas */}
                    <Box>
                        <Group gap={4} mb={8}>
                            <IconDoor size={14} style={{ color: config.color }} />
                            <Text size="xs" fw={600} c={config.color}>
                                Ventanillas {ventanillasOcupadas}/{config.ventanillas}
                            </Text>
                        </Group>
                        <Group gap={8}>
                            {Array.from({ length: config.ventanillas }).map((_, i) => (
                                <Cube3D
                                    key={`vent-${i}`}
                                    size={cubeSize.ventanilla}
                                    color={config.color}
                                    occupied={i < ventanillasOcupadas}
                                    saturacion={saturacion}
                                    label={`Ventanilla ${i + 1}`}
                                />
                            ))}
                        </Group>
                    </Box>

                    {/* Boxes Triaje */}
                    <Box>
                        <Group gap={4} mb={8}>
                            <IconHeartRateMonitor size={14} style={{ color: config.color }} />
                            <Text size="xs" fw={600} c={config.color}>
                                Triaje {boxesOcupados}/{config.boxes}
                            </Text>
                            {colaTriaje > 0 && (
                                <Badge size="xs" color="orange" variant="filled">
                                    +{colaTriaje} esperando
                                </Badge>
                            )}
                        </Group>
                        <Group gap={8} wrap="wrap">
                            {Array.from({ length: config.boxes }).map((_, i) => (
                                <Cube3D
                                    key={`box-${i}`}
                                    size={cubeSize.box}
                                    color={config.color}
                                    occupied={i < boxesOcupados}
                                    saturacion={saturacion}
                                    label={`Box ${i + 1}`}
                                />
                            ))}
                        </Group>
                    </Box>

                    {/* Consultas */}
                    <Box>
                        <Group gap={4} mb={8}>
                            <IconStethoscope size={14} style={{ color: config.color }} />
                            <Text size="xs" fw={600} c={config.color}>
                                Consultas {consultasOcupadas}/{config.consultas}
                            </Text>
                            {colaConsulta > 0 && (
                                <Badge size="xs" color="orange" variant="filled">
                                    +{colaConsulta} esperando
                                </Badge>
                            )}
                        </Group>
                        <Group gap={6} wrap="wrap">
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
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: cfg.color,
                                        boxShadow: `0 0 6px ${cfg.color}`,
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
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface CSS3DHospitalSceneProps {
    consultasInfo?: ConsultaInfo[];
}

export function CSS3DHospitalScene({ consultasInfo }: CSS3DHospitalSceneProps) {
    const [camera, setCamera] = useState({ rotateX: 8, rotateY: -5, scale: 1 });
    const [isAutoRotating, setIsAutoRotating] = useState(true);
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
        const speed = 3; // grados por segundo

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
            rotateY: prev.rotateY + dx * 0.3,
            rotateX: Math.max(0, Math.min(25, prev.rotateX - dy * 0.3)),
        }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setCamera(prev => ({
            ...prev,
            scale: Math.max(0.6, Math.min(1.5, prev.scale - e.deltaY * 0.001)),
        }));
    }, []);

    const handleZoomIn = useCallback(() => setCamera(p => ({ ...p, scale: Math.min(1.5, p.scale + 0.1) })), []);
    const handleZoomOut = useCallback(() => setCamera(p => ({ ...p, scale: Math.max(0.6, p.scale - 0.1) })), []);
    const handleRotateLeft = useCallback(() => setCamera(p => ({ ...p, rotateY: p.rotateY + 20 })), []);
    const handleRotateRight = useCallback(() => setCamera(p => ({ ...p, rotateY: p.rotateY - 20 })), []);
    const handleReset = useCallback(() => {
        setCamera({ rotateX: 8, rotateY: -5, scale: 1 });
        setIsAutoRotating(true);
    }, []);

    return (
        <Box
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
                width: '100%',
                height: 650,
                borderRadius: 24,
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #0a0a12 0%, #12121a 50%, #0a0a12 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                cursor: isDragging.current ? 'grabbing' : 'grab',
                perspective: '1500px',
            }}
        >
            {/* Fondo con gradientes de color */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `
                        radial-gradient(ellipse at 20% 50%, rgba(34,139,230,0.1) 0%, transparent 40%),
                        radial-gradient(ellipse at 50% 50%, rgba(253,126,20,0.08) 0%, transparent 35%),
                        radial-gradient(ellipse at 80% 50%, rgba(64,192,87,0.1) 0%, transparent 40%)
                    `,
                    pointerEvents: 'none',
                }}
            />

            {/* Grid de fondo */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
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
                {/* Hospitales en fila horizontal */}
                <Group
                    gap="xl"
                    align="flex-start"
                    wrap="nowrap"
                    style={{
                        padding: '40px',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {Object.entries(HOSPITAL_CONFIG).map(([id, config]) => (
                        <Hospital3DCard
                            key={id}
                            config={config}
                            consultasInfo={id === 'chuac' ? consultasInfo : undefined}
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
    );
}
