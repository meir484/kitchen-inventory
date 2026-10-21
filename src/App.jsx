import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Package, AlertTriangle, CalendarClock, Plus, Minus, Search, Trash2, X,
  ShoppingCart, LayoutGrid, CheckCircle2, Circle, ChefHat, PackageCheck,
  Cloud, CloudOff, Copy, Link2, Lock, LockOpen,
} from 'lucide-react';
import { CATEGORIES, UNITS, catLabel, seedItems } from './data.js';
import {
  fetchKitchen, isValidCode, lockEditing, newKitchenCode, saveKitchen, unlockEditing, watchEditor, watchKitchen,
} from './sync.js';

const ITEMS_KEY = 'kitchen-inventory:items';
const CHECKED_KEY = 'kitchen-inventory:checked';
const CODE_KEY = 'kitchen-inventory:code';
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


function SyncModal({ code, status, onClose, onCreate, onJoin, onLeave }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const link = code ? `${location.origin}${location.pathname}#k=${code}` : '';

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'משהו השתבש, נסה שוב');
    }
    setBusy(false);
  };
  const copy = async (text, which) => {
    try { await navigator.clipboard.writeText(text); setCopied(which); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard unavailable */ }
  };
  const btn = 'rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><Cloud size={22} /> סנכרון בין מכשירים</h2>
          <button onClick={onClose} aria-label="סגור" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button>
        </div>

        {code ? (
          <>
            <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">
              {status === 'error' ? 'אין חיבור כרגע. השינויים יסונכרנו כשהחיבור יחזור.' : 'המלאי מסונכרן. כל שינוי יופיע בכל המכשירים המחוברים.'}
            </p>
            <label className="mb-1 block text-sm font-medium text-stone-600">קישור לחיבור מכשיר נוסף</label>
            <div className="mb-3 flex gap-2">
              <input readOnly value={link} dir="ltr" className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm" />
              <button onClick={() => copy(link, 'link')} className={`${btn} flex items-center gap-1 bg-stone-900 text-white`}><Link2 size={16} />{copied === 'link' ? 'הועתק' : 'העתק'}</button>
            </div>
            <label className="mb-1 block text-sm font-medium text-stone-600">קוד המטבח</label>
            <div className="mb-3 flex gap-2">
              <input readOnly value={code} dir="ltr" className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm" />
              <button onClick={() => copy(code, 'code')} className={`${btn} flex items-center gap-1 bg-stone-100 hover:bg-stone-200`}><Copy size={16} />{copied === 'code' ? 'הועתק' : 'העתק'}</button>
            </div>
            <p className="mb-5 text-xs text-stone-500">מי שמחזיק בקישור או בקוד יכול לראות ולערוך את המלאי. שתף רק עם בני הבית.</p>
            <button onClick={() => { onLeave(); onClose(); }} className={`${btn} flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100`}>
              <CloudOff size={16} /> נתק מכשיר זה מהסנכרון
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-stone-600">שמור את המלאי בענן כדי שיהיה זמין בכל מכשיר ובין בני הבית.</p>
            <button disabled={busy} onClick={() => run(onCreate)} className={`${btn} mb-5 w-full bg-gradient-to-l from-orange-500 to-rose-500 py-3 text-white shadow`}>
              {busy ? 'מתחבר…' : 'צור מטבח משותף מהמלאי הנוכחי'}
            </button>
            <div className="mb-2 text-sm font-medium text-stone-600">כבר יש לך קוד ממכשיר אחר?</div>
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value.trim())} dir="ltr" placeholder="הדבק כאן קוד מטבח"
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 outline-none focus:border-orange-400" />
              <button disabled={busy || !input} onClick={() => run(() => onJoin(input))} className={`${btn} bg-stone-900 text-white`}>התחבר</button>
            </div>
            <p className="mt-2 text-xs text-stone-500">ההתחברות מחליפה את המלאי במכשיר זה במלאי המשותף.</p>
          </>
        )}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function UnlockModal({ onClose }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await unlockEditing(pw);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><Lock size={20} /> סיסמת עריכה</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button>
        </div>
        <p className="mb-3 text-sm text-stone-600">המלאי המשותף נעול לעריכה. הזן את הסיסמה כדי לשנות.</p>
        <input autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="סיסמה"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200" />
        {error && <p className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <button disabled={busy || !pw} className="mt-4 w-full rounded-xl bg-stone-900 py-3 font-bold text-white disabled:opacity-40">
          {busy ? 'בודק…' : 'אפשר עריכה'}
        </button>
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
  const [showSync, setShowSync] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [code, setCode] = useState(() => load(CODE_KEY, ''));
  const [syncStatus, setSyncStatus] = useState('off');
  const lastRemote = useRef('');
  const writesReady = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);
  useEffect(() => {
    try { localStorage.setItem(CHECKED_KEY, JSON.stringify(checked)); } catch { /* storage unavailable */ }
  }, [checked]);


  useEffect(() => watchEditor(setIsEditor), []);
  const readOnly = !!code && !isEditor;
  const guard = (fn) => (...a) => (readOnly ? setShowUnlock(true) : fn(...a));

  const applyRemote = (data) => {
    const { items: ri, checked: rc } = JSON.parse(data.payload);
    lastRemote.current = data.payload;
    setItems(ri);
    setChecked(rc);
  };

  useEffect(() => {
    try { localStorage.setItem(CODE_KEY, JSON.stringify(code)); } catch { /* storage unavailable */ }
    writesReady.current = false;
    if (!code) { setSyncStatus('off'); return undefined; }
    setSyncStatus('syncing');
    return watchKitchen(
      code,
      (data) => {
        if (data && data.payload !== lastRemote.current) applyRemote(data);
        writesReady.current = true;
        setSyncStatus('ok');
      },
      () => setSyncStatus('error'),
    );
  }, [code]);

  useEffect(() => {
    if (!code || !isEditor || !writesReady.current) return undefined;
    const payload = JSON.stringify({ items, checked });
    if (payload === lastRemote.current) return undefined;
    const t = setTimeout(() => {
      lastRemote.current = payload;
      saveKitchen(code, { payload }).then(() => setSyncStatus('ok')).catch(() => setSyncStatus('error'));
    }, 500);
    return () => clearTimeout(t);
  }, [items, checked, code, isEditor]);

  const joinKitchen = async (raw) => {
    if (!isValidCode(raw)) throw new Error('הקוד אינו תקין');
    const data = await fetchKitchen(raw).catch(() => { throw new Error('אין חיבור לשרת, נסה שוב'); });
    if (!data) throw new Error('לא נמצא מטבח עם הקוד הזה');
    applyRemote(data);
    setCode(raw);
  };
  const createKitchen = async () => {
    if (!isEditor) {
      setShowUnlock(true);
      throw new Error('הזן את סיסמת העריכה ואז לחץ שוב');
    }
    const fresh = newKitchenCode();
    const payload = JSON.stringify({ items, checked });
    await saveKitchen(fresh, { payload }).catch(() => { throw new Error('אין חיבור לשרת, נסה שוב'); });
    lastRemote.current = payload;
    setCode(fresh);
  };

  useEffect(() => {
    const m = location.hash.match(/^#k=([\w-]+)$/);
    if (!m || m[1] === code) return;
    history.replaceState(null, '', location.pathname + location.search);
    if (window.confirm('להתחבר למטבח המשותף? המלאי במכשיר זה יוחלף במלאי המשותף.')) {
      joinKitchen(m[1]).catch((e) => window.alert(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adjust = guard((id, delta) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))));
  const remove = guard((id) => {
    const it = items.find((i) => i.id === id);
    if (it && window.confirm(`למחוק את "${it.name}"?`)) setItems((p) => p.filter((i) => i.id !== id));
  });
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

  const toggleCheck = guard((id) => setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])));
  const restockChecked = guard(() => {
    setItems((p) => p.map((i) => (checked.includes(i.id) ? { ...i, quantity: Math.max(i.quantity, i.max) } : i)));
    setChecked([]);
  });
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
        <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSync(true)}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-bold shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50"
        >
          {syncStatus === 'off' ? <CloudOff size={20} className="text-stone-400" /> : <Cloud size={20} className={syncStatus === 'error' ? 'text-red-500' : syncStatus === 'syncing' ? 'text-amber-500' : 'text-emerald-500'} />}
          {syncStatus === 'off' ? 'סנכרון' : syncStatus === 'error' ? 'לא מחובר' : syncStatus === 'syncing' ? 'מסנכרן…' : 'מסונכרן'}
        </button>
        <button
          onClick={guard(() => setShowAdd(true))}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 to-rose-500 px-5 py-3 font-bold text-white shadow-lg transition hover:scale-105"
        >
          <Plus size={20} /> פריט חדש
        </button>
        </div>
      </header>

      {readOnly && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">
          <span className="flex items-center gap-2"><Lock size={18} /> מצב צפייה בלבד. לעריכה יש להזין סיסמה.</span>
          <button onClick={() => setShowUnlock(true)} className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-600">הזן סיסמה</button>
        </div>
      )}
      {code && isEditor && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
          <span className="flex items-center gap-2"><LockOpen size={16} /> מצב עריכה פעיל במכשיר זה</span>
          <button onClick={() => lockEditing()} className="font-bold underline">נעל</button>
        </div>
      )}

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

      {showSync && (
        <SyncModal code={code} status={syncStatus} onClose={() => setShowSync(false)}
          onCreate={createKitchen} onJoin={joinKitchen} onLeave={() => setCode('')} />
      )}
      {showUnlock && <UnlockModal onClose={() => setShowUnlock(false)} />}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={add} />}
    </div>
  );
}
