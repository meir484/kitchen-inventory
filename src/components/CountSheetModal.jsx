import React, { useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { buildCountSheetHtml, countSheetItems } from '../countSheet.js';
import { printHtml } from '../lib.js';
import CategoryIcon from './CategoryIcon.jsx';

export default function CountSheetModal({ items, categories, onClose }) {
  const real = useMemo(() => items.filter((i) => !i.example), [items]);
  const [chosen, setChosen] = useState(() => categories.map((c) => c.id));
  const [showCurrent, setShowCurrent] = useState(true);
  const [onlyReorder, setOnlyReorder] = useState(false);
  const [extraRows, setExtraRows] = useState(5);

  const list = countSheetItems(real, { categoryIds: chosen, onlyReorder });
  const toggle = (id) => setChosen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const print = () => printHtml(buildCountSheetHtml(list, { showCurrent, extraRows: Number(extraRows) || 0 }));

  const check = 'flex min-h-11 cursor-pointer items-center gap-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-hover">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="t-section">דף ספירה להדפסה</h2>
          <button onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>
        <p className="mb-4 text-ink-2">דף מסודר לפי קטגוריות עם מקום לכתוב ביד את הכמות שנספרה במחסן. אחרי הספירה מזינים את הכמויות באתר.</p>

        <fieldset className="mb-4">
          <legend className="t-label mb-1">אילו קטגוריות להדפיס</legend>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className={check}>
                <input type="checkbox" checked={chosen.includes(c.id)} onChange={() => toggle(c.id)} className="h-5 w-5 accent-primary" />
                <CategoryIcon id={c.id} label={c.label} size={16} className="text-ink-3" /> {c.label}
                <span className="t-meta">({real.filter((i) => i.category === c.id).length})</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setChosen(chosen.length === categories.length ? [] : categories.map((c) => c.id))} className="mt-1 min-h-11 text-sm text-ink-2 underline">
            {chosen.length === categories.length ? 'בטל את כל הבחירה' : 'בחר הכול'}
          </button>
        </fieldset>

        <label className={check}><input type="checkbox" checked={showCurrent} onChange={(e) => setShowCurrent(e.target.checked)} className="h-5 w-5 accent-primary" /> להציג את הכמות הנוכחית במערכת</label>
        <label className={check}><input type="checkbox" checked={onlyReorder} onChange={(e) => setOnlyReorder(e.target.checked)} className="h-5 w-5 accent-primary" /> רק פריטים שמתחת למינימום</label>
        <div className="mt-2 flex items-center gap-3">
          <label htmlFor="extra-rows" className="text-sm">שורות ריקות למוצרים חדשים</label>
          <input id="extra-rows" type="number" min="0" max="40" value={extraRows} onChange={(e) => setExtraRows(e.target.value)} className="field h-11 w-20 px-2 text-center" />
        </div>

        <p className="t-meta mt-4" role="status">יודפסו {list.length} פריטים{Number(extraRows) > 0 ? ` ועוד ${Math.min(40, Math.floor(Number(extraRows)))} שורות ריקות` : ''}.</p>
        <div className="mt-4 flex gap-3">
          <button onClick={print} disabled={!list.length && !(Number(extraRows) > 0)} className="btn-primary flex-1"><Printer size={18} aria-hidden="true" /> הדפס</button>
          <button onClick={onClose} className="btn-secondary">סגור</button>
        </div>
        <p className="t-micro mt-3">בחלון ההדפסה אפשר לבחור גם "שמור כ-PDF".</p>
      </div>
    </div>
  );
}
