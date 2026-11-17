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

// Prints an HTML document through a hidden iframe, so it works where pop-ups are blocked (phones included).
export function printHtml(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  frame.onload = () => {
    const w = frame.contentWindow;
    w.onafterprint = cleanup;
    w.focus();
    w.print();
    setTimeout(() => frame.isConnected && frame.remove(), 120000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

// ---- Matching an order/invoice line to an inventory item ----
export const normName = (s) =>
  String(s ?? '').toLowerCase().replace(/["'׳״`’]/g, '').replace(/[()\-–.,/]/g, ' ').replace(/\s+/g, ' ').trim();

const NOISE = new Set(['בדץ', 'יח', 'יחידה', 'במארז']);
const wordsOf = (s) => normName(s).split(' ').filter(Boolean);

// How alike two names are. Numbers (sizes) must agree, so "שמן 1 ליטר" never matches "שמן 5 ליטר".
export function nameSimilarity(a, b) {
  const wa = wordsOf(a); const wb = wordsOf(b);
  const numsA = wa.filter((w) => /^\d+$/.test(w)); const numsB = wb.filter((w) => /^\d+$/.test(w));
  if (numsA.length && numsB.length && [...numsA].sort().join() !== [...numsB].sort().join()) return 0;
  const ta = new Set(wa.filter((w) => !/^\d+$/.test(w) && !NOISE.has(w))); const tb = new Set(wb.filter((w) => !/^\d+$/.test(w) && !NOISE.has(w)));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((w) => tb.has(w)).length;
  return inter / (ta.size + tb.size - inter);
}

// -> { item, kind: 'exact' | 'alias' | 'close' } or null.  Items remember the invoice names they were matched with (`aliases`).
export function matchItem(items, name) {
  const n = normName(name);
  const alias = items.find((i) => (i.aliases || []).some((a) => normName(a) === n));
  if (alias) return { item: alias, kind: 'alias' };
  const exact = items.find((i) => normName(i.name) === n);
  if (exact) return { item: exact, kind: 'exact' };
  let best = null;
  items.forEach((i) => { const score = nameSimilarity(i.name, name); if (score >= 0.7 && (!best || score > best.score)) best = { item: i, kind: 'close', score }; });
  return best;
}

// Search by the item's name or by any invoice name it was matched with (`aliases`).
export const matchesQuery = (item, query) => {
  const q = normName(query);
  return !q || [item.name, ...(item.aliases || [])].some((n) => normName(n).includes(q));
};
export const aliasHit = (item, query) => {
  const q = normName(query);
  if (!q || normName(item.name).includes(q)) return null;
  return (item.aliases || []).find((a) => normName(a).includes(q)) || null;
};
