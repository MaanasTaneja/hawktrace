/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF9F6',
        sand: '#F0EDE8',
        stone: '#E2DFD8',
        ink: '#141211',
        mid: '#6B6560',
        muted: '#6B6560',
        dim: '#B5B0A8',
        burnt: '#E5622A',
        orange: '#E5622A',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
