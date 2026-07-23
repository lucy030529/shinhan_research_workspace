/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 신한투자증권 브랜드 컬러
        brand: {
          50: '#e6eeff',
          100: '#ccdcff',
          200: '#99baff',
          300: '#6697ff',
          400: '#3375ff',
          500: '#0046ff', // Primary Blue
          600: '#003dd9',
          700: '#002db3',
          800: '#00236e', // Secondary Dark Navy
          900: '#001a52',
          950: '#00102e',
        },
        // 신한 Secondary Blues
        shinhan: {
          sky: '#8cd2f5',
          blue: '#4baff5',
          mid: '#2878f5',
          navy: '#00236e',
        },
        // Neutral grays
        neutral: {
          0: '#ffffff',
          100: '#f6f6f9',
          150: '#eaeaef',
          200: '#dcdce4',
          300: '#c0c0cf',
          400: '#a5a5ba',
          500: '#8e8ea9',
          600: '#666687',
          700: '#4a4a6a',
          800: '#1a1a2e',
          900: '#000000', // Primary Black
        },
        ink: {
          DEFAULT: '#111111',
          soft: '#555555',
          faint: '#999999',
        },
        // Strapi semantic colors
        success: {
          100: '#eafbe7',
          500: '#5cb176',
          600: '#328048',
          700: '#2f6846',
        },
        warning: {
          100: '#fdf4dc',
          500: '#f29d41',
          600: '#d9822f',
          700: '#be5d01',
        },
        danger: {
          100: '#fcecea',
          500: '#ee5e52',
          600: '#d02b20',
          700: '#b72b1a',
        },
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
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
        card: '0 1px 4px rgba(33, 33, 52, 0.1)',
        'card-hover': '0 1px 4px rgba(33, 33, 52, 0.1), 0 4px 12px rgba(33, 33, 52, 0.08)',
        pop: '0 10px 30px -10px rgba(33, 33, 52, 0.25)',
        sidebar: '1px 0 0 0 rgba(220, 220, 228, 0.5)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '4px',
        md: '4px',
        lg: '8px',
      },
    },
  },
  plugins: [],
}
