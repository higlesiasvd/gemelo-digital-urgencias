import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Predictions } from '@/pages/Predictions';
import { Operacional } from '@/pages/Operacional';
import { Mapa } from '@/pages/Mapa';
import { useMqttConnection } from '@/hooks/useMqttConnection';
import { theme } from '@/theme/theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';

function AppContent() {
  useMqttConnection();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="predicciones" element={<Predictions />} />
          <Route path="operacional" element={<Operacional />} />
          <Route path="mapa" element={<Mapa />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppContent />
    </MantineProvider>
  );
}
