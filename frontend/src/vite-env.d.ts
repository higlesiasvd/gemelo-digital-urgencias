/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INFLUXDB_URL: string;
  readonly VITE_INFLUXDB_TOKEN: string;
  readonly VITE_INFLUXDB_ORG: string;
  readonly VITE_INFLUXDB_BUCKET: string;
  readonly VITE_MQTT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
