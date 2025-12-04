import { createTheme, MantineColorsTuple } from '@mantine/core';

const emergencyRed: MantineColorsTuple = [
  '#ffe9e9',
  '#ffd1d1',
  '#faa1a1',
  '#f66d6d',
  '#f24141',
  '#f02525',
  '#f01414',
  '#d60606',
  '#c00000',
  '#a90000',
];

const healthGreen: MantineColorsTuple = [
  '#e5feee',
  '#d2f9e0',
  '#a8f1c0',
  '#7aea9f',
  '#53e383',
  '#3bdf73',
  '#2cdd6a',
  '#1ac458',
  '#0caf4d',
  '#00963f',
];

const warningOrange: MantineColorsTuple = [
  '#fff4e2',
  '#ffe8cc',
  '#ffd09b',
  '#fdb766',
  '#fca13a',
  '#fb941d',
  '#fc8c09',
  '#e17900',
  '#c86a00',
  '#af5a00',
];

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    emergency: emergencyRed,
    health: healthGreen,
    warning: warningOrange,
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
  components: {
    Card: {
      defaultProps: {
        padding: 'lg',
        shadow: 'sm',
        radius: 'md',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
