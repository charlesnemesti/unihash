/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './whitepaper.html', './src/**/*.{js,ts,jsx,tsx,css}'],
  theme: {
    extend: {
      colors: {
        fluor: '#00E5FF',
        'fluor-red': '#FF1A4B',
        'fluor-blue': '#00E5FF',
        void: '#04060D',
        'void-lab': '#0A1020',
      },
      fontFamily: {
        mono: ['"Fira Code"', '"Courier New"', '"Space Mono"', 'monospace'],
        terminal: ['"VT323"', 'monospace'],
      },
    },
  },
  plugins: [],
};
