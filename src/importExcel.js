import { categoryIdFromLabel } from './categories.js';

const normText = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const headerKey = (s) => normText(s).replace(/\(.*?\)/g, '').trim().toLowerCase();

const ITEM_COLUMNS = {
  name: ['שם פריט', 'שם', 'פריט', 'מוצר', 'שם מוצר', 'name', 'item', 'product'],
  category: ['קטגוריה', 'category'],
  quantity: ['מלאי נוכחי', 'כמות נוכחית', 'כמות', 'מלאי', 'quantity', 'qty', 'stock'],
  lowThreshold: ['מלאי מינימלי', 'מינימום', 'מינימלי', 'min', 'minimum'],
  max: ['כמות מלאה', 'כמות יעד', 'יעד', 'max', 'target'],
  unit: ['יחידת מידה', 'יחידה', 'unit'],
  supplier: ['ספק', 'supplier'],
  price: ['מחיר ליחידה', 'מחיר', 'price'],
  expiry: ['תאריך תפוגה', 'תפוגה', 'expiry'],
  lastOrderQty: ['כמות הזמנה אחרונה'],
  lastOrderDate: ['תאריך הזמנה אחרונה'],
};

const ORDER_COLUMNS = {
  date: ['תאריך', 'date'],
  invoice: ['מס׳ חשבונית', "מס' חשבונית", 'מס חשבונית', 'חשבונית', 'invoice'],
  supplier: ['ספק', 'supplier'],
  name: ['שם פריט', 'פריט', 'שם', 'name', 'item'],
  qty: ['כמות', 'qty', 'quantity'],
  price: ['מחיר ליחידה', 'מחיר', 'price'],
  total: ['סה"כ', 'סהכ', 'total'],
};

const GENERIC_SHEET = /^(sheet|גיליון|לוח)\s*\d*$/i;

export const toNumber = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const n = Number(v.replace(/[₪,\s]/g, (c) => (c === ',' ? '.' : '')));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

const pad = (n) => String(n).padStart(2, '0');

// Accepts Excel dates, ISO strings and dd/mm/yyyy text; anything else (or a bogus year) is ignored.
export const toIsoDate = (v) => {
  let iso = '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) iso = v.toISOString().slice(0, 10);
  else if (typeof v === 'string') {
    const t = v.trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) iso = `${m[1]}-${m[2]}-${m[3]}`;
    else if ((m = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/))) iso = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  }
  const year = Number(iso.slice(0, 4));
  return year >= 2000 && year <= 2100 ? iso : '';
};

const mapColumns = (headerRow, spec) => {
  const found = {};
  headerRow.forEach((cell, idx) => {
    const key = headerKey(cell);
    if (!key) return;
    Object.entries(spec).forEach(([field, names]) => {
      if (found[field] === undefined && names.some((n) => headerKey(n) === key)) found[field] = idx;
    });
  });
  return found;
};

const findHeader = (rows, spec, required) => {
  for (let r = 0; r < Math.min(rows.length, 10); r += 1) {
    const cols = mapColumns(rows[r], spec);
    if (required.every((f) => cols[f] !== undefined)) return { rowIndex: r, cols };
  }
  return null;
};

const isEmptyRow = (row) => row.every((c) => c === null || c === undefined || String(c).trim() === '');

const text = (row, cols, field) => (cols[field] === undefined ? '' : normText(row[cols[field]]));
const num = (row, cols, field) => (cols[field] === undefined ? null : toNumber(row[cols[field]]));

