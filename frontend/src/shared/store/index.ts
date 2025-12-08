// ═══════════════════════════════════════════════════════════════════════════════
// STORE GLOBAL - ZUSTAND
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { HospitalState, ContextoExterno, Derivacion } from '@/shared/types';

interface AppState {
    // Conexión
    isConnected: boolean;
    setConnected: (connected: boolean) => void;

    // Estado de hospitales
    hospitals: Record<string, HospitalState>;
    updateHospitalState: (hospitalId: string, state: HospitalState) => void;

    // Contexto externo
    contexto: ContextoExterno;
    updateContexto: (contexto: Partial<ContextoExterno>) => void;

    // Derivaciones activas
    derivaciones: Derivacion[];
    addDerivacion: (derivacion: Derivacion) => void;
    clearDerivacion: (id: number) => void;

    // Last update
    lastUpdate: Date | null;
}

export const useAppStore = create<AppState>((set) => ({
    // Conexión
    isConnected: false,
    setConnected: (connected) => set({ isConnected: connected }),

    // Hospitales
    hospitals: {},
    updateHospitalState: (hospitalId, state) =>
        set((prev) => ({
            hospitals: { ...prev.hospitals, [hospitalId]: state },
            lastUpdate: new Date(),
        })),

    // Contexto
    contexto: {
        temperatura: null,
        condicion_climatica: null,
        factor_eventos: 1.0,
        es_festivo: false,
    },
    updateContexto: (contexto) =>
        set((prev) => ({
            contexto: { ...prev.contexto, ...contexto },
        })),

    // Derivaciones
    derivaciones: [],
    addDerivacion: (derivacion) =>
        set((prev) => ({
            derivaciones: [derivacion, ...prev.derivaciones].slice(0, 50),
        })),
    clearDerivacion: (id) =>
        set((prev) => ({
            derivaciones: prev.derivaciones.filter((d) => d.id !== id),
        })),

    // Last update
    lastUpdate: null,
}));

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTORES
// ═══════════════════════════════════════════════════════════════════════════════

export const useIsConnected = () => useAppStore((s) => s.isConnected);
export const useHospitals = () => useAppStore((s) => s.hospitals);
export const useHospitalById = (id: string) => useAppStore((s) => s.hospitals[id]);
export const useContexto = () => useAppStore((s) => s.contexto);
export const useDerivaciones = () => useAppStore((s) => s.derivaciones);
export const useLastUpdate = () => useAppStore((s) => s.lastUpdate);

// Selector para saturación global
export const useSystemSaturation = () =>
    useAppStore((s) => {
        const hospitals = Object.values(s.hospitals);
        if (hospitals.length === 0) return 0;
        return hospitals.reduce((acc, h) => acc + (h.nivel_saturacion || 0), 0) / hospitals.length;
    });

// Selector para hospitales críticos
export const useCriticalHospitals = () =>
    useAppStore((s) =>
        Object.entries(s.hospitals)
            .filter(([_, h]) => (h.nivel_saturacion || 0) > 0.85)
            .map(([id]) => id)
    );
