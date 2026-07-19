/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        esa: {
          bg: '#1f1737',
          deep: '#140f24',
          purple: '#8c3eb3',
          orange: '#f19337',
          green: '#65bc7b',
          text: '#f6f6f6',
        },
      },
    },
  },
  plugins: [],
};
