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
export const needsOrder = (i) => !i.muted && isCounted(i) && i.quantity < i.lowThreshold;
export const stockStatus = (i) => (!isCounted(i) ? 'unknown' : i.muted && i.quantity < i.lowThreshold ? 'muted' : i.quantity <= 0 ? 'out' : i.quantity < i.lowThreshold ? 'low' : 'full');
export const stockValue = (i) => (isCounted(i) && i.price ? i.quantity * i.price : 0);
export const suggestQty = (i) => i.lastOrderQty || Math.max(Math.ceil((i.max || 1) - qtyOf(i)), 1);

export const STATUS = {
  full: { label: 'מלא', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'מלאי נמוך', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' },
  out: { label: 'אזל', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  muted: { label: 'מושתק', bar: 'bg-stone-300', badge: 'bg-stone-100 text-stone-500' },
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
  removedOrders: Array.isArray(s?.removedOrders) ? s.removedOrders : [],
});

const dayNum = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);
const addDays = (iso, n) => new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);

// Per-item ordering rhythm learned from the order log (items are matched by exact name).
export function orderStats(orders) {
  const byName = new Map();
  orders.forEach((o) => {
    if (!byName.has(o.name)) byName.set(o.name, { name: o.name, supplier: o.supplier, byDate: new Map() });
    const e = byName.get(o.name);
    e.supplier = o.supplier;
    e.byDate.set(o.date, (e.byDate.get(o.date) || 0) + o.qty);
  });
  const out = new Map();
  byName.forEach((e, name) => {
    const dates = [...e.byDate.keys()].sort();
    const qtys = dates.map((d) => e.byDate.get(d));
    const gaps = dates.slice(1).map((d, k) => dayNum(d) - dayNum(dates[k]));
    const avgInterval = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null;
    const last = dates[dates.length - 1];
    out.set(name, {
      name, supplier: e.supplier, count: dates.length, last, avgInterval,
      avgQty: Math.round((qtys.reduce((s, q) => s + q, 0) / qtys.length) * 10) / 10,
      next: avgInterval ? addDays(last, avgInterval) : null,
    });
  });
  return out;
}
