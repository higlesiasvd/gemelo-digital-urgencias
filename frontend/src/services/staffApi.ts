/**
 * Staff Management API Client
 * Conecta con el servicio FastAPI de gestión de personal
 */

const API_BASE_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ============= Tipos =============

export type RolPersonal = 'medico' | 'enfermero' | 'auxiliar' | 'administrativo';
export type TipoTurno = 'manana' | 'tarde' | 'noche' | 'guardia_24h';
export type EstadoDisponibilidad = 'disponible' | 'trabajando' | 'descanso' | 'baja' | 'vacaciones';
export type PrioridadRefuerzo = 'baja' | 'media' | 'alta' | 'urgente' | 'critica';

export interface Personal {
  id: string;
  numero_empleado: string;
  nombre: string;
  apellidos: string;
  rol: RolPersonal;
  especialidad?: string;
  hospital_asignado: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  fecha_contratacion: string;
  horas_semanales_contrato: number;
  puede_hacer_guardias: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PersonalCreate {
  numero_empleado: string;
  nombre: string;
  apellidos: string;
  rol: RolPersonal;
  especialidad?: string;
  hospital_asignado: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  horas_semanales_contrato?: number;
  puede_hacer_guardias?: boolean;
}

export interface Turno {
  id: string;
  personal_id: string;
  fecha: string;
  tipo_turno: TipoTurno;
  hora_inicio: string;
  hora_fin: string;
  hospital: string;
  es_guardia: boolean;
  horas_extra: number;
  confirmado: boolean;
  notas?: string;
}

export interface TurnoCreate {
  personal_id: string;
  fecha: string;
  tipo_turno: TipoTurno;
  hospital: string;
  es_guardia?: boolean;
  horas_extra?: number;
  notas?: string;
}

export interface Disponibilidad {
  id: string;
  personal_id: string;
  fecha: string;
  estado: EstadoDisponibilidad;
  motivo_no_disponible?: string;
  fecha_inicio_periodo?: string;
  fecha_fin_periodo?: string;
  notas?: string;
}

export interface DisponibilidadUpdate {
  personal_id: string;
  fecha: string;
  estado: EstadoDisponibilidad;
  motivo_no_disponible?: string;
  fecha_inicio_periodo?: string;
  fecha_fin_periodo?: string;
  notas?: string;
}

export interface SolicitudRefuerzo {
  id: string;
  hospital_id: string;
  fecha_necesidad: string;
  turno_necesario: string;
  rol_requerido: RolPersonal;
  cantidad_personal: number;
  prioridad: PrioridadRefuerzo;
  motivo: string;
  estado: string;
  demanda_predicha?: number;
  saturacion_predicha?: number;
  generado_automaticamente: boolean;
  personal_asignado?: string[];
  notas?: string;
  created_at?: string;
}

export interface SolicitudRefuerzoCreate {
  hospital_id: string;
  fecha_necesidad: string;
  turno_necesario: string;
  rol_requerido: RolPersonal;
  cantidad_personal?: number;
  prioridad?: PrioridadRefuerzo;
  motivo?: string;
  notas?: string;
}

export interface ResumenDashboard {
  total_personal: number;
  activos_hoy: number;
  en_turno_actual: number;
  de_baja: number;
  de_vacaciones: number;
  solicitudes_pendientes: number;
  por_hospital: Record<string, {
    total: number;
    activos: number;
    en_turno: number;
  }>;
  por_rol: Record<string, number>;
}

export interface HealthCheck {
  status: string;
  database: string;
  timestamp: string;
}

// ============= Cliente API =============

class StaffApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health Check
  async healthCheck(): Promise<HealthCheck> {
    return this.request<HealthCheck>('/health');
  }

  // Dashboard - usa el endpoint de resumen del hospital
  async getResumenDashboard(): Promise<ResumenDashboard> {
    // El endpoint real es /api/hospitales/{hospital_id}/resumen-personal
    try {
      const response = await this.request<{
        totales: {
          programado: number;
          trabajando: number;
          en_baja: number;
          en_vacaciones: number;
          en_descanso: number;
        };
        medicos: { programados: number; disponibles: number };
        enfermeros: { programados: number; disponibles: number };
        auxiliares: { programados: number; disponibles: number };
        refuerzos: { solicitados: number; confirmados: number; guardia_localizada: number };
      }>('/api/hospitales/chuac/resumen-personal');
      
      return {
        total_personal: response.medicos.disponibles + response.enfermeros.disponibles + response.auxiliares.disponibles,
        activos_hoy: response.totales.programado,
        en_turno_actual: response.totales.trabajando || response.totales.programado,
        de_baja: response.totales.en_baja,
        de_vacaciones: response.totales.en_vacaciones,
        solicitudes_pendientes: response.refuerzos.solicitados,
        por_hospital: {
          'chuac': {
            total: response.medicos.disponibles + response.enfermeros.disponibles + response.auxiliares.disponibles,
            activos: response.totales.programado,
            en_turno: response.totales.trabajando || response.totales.programado
          }
        },
        por_rol: {
          'medico': response.medicos.disponibles,
          'enfermero': response.enfermeros.disponibles,
          'auxiliar': response.auxiliares.disponibles
        }
      };
    } catch {
      // Fallback si no hay conexión
      return {
        total_personal: 0,
        activos_hoy: 0,
        en_turno_actual: 0,
        de_baja: 0,
        de_vacaciones: 0,
        solicitudes_pendientes: 0,
        por_hospital: {},
        por_rol: {}
      };
    }
  }

