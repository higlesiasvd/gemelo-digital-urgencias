// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET HOOK - CONEXIÓN EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/shared/store';
import type { StatusUpdateMessage, WSMessage, HospitalState } from '@/shared/types';

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
    url?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        url = getWebSocketUrl(),
        reconnectInterval = 3000,
        maxReconnectAttempts = 10,
    } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const [status, setStatus] = useState<WSStatus>('disconnected');

    const { setConnected, updateHospitalState, updateContexto } = useAppStore();

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data) as WSMessage;
            console.log('[WebSocket] Mensaje recibido:', message.type);

            if (message.type === 'status_update') {
                const statusData = (message as StatusUpdateMessage).data;
                console.log('[WebSocket] status_update data:', statusData);

                if (statusData.hospitales) {
                    console.log('[WebSocket] Actualizando hospitales:', Object.keys(statusData.hospitales));
                    Object.entries(statusData.hospitales).forEach(([hospitalId, state]) => {
                        updateHospitalState(hospitalId, state as HospitalState);
                    });
                }

                if (statusData.contexto) {
                    updateContexto(statusData.contexto);
                }
            }
        } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
        }
    }, [updateHospitalState, updateContexto]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setStatus('connecting');
        console.log('[WebSocket] Conectando a:', url);

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] ✅ Conectado');
                setStatus('connected');
                setConnected(true);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = handleMessage;

            ws.onerror = (error) => {
                console.error('[WebSocket] ❌ Error:', error);
                setStatus('error');
            };

            ws.onclose = () => {
                console.log('[WebSocket] Desconectado');
                setStatus('disconnected');
                setConnected(false);
                wsRef.current = null;

                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    console.log(`[WebSocket] Reconectando (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
                    reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
                }
            };
        } catch (error) {
            console.error('[WebSocket] Error al conectar:', error);
            setStatus('error');
        }
    }, [url, handleMessage, setConnected, reconnectInterval, maxReconnectAttempts]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setStatus('disconnected');
        setConnected(false);
    }, [setConnected]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        status,
        isConnected: status === 'connected',
        connect,
        disconnect,
    };
}

function getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
        return 'ws://localhost:8080/ws';
    }

    const { hostname, port, protocol } = window.location;

    // Desarrollo: puertos típicos de Vite (3000-3010, 5173)
    const devPorts = ['3000', '3001', '3002', '3003', '3004', '3005', '5173'];
    const isDev = hostname === 'localhost' && devPorts.includes(port);

    if (isDev) {
        // En desarrollo, el WebSocket del backend está en el puerto 8080
        return 'ws://localhost:8080/ws';
    }

    // En producción, usar el proxy de nginx
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}${port ? ':' + port : ''}/api/mcp/ws`;
}
