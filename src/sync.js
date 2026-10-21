import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, initializeFirestore, onSnapshot, setDoc } from 'firebase/firestore';

// Public web identifiers; access is governed by the Firestore security rules.
const app = initializeApp({
  apiKey: 'AIzaSyDc5meJCPP0d1UqkAB7ubRn11FVCIlzv4c',
  authDomain: 'kitchen-inventory-e54fd.firebaseapp.com',
  projectId: 'kitchen-inventory-e54fd',
  storageBucket: 'kitchen-inventory-e54fd.firebasestorage.app',
  messagingSenderId: '413846928233',
  appId: '1:413846928233:web:4b8d92ec1a555db0c15bf8',
});
// Some networks and filters break Firestore's streaming channel; fall back to long polling there.
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

const ref = (code) => doc(db, 'kitchens', code);

export const newKitchenCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const isValidCode = (code) => /^[a-zA-Z0-9_-]{16,64}$/.test(code);

export const fetchKitchen = async (code) => {
  const snap = await getDoc(ref(code));
  return snap.exists() ? snap.data() : null;
};

export const withTimeout = (promise, ms, message) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);

export const saveKitchen = (code, data) => setDoc(ref(code), { ...data, updatedAt: Date.now() });

export const watchKitchen = (code, onData, onError) =>
  onSnapshot(
    ref(code),
    (snap) => {
      if (!snap.metadata.hasPendingWrites) onData(snap.exists() ? snap.data() : null);
    },
    onError,
  );

// One shared editor account; viewers need only the kitchen code, editors also need the password.
export const EDITOR_EMAIL = 'editor@kitchen-inventory.app';
const auth = getAuth(app);

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
