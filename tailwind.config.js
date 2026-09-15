/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F2',
        card: '#FCFBF9',
        // Alert tokens ride CSS vars so light/dark flip in one place (see index.css).
        alert: {
          bg: 'rgb(var(--alert-bg) / <alpha-value>)',
          border: 'rgb(var(--alert-border) / <alpha-value>)',
          text: 'rgb(var(--alert-text) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'SF Pro Text'",
          "'SF Pro Display'",
          'system-ui',
          'sans-serif',
        ],
        serif: ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
