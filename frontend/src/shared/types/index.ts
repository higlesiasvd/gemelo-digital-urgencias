// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - HOSPITALES Y DATOS EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════════════════

export type HospitalId = 'chuac' | 'modelo' | 'san_rafael';

export interface HospitalConfig {
    id: HospitalId;
    nombre: string;
    tipo: 'referencia' | 'privado' | 'comarcal';
    ventanillas: number;
    boxes_triaje: number;
    consultas: number;
    escalable: boolean;
    medicos_max_consulta: number;
}

export interface HospitalState {
    id: string;
    nombre: string;
    ventanillas_ocupadas: number;
    ventanillas_totales: number;
    boxes_ocupados: number;
    boxes_totales: number;
    ocupacion_boxes: number;
    consultas_ocupadas: number;
    consultas_totales: number;
    ocupacion_consultas: number;
    cola_triaje: number;
    cola_consulta: number;
    tiempo_medio_espera: number;
    tiempo_medio_total: number;
    nivel_saturacion: number;
    emergencia_activa: boolean;
    pacientes_atendidos_hora: number;
    pacientes_derivados: number;
    ultimo_update: string | null;
}

export interface ContextoExterno {
    temperatura: number | null;
    condicion_climatica: string | null;
    factor_eventos: number;
    es_festivo: boolean;
}

export interface SystemStatus {
    estado_general: 'NORMAL' | 'ATENCION' | 'ALERTA' | 'CRITICO';
    saturacion_global: number;
    boxes_ocupados: number;
    boxes_totales: number;
    pacientes_en_espera: number;
    hospitales_activos: number;
    hospitales: Record<string, HospitalState>;
    contexto: ContextoExterno;
    timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - PERSONAL Y SERGAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface StaffMember {
    staff_id: string;
    nombre: string;
    rol: 'medico' | 'enfermera' | 'celador';
    hospital_id: HospitalId;
    asignacion_actual: string | null;
    estado: 'disponible' | 'ocupado' | 'descanso';
}

export interface MedicoSergas {
    medico_id: string;
    nombre: string;
    especialidad: string | null;
    disponible: boolean;
    asignado_a_hospital: string | null;
    asignado_a_consulta: number | null;
}

export interface Consulta {
    numero_consulta: number;
    hospital_id: HospitalId;
    medicos_asignados: number;
    velocidad_factor: number;
    ocupada: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - DERIVACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Derivacion {
    id: number;
    hospital_origen: HospitalId;
    hospital_destino: HospitalId;
    motivo: string;
    nivel_urgencia: 'alta' | 'media' | 'baja';
    timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - WEBSOCKET
// ═══════════════════════════════════════════════════════════════════════════════

export interface WSMessage {
    type: 'status_update' | 'hospital_stats' | 'diversion_alert' | 'doctor_assigned' | 'doctor_unassigned';
    data: unknown;
}

export interface StatusUpdateMessage {
    type: 'status_update';
    data: SystemStatus;
}

export interface DiversionAlertMessage {
    type: 'diversion_alert';
    data: {
        hospital_origen: HospitalId;
        hospital_destino: HospitalId;
        motivo: string;
        nivel_urgencia: string;
    };
}
