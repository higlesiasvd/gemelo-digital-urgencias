export interface HospitalStats {
  hospital_id: string;
  // Ocupación
  ocupacion_boxes: number;
  ocupacion_observacion: number;
  boxes_ocupados: number;
  boxes_totales: number;
  observacion_ocupadas: number;
  observacion_totales: number;
  // Colas - campo correcto del simulador
  pacientes_en_espera_triaje: number;
  pacientes_en_espera_atencion: number;
  // Tiempos - campos correctos del simulador  
  tiempo_medio_espera: number;
  tiempo_medio_atencion: number;
  tiempo_medio_total: number;
  // Contadores
  pacientes_llegados_hora: number;
  pacientes_atendidos_hora: number;
  pacientes_derivados: number;
  // Estado
  nivel_saturacion: number;
  emergencia_activa: boolean;
  timestamp: number;
}

export interface Paciente {
  id: number;
  hospital_id: string;
  edad: number;
  nivel_triaje: 'ROJO' | 'NARANJA' | 'AMARILLO' | 'VERDE' | 'AZUL';
  patologia: string;
  tiempo_total?: number;
  tiempo_espera_atencion?: number;
  destino?: string;
  derivado_a?: string;
}

export interface EventoPaciente {
  tipo: 'llegada' | 'triaje' | 'atencion' | 'alta' | 'ingreso';
  timestamp: number;
  paciente_id: number;
  edad: number;
  nivel_triaje: string;
  patologia: string;
  tiempo_total?: number;
  tiempo_espera_atencion?: number;
  destino?: string;
  derivado_a?: string;
  contexto?: ContextoPaciente;
}

export interface ContextoPaciente {
  hora_dia: number;
  dia_semana: number;
  es_festivo: boolean;
  temperatura: number;
  condicion_climatica: string;
  eventos_proximos: number;
  partido_proximo: boolean;
}

export interface Prediccion {
  timestamp: string;
  hora: number;
  llegadas_esperadas: number;
  minimo: number;
  maximo: number;
}

export interface AlertaPrediccion {
  tipo: string;
  nivel: 'info' | 'warning' | 'critical';
  mensaje: string;
  hospital: string;
  z_score: number;
  timestamp: Date;
}

export interface HospitalInfo {
  id: string;
  nombre: string;
  ubicacion: string;
  num_boxes: number;
  num_camas_observacion: number;
  pacientes_dia_base: number;
  coordenadas: {
    lat: number;
    lon: number;
  };
}

export const HOSPITALES: Record<string, HospitalInfo> = {
  chuac: {
    id: 'chuac',
    nombre: 'CHUAC - Hospital Universitario',
    ubicacion: 'A Coruña',
    num_boxes: 40,
    num_camas_observacion: 20,
    pacientes_dia_base: 180,
    coordenadas: { lat: 43.3623, lon: -8.4115 },
  },
  hm_modelo: {
    id: 'hm_modelo',
    nombre: 'Hospital HM Modelo',
    ubicacion: 'A Coruña',
    num_boxes: 15,
    num_camas_observacion: 8,
    pacientes_dia_base: 60,
    coordenadas: { lat: 43.3713, lon: -8.3960 },
  },
  san_rafael: {
    id: 'san_rafael',
    nombre: 'Hospital San Rafael',
    ubicacion: 'A Coruña',
    num_boxes: 12,
    num_camas_observacion: 6,
    pacientes_dia_base: 45,
    coordenadas: { lat: 43.3655, lon: -8.4102 },
  },
};
