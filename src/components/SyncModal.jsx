import React, { useState } from 'react';
import { Cloud, CloudOff, Copy, Link2, LogOut, UserRound, X } from 'lucide-react';

export default function SyncModal({ code, status, accountUser, onMoveToAccount, accountsEnabled, onClose, onCreate, onJoin, onLeave, onAccount, onLogout, onReset }) {
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
  const btn = 'btn';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-hover">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 t-section"><Cloud size={22} /> {accountUser || code ? 'החשבון שלי' : 'התחברות'}</h2>
          <button onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>

        {accountUser && !code ? (
          <>
            <p className="mb-4 rounded-control bg-success-soft p-3 text-success-text">
              {status === 'error' ? 'אין חיבור כרגע. השינויים יסונכרנו כשהחיבור יחזור.' : 'מחובר. המלאי שמור בענן וכל שינוי יופיע בכל מכשיר שתתחבר אליו.'}
            </p>
            <div className="mb-4 flex items-center gap-2 rounded-control bg-subtle p-3" dir="ltr"><UserRound size={18} className="shrink-0 text-ink-3" /><span className="truncate">{accountUser.email}</span></div>
            <p className="mb-5 text-xs text-ink-3">המלאי פרטי ונראה רק לך. כדי לראות אותו במכשיר אחר, התחבר שם עם אותו אימייל וסיסמה.</p>
            <button onClick={() => { onLogout(); onClose(); }} className={`${btn} flex items-center gap-2 bg-danger-soft text-danger-text hover:brightness-95`}>
              <LogOut size={16} /> התנתק (המלאי יישאר במכשיר זה)
            </button>
          </>
        ) : code ? (
          <>
            <p className="mb-4 rounded-control bg-success-soft p-3 text-success-text">
              {status === 'error' ? 'אין חיבור כרגע. השינויים יסונכרנו כשהחיבור יחזור.' : 'מחובר. כל שינוי יופיע בכל המכשירים המחוברים.'}
            </p>
            <label className="mb-1 block text-sm font-medium text-ink-2">קישור לחיבור מכשיר נוסף</label>
            <div className="mb-3 flex gap-2">
              <input readOnly value={link} dir="ltr" className="min-w-0 flex-1 rounded-control border border-line-strong bg-subtle px-3 py-2 text-sm" />
              <button onClick={() => copy(link, 'link')} className={`${btn} flex items-center gap-1 bg-ink text-on-solid`}><Link2 size={16} />{copied === 'link' ? 'הועתק' : 'העתק'}</button>
            </div>
            <label className="mb-1 block text-sm font-medium text-ink-2">קוד המטבח</label>
            <div className="mb-3 flex gap-2">
              <input readOnly value={code} dir="ltr" className="min-w-0 flex-1 rounded-control border border-line-strong bg-subtle px-3 py-2 text-sm" />
              <button onClick={() => copy(code, 'code')} className={`${btn} flex items-center gap-1 bg-tint hover:bg-tint-strong`}><Copy size={16} />{copied === 'code' ? 'הועתק' : 'העתק'}</button>
            </div>
            <p className="mb-5 text-xs text-ink-3">מי שמחזיק בקישור או בקוד יכול לראות ולערוך את המלאי. שתף רק עם בני הבית.</p>
            {accountUser && (
              <div className="mb-5 rounded-control border border-warning/30 bg-warning-soft p-3 text-sm text-warning-text">
                <p className="mb-2">אתה מחובר גם לחשבון האישי <span dir="ltr">{accountUser.email}</span>. כדי לערוך בלי סיסמה, אפשר להעביר את המלאי לחשבון.</p>
                <button onClick={() => { onClose(); onMoveToAccount(); }} className="btn-primary">מעבר לחשבון האישי</button>
              </div>
            )}
            <button onClick={() => { onLeave(); onClose(); }} className={`${btn} flex items-center gap-2 bg-danger-soft text-danger-text hover:brightness-95`}>
              <CloudOff size={16} /> התנתק במכשיר זה
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
                <p className="mb-3 text-ink-2">התחבר כדי לשמור את המלאי בענן ולראות אותו בכל מכשיר. המלאי שלך פרטי ונראה רק לך.</p>
                <div className="mb-3 flex gap-2">
                  {[['login', 'התחברות'], ['register', 'חשבון חדש']].map(([id, text]) => (
                    <button type="button" key={id} onClick={() => { setMode(id); setError(''); setNotice(''); }}
                      className="seg flex-1" aria-pressed={mode === id}>{text}</button>
                  ))}
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="אימייל" autoComplete="email"
                  className="field mb-2 w-full " />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
                  placeholder={mode === 'register' ? 'סיסמה (לפחות 6 תווים)' : 'סיסמה'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="field mb-3 w-full " />
                <button disabled={busy} className="btn-primary w-full">
                  {busy ? 'רגע…' : mode === 'register' ? 'צור חשבון' : 'התחבר'}
                </button>
                {mode === 'login' && (
                  <button type="button" disabled={busy || !email}
                    onClick={() => run(async () => { await onReset(email); setNotice('נשלח אליך מייל לאיפוס הסיסמה'); })}
                    className="mt-2 text-sm text-ink-3 underline disabled:no-underline disabled:opacity-40">שכחתי סיסמה</button>
                )}
              </form>
            )}
            <details open={!accountsEnabled}>
              {accountsEnabled && <summary className="cursor-pointer text-sm font-medium text-ink-3">מטבח משותף עם קוד (מתקדם)</summary>}
              <div className="mt-3">
          <>
            {!accountsEnabled && <p className="mb-4 text-ink-2">שמור את המלאי בענן כדי שיהיה זמין בכל מכשיר ובין בני הבית.</p>}
            <button disabled={busy} onClick={() => run(onCreate)} className="btn-primary mb-5 w-full">
              {busy ? 'מתחבר…' : 'צור מטבח משותף מהמלאי הנוכחי'}
            </button>
            <div className="mb-2 text-sm font-medium text-ink-2">כבר יש לך קוד ממכשיר אחר?</div>
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value.trim())} dir="ltr" placeholder="הדבק כאן קוד מטבח"
                className="field min-w-0 flex-1 " />
              <button disabled={busy || !input} onClick={() => run(() => onJoin(input))} className={`${btn} bg-ink text-on-solid`}>התחבר</button>
            </div>
            <p className="mt-2 text-xs text-ink-3">ההתחברות מחליפה את המלאי במכשיר זה במלאי המשותף.</p>
          </>
              </div>
            </details>
          </>
        )}
        {notice && <p className="mt-4 rounded-control bg-success-soft p-3 text-success-text">{notice}</p>}
        {error && <p className="mt-4 rounded-control bg-danger-soft p-3 text-danger-text">{error}</p>}
      </div>
    </div>
  );
}
