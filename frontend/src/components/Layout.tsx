import { AppShell, Burger, Group, Text, NavLink, Badge, Indicator } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconBrain,
  IconMapPin,
  IconActivity,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useHospitalStore } from '@/store/hospitalStore';

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, stats } = useHospitalStore();

  // Calcular alertas basadas en saturación
  const hospitalIds = Object.keys(stats);
  const criticalAlerts = hospitalIds.filter(id => {
    const s = stats[id];
    return s && (s.nivel_saturacion > 0.85 || s.pacientes_en_espera_atencion > 15);
  }).length;

  const navItems = [
    { icon: IconDashboard, label: 'Vista General', path: '/' },
    { icon: IconActivity, label: 'Operacional', path: '/operacional' },
    { icon: IconBrain, label: 'Predicciones', path: '/predicciones' },
    { icon: IconMapPin, label: 'Mapa y Eventos', path: '/mapa', badge: criticalAlerts },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="xl" fw={700} c="blue">
              🏥 Gemelo Digital Urgencias
            </Text>
          </Group>
          <Group>
            <Indicator
              inline
              size={12}
              offset={7}
              position="middle-end"
              color={isConnected ? 'green' : 'red'}
              withBorder
            >
              <Badge
                variant="light"
                color={isConnected ? 'green' : 'red'}
                size="lg"
              >
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </Indicator>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              active={location.pathname === item.path}
              label={item.label}
              leftSection={<item.icon size={20} stroke={1.5} />}
              rightSection={
                item.badge && item.badge > 0 ? (
                  <Badge size="sm" color="red" variant="filled">
                    {item.badge}
                  </Badge>
                ) : null
              }
              onClick={() => {
                navigate(item.path);
                if (opened) toggle();
              }}
              style={{ borderRadius: '8px', marginBottom: '4px' }}
            />
          ))}
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed" ta="center">
            Versión 1.0.0
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
