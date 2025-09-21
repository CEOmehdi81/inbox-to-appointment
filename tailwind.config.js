/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#7C5CFF',
          lime: '#D1FF25',
          card: '#111315',
          panel: '#0B0C0D',
        },
      },
      borderRadius: { xl: '14px' },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,.04) inset, 0 1px 2px rgba(0,0,0,.35)',
      },
    },
  },
  plugins: [],
};