import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
      colors: {
        // پالت برند: آبی تیره مدیریتی + رنگ‌های وضعیت
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        success: { light: '#dcfce7', DEFAULT: '#16a34a', dark: '#166534' },
        warning: { light: '#ffedd5', DEFAULT: '#ea580c', dark: '#9a3412' },
        danger: { light: '#fee2e2', DEFAULT: '#dc2626', dark: '#991b1b' },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
export default config;
