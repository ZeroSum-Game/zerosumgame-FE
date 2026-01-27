/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'board-sand': '#f7f2e7',
        'board-edge': '#2b2b2b'
      },
      boxShadow: {
        'card': '0 20px 80px -40px rgba(0, 0, 0, 0.85)',
        'card-lg': '0 28px 120px -60px rgba(0, 0, 0, 0.9)'
      }
    }
  },
  plugins: []
};
