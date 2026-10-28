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

  const btn = 'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><FileSpreadsheet size={22} /> ייבוא מאקסל</h2>
          <button onClick={onClose} aria-label="סגור" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button>
        </div>

        {!parsed ? (
          <>
            <p className="mb-4 text-stone-600">
              העלה קובץ אקסל (xlsx) והמערכת תיצור את כל המוצרים לבד. כל גיליון נחשב לקטגוריה, או שאפשר להוסיף עמודת "קטגוריה".
              גיליון בשם "יומן הזמנות" ייכנס להיסטוריית ההזמנות.
            </p>
            <label className={`${btn} cursor-pointer bg-gradient-to-l from-orange-500 to-rose-500 py-3 text-white shadow`}>
              <Upload size={18} /> {busy ? 'קורא את הקובץ…' : 'בחר קובץ אקסל'}
              <input type="file" accept=".xlsx" onChange={pick} disabled={busy} className="hidden" />
            </label>
            <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
              <div className="mb-1 font-medium">עמודות שהמערכת מכירה:</div>
              שם פריט (חובה), קטגוריה, מלאי נוכחי, מלאי מינימלי, יחידה, ספק, מחיר ליחידה, תאריך תפוגה.
              <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 font-bold text-orange-600 underline">
                <Download size={16} /> הורד תבנית אקסל מוכנה
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-stone-500">{fileName}</p>
            <ul className="mb-4 divide-y divide-stone-100 rounded-xl ring-1 ring-stone-100">
              {parsed.report.map((r) => (
                <li key={r.sheet} className="flex items-center justify-between p-3 text-sm">
                  <span className="font-medium">{r.sheet}</span>
                  <span className={r.kind === 'skipped' ? 'text-stone-400' : 'text-stone-600'}>
                    {KIND[r.kind]}{r.kind !== 'skipped' ? ` · ${r.count}` : ''}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mb-3 space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-1 accent-orange-500" />
                <span><b>הוסף ועדכן</b> – מוצרים חדשים יתווספו, ומוצרים בעלי אותו שם יתעדכנו לפי הקובץ. שום מוצר לא יימחק.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1 accent-orange-500" />
                <span><b>החלף הכול</b> – המלאי הנוכחי יימחק ויוחלף במה שבקובץ.</span>
              </label>
              {parsed.orders.length > 0 && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={includeOrders} onChange={(e) => setIncludeOrders(e.target.checked)} className="accent-orange-500" />
                  <span>ייבא גם את יומן ההזמנות ({parsed.orders.length} שורות)</span>
                </label>
              )}
            </div>

            <div className="mb-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
              {plan.added} מוצרים חדשים{mode === 'merge' ? ` · ${plan.updated} יעודכנו` : ''}
              {includeOrders && parsed.orders.length ? ` · ${plan.ordersAdded} שורות הזמנה חדשות` : ''}
            </div>

            <div className="flex gap-2">
              <button onClick={apply} className={`${btn} flex-1 bg-gradient-to-l from-orange-500 to-rose-500 text-white shadow`}>אשר ייבוא</button>
              <button onClick={() => setParsed(null)} className={`${btn} bg-stone-100 hover:bg-stone-200`}>קובץ אחר</button>
            </div>
          </>
        )}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-600">{error}</p>}
      </div>
    </div>
  );
}
