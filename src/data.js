export * from './categories.js';

// A handful of examples for first-time visitors. They are flagged so they can be cleared in one click.
export function exampleItems() {
  const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const make = (n, name, category, quantity, lowThreshold, max, extra = {}) => ({
    id: `ex-${n}`, name, category, quantity, unit: 'יח׳', lowThreshold, max, expiry: '', supplier: '', price: null, example: true, ...extra,
  });
  return [
    make(1, 'אורז 5 ק״ג', 'dry', 4, 2, 6, { supplier: 'ספק לדוגמה', price: 28 }),
    make(2, 'שמן קנולה 1 ליטר', 'dry', 1, 3, 8, { supplier: 'ספק לדוגמה', price: 6 }),
    make(3, 'חלב 3%', 'מקרר', 6, 4, 12, { unit: 'ליטר', expiry: inDays(2) }),
    make(4, 'שניצל קפוא', 'קפואים', 0, 2, 6, { unit: 'חבילות' }),
    make(5, 'סבון כלים', 'ניקיון', 3, 2, 6),
  ];
}
