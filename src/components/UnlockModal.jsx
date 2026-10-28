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
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-hover">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 t-section"><Lock size={20} /> סיסמת עריכה</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="icon-btn -me-2"><X size={20} /></button>
        </div>
        <p className="mb-3 text-sm text-ink-2">המלאי המשותף נעול לעריכה. הזן את הסיסמה כדי לשנות.</p>
        <input autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="סיסמה"
          className="field" />
        {error && <p className="mt-3 rounded-control bg-danger-soft p-2 text-sm text-danger-text">{error}</p>}
        <button disabled={busy || !pw} className="btn-ink mt-4 w-full">
          {busy ? 'בודק…' : 'אפשר עריכה'}
        </button>
      </form>
    </div>
  );
}
