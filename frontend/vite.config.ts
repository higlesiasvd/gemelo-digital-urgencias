import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api/influx': {
        target: 'http://influxdb:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/influx/, ''),
      },
    },
  },
});
