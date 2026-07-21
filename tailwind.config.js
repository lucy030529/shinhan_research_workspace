/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 신한투자증권 톤: 네이비/블루 계열
        brand: {
          50: '#ededfd',
          100: '#d5dcfc',
          200: '#b8cdfb',
          300: '#94bff9',
          400: '#78adef',
          500: '#328ad5', // primary
          600: '#1455a2',
          700: '#083b88',
          800: '#00236e',
          900: '#001a52',
          950: '#00113a',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#475569',
          faint: '#94a3b8',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Segoe UI"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.25)',
      },
    },
  },
  plugins: [],
}
