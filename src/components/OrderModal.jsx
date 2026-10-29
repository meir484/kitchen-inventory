import React, { useMemo, useState } from 'react';
import { Copy, MessageCircle, Minus, Plus, Printer, X, ClipboardCheck } from 'lucide-react';
import { cheapestOffer, formatDate, hasPacks, money, offersOf, suggestPacks, suggestQty, todayIso } from '../lib.js';

const NO_SUPPLIER = 'ללא ספק';

// The supplier to order from by default: the cheapest known offer, otherwise the item's own supplier.
const defaultSupplier = (i) => cheapestOffer(i)?.supplier || i.supplier || '';

export default function OrderModal({ items, onClose, onSaveOrder }) {
  // quantity is typed in packs for items that have a pack size, and in units otherwise
  const [qty, setQty] = useState(() => Object.fromEntries(items.map((i) => [i.id, hasPacks(i) ? suggestPacks(i) : suggestQty(i)])));
  const [pick, setPick] = useState(() => Object.fromEntries(items.map((i) => [i.id, defaultSupplier(i)])));
  const [skip, setSkip] = useState([]);
  const [invoice, setInvoice] = useState('');
  const [copied, setCopied] = useState(false);

  const bump = (id, delta) => setQty((p) => ({ ...p, [id]: Math.max(0, Math.round(((Number(p[id]) || 0) + delta) * 100) / 100) }));

  // what is actually ordered for one item, given the chosen supplier and quantity
  const effective = (i) => {
    const supplier = pick[i.id] ?? '';
    const offer = offersOf(i).find((o) => o.supplier === supplier);
    const price = offer?.price ?? (supplier === (i.supplier || '') ? i.price : null) ?? 0;
    const n = Number(qty[i.id]) || 0;
    const units = hasPacks(i) ? Math.round(n * i.packSize * 100) / 100 : n;
    return { item: i, supplier: supplier || NO_SUPPLIER, price: price || 0, packs: hasPacks(i) ? n : null, qty: units, total: units * (price || 0) };
  };

  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const key = (pick[i.id] ?? '') || NO_SUPPLIER;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    });
    return [...map.entries()].sort(([a], [b]) => (a === NO_SUPPLIER) - (b === NO_SUPPLIER) || a.localeCompare(b, 'he'));
  }, [items, pick]);

  const lines = items.filter((i) => !skip.includes(i.id) && Number(qty[i.id]) > 0).map(effective);
  const grand = lines.reduce((sum, l) => sum + l.total, 0);
  const amount = (l) => (l.packs !== null ? `${l.packs} ${l.packs === 1 ? 'מארז' : 'מארזים'} (${l.qty} יח׳)` : `${l.qty}`);

  const text = useMemo(() => {
    const out = [`רשימת הזמנה – ${formatDate(todayIso())}`];
    groups.forEach(([supplier, list]) => {
      const sel = list.map((i) => lines.find((l) => l.item.id === i.id)).filter(Boolean);
      if (!sel.length) return;
      out.push('', `*${supplier}*`);
      sel.forEach((l) => out.push(`• ${l.item.name} – ${amount(l)}`));
    });
    if (grand > 0) out.push('', `סה״כ משוער: ${money(grand)}`);
    return out.join('\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, qty, pick, skip, grand]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const body = groups.map(([supplier, list]) => {
      const sel = list.map((i) => lines.find((l) => l.item.id === i.id)).filter(Boolean);
      if (!sel.length) return '';
      const rows = sel.map((l) => `<tr><td>${esc(l.item.name)}</td><td>${esc(amount(l))}</td><td>${l.price ? money(l.total) : ''}</td></tr>`).join('');
      return `<h2>${esc(supplier)}</h2><table><tr><th>פריט</th><th>כמות</th><th>סכום משוער</th></tr>${rows}</table>`;
    }).join('');
    w.document.write(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>רשימת הזמנה</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin-bottom:16px}
      td,th{border:1px solid #ccc;padding:6px 10px;text-align:right}th{background:#f3f3f3}</style></head>
      <body><h1>רשימת הזמנה – ${formatDate(todayIso())}</h1>${body}${grand > 0 ? `<p><b>סה״כ משוער: ${money(grand)}</b></p>` : ''}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const saveOrder = () => {
    const date = todayIso();
    onSaveOrder(lines.map((l, k) => ({
      id: `o-${Date.now()}-${k}`, date, invoice: invoice.trim(), supplier: l.supplier,
      name: l.item.name, qty: l.qty, price: l.price, total: Math.round(l.total * 100) / 100,
      ...(l.packs !== null ? { packs: l.packs, packSize: l.item.packSize } : {}),
    })));
  };

  const btn = 'btn';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-card bg-surface shadow-hover">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="t-section">רשימת הזמנה</h2>
          <button onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {groups.map(([supplier, list]) => (
            <div key={supplier} className="mb-5">
              <h3 className="mb-2 font-bold text-primary">{supplier}</h3>
              <ul className="divide-y divide-line rounded-card ring-1 ring-line">
                {list.map((i) => {
                  const off = skip.includes(i.id);
                  const e = effective(i);
                  const offers = offersOf(i);
                  const best = offers.length > 1 ? cheapestOffer(i) : null;
                  return (
                    <li key={i.id} className={`flex flex-wrap items-center gap-3 p-3 ${off ? 'opacity-40' : ''}`}>
                      <label className="-me-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"><input type="checkbox" checked={!off} aria-label={`כלול ${i.name}`}
                        onChange={() => setSkip((p) => (off ? p.filter((x) => x !== i.id) : [...p, i.id]))}
                        className="h-6 w-6 accent-primary" /></label>
                      <div className="min-w-0 flex-1 basis-40">
                        <div className="font-medium leading-snug">{i.name}</div>
                        <div className="t-meta">במלאי {i.quantity} · מינימום {i.lowThreshold}{e.price ? ` · ${money(e.price)} ליח׳` : ''}{hasPacks(i) ? ` · ${i.packSize} במארז` : ''}</div>
                        {offers.length > 1 && (
                          <select
                            value={pick[i.id] ?? ''}
                            onChange={(ev) => setPick((p) => ({ ...p, [i.id]: ev.target.value }))}
                            aria-label={`ספק עבור ${i.name}`}
                            className="field mt-1 h-11 w-full text-sm"
                          >
                            {offers.map((o) => (
                              <option key={`${o.supplier}-${o.price}`} value={o.supplier}>
                                {o.supplier || 'ללא שם'} · {o.price != null ? money(o.price) : 'ללא מחיר'}{best && o.supplier === best.supplier && o.price === best.price ? ' (הזול ביותר)' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-center">
                        <div className="flex items-center gap-1.5">
                          {hasPacks(i) && (
                            <button type="button" onClick={() => bump(i.id, 1)} aria-label={`הוסף מארז ל${i.name}`} className="step step-up"><Plus size={18} aria-hidden="true" /></button>
                          )}
                          <input type="number" min="0" step={hasPacks(i) ? 'any' : '1'} value={qty[i.id]} aria-label={`${hasPacks(i) ? 'מארזים' : 'כמות'} ל${i.name}`}
                            onChange={(ev) => setQty((p) => ({ ...p, [i.id]: ev.target.value }))}
                            className="field h-11 w-20 px-2 text-center" />
                          {hasPacks(i) && (
                            <button type="button" onClick={() => bump(i.id, -1)} disabled={!(Number(qty[i.id]) > 0)} aria-label={`הפחת מארז מ${i.name}`} className="step step-down"><Minus size={18} aria-hidden="true" /></button>
                          )}
                        </div>
                        <span className="t-micro mt-0.5">{hasPacks(i) ? `מארזים (${e.qty} יח׳)` : i.unit}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-line p-5">
          <div className="flex items-center justify-between">
            <span className="text-ink-3">{lines.length} פריטים בהזמנה</span>
            <span className="text-lg font-bold">{grand > 0 ? `סה״כ משוער: ${money(grand)}` : ''}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button disabled={!lines.length} onClick={copy} className={`${btn} bg-ink text-on-solid`}><Copy size={16} />{copied ? 'הועתק' : 'העתק'}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
              className={`${btn} border border-success/30 bg-success-soft text-success-text hover:brightness-95 ${lines.length ? '' : 'pointer-events-none opacity-40'}`}><MessageCircle size={16} />וואטסאפ</a>
            <button disabled={!lines.length} onClick={print} className={`${btn} bg-tint hover:bg-tint-strong`}><Printer size={16} />הדפס</button>
          </div>
          <div className="flex gap-2">
            <input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="מס׳ חשבונית"
              className="field min-w-0 flex-1" />
            <button disabled={!lines.length} onClick={saveOrder} className="btn-primary">
              <ClipboardCheck size={16} /> שמור בהיסטוריה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
