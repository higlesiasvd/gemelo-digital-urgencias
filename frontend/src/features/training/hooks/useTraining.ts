// ═══════════════════════════════════════════════════════════════════════════════
// USE TRAINING HOOK - React Query hooks for training API
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Lesson {
    lesson_id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    icono: string;
    color: string;
    orden: number;
    ejercicios_requeridos: number;
    xp_recompensa: number;
    ejercicios_completados: number;
    estrellas: number;
    completada: boolean;
    desbloqueada: boolean;
}

export interface ConstantesVitales {
    pa?: string;
    fc?: number;
    sato2?: number;
    temp?: number;
}

export interface ClinicalCase {
    case_id: string;
    titulo: string;
    descripcion: string;
    paciente_edad: number | null;
    paciente_sexo: string | null;
    motivo_consulta: string;
    sintomas: string[];
    constantes_vitales: ConstantesVitales | null;
    antecedentes: string | null;
}

export interface SubmitAnswerRequest {
    case_id: string;
    respuesta: string;
    tiempo_ms?: number;
}

export interface SubmitAnswerResponse {
    es_correcta: boolean;
    respuesta_correcta: string;
    explicacion: string;
    xp_obtenido: number;
    xp_total: number;
    vidas_restantes: number;
    racha_correctas: number;
    badges_desbloqueados: string[];
}

export interface UserStats {
    xp_total: number;
    nivel: number;
    racha_dias: number;
    racha_max: number;
    vidas: number;
    ejercicios_hoy: number;
    ejercicios_total: number;
    precision: number;
    lecciones_completadas: number;
}

export interface Badge {
    badge_id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    icono: string;
    color: string;
    obtenido: boolean;
    obtenido_en: string | null;
}

export interface LeaderboardEntry {
    rank: number;
    user_id: string;
    nombre: string;
    avatar_url: string | null;
    xp_total: number;
    nivel: number;
    racha_dias: number;
    badges_count: number;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    user_rank: number | null;
    total_users: number;
}

export interface UserProfile {
    user_id: string;
    nombre: string;
    apellidos: string | null;
    avatar_url: string | null;
    xp_total: number;
    nivel: number;
    racha_dias: number;
    racha_max: number;
    badges: Badge[];
    lecciones_completadas: number;
    ejercicios_total: number;
    precision: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWithAuth(endpoint: string, token: string | null, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - LESSONS
// ═══════════════════════════════════════════════════════════════════════════════

export function useLessons() {
    const { token } = useAuth();

    return useQuery<Lesson[]>({
        queryKey: ['training', 'lessons'],
        queryFn: () => fetchWithAuth('/training/lessons', token),
        enabled: !!token,
        staleTime: 30000, // 30 seconds
    });
}

export function useLessonExercises(lessonId: string, limit: number = 10) {
    const { token } = useAuth();

    return useQuery<ClinicalCase[]>({
        queryKey: ['training', 'exercises', lessonId],
        queryFn: () => fetchWithAuth(`/training/lessons/${lessonId}/exercises?limit=${limit}`, token),
        enabled: !!token && !!lessonId,
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - EXERCISE SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════════

export function useSubmitAnswer() {
    const { token, refreshUser } = useAuth();
    const queryClient = useQueryClient();

    return useMutation<SubmitAnswerResponse, Error, SubmitAnswerRequest>({
        mutationFn: (data) =>
            fetchWithAuth('/training/exercises/submit', token, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            // Refresh user data and lessons after submitting
            refreshUser();
            queryClient.invalidateQueries({ queryKey: ['training', 'lessons'] });
            queryClient.invalidateQueries({ queryKey: ['training', 'stats'] });
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - STATS
// ═══════════════════════════════════════════════════════════════════════════════

export function useUserStats() {
    const { token } = useAuth();

    return useQuery<UserStats>({
        queryKey: ['training', 'stats'],
        queryFn: () => fetchWithAuth('/training/stats', token),
        enabled: !!token,
        staleTime: 10000, // 10 seconds
    });
}

export function useRestoreLife() {
    const { token, refreshUser } = useAuth();

    return useMutation({
        mutationFn: () =>
            fetchWithAuth('/training/restore-life', token, { method: 'POST' }),
        onSuccess: () => {
            refreshUser();
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - GAMIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useAllBadges() {
    const { token } = useAuth();

    return useQuery<Badge[]>({
        queryKey: ['gamification', 'badges', 'all'],
        queryFn: () => fetchWithAuth('/gamification/badges', token),
        enabled: !!token,
    });
}

export function useUserBadges() {
    const { token } = useAuth();

    return useQuery<Badge[]>({
        queryKey: ['gamification', 'badges', 'user'],
        queryFn: () => fetchWithAuth('/gamification/badges/user', token),
        enabled: !!token,
    });
}

export function useMyProfile() {
    const { token } = useAuth();

    return useQuery<UserProfile>({
        queryKey: ['gamification', 'profile'],
        queryFn: () => fetchWithAuth('/gamification/profile', token),
        enabled: !!token,
    });
}

export function useLeaderboard(type: 'global' | 'weekly' | 'streak' = 'global', limit: number = 50) {
    const { token } = useAuth();

    const endpoints = {
        global: '/gamification/leaderboard',
        weekly: '/gamification/leaderboard/weekly',
        streak: '/gamification/leaderboard/streak',
    };

    return useQuery<LeaderboardResponse>({
        queryKey: ['gamification', 'leaderboard', type],
        queryFn: () => fetchWithAuth(`${endpoints[type]}?limit=${limit}`, token),
        enabled: !!token,
        staleTime: 60000, // 1 minute
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - GAMIFICATION STATS (for homepage)
// ═══════════════════════════════════════════════════════════════════════════════

export function useGamificationStats() {
    const { token, user } = useAuth();

    return useQuery({
        queryKey: ['gamification', 'stats'],
        queryFn: async () => {
            // Combine data from user and profile
            try {
                const profile = await fetchWithAuth('/gamification/profile', token);
                return {
                    racha_actual: profile?.racha_dias || 0,
                    vidas_actuales: user?.vidas || 5,
                    xp_total: profile?.xp_total || user?.xp_total || 0,
                    nivel_actual: profile?.nivel || user?.nivel || 1,
                    lecciones_completadas: profile?.lecciones_completadas || 0,
                };
            } catch {
                return {
                    racha_actual: 0,
                    vidas_actuales: user?.vidas || 5,
                    xp_total: user?.xp_total || 0,
                    nivel_actual: user?.nivel || 1,
                    lecciones_completadas: 0,
                };
            }
        },
        enabled: !!token,
        staleTime: 30000,
    });
}

