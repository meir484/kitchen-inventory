import React, { useState } from 'react';
import { Bell, BellOff, Plus, Trash2, X } from 'lucide-react';
import { UNITS, categoryIdFromLabel, catLabel } from '../data.js';
import { offersOf } from '../lib.js';

export default function EditModal({ item, categories, suppliers, onClose, onSave, onDelete }) {
  const [f, setF] = useState({
    name: item.name,
    quantity: item.quantity ?? '',
    muted: !!item.muted,
    category: catLabel(item.category).label,
    unit: item.unit,
    lowThreshold: item.lowThreshold,
    max: item.max,
    expiry: item.expiry || '',
    packSize: item.packSize > 1 ? item.packSize : '',
  });
  // suppliers and their prices; `pref` is the preferred row (it fills the item's own supplier/price)
  const initialRows = offersOf(item).map((o) => ({ supplier: o.supplier || '', price: o.price ?? '' }));
  const [rows, setRows] = useState(initialRows.length ? initialRows : [{ supplier: '', price: '' }]);
  const [pref, setPref] = useState(() => Math.max(0, offersOf(item).findIndex((o) => o.supplier === (item.supplier || '') && (o.price ?? '') === (item.price ?? ''))));
  const setRow = (idx, k, v) => setRows((p) => p.map((r, n) => (n === idx ? { ...r, [k]: v } : r)));
  const removeRow = (idx) => { setRows((p) => (p.length > 1 ? p.filter((_, n) => n !== idx) : [{ supplier: '', price: '' }])); setPref((p) => (p === idx ? 0 : p > idx ? p - 1 : p)); };
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : Math.max(0, Number(e.target.value)));
  const valid = f.name.trim() && f.lowThreshold !== '' && f.max !== '';
  const units = UNITS.includes(f.unit) ? UNITS : [f.unit, ...UNITS];

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const clean = rows.map((r, n) => ({ ...r, n })).filter((r) => r.supplier.trim() || r.price !== '');
    const main = clean.find((r) => r.n === pref) || clean[0];
    onSave(item.id, {
      name: f.name.trim(),
      quantity: f.quantity === '' ? null : Number(f.quantity),
      muted: f.muted,
      category: categoryIdFromLabel(f.category),
      unit: f.unit,
      lowThreshold: Number(f.lowThreshold),
      max: Math.max(Number(f.max), Number(f.quantity) || 0, 1),
      expiry: f.expiry,
      supplier: main ? main.supplier.trim() : '',
      price: main && main.price !== '' ? Number(main.price) : null,
      offers: clean.length > 1 ? clean.map((r) => ({ supplier: r.supplier.trim(), price: r.price === '' ? null : Number(r.price) })) : undefined,
      packSize: f.packSize !== '' && Number(f.packSize) > 1 ? Number(f.packSize) : undefined,
    });
  };

  const input = 'field';
  const label = 't-label mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-hover">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="t-section">עריכת פריט</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label} htmlFor="edit-name">שם הפריט</label>
            <input id="edit-name" autoFocus className={input} value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="edit-qty">כמות נוכחית</label>
            <input id="edit-qty" type="number" min="0" step="any" placeholder="לא נספר" className={input} value={f.quantity} onChange={num('quantity')} />
          </div>
          <div>
            <label className={label} htmlFor="edit-category">קטגוריה</label>
            <input id="edit-category" list="edit-categories" className={input} value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="למשל: יבשים" />
            <datalist id="edit-categories">{categories.map((c) => <option key={c.id} value={c.label} />)}</datalist>
          </div>
          <div>
            <label className={label} htmlFor="edit-unit">יחידת מידה</label>
            <select id="edit-unit" className={input} value={f.unit} onChange={(e) => set('unit', e.target.value)}>
              {units.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="edit-pack">כמות במארז (אופציונלי)</label>
            <input id="edit-pack" type="number" min="2" step="1" placeholder="למשל 6" className={input} value={f.packSize} onChange={num('packSize')} />
          </div>
          <div>
            <label className={label} htmlFor="edit-packs">כמות מארזים</label>
            <input
              id="edit-packs" type="number" min="0" step="any" className={input} disabled={!(Number(f.packSize) > 1)}
              placeholder={Number(f.packSize) > 1 ? '' : 'קבע כמות במארז'}
              value={Number(f.packSize) > 1 && f.quantity !== '' ? Math.round((Number(f.quantity) / Number(f.packSize)) * 100) / 100 : ''}
              onChange={(e) => set('quantity', e.target.value === '' ? '' : Math.round(Math.max(0, Number(e.target.value)) * Number(f.packSize) * 100) / 100)}
            />
          </div>
          <fieldset className="col-span-2">
            <legend className="t-label mb-1">ספקים ומחיר ליחידה (₪)</legend>
            <datalist id="suppliers-list">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
            {rows.map((r, idx) => (
              <div key={idx} className="mb-2 flex items-center gap-2">
                <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center" title="ספק מועדף">
                  <input type="radio" name="preferred-supplier" checked={pref === idx} onChange={() => setPref(idx)} aria-label={`ספק מועדף: שורה ${idx + 1}`} className="h-5 w-5 accent-primary" />
                </label>
                <input list="suppliers-list" className={`${input} min-w-0 flex-1`} value={r.supplier} onChange={(e) => setRow(idx, 'supplier', e.target.value)} placeholder="שם הספק" aria-label={`שם ספק ${idx + 1}`} />
                <input type="number" min="0" step="0.01" className={`${input} w-20 shrink-0 px-2`} value={r.price} onChange={(e) => setRow(idx, 'price', e.target.value)} placeholder="מחיר" aria-label={`מחיר ספק ${idx + 1}`} />
                <button type="button" onClick={() => removeRow(idx)} aria-label={`הסר ספק ${idx + 1}`} className="icon-btn shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setRows((p) => [...p, { supplier: '', price: '' }])} className="btn-secondary text-sm"><Plus size={16} /> הוסף ספק</button>
            <p className="t-micro mt-2">הספק המסומן הוא המועדף. בהפקת הזמנה אפשר לבחור ספק לכל פריט, והזול ביותר נבחר מראש.</p>
          </fieldset>
          <div>
            <label className={label} htmlFor="edit-min">מלאי מינימלי</label>
            <input id="edit-min" type="number" min="0" className={input} value={f.lowThreshold} onChange={num('lowThreshold')} />
          </div>
          <div>
            <label className={label} htmlFor="edit-max">כמות מלאה (יעד)</label>
            <input id="edit-max" type="number" min="1" className={input} value={f.max} onChange={num('max')} />
          </div>
          <div className="col-span-2">
            <button type="button" onClick={() => set('muted', !f.muted)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-control border px-3 text-right text-sm font-medium transition ${f.muted ? 'border-warning/40 bg-warning-soft text-warning-text' : 'border-line-strong bg-subtle text-ink-2'}`}>
              {f.muted ? <BellOff size={18} /> : <Bell size={18} />}
              {f.muted ? 'מושתק – לא יופיע כחסר ולא ייכנס להזמנות' : 'התראות מלאי נמוך פעילות'}
            </button>
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="edit-expiry">תאריך תפוגה (אופציונלי)</label>
            <input id="edit-expiry" type="date" className={input} value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={!valid} className="btn-primary flex-1">
            שמור שינויים
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
        </div>
        <button type="button" onClick={() => onDelete(item.id)} className="btn mt-3 px-3 text-sm text-danger-text hover:bg-danger-soft">
          <Trash2 size={14} /> מחק את הפריט
        </button>
      </form>
    </div>
  );
}
