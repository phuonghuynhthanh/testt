/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0F172A',
          card: '#1B2336',
          elevated: '#272F42',
          border: '#2A3347',
          hover: '#2F3A52',
        },
        content: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
        },
        status: {
          success: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#4ADE80',
            border: 'rgba(34, 197, 94, 0.3)',
          },
          warning: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#FBBF24',
            border: 'rgba(245, 158, 11, 0.3)',
          },
          error: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#F87171',
            border: 'rgba(239, 68, 68, 0.3)',
          },
          info: {
            bg: 'rgba(56, 189, 248, 0.12)',
            text: '#7DD3FC',
            border: 'rgba(56, 189, 248, 0.3)',
          },
          neutral: {
            bg: 'rgba(148, 163, 184, 0.12)',
            text: '#94A3B8',
            border: 'rgba(148, 163, 184, 0.3)',
          },
        },
        primary: {
          green: {
            DEFAULT: '#22C55E',
            dark: '#4ADE80',
          },
          black: {
            DEFAULT: '#0F172A',
          },
        },
      },
      fontFamily: {
        sans: ['Fira Sans', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '10px',
      },
    },
  },
  plugins: [],
};
