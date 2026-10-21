import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { unlockEditing } from '../sync.js';

export default function UnlockModal({ onClose }) {
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
