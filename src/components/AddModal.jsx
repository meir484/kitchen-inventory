import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, UNITS } from '../data.js';

const emptyForm = {
  name: '', category: 'dry', quantity: 1, unit: UNITS[0], max: 5, lowThreshold: 1, expiry: '', supplier: '', price: '',
};

export default function AddModal({ onClose, onSave }) {
  const [f, setF] = useState(emptyForm);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : Math.max(0, Number(e.target.value)));
  const valid = f.name.trim() && f.quantity !== '' && f.lowThreshold !== '' && f.max !== '';

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      ...f,
      name: f.name.trim(),
      supplier: f.supplier.trim(),
      price: f.price === '' ? null : Number(f.price),
      max: Math.max(Number(f.max), Number(f.quantity), 1),
    });
  };

  const input = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200';
  const label = 'mb-1 block text-sm font-medium text-stone-600';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">הוספת פריט חדש</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>שם הפריט</label>
            <input autoFocus className={input} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="למשל: סוכר" />
          </div>
          <div>
            <label className={label}>קטגוריה</label>
            <select className={input} value={f.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>יחידת מידה</label>
            <select className={input} value={f.unit} onChange={(e) => set('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>כמות נוכחית</label>
            <input type="number" min="0" className={input} value={f.quantity} onChange={num('quantity')} />
          </div>
          <div>
            <label className={label}>כמות מלאה (יעד)</label>
            <input type="number" min="1" className={input} value={f.max} onChange={num('max')} />
          </div>
          <div>
            <label className={label}>מלאי מינימלי (התראה מתחת ל־)</label>
            <input type="number" min="0" className={input} value={f.lowThreshold} onChange={num('lowThreshold')} />
          </div>
          <div>
            <label className={label}>תאריך תפוגה (אופציונלי)</label>
            <input type="date" className={input} value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />
          </div>
          <div>
            <label className={label}>ספק (אופציונלי)</label>
            <input className={input} value={f.supplier} onChange={(e) => set('supplier', e.target.value)} />
          </div>
          <div>
            <label className={label}>מחיר ליחידה (אופציונלי)</label>
            <input type="number" min="0" step="0.01" className={input} value={f.price} onChange={(e) => set('price', e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={!valid} className="flex-1 rounded-xl bg-gradient-to-l from-orange-500 to-rose-500 py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40">
            הוסף למלאי
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-stone-100 px-5 py-3 font-medium hover:bg-stone-200">ביטול</button>
        </div>
      </form>
    </div>
  );
}
