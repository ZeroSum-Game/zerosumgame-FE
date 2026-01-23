/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'board-sand': '#f7f2e7',
        'board-edge': '#2b2b2b'
      }
    }
  },
  plugins: []
};
