import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Package, AlertTriangle, CalendarClock, Plus, Search, ShoppingCart, LayoutGrid, CheckCircle2, Circle,
  ChefHat, PackageCheck, FileSpreadsheet, Cloud, CloudOff, Lock, LockOpen, History, FileText, Rows3, Grid3x3, ChevronDown, ChevronUp, Wallet, BellOff,
} from 'lucide-react';
import { catLabel, categoriesOf, mergeSeedOrders } from './data.js';
import {
  daysUntil, EXPIRY_SOON_DAYS, load, money, needsOrder, normalizeState, orderStats, qtyOf, save, STATUS, stockStatus, stockValue,
} from './lib.js';
import {
  fetchKitchen, isValidCode, lockEditing, newKitchenCode, saveKitchen, watchEditor, watchKitchen, withTimeout,
} from './sync.js';
import { runMigrations } from './migrations.js';
import ItemCard from './components/ItemCard.jsx';
import EditModal from './components/EditModal.jsx';
import ImportModal from './components/ImportModal.jsx';
import AddModal from './components/AddModal.jsx';
import SyncModal from './components/SyncModal.jsx';
import UnlockModal from './components/UnlockModal.jsx';
import OrderModal from './components/OrderModal.jsx';
import OrdersHistory from './components/OrdersHistory.jsx';

