/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
