// ═══════════════════════════════════════════════════════════════════════════════
// AUTH CONTEXT - Contexto global de autenticación
// ═══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface User {
    user_id: string;
    email: string;
    nombre: string;
    apellidos?: string;
    avatar_url?: string;
    rol: 'estudiante' | 'admin';
    xp_total: number;
    nivel: number;
    racha_dias: number;
    racha_max: number;
    vidas: number;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
    devLogin: (email?: string, nombre?: string) => Promise<void>;
    refreshUser: () => Promise<void>;
    setAuth: (user: User, token: string) => void;
    token: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_STAFF_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'auth_token';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
    const [isLoading, setIsLoading] = useState(true);

    // Verificar autenticación al cargar
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (!storedToken) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                    setUser(data.user);
                    setToken(storedToken);
                } else {
                    // Token inválido
                    localStorage.removeItem(TOKEN_KEY);
                    setToken(null);
                }
            } else {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = () => {
        // Redirigir a Google OAuth
        window.location.href = `${API_URL}/auth/google`;
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Error en logout:', error);
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
        }
    };

    const devLogin = async (email = 'test@example.com', nombre = 'Test User') => {
        try {
            const response = await fetch(`${API_URL}/auth/dev/login?email=${email}&nombre=${nombre}`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(TOKEN_KEY, data.access_token);
                setToken(data.access_token);
                setUser(data.user);
            } else {
                throw new Error('Error en dev login');
            }
        } catch (error) {
            console.error('Error en dev login:', error);
            throw error;
        }
    };

    const refreshUser = async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                    setUser(data.user);
                }
            }
        } catch (error) {
            console.error('Error refrescando usuario:', error);
        }
    };

    const setAuth = (newUser: User, newToken: string) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(newUser);
    };

    // Manejar token desde URL (callback de OAuth)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            localStorage.setItem(TOKEN_KEY, tokenFromUrl);
            setToken(tokenFromUrl);
            // Limpiar URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Verificar autenticación
            checkAuth();
        }
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        devLogin,
        refreshUser,
        setAuth,
        token
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH GUARD - Componente para proteger rutas
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthGuardProps {
    children: ReactNode;
    redirectTo?: string;
}

export function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate(redirectTo);
        }
    }, [isLoading, isAuthenticated, navigate, redirectTo]);

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)'
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(0, 196, 220, 0.3)',
                    borderTopColor: '#00c4dc',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
