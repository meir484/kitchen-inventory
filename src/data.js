export const CATEGORIES = [
  { id: 'dry', label: 'מוצרים יבשים', emoji: '🌾' },
  { id: 'fridge', label: 'מקרר', emoji: '🥛' },
  { id: 'freezer', label: 'מקפיא', emoji: '❄️' },
  { id: 'spices', label: 'תבלינים', emoji: '🌶️' },
  { id: 'cleaning', label: 'חומרי ניקוי', emoji: '🧴' },
];

export const UNITS = ['יח׳', 'ק״ג', 'גרם', 'ליטר', 'מ״ל', 'חבילות', 'בקבוקים', 'קופסאות'];

export const catLabel = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

const day = 86400000;
const iso = (offset) => new Date(Date.now() + offset * day).toISOString().slice(0, 10);

export const seedItems = () => [
  { id: 1, name: 'אורז', category: 'dry', quantity: 3, unit: 'ק״ג', max: 5, lowThreshold: 1, expiry: iso(200) },
  { id: 2, name: 'קמח', category: 'dry', quantity: 1, unit: 'ק״ג', max: 5, lowThreshold: 2, expiry: iso(90) },
  { id: 3, name: 'חלב', category: 'fridge', quantity: 2, unit: 'ליטר', max: 6, lowThreshold: 2, expiry: iso(3) },
  { id: 4, name: 'ביצים', category: 'fridge', quantity: 0, unit: 'יח׳', max: 30, lowThreshold: 6, expiry: iso(-2) },
  { id: 5, name: 'חזה עוף', category: 'freezer', quantity: 4, unit: 'חבילות', max: 6, lowThreshold: 2, expiry: iso(60) },
  { id: 6, name: 'פפריקה', category: 'spices', quantity: 1, unit: 'יח׳', max: 3, lowThreshold: 1, expiry: iso(300) },
  { id: 7, name: 'סבון כלים', category: 'cleaning', quantity: 2, unit: 'בקבוקים', max: 4, lowThreshold: 1, expiry: '' },
];