  // ============= Personal =============
  
  async getPersonal(params?: {
    hospital?: string;
    rol?: RolPersonal;
    activo?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Personal[]> {
    const searchParams = new URLSearchParams();
    if (params?.hospital) searchParams.append('hospital_id', params.hospital);
    if (params?.rol) searchParams.append('rol', params.rol);
    if (params?.activo !== undefined) searchParams.append('activo', String(params.activo));
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    
    const query = searchParams.toString();
    return this.request<Personal[]>(`/api/personal${query ? `?${query}` : ''}`);
  }

  async getPersonalById(id: string): Promise<Personal> {
    return this.request<Personal>(`/api/personal/${id}`);
  }

  async createPersonal(data: PersonalCreate): Promise<Personal> {
    return this.request<Personal>('/api/personal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePersonal(id: string, data: Partial<PersonalCreate>): Promise<Personal> {
    return this.request<Personal>(`/api/personal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePersonal(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/personal/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= Turnos =============

  async getTurnos(params?: {
    personal_id?: string;
    hospital?: string;
    fecha?: string;
    skip?: number;
    limit?: number;
  }): Promise<Turno[]> {
    const searchParams = new URLSearchParams();
    // hospital_id es obligatorio en la API
    searchParams.append('hospital_id', params?.hospital || 'chuac');
    if (params?.personal_id) searchParams.append('personal_id', params.personal_id);
    if (params?.fecha) searchParams.append('fecha', params.fecha);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    
    return this.request<Turno[]>(`/api/turnos?${searchParams.toString()}`);
  }

  async createTurno(data: TurnoCreate): Promise<Turno> {
    return this.request<Turno>('/api/turnos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTurno(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/turnos/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= Disponibilidad =============

  async getDisponibilidad(params?: {
    personal_id?: string;
    fecha?: string;
    estado?: EstadoDisponibilidad;
    skip?: number;
    limit?: number;
  }): Promise<Disponibilidad[]> {
    const searchParams = new URLSearchParams();
    if (params?.personal_id) searchParams.append('personal_id', params.personal_id);
    if (params?.fecha) searchParams.append('fecha', params.fecha);
    if (params?.estado) searchParams.append('estado', params.estado);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    
    const query = searchParams.toString();
    return this.request<Disponibilidad[]>(`/api/disponibilidad${query ? `?${query}` : ''}`);
  }

  async updateDisponibilidad(data: DisponibilidadUpdate): Promise<Disponibilidad> {
    return this.request<Disponibilidad>('/api/disponibilidad', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============= Solicitudes de Refuerzo =============

  async getSolicitudesRefuerzo(params?: {
    hospital?: string;
    estado?: string;
    prioridad?: PrioridadRefuerzo;
    skip?: number;
    limit?: number;
  }): Promise<SolicitudRefuerzo[]> {
    const searchParams = new URLSearchParams();
    if (params?.hospital) searchParams.append('hospital_id', params.hospital);
    if (params?.estado) searchParams.append('estado', params.estado);
    if (params?.prioridad) searchParams.append('prioridad', params.prioridad);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    
    const query = searchParams.toString();
    return this.request<SolicitudRefuerzo[]>(`/api/refuerzos${query ? `?${query}` : ''}`);
  }

  async createSolicitudRefuerzo(data: SolicitudRefuerzoCreate): Promise<SolicitudRefuerzo> {
    return this.request<SolicitudRefuerzo>('/api/refuerzos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async responderSolicitud(
    id: string,
    data: {
      estado: string;
      personal_asignado?: string[];
      notas_respuesta?: string;
    }
  ): Promise<SolicitudRefuerzo> {
    return this.request<SolicitudRefuerzo>(`/api/refuerzos/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPersonalDisponibleParaRefuerzo(params: {
    hospital: string;
    fecha: string;
    turno: TipoTurno;
    roles: RolPersonal[];
  }): Promise<Personal[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('hospital_id', params.hospital);
    searchParams.append('fecha', params.fecha);
    searchParams.append('turno', params.turno);
    params.roles.forEach(rol => searchParams.append('roles', rol));
    
    return this.request<Personal[]>(`/api/personal/disponibles-refuerzo?${searchParams.toString()}`);
  }
}

// Exportar instancia singleton
export const staffApi = new StaffApiClient();

// Exportar también la clase para testing
export { StaffApiClient };
