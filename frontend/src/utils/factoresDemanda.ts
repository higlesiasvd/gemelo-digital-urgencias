/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FACTORES DE DEMANDA - Definiciones consistentes con el backend Python
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Estos factores deben coincidir con los definidos en:
 * - src/infrastructure/external_services/weather_service.py
 * - src/infrastructure/external_services/holidays_service.py
 * - src/infrastructure/external_services/football_service.py
 * - src/infrastructure/external_services/events_service.py
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORES DE TEMPERATURA (weather_service.py)
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularFactorTemperatura(temperatura: number): number {
  // Ola de calor (>35C): +30% urgencias
  if (temperatura > 35) return 1.3;
  // Calor fuerte (30-35C): +15%
  if (temperatura > 30) return 1.15;
  // Frio intenso (<5C): +20%
  if (temperatura < 5) return 1.2;
  // Frio moderado (5-10C): +10%
  if (temperatura < 10) return 1.1;
  // Normal
  return 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORES DE LLUVIA (weather_service.py)
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularFactorLluvia(estaLloviendo: boolean, lluviaMm: number = 0): number {
  if (!estaLloviendo) return 1.0;
  // Lluvia intensa (>5mm/h): +25% (mas accidentes)
  if (lluviaMm > 5) return 1.25;
  // Lluvia moderada (1-5mm/h): +15%
  if (lluviaMm > 1) return 1.15;
  // Lluvia ligera: +10%
  return 1.1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORES DE FESTIVOS (holidays_service.py)
// ═══════════════════════════════════════════════════════════════════════════════

export function calcularFactorFestivo(esFestivo: boolean, esFinDeSemana: boolean, esPuente: boolean = false): number {
  // Los festivos suelen reducir demanda general pero aumentan ciertos tipos
  if (esFestivo) {
    // Puente: reduccion adicional
    if (esPuente) return 0.75;
    return 0.85;
  }
  // Fin de semana (sin festivo)
  if (esFinDeSemana) return 0.9;
  // Dia laboral normal
  return 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORES DE EVENTOS (events_service.py, football_service.py)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FactorEvento {
  nombre: string;
  tipo: 'futbol' | 'concierto' | 'festival' | 'maraton' | 'feria' | 'otro';
  asistentes: number;
  esLocal: boolean;
  factorDemanda: number;
  factorTrauma: number;
  factorAlcohol: number;
}

export function calcularFactorEvento(tipo: string, asistentes: number, esLocal: boolean = true): FactorEvento {
  let factorDemanda = 1.0;
  let factorTrauma = 1.0;
  let factorAlcohol = 1.0;

  // Partido de futbol en casa
  if (tipo === 'futbol' && esLocal) {
    factorDemanda = 1.15;
    // Ajustar por asistencia
    if (asistentes > 25000) {
      factorDemanda *= 1.2;
      factorAlcohol = 1.5;
      factorTrauma = 1.3;
    } else if (asistentes > 15000) {
      factorDemanda *= 1.1;
      factorAlcohol = 1.3;
      factorTrauma = 1.15;
    }
  }

  // Concierto/Festival
  if (tipo === 'concierto' || tipo === 'festival') {
    const factorBase = Math.min(1.5, 1.0 + (asistentes / 50000) * 0.5);
    factorDemanda = factorBase;
    factorAlcohol = factorBase * 1.2;
    factorTrauma = factorBase * 1.1;
  }

  // Maraton/Carrera popular
  if (tipo === 'maraton') {
    factorDemanda = 1.2;
    factorTrauma = 1.4; // Mas lesiones deportivas
    factorAlcohol = 1.0;
  }

  // Feria/Fiestas populares
  if (tipo === 'feria' || tipo === 'festival') {
    factorDemanda = 1.25;
    factorAlcohol = 1.6;
    factorTrauma = 1.2;
  }

  return {
    nombre: tipo,
    tipo: tipo as FactorEvento['tipo'],
    asistentes,
    esLocal,
    factorDemanda: Math.round(factorDemanda * 100) / 100,
    factorTrauma: Math.round(factorTrauma * 100) / 100,
    factorAlcohol: Math.round(factorAlcohol * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATRON HORARIO (predictor.py)
// ═══════════════════════════════════════════════════════════════════════════════

export const PATRON_HORARIO: Record<number, number> = {
  0: 0.5, 1: 0.4, 2: 0.3, 3: 0.3, 4: 0.3, 5: 0.4,
  6: 0.6, 7: 0.8, 8: 1.0, 9: 1.3, 10: 1.5, 11: 1.6,
  12: 1.5, 13: 1.3, 14: 1.1, 15: 1.2, 16: 1.4, 17: 1.5,
  18: 1.4, 19: 1.3, 20: 1.2, 21: 1.0, 22: 0.8, 23: 0.6
};

// ═══════════════════════════════════════════════════════════════════════════════
// PATRON SEMANAL (predictor.py)
// ═══════════════════════════════════════════════════════════════════════════════

export const PATRON_SEMANAL: Record<number, number> = {
  0: 1.1,  // Lunes - acumulado fin de semana
  1: 1.0,  // Martes
  2: 1.0,  // Miercoles
  3: 1.0,  // Jueves
  4: 1.1,  // Viernes
  5: 0.9,  // Sabado
  6: 0.9   // Domingo
};

// ═══════════════════════════════════════════════════════════════════════════════
// LLEGADAS BASE POR HOSPITAL (predictor.py)
// ═══════════════════════════════════════════════════════════════════════════════

export const LLEGADAS_BASE_DIA: Record<string, number> = {
  chuac: 420,      // Hospital de referencia
  modelo: 120,
  san_rafael: 80,
};

export const LLEGADAS_BASE_HORA: Record<string, number> = {
  chuac: 17.5,     // 420/24
  modelo: 5.0,     // 120/24
  san_rafael: 3.3, // 80/24
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCION COMBINADA PARA CALCULAR FACTOR TOTAL
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContextoDemanda {
  temperatura?: number;
  estaLloviendo?: boolean;
  lluviaMm?: number;
  esFestivo?: boolean;
  esFinDeSemana?: boolean;
  esPuente?: boolean;
  eventos?: Array<{tipo: string; asistentes: number; esLocal?: boolean}>;
}

export interface FactoresDemanda {
  factorTemperatura: number;
  factorLluvia: number;
  factorFestivo: number;
  factorEventos: number;
  factorTotal: number;
  detalleEventos: FactorEvento[];
}

export function calcularFactoresDemanda(contexto: ContextoDemanda): FactoresDemanda {
  const factorTemperatura = contexto.temperatura !== undefined
    ? calcularFactorTemperatura(contexto.temperatura)
    : 1.0;

  const factorLluvia = calcularFactorLluvia(
    contexto.estaLloviendo || false,
    contexto.lluviaMm || 0
  );

  const factorFestivo = calcularFactorFestivo(
    contexto.esFestivo || false,
    contexto.esFinDeSemana || false,
    contexto.esPuente || false
  );

  // Calcular factor de eventos (maximo de todos los eventos)
  let factorEventos = 1.0;
  const detalleEventos: FactorEvento[] = [];

  if (contexto.eventos && contexto.eventos.length > 0) {
    for (const evento of contexto.eventos) {
      const factor = calcularFactorEvento(evento.tipo, evento.asistentes, evento.esLocal);
      detalleEventos.push(factor);
      if (factor.factorDemanda > factorEventos) {
        factorEventos = factor.factorDemanda;
      }
    }
  }

  // Factor total combinado
  const factorTotal = factorTemperatura * factorLluvia * factorFestivo * factorEventos;

  return {
    factorTemperatura: Math.round(factorTemperatura * 100) / 100,
    factorLluvia: Math.round(factorLluvia * 100) / 100,
    factorFestivo: Math.round(factorFestivo * 100) / 100,
    factorEventos: Math.round(factorEventos * 100) / 100,
    factorTotal: Math.round(factorTotal * 100) / 100,
    detalleEventos,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIOS WHAT-IF (consistentes con WhatIfSimulator)
// ═══════════════════════════════════════════════════════════════════════════════

export const ESCENARIOS_WHATIF = {
  flu_outbreak: {
    nombre: 'Brote de Gripe',
    multiplicador: 1.5,
    duracion_dias: 7,
    descripcion: 'Aumento del 50% en urgencias respiratorias',
  },
  heatwave: {
    nombre: 'Ola de Calor',
    multiplicador: 1.3,
    temperatura_umbral: 35,
    descripcion: 'Temperaturas >35C durante varios dias',
  },
  mass_event: {
    nombre: 'Evento Masivo',
    multiplicador: 1.35,
    asistentes_base: 30000,
    descripcion: 'Partido en Riazor + concierto',
  },
  staff_reduction: {
    nombre: 'Reduccion Personal',
    multiplicador_tiempo_espera: 1.25,
    reduccion_capacidad: 0.2,
    descripcion: 'Bajas laborales o huelga parcial',
  },
  add_boxes: {
    nombre: 'Ampliar Boxes',
    multiplicador_capacidad: 1.25,
    descripcion: 'Apertura de boxes adicionales',
  },
} as const;

export type EscenarioWhatIf = keyof typeof ESCENARIOS_WHATIF;
