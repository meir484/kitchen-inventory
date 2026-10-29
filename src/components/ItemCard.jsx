import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Trash2, CalendarClock, Truck, Bell, BellOff, Pencil, Ellipsis } from 'lucide-react';
import { catLabel } from '../data.js';
import { STATUS, cheapestOffer, expiryInfo, formatDate, formatPacks, hasPacks, isCounted, money, offersOf, qtyOf, stockStatus } from '../lib.js';
import CategoryIcon from './CategoryIcon.jsx';

function ItemMenu({ item, onEdit, onToggleMute, onDelete }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const keys = (e) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', keys);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', keys); };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn(item.id); };
  const row = 'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-right text-sm font-medium transition hover:bg-tint';

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`פעולות עבור ${item.name}`}
        title="עריכה, התראות ומחיקה"
        className="icon-btn -me-2 -mt-2"
      >
        <Ellipsis size={20} />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-30 mt-1 w-52 rounded-control border border-line-strong bg-surface p-1 shadow-hover">
          <button role="menuitem" onClick={run(onEdit)} className={`${row} text-ink`}><Pencil size={16} /> ערוך פריט</button>
          <button role="menuitem" onClick={run(onToggleMute)} className={`${row} text-ink`}>
            {item.muted ? <Bell size={16} /> : <BellOff size={16} />} {item.muted ? 'החזר התראות מלאי' : 'השתק התראות מלאי'}
          </button>
          <div className="my-1 border-t border-line" role="separator" />
          <button role="menuitem" onClick={run(onDelete)} className={`${row} text-danger-text hover:bg-danger-soft`}><Trash2 size={16} /> מחק פריט</button>
        </div>
      )}
    </div>
  );
}

export default function ItemCard({ item, rhythm, onAdjust, onDelete, onToggleMute, onSetQty, onEdit, onSetMin }) {
  const status = stockStatus(item);
  const s = STATUS[status];
  const cat = catLabel(item.category);
  const exp = expiryInfo(item.expiry);
  const counted = isCounted(item);
  const pct = counted ? Math.min(100, Math.max(qtyOf(item) > 0 ? 4 : 0, (qtyOf(item) / (item.max || 1)) * 100)) : 0;
  const offers = offersOf(item);
  const best = offers.length > 1 ? cheapestOffer(item) : null;
  const hasMeta = item.supplier || item.price || item.lastOrderDate || rhythm?.avgInterval || offers.length > 1;

  const editQty = () => {
    const v = window.prompt(`כמות חדשה ל"${item.name}":`, counted ? String(item.quantity) : '');
    const n = v === null || v.trim() === '' ? NaN : Number(v.replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) onSetQty(item.id, n);
  };
  const editMin = () => {
    const v = window.prompt(`מלאי מינימלי ל"${item.name}" (התראה כשהכמות מתחת לערך הזה):`, String(item.lowThreshold));
    const n = v === null || v.trim() === '' ? NaN : Number(v.replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) onSetMin(item.id, n);
  };

  return (
    <article className="card flex flex-col gap-4 p-5 transition hover:border-line-strong hover:shadow-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`badge ${s.badge}`}>{s.label}</span>
          {item.muted && <BellOff size={14} className="text-ink-3" aria-label="התראות מושתקות" role="img" />}
          <span className="t-meta inline-flex items-center gap-1"><CategoryIcon id={item.category} label={cat.label} size={14} />{cat.label}</span>
        </div>
        <ItemMenu item={item} onEdit={onEdit} onToggleMute={onToggleMute} onDelete={onDelete} />
      </div>

      <h3 className="t-product">
        <button onClick={() => onEdit(item.id)} title={item.name} className="line-clamp-2 min-h-11 w-full break-words text-right hover:text-primary">{item.name}</button>
      </h3>

      <div className="h-1 overflow-hidden rounded-full bg-tint" role="presentation">
        <div className={`h-full rounded-full transition-all duration-300 ${s.bar}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => onAdjust(item.id, 1)} aria-label={`הוסף ל${item.name}`} className="step step-up"><Plus size={18} /></button>
          <button
            onClick={editQty}
            title="לחץ להזנת כמות ידנית"
            aria-label={`ערוך כמות ל${item.name}`}
            className="min-h-11 min-w-14 rounded-control px-1.5 text-center transition hover:bg-tint"
          >
            <span className="t-number block">{counted ? item.quantity : '—'}</span>
            <span className="t-micro block">{item.unit}</span>
            {hasPacks(item) && counted && <span className="t-micro block whitespace-nowrap font-semibold text-ink-2">{formatPacks(item.quantity, item.packSize)}</span>}
          </button>
          <button onClick={() => onAdjust(item.id, -1)} disabled={qtyOf(item) <= 0} aria-label={`הפחת מ${item.name}`} className="step step-down"><Minus size={18} /></button>
        </div>
        <button
          onClick={editMin}
          title="לחץ לעריכת המינימום"
          aria-label={`ערוך מינימום ל${item.name}`}
          className="t-meta inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-control px-2 transition hover:bg-tint hover:text-ink"
        >
          מינימום {item.lowThreshold} <Pencil size={12} aria-hidden="true" />
        </button>
      </div>

      {hasPacks(item) && (
        <div className="flex gap-2">
          <button onClick={() => onAdjust(item.id, item.packSize)} aria-label={`הוסף מארז (${item.packSize}) ל${item.name}`} className="step-wide step-up">
            <Plus size={16} aria-hidden="true" /> מארז ({item.packSize})
          </button>
          <button onClick={() => onAdjust(item.id, -item.packSize)} disabled={qtyOf(item) <= 0} aria-label={`הפחת מארז (${item.packSize}) מ${item.name}`} className="step-wide step-down">
            <Minus size={16} aria-hidden="true" /> מארז
          </button>
        </div>
      )}

      {(hasMeta || exp) && (
        <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3 text-[13px] text-ink-2">
          {hasMeta && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {offers.length > 1 ? (
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Truck size={13} aria-hidden="true" />
                  {offers.map((o) => (
                    <span key={`${o.supplier}-${o.price}`} className={best && o.supplier === best.supplier && o.price === best.price ? 'font-semibold text-success-text' : ''}>
                      {o.supplier || 'ספק'} {o.price != null ? money(o.price) : ''}
                    </span>
                  ))}
                </span>
              ) : (
                <>
                  {item.supplier && <span className="inline-flex items-center gap-1"><Truck size={13} aria-hidden="true" /> {item.supplier}</span>}
                  {item.price ? <span>{money(item.price)} ליח׳</span> : null}
                </>
              )}
              {hasPacks(item) && <span>{item.packSize} במארז</span>}
              {rhythm?.avgInterval ? <span className="font-semibold text-info-text">מוזמן בערך כל {rhythm.avgInterval} ימים</span> : null}
              {item.lastOrderDate && <span>הזמנה אחרונה: {formatDate(item.lastOrderDate)}{item.lastOrderQty ? ` (${item.lastOrderQty})` : ''}</span>}
            </div>
          )}
          {exp && <div className={`inline-flex items-center gap-1.5 ${exp.cls}`}><CalendarClock size={14} /> {exp.text}</div>}
        </div>
      )}
    </article>
  );
}
