import { InfluxDB } from '@influxdata/influxdb-client';
import type { HospitalStats, Prediccion } from '@/types/hospital';

const url = import.meta.env.VITE_INFLUXDB_URL || 'http://localhost:8086';
const token = import.meta.env.VITE_INFLUXDB_TOKEN || 'mi-token-secreto-urgencias-dt';
const org = import.meta.env.VITE_INFLUXDB_ORG || 'urgencias';
const bucket = import.meta.env.VITE_INFLUXDB_BUCKET || 'hospitales';

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

export class InfluxDBService {
  async getHospitalStats(hospitalId: string): Promise<HospitalStats | null> {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "stats_${hospitalId}")
        |> last()
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    try {
      const rows: any[] = [];
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        rows.push(o);
      }

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        hospital_id: hospitalId,
        ocupacion_boxes: row.ocupacion_boxes || 0,
        ocupacion_observacion: row.ocupacion_observacion || 0,
        boxes_ocupados: row.boxes_ocupados || 0,
        boxes_totales: row.boxes_totales || 0,
        observacion_ocupadas: row.observacion_ocupadas || 0,
        observacion_totales: row.observacion_totales || 0,
        pacientes_en_espera_triaje: row.pacientes_en_espera_triaje || 0,
        pacientes_en_espera_atencion: row.pacientes_en_espera_atencion || 0,
        tiempo_medio_espera: row.tiempo_medio_espera || 0,
        tiempo_medio_atencion: row.tiempo_medio_atencion || 0,
        tiempo_medio_total: row.tiempo_medio_total || 0,
        pacientes_llegados_hora: row.pacientes_llegados_hora || 0,
        pacientes_atendidos_hora: row.pacientes_atendidos_hora || 0,
        pacientes_derivados: row.pacientes_derivados || 0,
        nivel_saturacion: row.nivel_saturacion || 0,
        emergencia_activa: row.emergencia_activa || false,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error querying InfluxDB:', error);
      return null;
    }
  }

  async getAllHospitalsStats(): Promise<HospitalStats[]> {
    const hospitalIds = ['chuac', 'hm_modelo', 'san_rafael'];
    const promises = hospitalIds.map((id) => this.getHospitalStats(id));
    const results = await Promise.all(promises);
    return results.filter((stat): stat is HospitalStats => stat !== null);
  }

  async getPredictions(hospitalId: string, hours: number = 24): Promise<Prediccion[]> {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -1h, stop: ${hours}h)
        |> filter(fn: (r) => r._measurement == "alertas_prediccion")
        |> filter(fn: (r) => r.hospital == "${hospitalId}")
        |> filter(fn: (r) => r.tipo == "prediccion")
        |> filter(fn: (r) => r._field == "llegadas_esperadas" or r._field == "minimo" or r._field == "maximo")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"])
    `;

    try {
      const rows: any[] = [];
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        rows.push(o);
      }

      return rows.map((row) => ({
        timestamp: row._time,
        hora: row.hora || 0,
        llegadas_esperadas: row.llegadas_esperadas || 0,
        minimo: row.minimo || 0,
        maximo: row.maximo || 0,
      }));
    } catch (error) {
      console.error('Error querying predictions:', error);
      return [];
    }
  }

  async getArrivalsHistory(hospitalId: string, hours: number = 6): Promise<Array<{ timestamp: string; count: number }>> {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -${hours}h)
        |> filter(fn: (r) => r._measurement =~ /^eventos_/)
        |> filter(fn: (r) => r._field == "tipo_evento")
        |> filter(fn: (r) => r._value == "llegada")
        |> filter(fn: (r) => r.hospital_id == "${hospitalId}")
        |> aggregateWindow(every: 1h, fn: count, createEmpty: false)
    `;

    try {
      const rows: any[] = [];
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        rows.push(o);
      }

      return rows.map((row) => ({
        timestamp: row._time,
        count: row._value || 0,
      }));
    } catch (error) {
      console.error('Error querying arrivals history:', error);
      return [];
    }
  }
}

export const influxService = new InfluxDBService();
