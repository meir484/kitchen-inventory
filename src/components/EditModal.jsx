import React, { useState } from 'react';
import { Bell, BellOff, Trash2, X } from 'lucide-react';
import { UNITS, categoryIdFromLabel, catLabel } from '../data.js';

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
    supplier: item.supplier || '',
    price: item.price ?? '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : Math.max(0, Number(e.target.value)));
  const valid = f.name.trim() && f.lowThreshold !== '' && f.max !== '';
  const units = UNITS.includes(f.unit) ? UNITS : [f.unit, ...UNITS];

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave(item.id, {
      name: f.name.trim(),
      quantity: f.quantity === '' ? null : Number(f.quantity),
      muted: f.muted,
      category: categoryIdFromLabel(f.category),
      unit: f.unit,
      lowThreshold: Number(f.lowThreshold),
      max: Math.max(Number(f.max), Number(f.quantity) || 0, 1),
      expiry: f.expiry,
      supplier: f.supplier.trim(),
      price: f.price === '' ? null : Number(f.price),
    });
  };

  const input = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200';
  const label = 'mb-1 block text-sm font-medium text-stone-600';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">עריכת פריט</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button>
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
            <label className={label} htmlFor="edit-supplier">ספק</label>
            <input id="edit-supplier" list="suppliers-list" className={input} value={f.supplier} onChange={(e) => set('supplier', e.target.value)} />
            <datalist id="suppliers-list">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className={label} htmlFor="edit-price">מחיר ליחידה (₪)</label>
            <input id="edit-price" type="number" min="0" step="0.01" className={input} value={f.price} onChange={(e) => set('price', e.target.value)} />
          </div>
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
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right transition ${f.muted ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-stone-50 text-stone-600 ring-1 ring-stone-200'}`}>
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
          <button type="submit" disabled={!valid} className="flex-1 rounded-xl bg-gradient-to-l from-orange-500 to-rose-500 py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40">
            שמור שינויים
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-stone-100 px-5 py-3 font-medium hover:bg-stone-200">ביטול</button>
        </div>
        <button type="button" onClick={() => onDelete(item.id)} className="mt-3 flex items-center gap-2 text-sm text-red-500 hover:underline">
          <Trash2 size={14} /> מחק את הפריט
        </button>
      </form>
    </div>
  );
}
