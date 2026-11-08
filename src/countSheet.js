import { categoriesOf } from './categories.js';
import { formatDate, hasPacks, needsOrder, todayIso } from './lib.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Items for the sheet: chosen categories (by id), optionally only what is below its minimum.
export function countSheetItems(items, { categoryIds, onlyReorder = false }) {
  const chosen = new Set(categoryIds);
  return items.filter((i) => !i.example && chosen.has(i.category) && (!onlyReorder || needsOrder(i)));
}

// A printable A4 sheet: one table per category, with an empty cell to write the counted amount by hand.
export function buildCountSheetHtml(items, { showCurrent = true, extraRows = 0, date = formatDate(todayIso()) } = {}) {
  const cats = categoriesOf(items);
  const sections = cats.map((cat) => {
    const list = items.filter((i) => i.category === cat.id).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    if (!list.length) return '';
    const rows = list.map((i) => {
      const unit = hasPacks(i) ? `${esc(i.unit)} · ${i.packSize} במארז` : esc(i.unit);
      const blank = hasPacks(i)
        ? '<span class="hint">מארזים</span> ______ &nbsp; <span class="hint">יח׳</span> ______'
        : '';
      return `<tr>
        <td class="tick"><span class="box"></span></td>
        <td class="name">${esc(i.name)}</td>
        <td class="small">${unit}</td>
        <td class="num">${i.lowThreshold ?? ''}</td>
        ${showCurrent ? `<td class="num">${i.quantity ?? '—'}</td>` : ''}
        <td class="write">${blank}</td>
        <td class="note"></td>
      </tr>`;
    }).join('');
    return `<h2>${esc(cat.label)} <span class="count">(${list.length})</span></h2>
      <table>
        <thead><tr><th class="tick"></th><th>פריט</th><th>יחידה</th><th>מינימום</th>${showCurrent ? '<th>במערכת</th>' : ''}<th class="writeh">ספירה בפועל</th><th>הערות</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }).join('');

  const blankRows = Math.max(0, Math.min(40, Math.floor(extraRows)));
  const extra = blankRows
    ? `<h2>מוצרים נוספים / חדשים</h2><table><thead><tr><th class="tick"></th><th>פריט</th><th>יחידה</th><th>מינימום</th>${showCurrent ? '<th>במערכת</th>' : ''}<th class="writeh">ספירה בפועל</th><th>הערות</th></tr></thead><tbody>${
      Array.from({ length: blankRows }, () => `<tr><td class="tick"><span class="box"></span></td><td class="name"></td><td></td><td></td>${showCurrent ? '<td></td>' : ''}<td class="write"></td><td class="note"></td></tr>`).join('')
    }</tbody></table>`
    : '';

  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>דף ספירת מלאי</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, "Heebo", sans-serif; color: #111; font-size: 13px; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
  h1 { font-size: 20px; margin: 0; }
  .meta { font-size: 13px; }
  h2 { font-size: 15px; margin: 14px 0 4px; break-after: avoid; }
  .count { font-weight: normal; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { border: 1px solid #777; padding: 3px 6px; text-align: right; vertical-align: middle; }
  th { background: #eee; font-size: 12px; }
  td { height: 9.5mm; }
  .tick { width: 8mm; text-align: center; }
  .box { display: inline-block; width: 4.5mm; height: 4.5mm; border: 1px solid #333; }
  .name { font-weight: bold; font-size: 14px; }
  .small { font-size: 12px; }
  .num { text-align: center; width: 15mm; }
  .write, .writeh { width: 40mm; }
  .note { width: 28mm; }
  .small { width: 17mm; }
  .hint { font-size: 11px; color: #555; }
  footer { margin-top: 10px; font-size: 12px; color: #333; }
</style></head><body>
<header><h1>דף ספירת מלאי</h1><div class="meta">תאריך: ${esc(date)} &nbsp;|&nbsp; נספר על ידי: ____________________</div></header>
${sections || '<p>אין פריטים להדפסה.</p>'}${extra}
<footer>לאחר הספירה, מזינים את הכמויות באתר (לחיצה על המספר בכרטיס או "עריכה").</footer>
</body></html>`;
}
