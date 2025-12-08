// ═══════════════════════════════════════════════════════════════════════════════
// API CLIENT - REACT QUERY + FETCH
// ═══════════════════════════════════════════════════════════════════════════════

import { QueryClient } from '@tanstack/react-query';
import type { HospitalConfig, StaffMember, MedicoSergas } from '@/shared/types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const MCP_BASE_URL = import.meta.env.VITE_MCP_URL || 'http://localhost:8080';
export const PROPHET_BASE_URL = import.meta.env.VITE_PROPHET_URL || 'http://localhost:8001';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: 30000,
        },
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOSPITALES
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchHospitals(): Promise<{ hospitales: HospitalConfig[] }> {
    return fetchAPI('/hospitals');
}

export async function fetchHospitalState(hospitalId: string) {
    return fetchAPI(`/hospitals/${hospitalId}/state`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF & SERGAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchStaff(hospitalId?: string): Promise<StaffMember[]> {
    const params = hospitalId ? `?hospital_id=${hospitalId}` : '';
    return fetchAPI(`/staff${params}`);
}

export async function fetchListaSergas(disponible?: boolean): Promise<MedicoSergas[]> {
    const params = disponible !== undefined ? `?disponible=${disponible}` : '';
    return fetchAPI(`/staff/lista-sergas${params}`);
}

export async function assignDoctor(medicoId: string, consultaId: number): Promise<unknown> {
    return fetchAPI('/staff/assign', {
        method: 'POST',
        body: JSON.stringify({
            medico_id: medicoId,
            hospital_id: 'chuac',
            consulta_id: consultaId,
        }),
    });
}

export async function unassignDoctor(medicoId: string, motivo?: string): Promise<unknown> {
    return fetchAPI('/staff/unassign', {
        method: 'POST',
        body: JSON.stringify({
            medico_id: medicoId,
            motivo,
        }),
    });
}

export async function scaleConsulta(consultaId: number, targetMedicos: number): Promise<unknown> {
    return fetchAPI(`/staff/chuac/consultas/${consultaId}/scale?to=${targetMedicos}`, {
        method: 'POST',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchSimulationStatus() {
    return fetchAPI('/simulation/status');
}

export async function startSimulation() {
    return fetchAPI('/simulation/start', { method: 'POST' });
}

export async function stopSimulation() {
    return fetchAPI('/simulation/stop', { method: 'POST' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICCIÓN (Prophet Service)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Prediccion {
    hora: number;
    timestamp: string;
    llegadas_esperadas: number;
    minimo: number;
    maximo: number;
    factor_escenario: number;
}

export interface PredictionResponse {
    hospital_id: string;
    predicciones: Prediccion[];
    resumen: {
        total_esperado: number;
        promedio_hora: number;
        hora_pico: number;
        llegadas_pico: number;
        hora_valle: number;
        llegadas_valle: number;
        factor_escenario_aplicado: number;
    };
    escenario_aplicado: string | null;
    generado_en: string;
}

// Extended prediction types
export interface WhatIfScenario {
    lluvia?: boolean;
    evento_masivo?: boolean;
    personal_reducido?: number;
    temperatura_extrema?: boolean;
    partido_futbol?: boolean;
    incidente_grave?: boolean;
    epidemia?: boolean;
}

export interface ExtendedPrediccion {
    hora: number;
    timestamp: string;
    llegadas_esperadas: number;
    llegadas_min: number;
    llegadas_max: number;
    saturacion_estimada: number;
    boxes_ocupados_estimados: number;
    tiempo_espera_triaje: number;
    tiempo_espera_consulta: number;
    tiempo_total_estimado: number;
    derivaciones_estimadas: number;
    probabilidad_derivacion: number;
    personal_necesario: Record<string, number>;
    personal_deficit: Record<string, number>;
    factor_escenario: number;
    nivel_alerta: string;
}

export interface ExtendedPredictionResponse {
    hospital_id: string;
    hospital_nombre: string;
    predicciones: ExtendedPrediccion[];
    resumen: {
        total_llegadas: number;
        promedio_hora: number;
        saturacion_promedio: number;
        saturacion_maxima: number;
        tiempo_espera_maximo: number;
        derivaciones_totales: number;
        horas_criticas: number;
        factor_demanda: number;
        factor_tiempo: number;
    };
    graficos: {
        llegadas: Array<{ x: number; y: number; min: number; max: number }>;
        saturacion: Array<{ x: number; y: number }>;
        tiempos: Array<{ x: number; triaje: number; consulta: number; total: number }>;
        derivaciones: Array<{ x: number; y: number }>;
    };
    alertas: Array<{
        hora: number;
        timestamp: string;
        tipo: string;
        mensaje: string;
        recomendacion: string;
    }>;
    escenario_aplicado: WhatIfScenario | null;
    generado_en: string;
}

export interface HospitalComparison {
    periodo_horas: number;
    escenario: WhatIfScenario;
    hospitales: Record<string, {
        nombre: string;
        llegadas_totales: number;
        promedio_hora: number;
        saturacion_maxima: number;
        capacidad_boxes: number;
        recomendacion: string;
    }>;
    generado_en: string;
}

export async function fetchPrediction(hospitalId: string, hours: number = 24): Promise<PredictionResponse> {
    const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: hospitalId, hours_ahead: hours }),
    });

    if (!response.ok) {
        throw new Error(`Prediction Error: ${response.status}`);
    }

    return response.json();
}

export async function fetchExtendedPrediction(
    hospitalId: string,
    hours: number = 24,
    scenario?: WhatIfScenario
): Promise<ExtendedPredictionResponse> {
    const response = await fetch(`${API_BASE_URL}/predict/extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hospital_id: hospitalId,
            hours_ahead: hours,
            scenario: scenario || null,
            metricas: ["llegadas", "saturacion", "tiempo_espera", "derivaciones", "personal"]
        }),
    });

    if (!response.ok) {
        throw new Error(`Extended Prediction Error: ${response.status}`);
    }

    return response.json();
}

export async function fetchHospitalComparison(
    hours: number = 24,
    scenario?: { lluvia?: boolean; evento?: boolean }
): Promise<HospitalComparison> {
    const params = new URLSearchParams({ hours_ahead: hours.toString() });
    if (scenario?.lluvia) params.append('scenario_lluvia', 'true');
    if (scenario?.evento) params.append('scenario_evento', 'true');

    return fetchAPI(`/predict/compare?${params.toString()}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP (CHATBOT)
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendChatMessage(message: string) {
    const response = await fetch(`${MCP_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });

    if (!response.ok) {
        throw new Error(`MCP Error: ${response.status}`);
    }

    return response.json();
}

export async function fetchMCPStatus() {
    return fetch(`${MCP_BASE_URL}/status`).then((r) => r.json());
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENTES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IncidentLocation {
    lat: number;
    lon: number;
}

export interface GenerateIncidentRequest {
    tipo: 'accidente_trafico' | 'incendio' | 'evento_deportivo' | 'intoxicacion_masiva' | 'colapso_estructura' | 'accidente_laboral';
    ubicacion: IncidentLocation;
    gravedad: 'leve' | 'moderado' | 'grave' | 'catastrofico';
    descripcion?: string;
}

export interface IncidentPatient {
    patient_id: string;
    nombre: string;
    edad: number;
    nivel_triaje: string;
    patologia: string;
}

export interface IncidentResponse {
    incident_id: string;
    tipo: string;
    nombre: string;
    icono: string;
    ubicacion: IncidentLocation;
    hospital_destino: string;
    hospital_nombre: string;
    pacientes_generados: number;
    pacientes_detalle: IncidentPatient[];
    distancia_km: number;
    timestamp: string;
}

export interface IncidentType {
    id: string;
    nombre: string;
    icono: string;
    pacientes_rango: string;
    patologias: string[];
}

export async function generateIncident(request: GenerateIncidentRequest): Promise<IncidentResponse> {
    return fetchAPI('/incidents/generate', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export async function fetchActiveIncidents(): Promise<{ total: number; incidentes: IncidentResponse[] }> {
    return fetchAPI('/incidents/active');
}

export async function fetchIncidentTypes(): Promise<{ tipos: IncidentType[] }> {
    return fetchAPI('/incidents/types');
}

export async function clearIncidents(): Promise<{ success: boolean; cleared: number }> {
    return fetchAPI('/incidents/clear', { method: 'POST' });
}
