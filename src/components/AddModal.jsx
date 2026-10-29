import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UNITS, categoryIdFromLabel, catLabel } from '../data.js';

const emptyForm = {
  name: '', category: '', quantity: 1, unit: UNITS[0], max: 5, lowThreshold: 1, expiry: '', supplier: '', price: '', packSize: '',
};

export default function AddModal({ categories, onClose, onSave }) {
  const [f, setF] = useState(() => ({ ...emptyForm, category: categories[0]?.label || 'כללי' }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : Math.max(0, Number(e.target.value)));
  const valid = f.name.trim() && f.quantity !== '' && f.lowThreshold !== '' && f.max !== '';

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      ...f,
      category: categoryIdFromLabel(f.category),
      name: f.name.trim(),
      supplier: f.supplier.trim(),
      price: f.price === '' ? null : Number(f.price),
      packSize: f.packSize !== '' && Number(f.packSize) > 1 ? Number(f.packSize) : undefined,
      max: Math.max(Number(f.max), Number(f.quantity), 1),
    });
  };

  const input = 'field';
  const label = 't-label mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-hover">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="t-section">הוספת פריט חדש</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>שם הפריט</label>
            <input autoFocus className={input} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="למשל: סוכר" />
          </div>
          <div>
            <label className={label}>קטגוריה</label>
            <input id="add-category" list="add-categories" className={input} value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="למשל: יבשים" />
            <datalist id="add-categories">{categories.map((c) => <option key={c.id} value={c.label} />)}</datalist>
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
            <label className={label} htmlFor="add-pack">כמות במארז (אופציונלי)</label>
            <input id="add-pack" type="number" min="2" step="1" placeholder="למשל 6" className={input} value={f.packSize} onChange={num('packSize')} />
          </div>
          <div>
            <label className={label}>מחיר ליחידה (אופציונלי)</label>
            <input type="number" min="0" step="0.01" className={input} value={f.price} onChange={(e) => set('price', e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={!valid} className="btn-primary flex-1">
            הוסף למלאי
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
        </div>
      </form>
    </div>
  );
}
