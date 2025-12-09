import { createTheme, MantineColorsTuple } from '@mantine/core';

// ═══════════════════════════════════════════════════════════════════════════════
// PALETAS DE COLORES - MODERN DARK NAVY THEME
// ═══════════════════════════════════════════════════════════════════════════════

// Azul marino oscuro profesional
const navyBlue: MantineColorsTuple = [
    '#e8f4fc', '#c5e4f9', '#9bd0f5', '#6ab8ef', '#3a9fe8',
    '#1a8cde', '#0d6ebd', '#0a5a9c', '#08477b', '#0a1628',
];

// Azul cian moderno para acentos
const accentCyan: MantineColorsTuple = [
    '#e6fcff', '#c3f7fc', '#8eeef9', '#4de4f5', '#0cd6ed',
    '#00c4dc', '#00a3b8', '#008294', '#006270', '#00424c',
];

const emeraldGreen: MantineColorsTuple = [
    '#e6fff5', '#c3ffe7', '#8affd1', '#4dfcb8', '#1af09f',
    '#00d68f', '#00b377', '#009161', '#006f4b', '#004d35',
];

const vibrantOrange: MantineColorsTuple = [
    '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c',
    '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
];

const deepPurple: MantineColorsTuple = [
    '#f5f0ff', '#e8deff', '#d4c4fc', '#bda6f7', '#a688f0',
    '#8b6ce6', '#7152d9', '#5a3fc7', '#4530a8', '#302187',
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMA MANTINE - MODERN CLEAN DESIGN
// ═══════════════════════════════════════════════════════════════════════════════

export const theme = createTheme({
    primaryColor: 'navyBlue',
    colors: {
        navyBlue,
        accentCyan,
        emeraldGreen,
        vibrantOrange,
        deepPurple,
    },
    defaultRadius: 'lg',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headings: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '600',
    },
    shadows: {
        xs: '0 1px 2px rgba(10, 22, 40, 0.08)',
        sm: '0 2px 8px rgba(10, 22, 40, 0.12)',
        md: '0 4px 16px rgba(10, 22, 40, 0.16)',
        lg: '0 8px 32px rgba(10, 22, 40, 0.20)',
        xl: '0 16px 48px rgba(10, 22, 40, 0.24)',
    },
    components: {
        Card: {
            defaultProps: { shadow: 'sm', radius: 'xl', withBorder: true },
            styles: {
                root: {
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(10, 22, 40, 0.25)' },
                },
            },
        },
        Button: {
            defaultProps: { radius: 'xl' },
            styles: { root: { transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)' } } },
        },
        Badge: { defaultProps: { radius: 'xl' } },
        Paper: { defaultProps: { radius: 'xl' } },
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CSS VARIABLES - MODERN DARK NAVY PALETTE
// ═══════════════════════════════════════════════════════════════════════════════

export const cssVariables = {
    // Primary backgrounds - azul marino muy oscuro
    bgBase: '#050a12',
    bgSurface: '#0a1628',
    bgElevated: '#0d1f3c',
    bgCard: '#0f2447',

    // Glass effect con tono azul
    glassBg: 'rgba(10, 22, 40, 0.85)',
    glassBorder: 'rgba(56, 189, 248, 0.12)',
    glassShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glassBlur: 'blur(20px)',

    // Accent colors
    accentPrimary: '#00c4dc',
    accentSecondary: '#1a8cde',

    // Gradientes modernos
    gradientPrimary: 'linear-gradient(135deg, #0d6ebd 0%, #00c4dc 100%)',
    gradientSuccess: 'linear-gradient(135deg, #00b377 0%, #00d68f 100%)',
    gradientWarning: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
    gradientDanger: 'linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)',
    gradientNavy: 'linear-gradient(180deg, #0a1628 0%, #050a12 100%)',

    // Body background - gradiente azul marino profundo
    bodyBg: 'linear-gradient(135deg, #050a12 0%, #0a1628 50%, #050a12 100%)',
};
