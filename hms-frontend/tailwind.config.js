/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hms: {
          dark: '#052E24',
          deep: '#063C2F',
          forest: '#07543F',
          emerald: '#087F5B',
          accent: '#12B886',
          soft: '#EEF7F1',
          tint: '#DDEFE5',
          bg: '#F6F8F6',
          surface: '#FFFFFF',
          border: '#DDE5E0',
          'border-light': '#E5ECE8',
          text: '#10201B',
          muted: '#65756E',
          warning: '#F59E0B',
          danger: '#EF4444',
          critical: '#DC2626',
          info: '#3B82F6',
        }
      },
      borderRadius: {
        'card': '20px',
        'kpi': '18px',
        'btn': '12px',
        'input': '12px',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(16, 32, 27, 0.05), 0 2px 6px -1px rgba(16, 32, 27, 0.03)',
        'card-hover': '0 10px 25px -3px rgba(16, 32, 27, 0.08), 0 4px 10px -2px rgba(16, 32, 27, 0.04)',
        'hero': '0 12px 32px -4px rgba(5, 46, 36, 0.25)',
        'modal': '0 25px 50px -12px rgba(5, 46, 36, 0.35)',
      }
    },
  },
  plugins: [],
};