const ITEMS_KEY = 'kitchen-inventory:v2:items';
const ORDERS_KEY = 'kitchen-inventory:v2:orders';
const APPLIED_KEY = 'kitchen-inventory:v2:applied';
const REMOVED_KEY = 'kitchen-inventory:v2:removedOrders';
const CHECKED_KEY = 'kitchen-inventory:v2:checked';
const VIEW_KEY = 'kitchen-inventory:v2:view';
const CODE_KEY = 'kitchen-inventory:code';

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur sm:gap-4 sm:p-5">
      <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex ${tone}`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-2xl font-extrabold leading-none sm:text-3xl">{value}</div>
        <div className="mt-1 text-xs text-stone-500 sm:text-sm">{label}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [boot] = useState(() => runMigrations(load(ITEMS_KEY, []), load(APPLIED_KEY, [])));
  const [items, setItems] = useState(boot.items);
  const [applied, setApplied] = useState(boot.applied);
  const [removedOrders, setRemovedOrders] = useState(() => load(REMOVED_KEY, []));
  const [orders, setOrders] = useState(() => mergeSeedOrders(load(ORDERS_KEY, []), load(REMOVED_KEY, []), boot.items));
  const [checked, setChecked] = useState(() => load(CHECKED_KEY, []));
  const [tab, setTab] = useState('inventory');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [onlyMuted, setOnlyMuted] = useState(false);
  const [view, setView] = useState(() => load(VIEW_KEY, 'grouped'));
  const [openGroups, setOpenGroups] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSync, setShowSync] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [code, setCode] = useState(() => load(CODE_KEY, ''));
  const [syncStatus, setSyncStatus] = useState('off');
  const lastRemote = useRef('');
  const writesReady = useRef(false);
  const unsynced = useRef(false);

  useEffect(() => save(ITEMS_KEY, items), [items]);
  useEffect(() => save(ORDERS_KEY, orders), [orders]);
  useEffect(() => save(CHECKED_KEY, checked), [checked]);
  useEffect(() => save(REMOVED_KEY, removedOrders), [removedOrders]);
  useEffect(() => save(APPLIED_KEY, applied), [applied]);
  useEffect(() => save(VIEW_KEY, view), [view]);

  useEffect(() => watchEditor(setIsEditor), []);
  const readOnly = !!code && !isEditor;
  const guard = (fn) => (...a) => (readOnly ? setShowUnlock(true) : fn(...a));

  const applyRemote = (data) => {
    const next = normalizeState(JSON.parse(data.payload));
    lastRemote.current = data.payload;
    const migrated = runMigrations(next.items, next.appliedMigrations);
    setItems(migrated.items);
    setApplied(migrated.applied);
    setChecked(next.checked);
    setOrders(mergeSeedOrders(next.orders, next.removedOrders, migrated.items));
    setRemovedOrders(next.removedOrders);
  };

  useEffect(() => {
    save(CODE_KEY, code);
    writesReady.current = false;
    unsynced.current = false;
    if (!code) { setSyncStatus('off'); return undefined; }
    setSyncStatus('syncing');
    return watchKitchen(
      code,
      (data) => {
        const first = !writesReady.current;
        if (data && data.payload !== lastRemote.current && (first || !unsynced.current)) applyRemote(data);
        writesReady.current = true;
        setSyncStatus('ok');
      },
      () => setSyncStatus('error'),
    );
  }, [code]);

  useEffect(() => {
    if (!code || !isEditor || !writesReady.current) return undefined;
    const payload = JSON.stringify({ items, checked, orders, removedOrders, appliedMigrations: applied });
    if (payload === lastRemote.current) return undefined;
    unsynced.current = true;
    const t = setTimeout(() => {
      lastRemote.current = payload;
      saveKitchen(code, { payload })
        .then(() => setSyncStatus('ok'))
        .catch(() => setSyncStatus('error'))
        .finally(() => { unsynced.current = false; });
    }, 500);
    return () => clearTimeout(t);
  }, [items, checked, orders, removedOrders, applied, code, isEditor]);

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
    const payload = JSON.stringify({ items, checked, orders, removedOrders, appliedMigrations: applied });
    await withTimeout(saveKitchen(fresh, { payload }), 15000, 'השרת לא הגיב. בדוק חיבור לאינטרנט (חלק מהסינונים חוסמים את השירות) ונסה שוב')
      .catch((e) => {
        throw new Error(e.code === 'permission-denied' ? 'אין הרשאה לשמור. הזן שוב את סיסמת העריכה' : e.message || 'אין חיבור לשרת, נסה שוב');
      });
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
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, qtyOf(i) + delta) } : i))));
  const setQty = guard((id, value) => setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: value, max: Math.max(i.max || 1, value) } : i))));
  const updateItem = guard((id, patch) => {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setEditingId(null);
  });
  const setMin = guard((id, value) => setItems((p) => p.map((i) => (i.id === id ? { ...i, lowThreshold: value, max: Math.max(i.max || 1, value * 2) } : i))));
  const remove = guard((id) => {
    const it = items.find((i) => i.id === id);
    if (it && window.confirm(`למחוק את "${it.name}"?`)) setItems((p) => p.filter((i) => i.id !== id));
  });
  const add = (data) => {
    setItems((p) => [...p, { ...data, id: `n-${Date.now()}` }]);
    setShowAdd(false);
  };
  const toggleMute = guard((id) => setItems((p) => p.map((i) => (i.id === id ? { ...i, muted: !i.muted } : i))));
  const toggleCheck = guard((id) => setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])));
  const restockChecked = guard(() => {
    setItems((p) => p.map((i) => (checked.includes(i.id) ? { ...i, quantity: Math.max(qtyOf(i), i.max) } : i)));
    setChecked([]);
  });
  const saveOrder = guard((rows) => {
    setOrders((p) => [...p, ...rows]);
    setShowOrder(false);
    setTab('history');
  });
  const deleteOrderRow = guard((id) => {
    if (window.confirm('למחוק את שורת ההזמנה?')) {
      setOrders((p) => p.filter((o) => o.id !== id));
      setRemovedOrders((p) => [...p, id]);
    }
  });
  const applyImport = guard((plan) => {
    setItems(plan.items);
    setOrders(plan.orders);
    setChecked([]);
    setShowImport(false);
    setCategory('all');
    setTab('inventory');
  });

  const rhythms = useMemo(() => orderStats(orders), [orders]);
  const lowItems = useMemo(() => items.filter(needsOrder), [items]);
  const expiringCount = useMemo(
    () => items.filter((i) => { const d = daysUntil(i.expiry); return d !== null && d <= EXPIRY_SOON_DAYS; }).length,
    [items],
  );
  const totalValue = useMemo(() => items.reduce((s, i) => s + stockValue(i), 0), [items]);

  const visible = useMemo(() => {
    const q = query.trim();
    const list = items.filter((i) => (category === 'all' || i.category === category) && (!onlyMuted || i.muted) && i.name.includes(q));
    const far = Number.MAX_SAFE_INTEGER;
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name, 'he'),
      quantity: (a, b) => qtyOf(a) - qtyOf(b),
      shortage: (a, b) => (qtyOf(a) - a.lowThreshold) - (qtyOf(b) - b.lowThreshold),
      expiry: (a, b) => (daysUntil(a.expiry) ?? far) - (daysUntil(b.expiry) ?? far),
    };
    return [...list].sort(sorters[sort]);
  }, [items, category, query, sort, onlyMuted]);

  const categories = useMemo(() => categoriesOf(items), [items]);
  const sections = useMemo(
    () => categories
      .map((c) => {
        const list = visible.filter((i) => i.category === c.id);
        return { ...c, list, low: list.filter(needsOrder).length, value: list.reduce((s, i) => s + stockValue(i), 0) };
      })
      .filter((c) => c.list.length),
    [visible, categories],
  );

  const toggleGroup = (id) => setOpenGroups((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
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

  const grid = (list) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((i) => <ItemCard key={i.id} item={i} rhythm={rhythms.get(i.name)} onAdjust={adjust} onDelete={remove} onToggleMute={toggleMute} onSetQty={setQty} onEdit={(id) => (readOnly ? setShowUnlock(true) : setEditingId(id))} onSetMin={setMin} />)}
    </div>
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
            {syncStatus === 'off'
              ? <CloudOff size={20} className="text-stone-400" />
              : <Cloud size={20} className={syncStatus === 'error' ? 'text-red-500' : syncStatus === 'syncing' ? 'text-amber-500' : 'text-emerald-500'} />}
            {syncStatus === 'off' ? 'סנכרון' : syncStatus === 'error' ? 'לא מחובר' : syncStatus === 'syncing' ? 'מסנכרן…' : 'מסונכרן'}
          </button>
          <button
            onClick={guard(() => setShowImport(true))}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-bold shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50"
          >
            <FileSpreadsheet size={20} className="text-emerald-600" /> ייבוא מאקסל
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

      {items.length === 0 && (
        <section className="mb-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <ChefHat size={48} className="mx-auto mb-3 text-orange-400" />
          <h2 className="mb-2 text-2xl font-extrabold">ברוכים הבאים למלאי המטבח</h2>
          <p className="mx-auto mb-5 max-w-md text-stone-600">עדיין אין כאן מוצרים. אפשר להעלות קובץ אקסל והמערכת תיצור הכול לבד, להוסיף מוצר ידנית, או להתחבר למטבח משותף עם קוד.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 to-rose-500 px-5 py-3 font-bold text-white shadow-lg"><FileSpreadsheet size={20} /> ייבוא מאקסל</button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-stone-100 px-5 py-3 font-bold hover:bg-stone-200"><Plus size={20} /> הוספת מוצר ידנית</button>
            <button onClick={() => setShowSync(true)} className="flex items-center gap-2 rounded-xl bg-stone-100 px-5 py-3 font-bold hover:bg-stone-200"><Cloud size={20} /> התחברות עם קוד</button>
          </div>
        </section>
      )}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Package} label="סה״כ פריטים" value={items.length} tone="bg-sky-100 text-sky-600" />
        <StatCard icon={AlertTriangle} label="לחידוש (מתחת למינימום)" value={lowItems.length} tone="bg-amber-100 text-amber-600" />
        <StatCard icon={CalendarClock} label="עומדים לפוג / פגו תוקף" value={expiringCount} tone="bg-red-100 text-red-600" />
        <StatCard icon={Wallet} label="שווי מלאי מוערך" value={money(totalValue)} tone="bg-emerald-100 text-emerald-600" />
      </section>

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabBtn('inventory', LayoutGrid, 'מלאי', 0)}
        {tabBtn('shopping', ShoppingCart, 'רשימת קניות', lowItems.length)}
        {tabBtn('history', History, 'היסטוריית הזמנות', 0)}
      </nav>

      {tab === 'inventory' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {[{ id: 'all', label: 'הכל', emoji: '🍽️' }, ...categories].map((c) => {
              const count = c.id === 'all' ? items.length : items.filter((i) => i.category === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    category === c.id ? 'bg-orange-500 text-white shadow' : 'bg-white text-stone-600 ring-1 ring-black/5 hover:bg-orange-50'
                  }`}
                >
                  {c.emoji} {c.label} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
            <button
              onClick={() => setOnlyMuted((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                onlyMuted ? 'bg-amber-500 text-white shadow' : 'bg-white text-stone-600 ring-1 ring-black/5 hover:bg-amber-50'
              }`}
            >
              <BellOff size={14} /> מושתקים ({items.filter((i) => i.muted).length})
            </button>
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
              <option value="shortage">מיון: לפי חוסר (הדחוף ראשון)</option>
              <option value="expiry">מיון: לפי תאריך תפוגה</option>
            </select>
            <div className="flex overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              {[['grouped', Rows3, 'לפי קטגוריות'], ['grid', Grid3x3, 'כל הפריטים']].map(([id, Icon, text]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${view === id ? 'bg-stone-900 text-white' : 'hover:bg-stone-50'}`}
                >
                  <Icon size={16} /> {text}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl bg-white/70 py-16 text-center text-stone-500">
              <Package size={48} className="mx-auto mb-3 text-stone-300" />
              לא נמצאו פריטים
            </div>
          ) : view === 'grid' ? (
            grid(visible)
          ) : (
            <div className="space-y-4">
              {sections.map((c) => {
                const expanded = openGroups.includes(c.id) || !!query.trim() || category !== 'all';
                return (
                  <div key={c.id} className="rounded-3xl bg-white/60 p-3 ring-1 ring-black/5">
                    <button onClick={() => toggleGroup(c.id)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-right hover:bg-white/80">
                      <span className="text-2xl">{c.emoji}</span>
                      <span className="flex-1">
                        <span className="block text-lg font-extrabold">{c.label}</span>
                        <span className="text-sm text-stone-500">{c.list.length} פריטים{c.value > 0 ? ` · שווי ${money(c.value)}` : ''}</span>
                      </span>
                      {c.low > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{c.low} לחידוש</span>}
                      {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {expanded && <div className="p-3 pt-1">{grid(c.list)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'shopping' && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">מה צריך לקנות ({lowItems.length})</h2>
            <div className="flex flex-wrap gap-2">
              {shoppingChecked.length > 0 && (
                <button onClick={restockChecked} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white shadow hover:bg-emerald-600">
                  <PackageCheck size={18} /> קניתי – עדכן מלאי ({shoppingChecked.length})
                </button>
              )}
              {lowItems.length > 0 && (
                <button onClick={() => setShowOrder(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 to-rose-500 px-4 py-2 font-bold text-white shadow hover:opacity-90">
                  <FileText size={18} /> הפק רשימת הזמנה
                </button>
              )}
            </div>
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
                      {done ? <CheckCircle2 className="shrink-0 text-emerald-500" /> : <Circle className="shrink-0 text-stone-300" />}
                      <span className={`min-w-0 flex-1 font-medium ${done ? 'text-stone-400 line-through' : ''}`}>
                        {i.name}
                        <span className="mr-2 text-sm font-normal text-stone-400">{catLabel(i.category).label}{i.supplier ? ` · ${i.supplier}` : ''}</span>
                      </span>
                      <span className="hidden text-sm text-stone-500 sm:inline">יש {i.quantity} · מינימום {i.lowThreshold}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.badge}`}>{st.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'history' && <OrdersHistory orders={orders} onDeleteOrder={deleteOrderRow} />}


      {showSync && (
        <SyncModal code={code} status={syncStatus} onClose={() => setShowSync(false)}
          onCreate={createKitchen} onJoin={joinKitchen} onLeave={() => setCode('')} />
      )}
      {showUnlock && <UnlockModal onClose={() => setShowUnlock(false)} />}
      {showOrder && <OrderModal items={lowItems} onClose={() => setShowOrder(false)} onSaveOrder={saveOrder} />}
      {editingId && items.find((i) => i.id === editingId) && (
        <EditModal
          item={items.find((i) => i.id === editingId)}
          categories={categories}
          suppliers={[...new Set(items.map((i) => i.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'))}
          onClose={() => setEditingId(null)}
          onSave={updateItem}
          onDelete={(id) => { setEditingId(null); remove(id); }}
        />
      )}
      {showImport && <ImportModal items={items} orders={orders} onClose={() => setShowImport(false)} onApply={applyImport} />}
      {showAdd && <AddModal categories={categories} onClose={() => setShowAdd(false)} onSave={add} />}
    </div>
  );
}