// sheets: [{ sheet: 'name', data: [[cell, ...], ...] }]
export function parseWorkbook(sheets, now = Date.now()) {
  const items = [];
  const orders = [];
  const report = [];
  const seenNames = new Set();
  let seq = 0;

  sheets.forEach(({ sheet, data }) => {
    const rows = data.filter((r) => Array.isArray(r));
    const orderHeader = findHeader(rows, ORDER_COLUMNS, ['date', 'name', 'qty']);
    const itemHeader = findHeader(rows, ITEM_COLUMNS, ['name']);

    if (orderHeader && !(itemHeader && itemHeader.cols.quantity !== undefined && orderHeader.cols.invoice === undefined)) {
      const { rowIndex, cols } = orderHeader;
      let count = 0;
      rows.slice(rowIndex + 1).forEach((row) => {
        const name = text(row, cols, 'name');
        const date = toIsoDate(row[cols.date]);
        const qty = num(row, cols, 'qty');
        if (!name || !date || qty === null) return;
        const price = num(row, cols, 'price') ?? 0;
        const total = num(row, cols, 'total') ?? Math.round(qty * price * 100) / 100;
        seq += 1;
        orders.push({ id: `x-${now}-o${seq}`, date, invoice: text(row, cols, 'invoice'), supplier: text(row, cols, 'supplier') || 'ללא ספק', name, qty, price, total });
        count += 1;
      });
      report.push({ sheet, kind: 'orders', count });
      return;
    }

    if (!itemHeader) {
      report.push({ sheet, kind: 'skipped', count: 0 });
      return;
    }

    const { rowIndex, cols } = itemHeader;
    const sheetCategory = GENERIC_SHEET.test(sheet.trim()) ? 'כללי' : normText(sheet);
    let count = 0;
    rows.slice(rowIndex + 1).forEach((row) => {
      if (isEmptyRow(row)) return;
      const name = text(row, cols, 'name');
      if (!name || name.startsWith('דוגמה') || name === 'סה"כ') return;
      const key = name.toLowerCase();
      if (seenNames.has(key)) return;
      seenNames.add(key);
      const quantity = num(row, cols, 'quantity');
      const lowThreshold = num(row, cols, 'lowThreshold');
      const max = num(row, cols, 'max');
      seq += 1;
      items.push({
        id: `x-${now}-${seq}`,
        name,
        category: categoryIdFromLabel(text(row, cols, 'category') || sheetCategory),
        quantity,
        unit: text(row, cols, 'unit') || 'יח׳',
        lowThreshold: lowThreshold ?? 0,
        hasMin: lowThreshold !== null,
        max: max ?? Math.max((lowThreshold || 0) * 2, quantity || 0, 1),
        expiry: cols.expiry === undefined ? '' : toIsoDate(row[cols.expiry]),
        supplier: text(row, cols, 'supplier'),
        price: num(row, cols, 'price'),
        lastOrderQty: num(row, cols, 'lastOrderQty'),
        lastOrderDate: cols.lastOrderDate === undefined ? '' : toIsoDate(row[cols.lastOrderDate]),
      });
      count += 1;
    });
    report.push({ sheet, kind: 'items', count });
  });

  return { items, orders, report };
}

const sameName = (a, b) => normText(a).toLowerCase() === normText(b).toLowerCase();

// mode 'merge': update matching items (by name) and add new ones. mode 'replace': use the file as is.
export function planImport(allItems, currentOrders, parsed, { mode, includeOrders }) {
  const currentItems = allItems.filter((i) => !i.example);
  const incoming = parsed.items.map(({ hasMin, ...item }) => ({ ...item, hasMin }));
  let items;
  let added = 0;
  let updated = 0;

  if (mode === 'replace') {
    items = incoming.map(({ hasMin, ...item }) => item);
    added = items.length;
  } else {
    items = currentItems.map((cur) => {
      const inc = incoming.find((i) => sameName(i.name, cur.name));
      if (!inc) return cur;
      updated += 1;
      const patch = {};
      if (inc.quantity !== null) patch.quantity = inc.quantity;
      if (inc.hasMin) patch.lowThreshold = inc.lowThreshold;
      if (inc.supplier) patch.supplier = inc.supplier;
      if (inc.price !== null) patch.price = inc.price;
      if (inc.unit !== 'יח׳') patch.unit = inc.unit;
      if (inc.expiry) patch.expiry = inc.expiry;
      if (inc.lastOrderQty !== null) patch.lastOrderQty = inc.lastOrderQty;
      if (inc.lastOrderDate) patch.lastOrderDate = inc.lastOrderDate;
      const next = { ...cur, ...patch };
      next.max = Math.max(cur.max || 1, next.quantity || 0, (next.lowThreshold || 0) * 2);
      return next;
    });
    const fresh = incoming.filter((i) => !currentItems.some((c) => sameName(c.name, i.name))).map(({ hasMin, ...item }) => item);
    added = fresh.length;
    items = [...items, ...fresh];
  }

  let orders = currentOrders;
  let ordersAdded = 0;
  if (includeOrders && parsed.orders.length) {
    const key = (o) => `${o.date}|${o.invoice}|${normText(o.name)}|${o.qty}|${o.price}`;
    const have = new Set(currentOrders.map(key));
    const fresh = parsed.orders.filter((o) => !have.has(key(o)));
    ordersAdded = fresh.length;
    orders = [...currentOrders, ...fresh];
  }
  return { items, orders, added, updated, ordersAdded };
}

export const templateRows = [
  ['שם פריט', 'קטגוריה', 'מלאי נוכחי', 'מלאי מינימלי', 'יחידה', 'ספק', 'מחיר ליחידה', 'תאריך תפוגה'],
  ['דוגמה: אורז', 'יבשים', 5, 2, 'ק״ג', 'ספק לדוגמה', 7.5, ''],
  ['דוגמה: חלב', 'מקרר', 6, 4, 'ליטר', '', 6, '2026-12-31'],
];
