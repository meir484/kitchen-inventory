import React, { useMemo, useState } from 'react';
import { Copy, MessageCircle, Printer, X, ClipboardCheck } from 'lucide-react';
import { formatDate, money, suggestQty, todayIso } from '../lib.js';

const NO_SUPPLIER = 'ללא ספק';

export default function OrderModal({ items, onClose, onSaveOrder }) {
  const [qty, setQty] = useState(() => Object.fromEntries(items.map((i) => [i.id, suggestQty(i)])));
  const [skip, setSkip] = useState([]);
  const [invoice, setInvoice] = useState('');
  const [copied, setCopied] = useState(false);

  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const key = i.supplier || NO_SUPPLIER;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    });
    return [...map.entries()].sort(([a], [b]) => (a === NO_SUPPLIER) - (b === NO_SUPPLIER) || a.localeCompare(b, 'he'));
  }, [items]);

  const lines = items
    .filter((i) => !skip.includes(i.id) && Number(qty[i.id]) > 0)
    .map((i) => ({ item: i, qty: Number(qty[i.id]), total: Number(qty[i.id]) * (i.price || 0) }));
  const grand = lines.reduce((s, l) => s + l.total, 0);

  const text = useMemo(() => {
    const out = [`רשימת הזמנה – ${formatDate(todayIso())}`];
    groups.forEach(([supplier, list]) => {
      const sel = list.map((i) => lines.find((l) => l.item.id === i.id)).filter(Boolean);
      if (!sel.length) return;
      out.push('', `*${supplier}*`);
      sel.forEach((l) => out.push(`• ${l.item.name} – ${l.qty}`));
    });
    if (grand > 0) out.push('', `סה״כ משוער: ${money(grand)}`);
    return out.join('\n');
  }, [groups, lines, grand]);

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
      const rows = sel.map((l) => `<tr><td>${esc(l.item.name)}</td><td>${l.qty}</td><td>${l.item.price ? money(l.total) : ''}</td></tr>`).join('');
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
      id: `o-${Date.now()}-${k}`, date, invoice: invoice.trim(), supplier: l.item.supplier || NO_SUPPLIER,
      name: l.item.name, qty: l.qty, price: l.item.price || 0, total: Math.round(l.total * 100) / 100,
    })));
  };

  const btn = 'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 p-5">
          <h2 className="text-xl font-extrabold">רשימת הזמנה</h2>
          <button onClick={onClose} aria-label="סגור" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {groups.map(([supplier, list]) => (
            <div key={supplier} className="mb-5">
              <h3 className="mb-2 font-bold text-orange-600">{supplier}</h3>
              <ul className="divide-y divide-stone-100 rounded-2xl ring-1 ring-stone-100">
                {list.map((i) => {
                  const off = skip.includes(i.id);
                  return (
                    <li key={i.id} className={`flex items-center gap-3 p-3 ${off ? 'opacity-40' : ''}`}>
                      <input type="checkbox" checked={!off} aria-label={`כלול ${i.name}`}
                        onChange={() => setSkip((p) => (off ? p.filter((x) => x !== i.id) : [...p, i.id]))}
                        className="h-5 w-5 accent-orange-500" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-snug">{i.name}</div>
                        <div className="text-xs text-stone-400">במלאי {i.quantity} · מינימום {i.lowThreshold}{i.price ? ` · ${money(i.price)} ליח׳` : ''}</div>
                      </div>
                      <input type="number" min="0" value={qty[i.id]} aria-label={`כמות ל${i.name}`}
                        onChange={(e) => setQty((p) => ({ ...p, [i.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-center outline-none focus:border-orange-400" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-stone-100 p-5">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">{lines.length} פריטים בהזמנה</span>
            <span className="text-lg font-extrabold">{grand > 0 ? `סה״כ משוער: ${money(grand)}` : ''}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button disabled={!lines.length} onClick={copy} className={`${btn} bg-stone-900 text-white`}><Copy size={16} />{copied ? 'הועתק' : 'העתק'}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
              className={`${btn} bg-emerald-500 text-white ${lines.length ? '' : 'pointer-events-none opacity-40'}`}><MessageCircle size={16} />וואטסאפ</a>
            <button disabled={!lines.length} onClick={print} className={`${btn} bg-stone-100 hover:bg-stone-200`}><Printer size={16} />הדפס</button>
          </div>
          <div className="flex gap-2">
            <input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="מס׳ חשבונית (אופציונלי)"
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 outline-none focus:border-orange-400" />
            <button disabled={!lines.length} onClick={saveOrder} className={`${btn} bg-gradient-to-l from-orange-500 to-rose-500 text-white`}>
              <ClipboardCheck size={16} /> שמור בהיסטוריה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
