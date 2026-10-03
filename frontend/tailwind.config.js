export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#F5EFE6',
          200: '#EDE3D5',
          300: '#E3D6C4',
          400: '#D6C5AE',
        },
        espresso: {
          DEFAULT: '#5C3D2E',
          500: '#6B4A39',
          600: '#5C3D2E',
          700: '#4A3024',
          800: '#36231A',
          900: '#2A1B14',
        },
        terracotta: {
          DEFAULT: '#C98A4B',
          50: '#FBF1E6',
          100: '#F5E1CA',
          600: '#B07438',
          700: '#8F5C2A',
        },
        taupe: {
          DEFAULT: '#A89A8C',
          200: '#DDD4CA',
          300: '#C9BDB0',
          500: '#A89A8C',
          600: '#8A7B6D',
          700: '#6E6156',
        },
        ink: '#2E211A',
        sage: {
          50: '#EEF2E8',
          100: '#E2E9D9',
          600: '#6B8257',
          700: '#4F6339',
        },
        honey: {
          50: '#FBF0DF',
          100: '#F6E2C2',
          600: '#A8701F',
          700: '#82560F',
        },
        brick: {
          50: '#F8E6E1',
          100: '#F1D3CB',
          600: '#B5523F',
          700: '#933B2B',
        },
        cloudinary: '#3448C5',
      },
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
};
