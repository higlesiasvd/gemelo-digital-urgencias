// ═══════════════════════════════════════════════════════════════════════════════
// APP ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppLayout } from '@/components/Layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { HospitalListPage } from '@/features/hospitals/pages/HospitalListPage';
import { CHUACPage } from '@/features/hospitals/pages/CHUACPage';
import { ModeloPage } from '@/features/hospitals/pages/ModeloPage';
import { SanRafaelPage } from '@/features/hospitals/pages/SanRafaelPage';
import { StaffPage } from '@/features/staff/StaffPage';
import { DerivacionesPage } from '@/features/derivaciones/DerivacionesPage';
import { SimulationPage } from '@/features/simulation/SimulationPage';
import { PredictorPage } from '@/features/demand/predictor/PredictorPage';
import { MapPage } from '@/features/map/MapPage';
import { MCPPage } from '@/features/mcp/MCPPage';
import { ConfigPage } from '@/features/config/ConfigPage';

import { theme } from '@/shared/theme';
import { queryClient } from '@/shared/api/client';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@/shared/theme/global.css';

// ═══════════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════════

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="hospitales" element={<HospitalListPage />} />
              <Route path="hospitales/chuac" element={<CHUACPage />} />
              <Route path="hospitales/modelo" element={<ModeloPage />} />
              <Route path="hospitales/san-rafael" element={<SanRafaelPage />} />
              <Route path="personal" element={<StaffPage />} />
              <Route path="derivaciones" element={<DerivacionesPage />} />
              <Route path="simulacion" element={<SimulationPage />} />
              <Route path="demanda/predictor" element={<PredictorPage />} />
              <Route path="mapa" element={<MapPage />} />
              <Route path="mcp" element={<MCPPage />} />
              <Route path="configuracion" element={<ConfigPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}
