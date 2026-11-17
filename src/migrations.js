import { normName } from './lib.js';

// One-time stock updates for the original kitchen (its items keep the ids they were first created with).
// They run once per saved inventory, on whichever device opens it first; the applied ids travel with the synced data.
const LEGACY_ID = /^(dry|shamai|salads|frozen)-\d+$/;
export const isLegacyState = (items) => items.some((i) => LEGACY_ID.test(i.id));

const SUPPLIER = 'אריזות ירושלים';

// A delivery: each line adds `qty` to the existing item called `into` (default: the line's own name), or becomes a new item.
const RECEIPTS = [
  {
    id: 'receipt-659588',
    date: '2026-11-08',
    invoice: '659588',
    supplier: SUPPLIER,
    lines: [
      { name: "ממרח שוקולד מנות 120 יח'", qty: 120, price: 0.65 },
      { name: "ריבה מנות אפרסק 120 יח'", qty: 120, price: 0.44, into: "ריבה מנות 120 יח'" },
      { name: "ריבה מנות אוכמניות 120 יח'", qty: 120, price: 0.44, into: "ריבה מנות 120 יח'" },
      { name: 'מלח עבה 1 ק"ג (12 במארז)', qty: 12, price: 1.5, into: "מלח שולחן 1 ק\"ג (12 יח')" },
      { name: 'טונה פאוץ 1 ק"ג בד"ץ יבנה', qty: 12, price: 19.5 },
      { name: "קפה נמס רד מאג 200 גר' צנצנת", qty: 12, price: 21 },
      { name: 'מיונז 5 ק"ג תלמה', qty: 3, price: 88 },
      { name: "חלבה 500 גר' בלוק אחדות", qty: 24, price: 8.5 },
      { name: "שיפקה 600 גר' בני דרום", qty: 12, price: 4.4 },
      { name: 'גריל עוף 1 ק"ג', qty: 1, price: 15 },
      { name: 'פלפל שחור גרוס 1 ק"ג ברמן', qty: 1, price: 33 },
      { name: 'פלפל שחור טחון 1 ק"ג ברמן', qty: 2, price: 27 },
      { name: 'פפריקה מתוקה 1 ק"ג', qty: 3, price: 11.9 },
      { name: 'פלפל שאטה גרוס 1 ק"ג', qty: 2, price: 22 },
      { name: 'עגבניות מרוסקות 3 ק"ג פריניר בד"ץ', qty: 12, price: 17.5 },
      { name: 'טבעות ירוק יבנה 9 ליטר', qty: 3, price: 95, into: 'זיתים ירוק יבנה 9 ליטר' },
      { name: 'שמן זית כתית מעולה 3 ליטר רויאמיל', qty: 3, price: 105 },
      { name: 'שמן קנולה 1 ליטר בד"ץ רויאמיל', qty: 30, price: 5.9 },
      { name: 'שמן קנולה 5 ליטר רויאמיל', qty: 9, price: 29 },
      { name: 'מיץ לימון 4 ליטר אריזות ירושלים', qty: 3, price: 9.9 },
      { name: 'מרק בול פטריות אוסם 1 ק"ג', qty: 2, price: 18 },
      { name: 'קורנפלקס 850 גרם תלמה', qty: 32, price: 18.9 },
      { name: 'סירופ פטל 4 ליטר רויאמיל', qty: 4, price: 21, into: 'פטל בטעמים' },
      { name: 'סירופ מנגו 4 ליטר רויאמיל', qty: 4, price: 21, into: 'פטל בטעמים' },
      { name: 'סירופ משמש 4 ליטר רויאמיל', qty: 4, price: 21, into: 'פטל בטעמים' },
      { name: 'רסק עגבניות 28% 3 ק"ג רויאמיל בד"ץ פסח', qty: 12, price: 19.5 },
      { name: 'סוכר בד"ץ 1 ק"ג שטרודל (10 ק"ג)', qty: 40, price: 3.2 },
    ],
  },
];

