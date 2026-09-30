/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#121212',
          card: '#1A1A1A',
          elevated: '#222222',
          border: '#2E2E2E',
          hover: '#2A2A2A',
        },
        content: {
          primary: '#F9FAFB',
          secondary: '#D1D5DB',
          muted: '#9CA3AF',
        },
        status: {
          success: {
            bg: 'rgba(16, 185, 129, 0.15)',
            text: '#34D399',
            border: 'rgba(16, 185, 129, 0.3)',
          },
          warning: {
            bg: 'rgba(245, 158, 11, 0.15)',
            text: '#FBBF24',
            border: 'rgba(245, 158, 11, 0.3)',
          },
          error: {
            bg: 'rgba(239, 68, 68, 0.15)',
            text: '#F87171',
            border: 'rgba(239, 68, 68, 0.3)',
          },
          info: {
            bg: 'rgba(59, 130, 246, 0.15)',
            text: '#60A5FA',
            border: 'rgba(59, 130, 246, 0.3)',
          },
          neutral: {
            bg: 'rgba(107, 114, 128, 0.15)',
            text: '#9CA3AF',
            border: 'rgba(107, 114, 128, 0.3)',
          },
        },
        gray: {
          th1: '#9CA3AF',
          th2: '#D1D5DB',
          hover: '#2A2A2A',
        },
        primary: {
          blue: {
            DEFAULT: '#001c42', 
            medium: '#004175',
            light: '#026e99',
          },
          green: {
            DEFAULT: '#07e86c',
            dark: '#00be73',
          },
          red: {
            dark: '#d22d3c',
          },
          gray: {
            DEFAULT: '#f5f5f5',
            dark: '#171717',
          },
          white: {
            DEFAULT: '#ffffff',
            hover: '#eeeeee',
          },
          black: {
            // primary
            DEFAULT: '#121212',
            medium: '#1A1A1A',
            light: '#222222',
            hover: '#001b3e',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
