import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, History, Search, Trash2 } from 'lucide-react';
import { daysUntil, formatDate, money, orderStats } from '../lib.js';

function FrequencyTable({ stats, supplier, query }) {
  const q = query.trim();
  const rows = stats
    .filter((r) => (supplier === 'all' || r.supplier === supplier) && (!q || r.name.includes(q)))
    .sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next || '').localeCompare(b.next || '') || b.count - a.count);
  const learned = rows.filter((r) => r.avgInterval).length;
  return (
    <>
      <p className="mb-3 rounded-control bg-info-soft p-3 text-sm text-info-text">
        הקצב מחושב מהמרווח הממוצע בין הזמנות של אותו פריט. כרגע אפשר ללמוד קצב על {learned} פריטים (אלה שהוזמנו לפחות פעמיים).
        ככל שיישמרו עוד הזמנות, החישוב יהיה מדויק יותר.
      </p>
      <div className="overflow-x-auto card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-subtle text-ink-3">
            <tr>
              <th className="p-3 text-right font-medium">פריט</th>
              <th className="p-3 font-medium">הוזמן (פעמים)</th>
              <th className="p-3 font-medium">הזמנה אחרונה</th>
              <th className="p-3 font-medium">בערך כל</th>
              <th className="p-3 font-medium">צפי הזמנה הבאה</th>
              <th className="p-3 font-medium">כמות ממוצעת</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = r.next ? daysUntil(r.next) : null;
              return (
                <tr key={r.name} className="border-t border-line">
                  <td className="p-3 text-right"><div className="font-medium">{r.name}</div><div className="text-xs text-ink-3">{r.supplier}</div></td>
                  <td className="p-3 text-center">{r.count}</td>
                  <td className="p-3 text-center">{formatDate(r.last)}</td>
                  <td className="p-3 text-center">{r.avgInterval ? `${r.avgInterval} ימים` : <span className="text-ink-3">אין מספיק נתונים</span>}</td>
                  <td className={`p-3 text-center ${d !== null && d <= 0 ? 'font-bold text-warning-text' : ''}`}>
                    {r.next ? `${formatDate(r.next)}${d <= 0 ? ' (הגיע הזמן)' : ''}` : '—'}
                  </td>
                  <td className="p-3 text-center">{r.avgQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function OrdersHistory({ orders, onDeleteOrder }) {
  const [supplier, setSupplier] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState([]);
  const [mode, setMode] = useState('orders');
  const stats = useMemo(() => [...orderStats(orders).values()], [orders]);

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
      <div className="mb-4 flex w-fit gap-2" role="group" aria-label="תצוגת היסטוריה">
        {[['orders', 'לפי הזמנות'], ['freq', 'תכיפות לפי פריט']].map(([id, text]) => (
          <button key={id} onClick={() => setMode(id)} className="seg" aria-pressed={mode === id}>{text}</button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <div className="text-sm text-ink-3">הזמנות</div>
          <div className="t-number">{groups.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-3">סה״כ הוצאות</div>
          <div className="t-number">{money(grand)}</div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי פריט או מס׳ חשבונית…"
            className="field h-12 pr-11" />
        </div>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="ספק"
          className="field h-12 w-auto">
          <option value="all">כל הספקים</option>
          {suppliers.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {mode === 'freq' ? (
        <FrequencyTable stats={stats} supplier={supplier} query={query} />
      ) : groups.length === 0 ? (
        <div className="card py-16 text-center text-ink-3">
          <History size={48} className="mx-auto mb-3 text-line-strong" />
          אין הזמנות להצגה
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = open.includes(g.key);
            return (
              <div key={g.key} className="overflow-hidden card">
                <button onClick={() => toggle(g.key)} className="flex w-full items-center gap-3 p-4 text-right hover:bg-subtle">
                  <div className="flex-1">
                    <div className="font-bold">{g.supplier}</div>
                    <div className="text-sm text-ink-3">
                      {formatDate(g.date)}{g.invoice ? ` · חשבונית ${g.invoice}` : ''} · {g.rows.length} פריטים
                    </div>
                  </div>
                  <div className="text-lg font-bold">{money(g.total)}</div>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && (
                  <table className="w-full border-t border-line text-sm">
                    <thead className="bg-subtle text-ink-3">
                      <tr><th className="p-2 text-right font-medium">פריט</th><th className="p-2 font-medium">כמות</th><th className="p-2 font-medium">מחיר</th><th className="p-2 font-medium">סה״כ</th><th /></tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id} className="border-t border-line">
                          <td className="p-2 text-right">{r.name}</td>
                          <td className="p-2 text-center">{r.qty}</td>
                          <td className="p-2 text-center">{r.price ? money(r.price) : '—'}</td>
                          <td className="p-2 text-center font-medium">{money(r.total)}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => onDeleteOrder(r.id)} aria-label="מחק שורה" className="icon-btn mx-auto h-11 w-11 text-ink-3 hover:text-danger-text"><Trash2 size={14} /></button>
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