const round2 = (n) => Math.round(n * 100) / 100;

function receive(state, r) {
  let items = state.items;
  const rows = [];
  r.lines.forEach((line, k) => {
    const target = items.find((i) => normName(i.name) === normName(line.into || line.name));
    if (target) {
      items = items.map((i) => {
        if (i !== target) return i;
        const quantity = round2((i.quantity ?? 0) + line.qty);
        const known = new Set([normName(i.name), ...(i.aliases || []).map(normName)]);
        return {
          ...i, quantity, max: Math.max(i.max || 1, quantity), lastOrderQty: line.qty, lastOrderDate: r.date,
          aliases: known.has(normName(line.name)) ? i.aliases : [...(i.aliases || []), line.name],
        };
      });
    } else {
      items = [...items, {
        id: `${r.id}-${k + 1}`, name: line.name, category: 'dry', quantity: line.qty, unit: 'יח׳', lowThreshold: 0, max: line.qty, expiry: '',
        supplier: r.supplier, price: line.price, lastOrderQty: line.qty, lastOrderDate: r.date,
      }];
    }
    rows.push({
      id: `${r.id}-o${k + 1}`, date: r.date, invoice: r.invoice, supplier: r.supplier, name: line.name,
      qty: line.qty, price: line.price, total: round2(line.qty * line.price), received: true,
    });
  });
  const have = new Set(state.orders.map((o) => o.id));
  return { items, orders: [...state.orders, ...rows.filter((o) => !have.has(o.id))], applied: [...state.applied, r.id] };
}


// One-off corrections of earlier matches. Same rules as receipts: once per saved inventory, id recorded in `applied`.
const SALT = 'מלח שולחן 1 ק"ג (12 יח\')';
const COARSE = 'מלח עבה 1 ק"ג (12 במארז)';

// Coarse salt was received into the table-salt item (as an alias); split it into its own item.
function splitCoarseSalt(state) {
  const salt = state.items.find((i) => normName(i.name) === normName(SALT));
  const hasAlias = salt && (salt.aliases || []).some((a) => normName(a) === normName(COARSE));
  const alreadySeparate = state.items.some((i) => normName(i.name) === normName(COARSE));
  if (!hasAlias || alreadySeparate) return state;
  const delivered = state.orders.filter((o) => normName(o.name) === normName(COARSE));
  const moved = round2(delivered.reduce((sum, o) => sum + o.qty, 0)) || 12;
  const price = delivered.length ? delivered[delivered.length - 1].price : 1.5;
  const lastSalt = state.orders.filter((o) => normName(o.name) === normName(SALT)).sort((a, b) => a.date.localeCompare(b.date)).pop();
  const items = state.items.map((i) => (i !== salt ? i : {
    ...i,
    quantity: Math.max(0, round2((i.quantity ?? 0) - moved)),
    aliases: (i.aliases || []).filter((a) => normName(a) !== normName(COARSE)),
    ...(lastSalt ? { lastOrderQty: lastSalt.qty, lastOrderDate: lastSalt.date } : {}),
  }));
  items.push({
    id: 'fix-split-coarse-salt-1', name: COARSE, category: salt.category, quantity: moved, unit: salt.unit, lowThreshold: 0, max: moved, expiry: '',
    supplier: salt.supplier, price, lastOrderQty: moved, lastOrderDate: delivered.length ? delivered[delivered.length - 1].date : '2026-11-08',
  });
  return { ...state, items };
}

const FIXES = [{ id: 'fix-split-coarse-salt', run: splitCoarseSalt }];

// state: { items, orders, applied } -> the same shape. Only inventories that descend from the original kitchen are touched.
export function runMigrations(state) {
  if (!isLegacyState(state.items)) return state;
  const received = RECEIPTS.filter((r) => !state.applied.includes(r.id)).reduce(receive, state);
  return FIXES.filter((f) => !received.applied.includes(f.id)).reduce((st, f) => ({ ...f.run(st), applied: [...st.applied, f.id] }), received);
}
