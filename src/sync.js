import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

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
const docUrl = (code) =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/kitchens/${code}?key=${API_KEY}`;

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

export const newKitchenCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const isValidCode = (code) => /^[a-zA-Z0-9_-]{16,64}$/.test(code);

export const withTimeout = (promise, ms, message) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);

export const fetchKitchen = async (code) => {
  const res = await http(docUrl(code));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`שגיאת שרת (${res.status})`);
  const json = await res.json();
  return { payload: json.fields?.payload?.stringValue ?? '' };
};

export const saveKitchen = async (code, data) => {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('נדרשת סיסמת עריכה'), { code: 'permission-denied' });
  const token = await user.getIdToken();
  const res = await http(docUrl(code), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: { payload: { stringValue: data.payload }, updatedAt: { integerValue: String(Date.now()) } } }),
  });
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error('אין הרשאה לשמור'), { code: 'permission-denied' });
  if (!res.ok) throw new Error(`השמירה נכשלה (${res.status})`);
};

export const watchKitchen = (code, onData, onError) => {
  let stopped = false;
  const tick = async () => {
    if (stopped || document.hidden) return;
    try {
      const data = await fetchKitchen(code);
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

// One shared editor account; viewers need only the kitchen code, editors also need the password.
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
export const watchEditor = (cb) => onAuthStateChanged(auth, (u) => cb(!!u));
