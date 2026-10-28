import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Package, AlertTriangle, CalendarClock, Plus, Search, ShoppingCart, LayoutGrid, CheckCircle2, Circle,
  ChefHat, PackageCheck, FileSpreadsheet, Download, Cloud, CloudOff, Lock, LockOpen, History, FileText, Rows3, Grid3x3, ChevronDown, ChevronUp, Wallet, BellOff, Moon, Sun,
} from 'lucide-react';
import { catLabel, categoriesOf, exampleItems } from './data.js';
import {
  daysUntil, downloadBlob, EXPIRY_SOON_DAYS, load, money, needsOrder, normalizeState, orderStats, qtyOf, save, STATUS, stockStatus, stockValue, todayIso,
} from './lib.js';
import {
  fetchDoc, isValidCode, loginAccount, lockEditing, newKitchenCode, registerAccount, resetPassword, saveDoc, watchAuth, watchDoc, withTimeout,
} from './sync.js';
import CategoryIcon from './components/CategoryIcon.jsx';
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
// Personal accounts need the matching Firestore rules; set VITE_ACCOUNTS=0 to switch them off.
const ACCOUNTS_ENABLED = import.meta.env.VITE_ACCOUNTS !== '0';

const TONES = {
  info: 'bg-info-soft text-info-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  success: 'bg-success-soft text-success-text',
};

