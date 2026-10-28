import React, { useState } from 'react';
import { Cloud, CloudOff, Copy, Link2, LogOut, UserRound, X } from 'lucide-react';

export default function SyncModal({ code, status, accountUser, accountsEnabled, onClose, onCreate, onJoin, onLeave, onAccount, onLogout, onReset }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
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

        {accountUser ? (
          <>
            <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">
              {status === 'error' ? 'אין חיבור כרגע. השינויים יסונכרנו כשהחיבור יחזור.' : 'המלאי מסונכרן ושמור בענן. כל שינוי יופיע בכל מכשיר שתתחבר אליו.'}
            </p>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-stone-50 p-3" dir="ltr"><UserRound size={18} className="shrink-0 text-stone-400" /><span className="truncate">{accountUser.email}</span></div>
            <p className="mb-5 text-xs text-stone-500">המלאי פרטי ונראה רק לך. כדי לראות אותו במכשיר אחר, התחבר שם עם אותו אימייל וסיסמה.</p>
            <button onClick={() => { onLogout(); onClose(); }} className={`${btn} flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100`}>
              <LogOut size={16} /> התנתק (המלאי יישאר במכשיר זה)
            </button>
          </>
        ) : code ? (
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
            {accountsEnabled && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice('');
                  run(() => onAccount(mode, email, password));
                }}
                className="mb-5"
              >
                <p className="mb-3 text-stone-600">התחבר כדי לשמור את המלאי בענן ולראות אותו בכל מכשיר. המלאי שלך פרטי ונראה רק לך.</p>
                <div className="mb-3 flex overflow-hidden rounded-xl bg-stone-100 text-sm font-medium">
                  {[['login', 'התחברות'], ['register', 'חשבון חדש']].map(([id, text]) => (
                    <button type="button" key={id} onClick={() => { setMode(id); setError(''); setNotice(''); }}
                      className={`flex-1 py-2 transition ${mode === id ? 'bg-stone-900 text-white' : 'hover:bg-stone-200'}`}>{text}</button>
                  ))}
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="אימייל" autoComplete="email"
                  className="mb-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-orange-400" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
                  placeholder={mode === 'register' ? 'סיסמה (לפחות 6 תווים)' : 'סיסמה'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="mb-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-orange-400" />
                <button disabled={busy} className={`${btn} w-full bg-gradient-to-l from-orange-500 to-rose-500 py-3 text-white shadow`}>
                  {busy ? 'רגע…' : mode === 'register' ? 'צור חשבון' : 'התחבר'}
                </button>
                {mode === 'login' && (
                  <button type="button" disabled={busy || !email}
                    onClick={() => run(async () => { await onReset(email); setNotice('נשלח אליך מייל לאיפוס הסיסמה'); })}
                    className="mt-2 text-sm text-stone-500 underline disabled:no-underline disabled:opacity-40">שכחתי סיסמה</button>
                )}
              </form>
            )}
            <details open={!accountsEnabled}>
              {accountsEnabled && <summary className="cursor-pointer text-sm font-medium text-stone-500">מטבח משותף עם קוד (מתקדם)</summary>}
              <div className="mt-3">
          <>
            {!accountsEnabled && <p className="mb-4 text-stone-600">שמור את המלאי בענן כדי שיהיה זמין בכל מכשיר ובין בני הבית.</p>}
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
              </div>
            </details>
          </>
        )}
        {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-600">{error}</p>}
      </div>
    </div>
  );
}
