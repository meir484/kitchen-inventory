import seed from './seed.json';

export const CATEGORIES = [
  { id: 'dry', label: 'יבשים', emoji: '🌾' },
  { id: 'shamai', label: 'ר. שמאי', emoji: '🧹' },
  { id: 'salads', label: 'סלטים', emoji: '🥗' },
  { id: 'frozen', label: 'קפואים', emoji: '🍟' },
];

export const UNITS = ['יח׳', 'ק״ג', 'גרם', 'ליטר', 'מ״ל', 'חבילות', 'בקבוקים', 'קופסאות'];

export const catLabel = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export const seedItems = () => structuredClone(seed.items);
export const seedOrders = () => structuredClone(seed.orders);

// Orders shipped with the app are merged into any saved state, unless the user deleted them.
export const mergeSeedOrders = (orders, removed = []) => {
  const have = new Set(orders.map((o) => o.id));
  return [...orders, ...seed.orders.filter((o) => !have.has(o.id) && !removed.includes(o.id))];
};
