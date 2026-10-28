// Every color comes from the CSS variables in src/index.css (one place, light + dark).
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const names = [
  'page', 'surface', 'subtle', 'tint', 'tint-strong', 'line', 'line-strong',
  'ink', 'ink-2', 'ink-3', 'on-solid',
  'primary', 'primary-hover', 'primary-soft', 'brand-end',
  'success', 'success-soft', 'success-text',
  'warning', 'warning-soft', 'warning-text',
  'danger', 'danger-soft', 'danger-text',
  'info', 'info-soft', 'info-text',
  'bar-warn',
];

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Heebo', 'system-ui', 'sans-serif'] },
      colors: Object.fromEntries(names.map((n) => [n, token(n)])),
      borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)' },
      boxShadow: { card: 'var(--shadow-card)', hover: 'var(--shadow-hover)' },
    },
  },
  plugins: [],
};
