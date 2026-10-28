import seed from './seed.json';

export * from './categories.js';

// Items and orders that shipped with the app (the original kitchen's data). Only states that
// descend from them get the shipped updates; anyone starting fresh never sees this data.
const SEED_ID = /^(dry|shamai|salads|frozen)-\d+$/;
export const isLegacyState = (items) => items.some((i) => SEED_ID.test(i.id));

export const mergeSeedOrders = (orders, removed = [], items = []) => {
  if (!isLegacyState(items)) return orders;
  const have = new Set(orders.map((o) => o.id));
  return [...orders, ...seed.orders.filter((o) => !have.has(o.id) && !removed.includes(o.id))];
};
