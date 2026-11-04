import React, { useState } from 'react';
import { ChefHat, Cloud, FileSpreadsheet, PackageCheck, ShoppingCart } from 'lucide-react';

const POINTS = [
  [PackageCheck, 'מלאי מסודר', 'כמויות, מינימום, ספקים ומחירים, וקטגוריות לפי הצורך'],
  [ShoppingCart, 'התראות והזמנות', 'מה חסר מופיע ברשימת קניות, ומשם מפיקים הזמנה לפי ספק'],
  [FileSpreadsheet, 'אקסל', 'ייבוא מוצרים מקובץ אקסל, וייצוא כגיבוי'],
  [Cloud, 'בכל מכשיר', 'המלאי נשמר בענן ופרטי, ונראה רק לך'],
];

export default function Welcome({ onSubmit, onReset, onGuest }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'משהו השתבש, נסה שוב');
    }
    setBusy(false);
  };
  const switchMode = (next) => { setMode(next); setError(''); setNotice(''); };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-4 py-8 lg:flex-row lg:items-center lg:gap-12">
      <section className="flex-1">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-card bg-gradient-to-br from-primary to-brand-end text-on-solid shadow-card">
            <ChefHat size={26} aria-hidden="true" />
          </div>
          <h1 className="t-title">מלאי המטבח</h1>
        </div>
        <p className="t-section mb-2">ניהול מלאי למטבח, בקלות ובחינם</p>
        <p className="mb-6 text-ink-2">רואים מה יש, מה חסר ומה להזמין, ממי ובכמה. מתחברים כדי לשמור את המלאי ולהגיע אליו מכל מכשיר.</p>
        <ul className="space-y-3">
          {POINTS.map(([Icon, title, text]) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-tint text-ink-2"><Icon size={20} aria-hidden="true" /></span>
              <span><span className="block font-semibold">{title}</span><span className="t-meta">{text}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card w-full p-6 lg:w-[26rem]" aria-label="התחברות והרשמה">
        <div className="mb-4 flex gap-2" role="group" aria-label="סוג פעולה">
          {[['login', 'התחברות'], ['register', 'הרשמה']].map(([id, text]) => (
            <button key={id} type="button" onClick={() => switchMode(id)} aria-pressed={mode === id} className="seg flex-1">{text}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); run(() => onSubmit(mode, email, password, remember)); }}>
          <label htmlFor="welcome-email" className="t-label mb-1 block">אימייל</label>
          <input id="welcome-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" autoComplete="email" className="field mb-3" />
          <label htmlFor="welcome-password" className="t-label mb-1 block">סיסמה</label>
          <input
            id="welcome-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'לפחות 6 תווים' : ''} className="field mb-3"
          />
          <label className="mb-1 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-primary" /> זכור אותי במחשב הזה
          </label>
          {!remember && <p className="t-micro mb-3">בלי סימון, תתבקש להתחבר שוב בכל פעם שתסגור את הדפדפן. מתאים למחשב משותף.</p>}
          <button disabled={busy} className="btn-primary mt-2 w-full">{busy ? 'רגע…' : mode === 'register' ? 'צור חשבון' : 'התחבר'}</button>
        </form>

        {mode === 'login' && (
          <button
            type="button" disabled={busy || !email}
            onClick={() => run(async () => { await onReset(email); setNotice('נשלח אליך מייל לאיפוס הסיסמה'); })}
            className="mt-2 min-h-11 text-sm text-ink-2 underline disabled:no-underline disabled:opacity-40"
          >שכחתי סיסמה</button>
        )}
        {notice && <p role="status" className="mt-3 rounded-control bg-success-soft p-3 text-sm text-success-text">{notice}</p>}
        {error && <p role="alert" className="mt-3 rounded-control bg-danger-soft p-3 text-sm text-danger-text">{error}</p>}

        <p className="mt-4 border-t border-line pt-4 text-center text-sm text-ink-2">
          {mode === 'login' ? 'אין לך חשבון? ' : 'כבר יש לך חשבון? '}
          <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="min-h-11 font-semibold text-primary underline">
            {mode === 'login' ? 'הרשמה' : 'התחברות'}
          </button>
        </p>
        <p className="text-center">
          <button type="button" onClick={onGuest} className="min-h-11 text-sm text-ink-3 underline">להמשך בלי חשבון (הנתונים יישמרו רק בדפדפן הזה)</button>
        </p>
      </section>
    </main>
  );
}
