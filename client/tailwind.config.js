/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a',
          surface: '#222222',
        },
        border: {
          DEFAULT: '#2a2a2a',
          highlight: '#444444',
        },
        text: {
          primary: '#f5f5f0',
          secondary: '#a0a0a0',
          muted: '#666666',
        },
        gold: {
          DEFAULT: '#c9a96e',
          light: '#e8c99a',
          dark: '#a88040',
        },
        status: {
          success: '#4a9b6f',
          error: '#c94a4a',
          warning: '#c9963a',
          info: '#4a82c9',
        },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "'Playfair Display'", 'Georgia', 'serif'],
        body: ["'Inter'", "'DM Sans'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      letterSpacing: {
        luxe: '0.08em',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
