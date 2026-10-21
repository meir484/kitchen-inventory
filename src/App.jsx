import React, { useEffect, useMemo, useState } from 'react';
import {
  Package, AlertTriangle, CalendarClock, Plus, Minus, Search, Trash2, X,
  ShoppingCart, LayoutGrid, CheckCircle2, Circle, ChefHat, PackageCheck,
} from 'lucide-react';
import { CATEGORIES, UNITS, catLabel, seedItems } from './data.js';

const ITEMS_KEY = 'kitchen-inventory:items';
const CHECKED_KEY = 'kitchen-inventory:checked';
const EXPIRY_SOON_DAYS = 3;

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysUntil = (expiry) => {
  if (!expiry) return null;
  return Math.round((new Date(expiry + 'T00:00:00') - todayStart()) / 86400000);
};

const stockStatus = (i) => (i.quantity <= 0 ? 'out' : i.quantity <= i.lowThreshold ? 'low' : 'full');

const STATUS = {
  full: { label: 'מלא', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'מלאי נמוך', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' },
  out: { label: 'אזל', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
};

const formatDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('he-IL');

function expiryInfo(expiry) {
  const d = daysUntil(expiry);
  if (d === null) return null;
  if (d < 0) return { text: `פג תוקף לפני ${-d} ימים`, cls: 'text-red-600 font-bold' };
  if (d === 0) return { text: 'פג תוקף היום', cls: 'text-red-600 font-bold' };
  if (d <= EXPIRY_SOON_DAYS) return { text: `פג בעוד ${d} ימים`, cls: 'text-amber-600 font-bold' };
  return { text: `תוקף עד ${formatDate(expiry)}`, cls: 'text-stone-500' };
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-3xl font-extrabold leading-none">{value}</div>
        <div className="mt-1 text-sm text-stone-500">{label}</div>
      </div>
    </div>
  );
}

function ItemCard({ item, onAdjust, onDelete }) {
  const status = stockStatus(item);
  const s = STATUS[status];
  const cat = catLabel(item.category);
  const exp = expiryInfo(item.expiry);
  const pct = Math.min(100, Math.max(status === 'out' ? 0 : 4, (item.quantity / (item.max || 1)) * 100));

  return (
    <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{item.name}</h3>
          <span className="text-sm text-stone-500">{cat.emoji} {cat.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.badge}`}>{s.label}</span>
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
            <div className="text-2xl font-extrabold leading-none">{item.quantity}</div>
            <div className="text-xs text-stone-500">{item.unit}</div>
          </div>
          <button
            onClick={() => onAdjust(item.id, -1)}
            disabled={item.quantity <= 0}
            aria-label="הפחת"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow transition hover:bg-rose-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={20} />
          </button>
        </div>
        <div className="text-left text-xs text-stone-400">התראה מתחת ל־{item.lowThreshold}</div>
      </div>

      {exp && (
        <div className={`mt-3 flex items-center gap-1.5 border-t border-stone-100 pt-3 text-sm ${exp.cls}`}>
          <CalendarClock size={15} /> {exp.text}
        </div>
      )}
    </div>
  );
}

const emptyForm = { name: '', category: 'dry', quantity: 1, unit: UNITS[0], max: 5, lowThreshold: 1, expiry: '' };

function AddModal({ onClose, onSave }) {
  const [f, setF] = useState(emptyForm);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : Math.max(0, Number(e.target.value)));
  const valid = f.name.trim() && f.quantity !== '' && f.lowThreshold !== '' && f.max !== '';

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ ...f, name: f.name.trim(), max: Math.max(Number(f.max), Number(f.quantity), 1) });
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
            <label className={label}>סף התראת מלאי נמוך</label>
            <input type="number" min="0" className={input} value={f.lowThreshold} onChange={num('lowThreshold')} />
          </div>
          <div>
            <label className={label}>תאריך תפוגה (אופציונלי)</label>
            <input type="date" className={input} value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />
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

export default function App() {
  const [items, setItems] = useState(() => load(ITEMS_KEY, seedItems()));
  const [checked, setChecked] = useState(() => load(CHECKED_KEY, []));
  const [tab, setTab] = useState('inventory');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);
  useEffect(() => {
    try { localStorage.setItem(CHECKED_KEY, JSON.stringify(checked)); } catch { /* storage unavailable */ }
  }, [checked]);

  const adjust = (id, delta) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)));
  const remove = (id) => {
    const it = items.find((i) => i.id === id);
    if (it && window.confirm(`למחוק את "${it.name}"?`)) setItems((p) => p.filter((i) => i.id !== id));
  };
  const add = (data) => {
    setItems((p) => [...p, { ...data, id: Date.now() }]);
    setShowAdd(false);
  };

  const lowItems = useMemo(() => items.filter((i) => stockStatus(i) !== 'full'), [items]);
  const expiringCount = useMemo(
    () => items.filter((i) => { const d = daysUntil(i.expiry); return d !== null && d <= EXPIRY_SOON_DAYS; }).length,
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim();
    const list = items.filter((i) => (category === 'all' || i.category === category) && i.name.includes(q));
    const far = Number.MAX_SAFE_INTEGER;
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name, 'he'),
      quantity: (a, b) => a.quantity - b.quantity,
      expiry: (a, b) => (daysUntil(a.expiry) ?? far) - (daysUntil(b.expiry) ?? far),
    };
    return [...list].sort(sorters[sort]);
  }, [items, category, query, sort]);

  const toggleCheck = (id) => setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const restockChecked = () => {
    setItems((p) => p.map((i) => (checked.includes(i.id) ? { ...i, quantity: Math.max(i.quantity, i.max) } : i)));
    setChecked([]);
  };
  const shoppingChecked = lowItems.filter((i) => checked.includes(i.id));

  const tabBtn = (id, Icon, text, badge) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold transition ${
        tab === id ? 'bg-stone-900 text-white shadow' : 'bg-white/70 text-stone-600 hover:bg-white'
      }`}
    >
      <Icon size={18} /> {text}
      {badge > 0 && <span className="rounded-full bg-rose-500 px-2 text-xs text-white">{badge}</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg">
            <ChefHat size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold">מלאי המטבח</h1>
            <p className="text-stone-500">כל מה שיש במטבח, במבט אחד</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 to-rose-500 px-5 py-3 font-bold text-white shadow-lg transition hover:scale-105"
        >
          <Plus size={20} /> פריט חדש
        </button>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Package} label="סה״כ פריטים" value={items.length} tone="bg-sky-100 text-sky-600" />
        <StatCard icon={AlertTriangle} label="מלאי נמוך / אזל" value={lowItems.length} tone="bg-amber-100 text-amber-600" />
        <StatCard icon={CalendarClock} label="עומדים לפוג / פגו תוקף" value={expiringCount} tone="bg-red-100 text-red-600" />
      </section>

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabBtn('inventory', LayoutGrid, 'מלאי', 0)}
        {tabBtn('shopping', ShoppingCart, 'רשימת קניות', lowItems.length)}
      </nav>

      {tab === 'inventory' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {[{ id: 'all', label: 'הכל', emoji: '🍽️' }, ...CATEGORIES].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  category === c.id ? 'bg-orange-500 text-white shadow' : 'bg-white text-stone-600 ring-1 ring-black/5 hover:bg-orange-50'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם פריט…"
                className="w-full rounded-xl border-0 bg-white py-3 pl-3 pr-10 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="מיון"
              className="rounded-xl border-0 bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="name">מיון: לפי א׳־ב׳</option>
              <option value="quantity">מיון: לפי כמות (מהנמוכה)</option>
              <option value="expiry">מיון: לפי תאריך תפוגה</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl bg-white/70 py-16 text-center text-stone-500">
              <Package size={48} className="mx-auto mb-3 text-stone-300" />
              לא נמצאו פריטים
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((i) => <ItemCard key={i.id} item={i} onAdjust={adjust} onDelete={remove} />)}
            </div>
          )}
        </>
      ) : (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">מה צריך לקנות ({lowItems.length})</h2>
            {shoppingChecked.length > 0 && (
              <button onClick={restockChecked} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white shadow hover:bg-emerald-600">
                <PackageCheck size={18} /> קניתי – עדכן מלאי ({shoppingChecked.length})
              </button>
            )}
          </div>
          {lowItems.length === 0 ? (
            <div className="py-12 text-center text-stone-500">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-400" />
              המלאי מלא, אין מה לקנות 🎉
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {lowItems.map((i) => {
                const done = checked.includes(i.id);
                const st = STATUS[stockStatus(i)];
                return (
                  <li key={i.id}>
                    <button onClick={() => toggleCheck(i.id)} className="flex w-full items-center gap-3 py-3 text-right transition hover:bg-stone-50">
                      {done ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-stone-300" />}
                      <span className={`flex-1 font-medium ${done ? 'text-stone-400 line-through' : ''}`}>
                        {i.name}
                        <span className="mr-2 text-sm font-normal text-stone-400">{catLabel(i.category).label}</span>
                      </span>
                      <span className="text-sm text-stone-500">
                        יש {i.quantity} · יעד {i.max} {i.unit}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.badge}`}>{st.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={add} />}
    </div>
  );
}
