import React from 'react';
import { Plus, Minus, Trash2, CalendarClock, Truck, Bell, BellOff } from 'lucide-react';
import { catLabel } from '../data.js';
import { STATUS, expiryInfo, formatDate, isCounted, money, qtyOf, stockStatus } from '../lib.js';

export default function ItemCard({ item, rhythm, onAdjust, onDelete, onToggleMute }) {
  const status = stockStatus(item);
  const s = STATUS[status];
  const cat = catLabel(item.category);
  const exp = expiryInfo(item.expiry);
  const pct = Math.min(100, Math.max(status === 'out' || status === 'unknown' ? 0 : 4, (qtyOf(item) / (item.max || 1)) * 100));
  const hasOrderInfo = item.supplier || item.price || item.lastOrderDate || rhythm?.avgInterval;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-snug">{item.name}</h3>
          <span className="text-sm text-stone-500">{cat.emoji} {cat.label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.badge}`}>{s.label}</span>
          <button
            onClick={() => onToggleMute(item.id)}
            aria-label={item.muted ? `החזר התראות ל${item.name}` : `השתק התראות ל${item.name}`}
            title={item.muted ? 'מושתק – לא יופיע כחסר. לחץ להחזרת התראות' : 'השתק: אל תציג כחסר'}
            className={`rounded-full p-1.5 transition ${item.muted ? 'bg-amber-100 text-amber-600' : 'text-stone-300 hover:bg-stone-100 hover:text-stone-600'}`}
          >
            {item.muted ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            aria-label={`מחק ${item.name}`}
            className="rounded-full p-1.5 text-stone-300 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full transition-all duration-300 ${s.bar}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdjust(item.id, 1)}
            aria-label="הוסף"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow transition hover:bg-emerald-600 active:scale-95"
          >
            <Plus size={20} />
          </button>
          <div className="min-w-[4.5rem] text-center">
            <div className="text-2xl font-extrabold leading-none">{isCounted(item) ? item.quantity : '—'}</div>
            <div className="text-xs text-stone-500">{item.unit}</div>
          </div>
          <button
            onClick={() => onAdjust(item.id, -1)}
            disabled={qtyOf(item) <= 0}
            aria-label="הפחת"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow transition hover:bg-rose-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={20} />
          </button>
        </div>
        <div className="text-left text-xs text-stone-400">מינימום: {item.lowThreshold}</div>
      </div>

      {hasOrderInfo && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500">
          {item.supplier && <span className="flex items-center gap-1"><Truck size={13} /> {item.supplier}</span>}
          {item.price ? <span>{money(item.price)} ליח׳</span> : null}
          {rhythm?.avgInterval ? <span className="font-medium text-sky-600">מוזמן בערך כל {rhythm.avgInterval} ימים</span> : null}
          {item.lastOrderDate && <span>הזמנה אחרונה: {formatDate(item.lastOrderDate)}{item.lastOrderQty ? ` (${item.lastOrderQty})` : ''}</span>}
        </div>
      )}

      {exp && (
        <div className={`mt-3 flex items-center gap-1.5 border-t border-stone-100 pt-3 text-sm ${exp.cls}`}>
          <CalendarClock size={15} /> {exp.text}
        </div>
      )}
    </div>
  );
}
