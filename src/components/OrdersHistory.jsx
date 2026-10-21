import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, History, Search, Trash2 } from 'lucide-react';
import { formatDate, money } from '../lib.js';

export default function OrdersHistory({ orders, onDeleteOrder }) {
  const [supplier, setSupplier] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState([]);

  const suppliers = useMemo(() => [...new Set(orders.map((o) => o.supplier))].sort((a, b) => a.localeCompare(b, 'he')), [orders]);

  const groups = useMemo(() => {
    const q = query.trim();
    const map = new Map();
    orders
      .filter((o) => (supplier === 'all' || o.supplier === supplier) && (!q || o.name.includes(q) || o.invoice.includes(q)))
      .forEach((o) => {
        const key = `${o.date}|${o.invoice}|${o.supplier}`;
        if (!map.has(key)) map.set(key, { key, date: o.date, invoice: o.invoice, supplier: o.supplier, rows: [] });
        map.get(key).rows.push(o);
      });
    return [...map.values()]
      .map((g) => ({ ...g, total: g.rows.reduce((s, r) => s + r.total, 0) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, supplier, query]);

  const grand = groups.reduce((s, g) => s + g.total, 0);
  const toggle = (key) => setOpen((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  return (
    <section>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm text-stone-500">הזמנות</div>
          <div className="text-2xl font-extrabold">{groups.length}</div>
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm text-stone-500">סה״כ הוצאות</div>
          <div className="text-2xl font-extrabold">{money(grand)}</div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי פריט או מס׳ חשבונית…"
            className="w-full rounded-xl border-0 bg-white py-3 pl-3 pr-10 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="ספק"
          className="rounded-xl border-0 bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-orange-300">
          <option value="all">כל הספקים</option>
          {suppliers.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white/70 py-16 text-center text-stone-500">
          <History size={48} className="mx-auto mb-3 text-stone-300" />
          אין הזמנות להצגה
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = open.includes(g.key);
            return (
              <div key={g.key} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <button onClick={() => toggle(g.key)} className="flex w-full items-center gap-3 p-4 text-right hover:bg-stone-50">
                  <div className="flex-1">
                    <div className="font-bold">{g.supplier}</div>
                    <div className="text-sm text-stone-500">
                      {formatDate(g.date)}{g.invoice ? ` · חשבונית ${g.invoice}` : ''} · {g.rows.length} פריטים
                    </div>
                  </div>
                  <div className="text-lg font-extrabold">{money(g.total)}</div>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && (
                  <table className="w-full border-t border-stone-100 text-sm">
                    <thead className="bg-stone-50 text-stone-500">
                      <tr><th className="p-2 text-right font-medium">פריט</th><th className="p-2 font-medium">כמות</th><th className="p-2 font-medium">מחיר</th><th className="p-2 font-medium">סה״כ</th><th /></tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id} className="border-t border-stone-50">
                          <td className="p-2 text-right">{r.name}</td>
                          <td className="p-2 text-center">{r.qty}</td>
                          <td className="p-2 text-center">{r.price ? money(r.price) : '—'}</td>
                          <td className="p-2 text-center font-medium">{money(r.total)}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => onDeleteOrder(r.id)} aria-label="מחק שורה" className="text-stone-300 hover:text-red-500"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