// `muted`: a zero in an alert card fades to grey; color returns as soon as there is something to act on.
function StatCard({ icon: Icon, label, value, tone, muted = false }) {
  return (
    <div className="card flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control sm:h-11 sm:w-11 ${muted ? 'bg-tint text-ink-3' : TONES[tone]}`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className={`t-stat ${muted ? 'text-ink-3' : ''}`}>{value}</div>
        <div className="t-meta mt-1.5 leading-snug">{label}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState(() => load(ITEMS_KEY, null) ?? exampleItems());
  // Ids of one-time updates applied by earlier versions; kept as is so that older open tabs never repeat them.
  const [applied, setApplied] = useState(() => load(APPLIED_KEY, []));
  const [removedOrders, setRemovedOrders] = useState(() => load(REMOVED_KEY, []));
  const [orders, setOrders] = useState(() => load(ORDERS_KEY, []));
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
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [authUser, setAuthUser] = useState(null);
  const [accountUser, setAccountUser] = useState(null);
  const accountFlow = useRef(false);
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

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('kitchen-inventory:theme', next); } catch { /* storage unavailable */ }
    setTheme(next);
  };
  const isEditor = !!authUser?.isEditor;
  useEffect(() => watchAuth((u) => {
    setAuthUser(u);
    if (!accountFlow.current) setAccountUser(ACCOUNTS_ENABLED && u && !u.isEditor ? u : null);
  }), []);
  const readOnly = !!code && !isEditor;
  const syncPath = code ? `kitchens/${code}` : accountUser ? `users/${accountUser.uid}` : '';
  const canWrite = code ? isEditor : !!accountUser;
  const guard = (fn) => (...a) => (readOnly ? setShowUnlock(true) : fn(...a));

  const applyRemote = (data) => {
    const next = normalizeState(JSON.parse(data.payload));
    lastRemote.current = data.payload;
    setItems(next.items);
    setApplied(next.appliedMigrations);
    setChecked(next.checked);
    setOrders(next.orders);
    setRemovedOrders(next.removedOrders);
  };

  useEffect(() => save(CODE_KEY, code), [code]);

  useEffect(() => {
    writesReady.current = false;
    unsynced.current = false;
    if (!syncPath) { setSyncStatus('off'); return undefined; }
    setSyncStatus('syncing');
    return watchDoc(
      syncPath,
      (data) => {
        const first = !writesReady.current;
        if (data && data.payload !== lastRemote.current && (first || !unsynced.current)) applyRemote(data);
        writesReady.current = true;
        setSyncStatus('ok');
      },
      () => setSyncStatus('error'),
      { signed: !code },
    );
  }, [syncPath]);

  useEffect(() => {
    if (!syncPath || !canWrite || !writesReady.current) return undefined;
    const payload = JSON.stringify({ items, checked, orders, removedOrders, appliedMigrations: applied });
    if (payload === lastRemote.current) return undefined;
    unsynced.current = true;
    const t = setTimeout(() => {
      lastRemote.current = payload;
      saveDoc(syncPath, { payload })
        .then(() => setSyncStatus('ok'))
        .catch(() => setSyncStatus('error'))
        .finally(() => { unsynced.current = false; });
    }, 500);
    return () => clearTimeout(t);
  }, [items, checked, orders, removedOrders, applied, syncPath, canWrite]);

  const joinKitchen = async (raw) => {
    if (!isValidCode(raw)) throw new Error('הקוד אינו תקין');
    if (accountUser) throw new Error('התנתק מהחשבון האישי לפני חיבור למטבח משותף');
    const data = await fetchDoc(`kitchens/${raw}`).catch(() => { throw new Error('אין חיבור לשרת, נסה שוב'); });
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
    await withTimeout(saveDoc(`kitchens/${fresh}`, { payload }), 15000, 'השרת לא הגיב. בדוק חיבור לאינטרנט (חלק מהסינונים חוסמים את השירות) ונסה שוב')
      .catch((e) => {
        throw new Error(e.code === 'permission-denied' ? 'אין הרשאה לשמור. הזן שוב את סיסמת העריכה' : e.message || 'אין חיבור לשרת, נסה שוב');
      });
    lastRemote.current = payload;
    setCode(fresh);
  };

  const realItems = () => items.filter((i) => !i.example);

  const connectAccount = async (mode, email, password) => {
    if (code) throw new Error('המכשיר מחובר למטבח משותף. נתק אותו קודם.');
    accountFlow.current = true;
    try {
      const user = await (mode === 'register' ? registerAccount : loginAccount)(email, password);
      const path = `users/${user.uid}`;
      const timeout = 'השרת לא הגיב. בדוק חיבור לאינטרנט ונסה שוב';
      const remote = await withTimeout(fetchDoc(path, { signed: true }), 15000, timeout);
      const mine = realItems();
      const localPayload = JSON.stringify({ items: mine, checked, orders, removedOrders, appliedMigrations: applied });
      const upload = async () => {
        await withTimeout(saveDoc(path, { payload: localPayload }), 15000, timeout);
        lastRemote.current = localPayload;
        setItems(mine);
      };
      if (!remote) await upload();
      else if ((mine.length || orders.length)
        && !window.confirm('נמצא מלאי שמור בחשבון שלך.\nאישור: לטעון אותו ולהחליף את המלאי שבמכשיר זה.\nביטול: להעלות את המלאי של המכשיר ולהחליף את מה ששמור בחשבון.')) await upload();
      else applyRemote(remote);
      setAccountUser({ uid: user.uid, email: user.email || email });
    } finally {
      accountFlow.current = false;
    }
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
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch, example: undefined } : i)));
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
  const clearExamples = guard(() => setItems((p) => p.filter((i) => !i.example)));
  const exportExcel = async () => {
    const mine = realItems();
    if (!mine.length && !orders.length) { window.alert('אין עדיין נתונים לייצוא. מוצרי הדוגמה לא נכללים.'); return; }
    const [{ default: writeExcelFile }, { buildSheets }] = await Promise.all([import('write-excel-file/browser'), import('./exportExcel.js')]);
    downloadBlob(await writeExcelFile(buildSheets(mine, orders)).toBlob(), `inventory-${todayIso()}.xlsx`);
  };
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
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className="seg"
    >
      <Icon size={18} aria-hidden="true" /> {text}
      {badge > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-on-solid">{badge}</span>}
    </button>
  );

  const grid = (list) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((i) => <ItemCard key={i.id} item={i} rhythm={rhythms.get(i.name)} onAdjust={adjust} onDelete={remove} onToggleMute={toggleMute} onSetQty={setQty} onEdit={(id) => (readOnly ? setShowUnlock(true) : setEditingId(id))} onSetMin={setMin} />)}
    </div>
  );

  const syncLabel = syncStatus === 'off' ? 'התחברות' : syncStatus === 'error' ? 'לא מחובר' : syncStatus === 'syncing' ? 'מתחבר…' : 'מחובר';
  const SyncIcon = syncStatus === 'off' ? CloudOff : Cloud;
  const syncTone = syncStatus === 'error' ? 'text-danger-text' : syncStatus === 'syncing' ? 'text-warning-text' : syncStatus === 'ok' ? 'text-success-text' : 'text-ink-3';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-gradient-to-br from-primary to-brand-end text-on-solid shadow-card">
            <ChefHat size={26} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="t-title">מלאי המטבח</h1>
              {code && isEditor && (
                <button onClick={() => lockEditing()} title="לחץ כדי לנעול את העריכה" className="badge hit bg-success-soft text-success-text">
                  <LockOpen size={12} aria-hidden="true" /> מצב עריכה · נעל
                </button>
              )}
            </div>
            <p className="t-meta">כל מה שיש במטבח, במבט אחד</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={guard(() => setShowAdd(true))} className="btn-brand">
            <Plus size={18} aria-hidden="true" /> פריט חדש
          </button>
          <button onClick={guard(() => setShowImport(true))} className="btn-secondary">
            <FileSpreadsheet size={18} aria-hidden="true" /> ייבוא מאקסל
          </button>
          <button onClick={exportExcel} className="btn-secondary">
            <Download size={18} aria-hidden="true" /> ייצוא לאקסל
          </button>
          <button onClick={() => setShowSync(true)} className="btn-secondary">
            <SyncIcon size={18} className={syncTone} aria-hidden="true" /> {syncLabel}
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
            title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
            className="btn-secondary w-11 px-0"
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {readOnly && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-text">
          <span className="flex items-center gap-2"><Lock size={16} aria-hidden="true" /> מצב צפייה בלבד. לעריכה יש להזין סיסמה.</span>
          <button onClick={() => setShowUnlock(true)} className="btn-ink">הזן סיסמה</button>
        </div>
      )}

      {items.some((i) => i.example) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-info/30 bg-info-soft px-4 py-3 text-sm text-info-text">
          <span>אלה מוצרי דוגמה כדי שתראה איך זה עובד. אפשר לייבא קובץ אקסל משלך או להוסיף מוצרים, ולמחוק את הדוגמאות.</span>
          <span className="flex flex-wrap gap-2">
            <button onClick={() => setShowImport(true)} className="btn-ink">ייבוא מאקסל</button>
            <button onClick={clearExamples} className="btn-secondary">מחק דוגמאות</button>
          </span>
        </div>
      )}
      {items.length === 0 && (
        <section className="card mb-8 p-8 text-center">
          <ChefHat size={44} className="mx-auto mb-3 text-primary" aria-hidden="true" />
          <h2 className="t-section mb-2">ברוכים הבאים למלאי המטבח</h2>
          <p className="mx-auto mb-5 max-w-md text-ink-2">עדיין אין כאן מוצרים. אפשר להעלות קובץ אקסל והמערכת תיצור הכול לבד, להוסיף מוצר ידנית, או להתחבר למטבח משותף עם קוד.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => setShowImport(true)} className="btn-primary"><FileSpreadsheet size={18} aria-hidden="true" /> ייבוא מאקסל</button>
            <button onClick={() => setShowAdd(true)} className="btn-secondary"><Plus size={18} aria-hidden="true" /> הוספת מוצר ידנית</button>
            <button onClick={() => setShowSync(true)} className="btn-secondary"><Cloud size={18} aria-hidden="true" /> התחברות עם קוד</button>
          </div>
        </section>
      )}

      <section className="mb-8 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:gap-4 lg:grid-cols-4" aria-label="סיכום מלאי">
        <StatCard icon={Package} label="סה״כ פריטים" value={items.length} tone="info" />
        <StatCard icon={AlertTriangle} label="לחידוש (מתחת למינימום)" value={lowItems.length} tone="warning" muted={lowItems.length === 0} />
        <StatCard icon={CalendarClock} label="עומדים לפוג / פגו תוקף" value={expiringCount} tone="danger" muted={expiringCount === 0} />
        <StatCard icon={Wallet} label="שווי מלאי מוערך" value={money(totalValue)} tone="success" />
      </section>

      <nav className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="אזורי המערכת">
        {tabBtn('inventory', LayoutGrid, 'מלאי', 0)}
        {tabBtn('shopping', ShoppingCart, 'רשימת קניות', lowItems.length)}
        {tabBtn('history', History, 'היסטוריית הזמנות', 0)}
      </nav>

      {tab === 'inventory' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="סינון לפי קטגוריה">
            {[{ id: 'all', label: 'הכל' }, ...categories].map((c) => {
              const count = c.id === 'all' ? items.length : items.filter((i) => i.category === c.id).length;
              return (
                <button key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className="seg">
                  <CategoryIcon id={c.id} label={c.label} size={16} /> {c.label} <span className="font-normal opacity-75">({count})</span>
                </button>
              );
            })}
            <button onClick={() => setOnlyMuted((v) => !v)} aria-pressed={onlyMuted} className="seg">
              <BellOff size={16} aria-hidden="true" /> מושתקים <span className="font-normal opacity-75">({items.filter((i) => i.muted).length})</span>
            </button>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם פריט…"
                aria-label="חיפוש לפי שם פריט"
                className="field h-12 pr-11"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="מיון" className="field h-12 w-auto">
              <option value="name">מיון: לפי א׳־ב׳</option>
              <option value="quantity">מיון: לפי כמות (מהנמוכה)</option>
              <option value="shortage">מיון: לפי חוסר (הדחוף ראשון)</option>
              <option value="expiry">מיון: לפי תאריך תפוגה</option>
            </select>
            <div className="flex gap-2" role="group" aria-label="תצוגה">
              {[['grouped', Rows3, 'לפי קטגוריות'], ['grid', Grid3x3, 'כל הפריטים']].map(([id, Icon, text]) => (
                <button key={id} onClick={() => setView(id)} aria-pressed={view === id} className="seg h-12">
                  <Icon size={16} aria-hidden="true" /> {text}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="card py-16 text-center text-ink-3">
              <Package size={44} className="mx-auto mb-3 text-line-strong" aria-hidden="true" />
              לא נמצאו פריטים
            </div>
          ) : view === 'grid' ? (
            grid(visible)
          ) : (
            <div className="space-y-4">
              {sections.map((c) => {
                const expanded = openGroups.includes(c.id) || !!query.trim() || category !== 'all';
                return (
                  <div key={c.id} className="rounded-card border border-line bg-surface/60 p-2 sm:p-3">
                    <button onClick={() => toggleGroup(c.id)} aria-expanded={expanded} className="flex min-h-14 w-full items-center gap-3 rounded-control p-2 text-right transition hover:bg-surface">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-tint text-ink-2"><CategoryIcon id={c.id} label={c.label} size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="t-section block">{c.label}</span>
                        <span className="t-meta">{c.list.length} פריטים{c.value > 0 ? ` · שווי ${money(c.value)}` : ''}</span>
                      </span>
                      {c.low > 0 && <span className="badge bg-danger-soft text-danger-text">{c.low} לחידוש</span>}
                      {expanded ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
                    </button>
                    {expanded && <div className="p-2 pt-1 sm:p-3">{grid(c.list)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'shopping' && (
        <section className="card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="t-section">מה צריך לקנות ({lowItems.length})</h2>
            <div className="flex flex-wrap gap-2">
              {shoppingChecked.length > 0 && (
                <button onClick={restockChecked} className="btn-ink">
                  <PackageCheck size={18} aria-hidden="true" /> קניתי – עדכן מלאי ({shoppingChecked.length})
                </button>
              )}
              {lowItems.length > 0 && (
                <button onClick={() => setShowOrder(true)} className="btn-primary">
                  <FileText size={18} aria-hidden="true" /> הפק רשימת הזמנה
                </button>
              )}
            </div>
          </div>
          {lowItems.length === 0 ? (
            <div className="py-12 text-center text-ink-3">
              <CheckCircle2 size={44} className="mx-auto mb-3 text-success" aria-hidden="true" />
              המלאי מלא, אין מה לקנות
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lowItems.map((i) => {
                const done = checked.includes(i.id);
                const st = STATUS[stockStatus(i)];
                return (
                  <li key={i.id}>
                    <button onClick={() => toggleCheck(i.id)} aria-pressed={done} className="flex min-h-14 w-full items-center gap-3 py-2 text-right transition hover:bg-subtle">
                      {done ? <CheckCircle2 className="shrink-0 text-success" aria-hidden="true" /> : <Circle className="shrink-0 text-line-strong" aria-hidden="true" />}
                      <span className={`min-w-0 flex-1 font-medium ${done ? 'text-ink-3 line-through' : ''}`}>
                        {i.name}
                        <span className="t-meta mr-2 font-normal">{catLabel(i.category).label}{i.supplier ? ` · ${i.supplier}` : ''}</span>
                      </span>
                      <span className="t-meta hidden sm:inline">יש {i.quantity} · מינימום {i.lowThreshold}</span>
                      <span className={`badge ${st.badge}`}>{st.label}</span>
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
        <SyncModal code={code} status={syncStatus} accountUser={accountUser} accountsEnabled={ACCOUNTS_ENABLED}
          onClose={() => setShowSync(false)} onCreate={createKitchen} onJoin={joinKitchen} onLeave={() => setCode('')}
          onAccount={connectAccount} onLogout={() => lockEditing()} onReset={resetPassword} />
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
