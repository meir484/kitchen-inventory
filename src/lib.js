export const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

export const EXPIRY_SOON_DAYS = 3;

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const daysUntil = (expiry) => {
  if (!expiry) return null;
  return Math.round((new Date(expiry + 'T00:00:00') - todayStart()) / 86400000);
};

export const formatDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('he-IL');
export const money = (n) => `₪${(Math.round((n || 0) * 100) / 100).toLocaleString('he-IL')}`;

export const isCounted = (i) => i.quantity !== null && i.quantity !== undefined;
export const qtyOf = (i) => (isCounted(i) ? i.quantity : 0);
export const needsOrder = (i) => isCounted(i) && i.quantity < i.lowThreshold;
export const stockStatus = (i) => (!isCounted(i) ? 'unknown' : i.quantity <= 0 ? 'out' : i.quantity < i.lowThreshold ? 'low' : 'full');
export const stockValue = (i) => (isCounted(i) && i.price ? i.quantity * i.price : 0);
export const suggestQty = (i) => i.lastOrderQty || Math.max(Math.ceil((i.max || 1) - qtyOf(i)), 1);

export const STATUS = {
  full: { label: 'מלא', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'מלאי נמוך', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' },
  out: { label: 'אזל', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  unknown: { label: 'לא נספר', bar: 'bg-stone-300', badge: 'bg-stone-100 text-stone-500' },
};

export function expiryInfo(expiry) {
  const d = daysUntil(expiry);
  if (d === null) return null;
  if (d < 0) return { text: `פג תוקף לפני ${-d} ימים`, cls: 'text-red-600 font-bold' };
  if (d === 0) return { text: 'פג תוקף היום', cls: 'text-red-600 font-bold' };
  if (d <= EXPIRY_SOON_DAYS) return { text: `פג בעוד ${d} ימים`, cls: 'text-amber-600 font-bold' };
  return { text: `תוקף עד ${formatDate(expiry)}`, cls: 'text-stone-500' };
}

export const normalizeState = (s) => ({
  items: Array.isArray(s?.items) ? s.items : [],
  checked: Array.isArray(s?.checked) ? s.checked : [],
  orders: Array.isArray(s?.orders) ? s.orders : [],
});
