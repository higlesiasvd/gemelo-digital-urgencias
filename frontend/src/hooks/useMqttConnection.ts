import { useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { useHospitalStore } from '@/store/hospitalStore';
import type { HospitalStats, AlertaPrediccion } from '@/types/hospital';

const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:9001';
const UPDATE_THROTTLE_MS = 2000; // Solo actualizar cada 2 segundos

export function useMqttConnection() {
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const lastUpdateRef = useRef<Record<string, number>>({});
  const isConnectedRef = useRef(false);
  
  const updateStats = useHospitalStore((state) => state.updateStats);
  const updateContexto = useHospitalStore((state) => state.updateContexto);
  const addAlert = useHospitalStore((state) => state.addAlert);
  const setConnected = useHospitalStore((state) => state.setConnected);
  const setPublishFunction = useHospitalStore((state) => state.setPublishFunction);

  const publishMessage = useCallback((topic: string, message: object) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    // Evitar múltiples conexiones
    if (clientRef.current) {
      return;
    }

    console.log('🔌 Connecting to MQTT broker:', MQTT_URL);
    
    // Connect to MQTT broker
    const client = mqtt.connect(MQTT_URL, {
      clientId: `urgencias-ui-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 1000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      isConnectedRef.current = true;
      setConnected(true);

      // Set publish function in store
      setPublishFunction(publishMessage);

      // Subscribe to hospital stats
      client.subscribe('urgencias/+/stats', (err) => {
        if (err) console.error('Error subscribing to stats:', err);
        else console.log('📡 Subscribed to urgencias/+/stats');
      });

      // Subscribe to prediction alerts
      client.subscribe('urgencias/prediccion/alertas', (err) => {
        if (err) console.error('Error subscribing to alerts:', err);
      });

      // Subscribe to hospital alerts
      client.subscribe('urgencias/+/alertas', (err) => {
        if (err) console.error('Error subscribing to hospital alerts:', err);
      });

      // Subscribe to patient events (to get context)
      client.subscribe('urgencias/+/eventos/llegada', (err) => {
        if (err) console.error('Error subscribing to events:', err);
      });
    });

    client.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());

        // Handle stats updates con throttling
        if (topic.includes('/stats')) {
          const hospitalId = topic.split('/')[1];
          const now = Date.now();
          const lastUpdate = lastUpdateRef.current[hospitalId] || 0;
          
          // Solo actualizar si pasaron al menos 2 segundos
          if (now - lastUpdate >= UPDATE_THROTTLE_MS) {
            lastUpdateRef.current[hospitalId] = now;
            updateStats(hospitalId, {
              ...data,
              hospital_id: hospitalId,
              timestamp: now,
            } as HospitalStats);
          }
        }

        // Handle patient arrival events - extract context
        if (topic.includes('/eventos/llegada') && data.contexto) {
          const ctx = data.contexto;
          updateContexto({
            temperatura: ctx.temperatura,
            esta_lloviendo: ctx.esta_lloviendo,
            factor_eventos: ctx.factor_eventos || 1.0,
            factor_festivos: ctx.factor_festivos || 1.0,
            es_festivo: ctx.es_festivo || false,
            es_fin_de_semana: ctx.es_fin_de_semana || false,
          });
        }

        // Handle prediction alerts (sin throttle, son menos frecuentes)
        if (topic.includes('/alertas')) {
          addAlert({
            ...data,
            timestamp: new Date(),
          } as AlertaPrediccion);
        }
      } catch (error) {
        console.error('Error parsing MQTT message:', error);
      }
    });

    client.on('error', (error) => {
      console.error('❌ MQTT error:', error);
      isConnectedRef.current = false;
      setConnected(false);
    });

    client.on('close', () => {
      console.log('🔌 MQTT connection closed');
      isConnectedRef.current = false;
      setConnected(false);
    });

    client.on('reconnect', () => {
      console.log('🔄 MQTT reconnecting...');
    });

    return () => {
      console.log('🧹 Cleaning up MQTT connection');
      if (clientRef.current) {
        clientRef.current.end();
        clientRef.current = null;
      }
    };
  }, [updateStats, updateContexto, addAlert, setConnected, setPublishFunction, publishMessage]);

  return {
    isConnected: useHospitalStore((state) => state.isConnected),
    publishMessage,
  };
}
