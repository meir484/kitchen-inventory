import seed from './seed.json';

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

// Items and orders that shipped with the app (the original kitchen's data). Only states that
// descend from them get the shipped updates; anyone starting fresh never sees this data.
const SEED_ID = /^(dry|shamai|salads|frozen)-\d+$/;
export const isLegacyState = (items) => items.some((i) => SEED_ID.test(i.id));

export const mergeSeedOrders = (orders, removed = [], items = []) => {
  if (!isLegacyState(items)) return orders;
  const have = new Set(orders.map((o) => o.id));
  return [...orders, ...seed.orders.filter((o) => !have.has(o.id) && !removed.includes(o.id))];
};
