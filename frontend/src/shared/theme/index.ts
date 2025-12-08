import { createTheme, MantineColorsTuple } from '@mantine/core';

// ═══════════════════════════════════════════════════════════════════════════════
// PALETAS DE COLORES
// ═══════════════════════════════════════════════════════════════════════════════

const primaryBlue: MantineColorsTuple = [
    '#e6f4ff', '#bae0ff', '#91caff', '#69b4ff', '#4096ff',
    '#1677ff', '#0958d9', '#003eb3', '#002c8c', '#001d66',
];

const emeraldGreen: MantineColorsTuple = [
    '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981',
    '#059669', '#047857', '#065f46', '#064e3b', '#022c22',
];

const vibrantOrange: MantineColorsTuple = [
    '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c',
    '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
];

const deepPurple: MantineColorsTuple = [
    '#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc',
    '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87',
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMA MANTINE
// ═══════════════════════════════════════════════════════════════════════════════

export const theme = createTheme({
    primaryColor: 'primaryBlue',
    colors: {
        primaryBlue,
        emeraldGreen,
        vibrantOrange,
        deepPurple,
    },
    defaultRadius: 'md',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    headings: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontWeight: '700',
    },
    shadows: {
        xs: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        sm: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 10px 15px -5px, rgba(0, 0, 0, 0.04) 0px 7px 7px -5px',
        md: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px',
        lg: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 28px 23px -7px, rgba(0, 0, 0, 0.04) 0px 12px 12px -7px',
        xl: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 36px 28px -7px, rgba(0, 0, 0, 0.04) 0px 17px 17px -7px',
    },
    components: {
        Card: {
            defaultProps: { shadow: 'sm', radius: 'lg', withBorder: true },
            styles: {
                root: {
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)' },
                },
            },
        },
        Button: {
            defaultProps: { radius: 'md' },
            styles: { root: { transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)' } } },
        },
        Badge: { defaultProps: { radius: 'md' } },
        Paper: { defaultProps: { radius: 'md' } },
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CSS VARIABLES
// ═══════════════════════════════════════════════════════════════════════════════

export const cssVariables = {
    glassBg: 'rgba(37, 38, 43, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
    gradientPrimary: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)',
    gradientSuccess: 'linear-gradient(135deg, #40c057 0%, #20c997 100%)',
    gradientWarning: 'linear-gradient(135deg, #fab005 0%, #fd7e14 100%)',
    gradientDanger: 'linear-gradient(135deg, #fa5252 0%, #e64980 100%)',
    bodyBg: 'linear-gradient(135deg, #0f0f12 0%, #1a1b1e 50%, #0f0f12 100%)',
};
