import { createTheme, MantineColorsTuple, rem } from '@mantine/core';

// ═══════════════════════════════════════════════════════════════════════════════
// TEMA OSCURO MODERNO - GEMELO DIGITAL HOSPITALARIO
// ═══════════════════════════════════════════════════════════════════════════════

// Colores personalizados
const urgenciasBlue: MantineColorsTuple = [
  '#e7f5ff',
  '#d0ebff',
  '#a5d8ff',
  '#74c0fc',
  '#4dabf7',
  '#339af0',
  '#228be6',
  '#1c7ed6',
  '#1971c2',
  '#1864ab',
];

const urgenciasGreen: MantineColorsTuple = [
  '#ebfbee',
  '#d3f9d8',
  '#b2f2bb',
  '#8ce99a',
  '#69db7c',
  '#51cf66',
  '#40c057',
  '#37b24d',
  '#2f9e44',
  '#2b8a3e',
];

const urgenciasOrange: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffd8a8',
  '#ffc078',
  '#ffa94d',
  '#ff922b',
  '#fd7e14',
  '#f76707',
  '#e8590c',
  '#d9480f',
];

const urgenciasRed: MantineColorsTuple = [
  '#fff5f5',
  '#ffe3e3',
  '#ffc9c9',
  '#ffa8a8',
  '#ff8787',
  '#ff6b6b',
  '#fa5252',
  '#f03e3e',
  '#e03131',
  '#c92a2a',
];

const dark: MantineColorsTuple = [
  '#C1C2C5',
  '#A6A7AB',
  '#909296',
  '#5c5f66',
  '#373A40',
  '#2C2E33',
  '#25262b',
  '#1A1B1E',
  '#141517',
  '#101113',
];

export const theme = createTheme({
  // Colores
  colors: {
    urgenciasBlue,
    urgenciasGreen,
    urgenciasOrange,
    urgenciasRed,
    dark,
  },
  primaryColor: 'urgenciasBlue',
  primaryShade: { light: 6, dark: 7 },

  // Tipografía moderna
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, Monaco, Courier, monospace',

  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.2' },
      h2: { fontSize: rem(26), lineHeight: '1.3' },
      h3: { fontSize: rem(22), lineHeight: '1.35' },
      h4: { fontSize: rem(18), lineHeight: '1.4' },
      h5: { fontSize: rem(16), lineHeight: '1.45' },
      h6: { fontSize: rem(14), lineHeight: '1.5' },
    },
  },

  // Espaciado
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // Bordes redondeados
  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },

  // Sombras para efecto glass
  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 8px rgba(0, 0, 0, 0.4)',
    md: '0 4px 16px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.7)',
  },

  // Componentes personalizados
  components: {
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'md',
      },
      styles: () => ({
        root: {
          backgroundColor: 'rgba(37, 38, 43, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }),
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
      styles: () => ({
        root: {
          backgroundColor: 'rgba(37, 38, 43, 0.6)',
          backdropFilter: 'blur(8px)',
        },
      }),
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Tooltip: {
      defaultProps: {
        radius: 'md',
      },
    },
    NavLink: {
      styles: () => ({
        root: {
          borderRadius: rem(8),
          '&[dataActive]': {
            backgroundColor: 'rgba(34, 139, 230, 0.15)',
          },
        },
      }),
    },
  },

  // Otras configuraciones
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  respectReducedMotion: true,
});

// Estilos globales para efecto glass
export const globalStyles = `
  :root {
    --glass-bg: rgba(37, 38, 43, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
    --glass-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    --gradient-primary: linear-gradient(135deg, #228be6 0%, #15aabf 100%);
    --gradient-success: linear-gradient(135deg, #40c057 0%, #20c997 100%);
    --gradient-warning: linear-gradient(135deg, #fab005 0%, #fd7e14 100%);
    --gradient-danger: linear-gradient(135deg, #fa5252 0%, #e64980 100%);
  }

  body {
    background: linear-gradient(135deg, #0f0f12 0%, #1a1b1e 50%, #0f0f12 100%);
    background-attachment: fixed;
    min-height: 100vh;
  }

  .glass-card {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .gradient-text {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Scrollbar personalizado */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Animaciones */
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(34, 139, 230, 0.5); }
    50% { box-shadow: 0 0 20px rgba(34, 139, 230, 0.8); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  .pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .float {
    animation: float 3s ease-in-out infinite;
  }
`;
