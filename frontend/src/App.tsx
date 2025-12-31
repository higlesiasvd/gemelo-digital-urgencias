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

// Auth & Training
import { AuthProvider, AuthGuard, LoginPage, RegisterPage, VerifyEmailPage } from '@/features/auth';
import { ModeSelectorPage } from '@/features/mode-selector';
import {
  TrainingLayout,
  TrainingHomePage,
  LessonPage,
  ProfilePage,
  LeaderboardPage,
  ProfessorPage,
} from '@/features/training';

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
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ========================================= */}
              {/* PUBLIC ROUTES */}
              {/* ========================================= */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* ========================================= */}
              {/* MODE SELECTOR (requires auth) */}
              {/* ========================================= */}
              <Route
                path="/"
                element={
                  <AuthGuard>
                    <ModeSelectorPage />
                  </AuthGuard>
                }
              />

              {/* ========================================= */}
              {/* GEMELO DIGITAL (current app) */}
              {/* ========================================= */}
              <Route
                path="/gemelo"
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              >
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

              {/* ========================================= */}
              {/* TRAINING MODE (new) */}
              {/* ========================================= */}
              <Route
                path="/formacion"
                element={
                  <AuthGuard>
                    <TrainingLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<TrainingHomePage />} />
                <Route path="leccion/:id" element={<LessonPage />} />
                <Route path="profesor" element={<ProfessorPage />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="ranking" element={<LeaderboardPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
