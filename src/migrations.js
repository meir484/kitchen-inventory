// One-time stock updates shipped with the app (e.g. receiving a delivery).
// Each runs once per saved state; the applied ids travel with the synced data.
const SHAMAI = 'ר. שמאי';
const received = (qty) => ({ supplier: SHAMAI, lastOrderQty: qty, lastOrderDate: '2026-10-20' });

export const MIGRATIONS = [
  {
    id: 'receipt-780721',
    adjust: [
      { id: 'shamai-129', set: 48.9, patch: { ...received(48.9), price: 6.9 } }, // מפה גליל לבן H.D.
      { id: 'shamai-128', add: 1, patch: received(1) }, // אשפתון בגליל ענק
      { id: 'shamai-126', add: 20, patch: received(20) }, // שקית אשפה 75/90 גליל
      { id: 'shamai-108', add: 6, patch: { ...received(6), price: 7.9 } }, // שמפו/סבון רצפות
      { id: 'shamai-131', set: 432, patch: { ...received(432), price: 1.75 } }, // נייר טואלט נרקיס
      { id: 'shamai-72', add: 3, patch: { ...received(90), price: 2 } }, // כוסות פלסטיק (נספרות בקרטונים של 30)
      { id: 'shamai-99', add: 6, patch: received(6) }, // ניילון נצמד
    ],
    addItems: [
      {
        id: 'receipt-780721-knives', name: 'סכינים שקופים 50 יח׳ סדרה 4', category: 'shamai', quantity: 80, unit: 'יח׳',
        lowThreshold: 0, max: 80, expiry: '', supplier: SHAMAI, price: 2.3, lastOrderQty: 80, lastOrderDate: '2026-10-20',
      },
      {
        id: 'receipt-780721-rubber', name: 'גומי למשתנות ריחנית', category: 'shamai', quantity: 12, unit: 'יח׳',
        lowThreshold: 0, max: 12, expiry: '', supplier: SHAMAI, price: 10.9, lastOrderQty: 12, lastOrderDate: '2026-10-20',
      },
    ],
  },
];

export function runMigrations(items, applied = []) {
  let next = items;
  const done = [...applied];
  MIGRATIONS.filter((m) => !done.includes(m.id)).forEach((m) => {
    const adj = new Map(m.adjust.map((a) => [a.id, a]));
    next = next.map((i) => {
      const a = adj.get(i.id);
      if (!a) return i;
      const qty = a.set !== undefined ? a.set : (i.quantity ?? 0) + a.add;
      return { ...i, ...a.patch, quantity: qty, max: Math.max(i.max || 1, qty) };
    });
    const have = new Set(next.map((i) => i.id));
    next = [...next, ...m.addItems.filter((i) => !have.has(i.id))];
    done.push(m.id);
  });
  return { items: next, applied: done };
}
