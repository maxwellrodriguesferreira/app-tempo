/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006194',
          container: '#007bb9',
          fixed: '#cce5ff',
          'fixed-dim': '#93ccff',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#fdfcff',
        secondary: {
          DEFAULT: '#545f73',
          container: '#d5e0f8',
          fixed: '#d8e3fb',
          'fixed-dim': '#bcc7de',
        },
        'on-secondary': '#ffffff',
        'on-secondary-container': '#586377',
        tertiary: {
          DEFAULT: '#6b38d4',
          container: '#8455ef',
          fixed: '#e9ddff',
          'fixed-dim': '#d0bcff',
        },
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fffbff',
        surface: {
          DEFAULT: '#f8f9ff',
          bright: '#f8f9ff',
          dim: '#cbdbf5',
          'container-lowest': '#ffffff',
          'container-low': '#eff4ff',
          container: '#e5eeff',
          'container-high': '#dce9ff',
          'container-highest': '#d3e4fe',
          variant: '#d3e4fe',
        },
        'on-surface': '#0b1c30',
        'on-surface-variant': '#3f4850',
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        outline: {
          DEFAULT: '#707881',
          variant: '#bfc7d2',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        'gutter': '1rem',
        'gutter-md': '1.5rem',
        'space-2xs': '0.125rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'space-2xl': '2rem',
        'space-3xl': '3rem',
      },
    },
  },
  plugins: [],
};
