import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { parseWorkbook, planImport, templateRows } from '../importExcel.js';
import { downloadBlob } from '../lib.js';

const KIND = { items: 'מוצרים', orders: 'יומן הזמנות', skipped: 'דולג (לא זוהו עמודות)' };

export default function ImportModal({ items, orders, onClose, onApply }) {
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState('merge');
  const [includeOrders, setIncludeOrders] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setParsed(null);
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('יש לבחור קובץ אקסל בפורמט xlsx. ב-Excel: שמירה בשם ← חוברת עבודה של Excel (.xlsx).');
      const { default: readXlsxFile } = await import('read-excel-file/universal');
      const sheets = await readXlsxFile(file);
      const result = parseWorkbook(sheets);
      if (!result.items.length && !result.orders.length) {
        throw new Error('לא נמצאו מוצרים בקובץ. ודא שבשורת הכותרות יש עמודה בשם "שם פריט". אפשר להוריד תבנית מוכנה.');
      }
      setFileName(file.name);
      setParsed(result);
    } catch (err) {
      setError(err.message || 'לא הצלחתי לקרוא את הקובץ');
    }
    setBusy(false);
    e.target.value = '';
  };

  const downloadTemplate = async () => {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const blob = await writeExcelFile(templateRows, {
      sheet: 'מוצרים',
      columns: [26, 14, 12, 14, 10, 18, 14, 16].map((width) => ({ width })),
    }).toBlob();
    downloadBlob(blob, 'inventory-template.xlsx');
  };

  const plan = parsed ? planImport(items, orders, parsed, { mode, includeOrders }) : null;

  const apply = () => {
    if (mode === 'replace' && !window.confirm('זה ימחק את כל המוצרים הקיימים ויחליף אותם בקובץ. להמשיך?')) return;
    onApply(plan);
  };

  const btn = 'btn';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-hover">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 t-section"><FileSpreadsheet size={22} /> ייבוא מאקסל</h2>
          <button onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>

        {!parsed ? (
          <>
            <p className="mb-4 text-ink-2">
              העלה קובץ אקסל (xlsx) והמערכת תיצור את כל המוצרים לבד. כל גיליון נחשב לקטגוריה, או שאפשר להוסיף עמודת "קטגוריה".
              גיליון בשם "יומן הזמנות" ייכנס להיסטוריית ההזמנות.
            </p>
            <label className="btn-primary w-full cursor-pointer">
              <Upload size={18} /> {busy ? 'קורא את הקובץ…' : 'בחר קובץ אקסל'}
              <input type="file" accept=".xlsx" onChange={pick} disabled={busy} className="hidden" />
            </label>
            <div className="mt-4 rounded-control bg-subtle p-3 text-sm text-ink-2">
              <div className="mb-1 font-medium">עמודות שהמערכת מכירה:</div>
              שם פריט (חובה), קטגוריה, מלאי נוכחי, מלאי מינימלי, יחידה, ספק, מחיר ליחידה, תאריך תפוגה.
              <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 font-bold text-primary underline">
                <Download size={16} /> הורד תבנית אקסל מוכנה
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-ink-3">{fileName}</p>
            <ul className="mb-4 divide-y divide-line rounded-control ring-1 ring-line">
              {parsed.report.map((r) => (
                <li key={r.sheet} className="flex items-center justify-between p-3 text-sm">
                  <span className="font-medium">{r.sheet}</span>
                  <span className={r.kind === 'skipped' ? 'text-ink-3' : 'text-ink-2'}>
                    {KIND[r.kind]}{r.kind !== 'skipped' ? ` · ${r.count}` : ''}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mb-3 space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-1 accent-primary" />
                <span><b>הוסף ועדכן</b> – מוצרים חדשים יתווספו, ומוצרים בעלי אותו שם יתעדכנו לפי הקובץ. שום מוצר לא יימחק.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1 accent-primary" />
                <span><b>החלף הכול</b> – המלאי הנוכחי יימחק ויוחלף במה שבקובץ.</span>
              </label>
              {parsed.orders.length > 0 && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={includeOrders} onChange={(e) => setIncludeOrders(e.target.checked)} className="accent-primary" />
                  <span>ייבא גם את יומן ההזמנות ({parsed.orders.length} שורות)</span>
                </label>
              )}
            </div>

            <div className="mb-4 rounded-control bg-info-soft p-3 text-sm text-info-text">
              {plan.added} מוצרים חדשים{mode === 'merge' ? ` · ${plan.updated} יעודכנו` : ''}
              {includeOrders && parsed.orders.length ? ` · ${plan.ordersAdded} שורות הזמנה חדשות` : ''}
            </div>

            <div className="flex gap-2">
              <button onClick={apply} className="btn-primary flex-1">אשר ייבוא</button>
              <button onClick={() => setParsed(null)} className={`${btn} bg-tint hover:bg-tint-strong`}>קובץ אחר</button>
            </div>
          </>
        )}
        {error && <p className="mt-4 rounded-control bg-danger-soft p-3 text-danger-text">{error}</p>}
      </div>
    </div>
  );
}
