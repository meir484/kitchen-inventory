import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';

// Public web identifiers; access is governed by the Firestore security rules.
const API_KEY = 'AIzaSyDc5meJCPP0d1UqkAB7ubRn11FVCIlzv4c';
const PROJECT_ID = 'kitchen-inventory-e54fd';
const app = initializeApp({
  apiKey: API_KEY,
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: '413846928233',
  appId: '1:413846928233:web:4b8d92ec1a555db0c15bf8',
});
const auth = getAuth(app);

// Plain HTTPS (Firestore REST) instead of the SDK's long-lived streaming channel, which some
// networks and filters leave hanging. Changes from other devices arrive by polling.
const POLL_MS = 5000;
const docUrl = (path) =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?key=${API_KEY}`;

const permissionError = (message) => Object.assign(new Error(message), { code: 'permission-denied' });

const http = async (url, options = {}, ms = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'השרת לא הגיב בזמן' : 'אין חיבור לשרת');
  } finally {
    clearTimeout(timer);
  }
};

const bearer = async () => {
  const user = auth.currentUser;
  if (!user) throw permissionError('נדרשת התחברות');
  return { Authorization: `Bearer ${await user.getIdToken()}` };
};

export const newKitchenCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const isValidCode = (code) => /^[a-zA-Z0-9_-]{16,64}$/.test(code);

export const withTimeout = (promise, ms, message) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);

// Documents: shared kitchens live at `kitchens/<code>` (readable by anyone with the code),
// personal data at `users/<uid>` (readable only by that user, so reads must be signed).
export const fetchDoc = async (path, { signed = false } = {}) => {
  const res = await http(docUrl(path), signed ? { headers: await bearer() } : {});
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) throw permissionError('אין הרשאה');
  if (!res.ok) throw new Error(`שגיאת שרת (${res.status})`);
  const json = await res.json();
  return { payload: json.fields?.payload?.stringValue ?? '' };
};

export const saveDoc = async (path, data) => {
  const res = await http(docUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await bearer()) },
    body: JSON.stringify({ fields: { payload: { stringValue: data.payload }, updatedAt: { integerValue: String(Date.now()) } } }),
  });
  if (res.status === 401 || res.status === 403) throw permissionError('אין הרשאה לשמור');
  if (!res.ok) throw new Error(`השמירה נכשלה (${res.status})`);
};

export const watchDoc = (path, onData, onError, options) => {
  let stopped = false;
  const tick = async () => {
    if (stopped || document.hidden) return;
    try {
      const data = await fetchDoc(path, options);
      if (!stopped) onData(data);
    } catch (e) {
      if (!stopped) onError(e);
    }
  };
  tick();
  const id = setInterval(tick, POLL_MS);
  const onVisible = () => !document.hidden && tick();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
};

// Shared kitchen: one editor account; viewers need only the code, editors also need the password.
export const EDITOR_EMAIL = 'editor@kitchen-inventory.app';

export const unlockEditing = async (password) => {
  try {
    await signInWithEmailAndPassword(auth, EDITOR_EMAIL, password);
  } catch (e) {
    const wrong = ['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials', 'auth/user-not-found'];
    throw new Error(wrong.includes(e.code) ? 'הסיסמה שגויה' : 'לא ניתן להתחבר כרגע, נסה שוב');
  }
};
export const lockEditing = () => signOut(auth);

// Personal accounts (email + password).
const AUTH_ERRORS = {
  'auth/email-already-in-use': 'האימייל הזה כבר רשום. נסה להתחבר.',
  'auth/invalid-email': 'כתובת האימייל אינה תקינה',
  'auth/weak-password': 'הסיסמה חלשה מדי. נדרשים לפחות 6 תווים.',
  'auth/invalid-credential': 'אימייל או סיסמה שגויים',
  'auth/wrong-password': 'אימייל או סיסמה שגויים',
  'auth/user-not-found': 'אימייל או סיסמה שגויים',
  'auth/invalid-login-credentials': 'אימייל או סיסמה שגויים',
  'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.',
  'auth/network-request-failed': 'אין חיבור לאינטרנט',
};
const authFail = (e) => new Error(AUTH_ERRORS[e.code] || 'הפעולה נכשלה, נסה שוב');

const isEditorEmail = (email) => (email || '').toLowerCase() === EDITOR_EMAIL;

export const registerAccount = async (email, password) => {
  if (isEditorEmail(email)) throw new Error('כתובת האימייל הזו שמורה');
  try { return (await createUserWithEmailAndPassword(auth, email.trim(), password)).user; } catch (e) { throw authFail(e); }
};
export const loginAccount = async (email, password) => {
  try { return (await signInWithEmailAndPassword(auth, email.trim(), password)).user; } catch (e) { throw authFail(e); }
};
export const resetPassword = async (email) => {
  try { await sendPasswordResetEmail(auth, email.trim()); } catch (e) { throw authFail(e); }
};

// Calls back with { uid, email } for the signed-in user (editor or personal), or null.
export const watchAuth = (cb) =>
  onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email || '', isEditor: isEditorEmail(u.email) } : null));
