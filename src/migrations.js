// One-time stock updates shipped with the app (e.g. receiving a delivery).
// Each runs once per saved state; the applied ids travel with the synced data.
const SHAMAI = 'ר. שמאי';
const JERUSALEM = 'אריזות ירושלים';
const receivedJ = (qty) => ({ supplier: JERUSALEM, lastOrderQty: qty, lastOrderDate: '2026-10-21' });
const newDry = (key, name, qty, price) => ({
  id: `receipt-658402-${key}`, name, category: 'dry', quantity: qty, unit: 'יח׳', lowThreshold: 0, max: qty, expiry: '',
  supplier: JERUSALEM, price, lastOrderQty: qty, lastOrderDate: '2026-10-21',
});
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
  {
    id: 'receipt-658402',
    adjust: [
      { id: 'dry-11', add: 16, patch: receivedJ(16) }, // טחינה 3 ק"ג אחדות
      { id: 'dry-44', add: 12, patch: receivedJ(12) }, // מלפפון מלח
      { id: 'dry-31', set: 10, patch: receivedJ(10) }, // שוקוצ'ינו (לא נספר קודם)
      { id: 'dry-39', add: 2, patch: receivedJ(2) }, // אבקת שום
      { id: 'dry-58', add: 30, patch: receivedJ(30) }, // שמן קנולה 1 ליטר
      { id: 'dry-12', add: 12, patch: receivedJ(12) }, // יין קברנה
      { id: 'dry-46', add: 40, patch: receivedJ(40) }, // סוכר
      { id: 'dry-54', add: 3, patch: { ...receivedJ(3), price: 136 } }, // קטשופ מנות (הלמנס 996 יח׳ במקום 1200)
    ],
    addItems: [
      newDry('mustard', 'חרדל 5 ק"ג תלמה', 1, 78),
      newDry('mushrooms', 'פטריות 8 חתוך בד"ץ רויאמיל', 24, 3.8),
      newDry('apricot-syrup', 'סירופ משמש 4 ליטר רויאמיל', 4, 21),
      newDry('cocktail-syrup', 'סירופ 4 ליטר קוקטייל למבדה אחדות', 4, 26),
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
