/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1e',
        surface:    '#111827',
        border:     '#1f2937',
        accent:     '#3b82f6',
        up:         '#10b981',
        down:       '#ef4444',
        neutral:    '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
