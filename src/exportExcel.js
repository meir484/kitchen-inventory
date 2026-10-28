import { categoriesOf } from './categories.js';
import { needsOrder, stockValue } from './lib.js';

const bold = (value) => ({ value, fontWeight: 'bold' });
const RESERVED = ['סיכום', 'יומן הזמנות'];

// The layout matches what the importer reads, so an export can be imported back as is.
export function buildSheets(items, orders) {
  const used = new Set(RESERVED.map((n) => n.toLowerCase()));
  const sheetName = (label) => {
    const base = (label || 'כללי').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 26) || 'כללי';
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base} ${n}`;
    used.add(name.toLowerCase());
    return name;
  };

  const cats = categoriesOf(items);
  const itemHeaders = ['שם פריט', 'מלאי נוכחי (בפועל)', 'מלאי מינימלי', 'להזמנה?', 'יחידה', 'ספק', 'מחיר ליחידה', 'תאריך תפוגה', 'כמות הזמנה אחרונה', 'תאריך הזמנה אחרונה'];
  const itemWidths = [34, 18, 14, 12, 10, 22, 14, 14, 18, 18].map((width) => ({ width }));

  const summary = [['קטגוריה', "מס' פריטים", 'פריטים לחידוש', 'שווי מלאי (מוערך)'].map(bold)];
  const sheets = [];
  cats.forEach((cat) => {
    const list = items.filter((i) => i.category === cat.id);
    sheets.push({
      sheet: sheetName(cat.label),
      columns: itemWidths,
      data: [
        itemHeaders.map(bold),
        ...list.map((i) => [
          i.name, i.quantity ?? null, i.lowThreshold ?? 0, needsOrder(i) ? 'להזמנה' : null, i.unit || null, i.supplier || null,
          i.price ?? null, i.expiry || null, i.lastOrderQty ?? null, i.lastOrderDate || null,
        ]),
      ],
    });
    summary.push([cat.label, list.length, list.filter(needsOrder).length, Math.round(list.reduce((s, i) => s + stockValue(i), 0) * 100) / 100]);
  });
  summary.push([bold('סה"כ'), bold(items.length), bold(items.filter(needsOrder).length), bold(Math.round(items.reduce((s, i) => s + stockValue(i), 0) * 100) / 100)]);

  const result = [{ sheet: 'סיכום', columns: [24, 14, 16, 20].map((width) => ({ width })), data: summary }, ...sheets];
  if (orders.length) {
    const sorted = [...orders].sort((a, b) => a.date.localeCompare(b.date));
    result.push({
      sheet: 'יומן הזמנות',
      columns: [14, 16, 24, 34, 10, 14, 12].map((width) => ({ width })),
      data: [
        ['תאריך', "מס' חשבונית", 'ספק', 'שם פריט', 'כמות', 'מחיר ליחידה', 'סה"כ'].map(bold),
        ...sorted.map((o) => [o.date, o.invoice || null, o.supplier, o.name, o.qty, o.price ?? null, o.total ?? null]),
      ],
    });
  }
  return result;
}
