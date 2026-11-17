import React, { useMemo, useState } from 'react';
import { PackageCheck, X } from 'lucide-react';
import { formatDate, matchItem } from '../lib.js';

const KIND = {
  exact: ['התאמה מדויקת', 'bg-success-soft text-success-text'],
  alias: ['לפי התאמה קודמת', 'bg-success-soft text-success-text'],
  close: ['התאמה משוערת – כדאי לבדוק', 'bg-warning-soft text-warning-text'],
  none: ['לא נמצא במלאי', 'bg-tint text-ink-2'],
};

// Adds the quantities of an order to the inventory. Every line can go to a matching item, become a new item, or be skipped.
export default function ReceiveModal({ group, items, onClose, onApply }) {
  const rows = useMemo(() => group.rows.filter((r) => !r.received), [group]);
  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name, 'he')), [items]);
  const [plan, setPlan] = useState(() => Object.fromEntries(rows.map((r) => {
    const m = matchItem(items, r.name);
    return [r.id, { target: m ? m.item.id : 'new', kind: m ? m.kind : 'none', qty: r.qty }];
  })));
  const set = (id, patch) => setPlan((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const active = rows.filter((r) => plan[r.id].target !== 'skip' && Number(plan[r.id].qty) > 0);
  const apply = () => onApply(active.map((r) => ({
    row: r,
    action: plan[r.id].target === 'new' ? 'new' : 'item',
    itemId: plan[r.id].target === 'new' ? null : plan[r.id].target,
    qty: Number(plan[r.id].qty),
  })), rows.map((r) => r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-card border border-line bg-surface shadow-hover">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="t-section">קליטה למלאי</h2>
            <p className="t-meta">{group.supplier} · {formatDate(group.date)}{group.invoice ? ` · חשבונית ${group.invoice}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="סגור" className="icon-btn -me-2 shrink-0"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-sm text-ink-2">הכמויות יתווספו לכמות שיש היום במלאי. לכל שורה אפשר לשנות לאיזה מוצר היא שייכת, ליצור מוצר חדש או לדלג. ההתאמה נזכרת בפעם הבאה.</p>
          <ul className="divide-y divide-line rounded-card ring-1 ring-line">
            {rows.map((r) => {
              const st = plan[r.id];
              const [kindText, kindCls] = KIND[st.target === 'new' ? 'none' : st.kind] || KIND.none;
              return (
                <li key={r.id} className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 ${st.target === 'skip' ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 sm:flex-1">
                    <div className="font-medium leading-snug">{r.name}</div>
                    <span className={`badge mt-1 ${st.target === 'skip' ? 'bg-tint text-ink-2' : kindCls}`}>{st.target === 'skip' ? 'לא יעודכן' : kindText}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <select
                      value={st.target}
                      onChange={(e) => set(r.id, { target: e.target.value, kind: e.target.value === 'new' || e.target.value === 'skip' ? 'none' : 'exact' })}
                      aria-label={`לאן לקלוט את ${r.name}`}
                      className="field h-11 min-w-0 flex-1 text-sm sm:w-64 sm:flex-none"
                    >
                      <option value="new">מוצר חדש: {r.name}</option>
                      <option value="skip">לדלג (לא לעדכן מלאי)</option>
                      <optgroup label="מוצרים במלאי">
                        {sorted.map((i) => <option key={i.id} value={i.id}>{i.name}{i.quantity != null ? ` (יש ${i.quantity})` : ''}</option>)}
                      </optgroup>
                    </select>
                    <div className="flex shrink-0 flex-col items-center">
                      <input type="number" min="0" step="any" value={st.qty} onChange={(e) => set(r.id, { qty: e.target.value })} aria-label={`כמות ל${r.name}`} className="field h-11 w-20 px-2 text-center" />
                      <span className="t-micro mt-0.5">יחידות</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5">
          <span className="t-meta" role="status">{active.length} מתוך {rows.length} שורות יעודכנו במלאי</span>
          <button onClick={apply} disabled={!active.length} className="btn-primary shrink-0 whitespace-nowrap"><PackageCheck size={18} aria-hidden="true" /> עדכן את המלאי</button>
        </div>
      </div>
    </div>
  );
}
