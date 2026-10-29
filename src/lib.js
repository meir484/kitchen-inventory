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
// 'near' is only a visual warning (within 1.5x of the minimum); what needs ordering is still needsOrder().
export const stockStatus = (i) => {
  if (!isCounted(i)) return 'unknown';
  if (i.muted && i.quantity < i.lowThreshold) return 'muted';
  if (i.quantity <= 0) return 'out';
  if (i.quantity < i.lowThreshold) return 'low';
  if (i.lowThreshold > 0 && i.quantity <= i.lowThreshold * 1.5) return 'near';
  return 'full';
};
export const suggestPacks = (i) => Math.max(Math.ceil(suggestQty(i) / i.packSize), 1);
export const stockValue = (i) => (isCounted(i) && i.price ? i.quantity * i.price : 0);
// Several suppliers per item: `offers` is [{ supplier, price }]. Without it the single supplier/price pair counts as one offer.
export const offersOf = (i) => {
  const list = (i.offers || []).filter((o) => o && (o.supplier || (o.price !== null && o.price !== undefined)));
  if (list.length) return list;
  return i.supplier || (i.price !== null && i.price !== undefined) ? [{ supplier: i.supplier || '', price: i.price ?? null }] : [];
};
export const cheapestOffer = (i) => [...offersOf(i)].filter((o) => o.price > 0).sort((a, b) => a.price - b.price)[0] || null;

// Packs: `packSize` = units per pack (optional). Quantity itself stays in units.
export const hasPacks = (i) => i.packSize > 1;
export const formatPacks = (qty, size) => {
  const full = Math.floor(qty / size);
  const rest = Math.round((qty - full * size) * 100) / 100;
  const parts = [];
  if (full > 0 || rest === 0) parts.push(full === 1 ? 'מארז' : `${full} מארזים`);
  if (rest > 0) parts.push(`${rest} יח׳`);
  return parts.join(' ו-');
};

export const suggestQty = (i) => i.lastOrderQty || Math.max(Math.ceil((i.max || 1) - qtyOf(i)), 1);

export const STATUS = {
  full: { label: 'מלא', bar: 'bg-ink-2', badge: 'bg-success-soft text-success-text' },
  near: { label: 'כמעט נגמר', bar: 'bg-bar-warn', badge: 'bg-primary-soft text-primary' },
  low: { label: 'לחידוש', bar: 'bg-danger', badge: 'bg-danger-soft text-danger-text' },
  out: { label: 'אזל', bar: 'bg-danger', badge: 'bg-danger-soft text-danger-text' },
  muted: { label: 'מושתק', bar: 'bg-line-strong', badge: 'bg-tint text-ink-2' },
  unknown: { label: 'לא נספר', bar: 'bg-line-strong', badge: 'bg-tint text-ink-2' },
};

export function expiryInfo(expiry) {
  const d = daysUntil(expiry);
  if (d === null) return null;
  if (d < 0) return { text: `פג תוקף לפני ${-d} ימים`, cls: 'text-danger-text font-semibold' };
  if (d === 0) return { text: 'פג תוקף היום', cls: 'text-danger-text font-semibold' };
  if (d <= EXPIRY_SOON_DAYS) return { text: `פג בעוד ${d} ימים`, cls: 'text-warning-text font-semibold' };
  return { text: `תוקף עד ${formatDate(expiry)}`, cls: 'text-ink-2' };
}

export const normalizeState = (s) => ({
  items: Array.isArray(s?.items) ? s.items : [],
  checked: Array.isArray(s?.checked) ? s.checked : [],
  orders: Array.isArray(s?.orders) ? s.orders : [],
  removedOrders: Array.isArray(s?.removedOrders) ? s.removedOrders : [],
  appliedMigrations: Array.isArray(s?.appliedMigrations) ? s.appliedMigrations : [],
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

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
