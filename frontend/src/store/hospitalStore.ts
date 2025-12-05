import { create } from 'zustand';
import type { HospitalStats, AlertaPrediccion } from '@/types/hospital';

// Contexto externo (clima, eventos, festivos)
export interface ContextoExterno {
  temperatura?: number;
  esta_lloviendo?: boolean;
  condicion_climatica?: string;
  factor_eventos: number;
  factor_festivos: number;
  es_festivo: boolean;
  es_fin_de_semana: boolean;
  partido_proximo?: boolean;
  eventos_proximos?: string[];
}

interface HospitalStore {
  stats: Record<string, HospitalStats>;
  alerts: AlertaPrediccion[];
  contexto: ContextoExterno | null;
  selectedHospital: string | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  publishMessage: ((topic: string, message: object) => boolean) | null;

  // Actions
  updateStats: (hospitalId: string, stats: HospitalStats) => void;
  updateContexto: (contexto: Partial<ContextoExterno>) => void;
  addAlert: (alert: AlertaPrediccion) => void;
  clearOldAlerts: (maxAge: number) => void;
  setSelectedHospital: (hospitalId: string | null) => void;
  setConnected: (connected: boolean) => void;
  setPublishFunction: (fn: (topic: string, message: object) => boolean) => void;
  reset: () => void;
}

export const useHospitalStore = create<HospitalStore>((set) => ({
  stats: {},
  alerts: [],
  contexto: null,
  selectedHospital: null,
  isConnected: false,
  lastUpdate: null,
  publishMessage: null,

  updateStats: (hospitalId, stats) =>
    set((state) => ({
      stats: {
        ...state.stats,
        [hospitalId]: stats,
      },
      lastUpdate: new Date(),
    })),

  updateContexto: (contexto) =>
    set((state) => ({
      contexto: {
        ...state.contexto,
        ...contexto,
      } as ContextoExterno,
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50), // Keep last 50 alerts
    })),

  clearOldAlerts: (maxAge) =>
    set((state) => {
      const cutoff = Date.now() - maxAge;
      return {
        alerts: state.alerts.filter((alert) => alert.timestamp.getTime() > cutoff),
      };
    }),

  setSelectedHospital: (hospitalId) =>
    set({ selectedHospital: hospitalId }),

  setConnected: (connected) =>
    set({ isConnected: connected }),

  setPublishFunction: (fn) =>
    set({ publishMessage: fn }),

  reset: () =>
    set({
      stats: {},
      alerts: [],
      selectedHospital: null,
      isConnected: false,
      lastUpdate: null,
      publishMessage: null,
    }),
}));
