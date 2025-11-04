import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF4545',
        'background-light': '#FFFFFF',
        'background-dark': '#121829',
        'surface-light': '#F8F6F6',
        'surface-dark': '#1A2033',
        accent: '#00B8D9',
        'text-primary-light': '#121829',
        'text-primary-dark': '#EAECEF',
        'text-secondary-light': '#6B7280',
        'text-secondary-dark': '#A0AEC0',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Noto Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [],
}

export default config

