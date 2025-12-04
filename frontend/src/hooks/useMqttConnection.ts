import { useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { useHospitalStore } from '@/store/hospitalStore';
import type { HospitalStats, AlertaPrediccion } from '@/types/hospital';

const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:9001';
const UPDATE_THROTTLE_MS = 2000; // Solo actualizar cada 2 segundos

export function useMqttConnection() {
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const lastUpdateRef = useRef<Record<string, number>>({});
  const { updateStats, updateContexto, addAlert, setConnected } = useHospitalStore();

  useEffect(() => {
    // Connect to MQTT broker
    const client = mqtt.connect(MQTT_URL, {
      clientId: `urgencias-ui-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 1000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnected(true);

      // Subscribe to hospital stats
      client.subscribe('urgencias/+/stats', (err) => {
        if (err) console.error('Error subscribing to stats:', err);
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
      console.error('MQTT error:', error);
      setConnected(false);
    });

    client.on('close', () => {
      console.log('MQTT connection closed');
      setConnected(false);
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, [updateStats, updateContexto, addAlert, setConnected]);

  return {
    isConnected: useHospitalStore((state) => state.isConnected),
  };
}
