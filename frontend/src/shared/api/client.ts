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

export async function fetchPrediction(hospitalId: string, hours: number = 24): Promise<PredictionResponse> {
    const response = await fetch(`${PROPHET_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: hospitalId, hours }),
    });

    if (!response.ok) {
        throw new Error(`Prophet Error: ${response.status}`);
    }

    return response.json();
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
