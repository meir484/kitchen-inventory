import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';

// Public web identifiers; access is governed by the Firestore security rules.
const app = initializeApp({
  apiKey: 'AIzaSyDc5meJCPP0d1UqkAB7ubRn11FVCIlzv4c',
  authDomain: 'kitchen-inventory-e54fd.firebaseapp.com',
  projectId: 'kitchen-inventory-e54fd',
  storageBucket: 'kitchen-inventory-e54fd.firebasestorage.app',
  messagingSenderId: '413846928233',
  appId: '1:413846928233:web:4b8d92ec1a555db0c15bf8',
});
const db = getFirestore(app);

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

export const saveKitchen = (code, data) => setDoc(ref(code), { ...data, updatedAt: Date.now() });

export const watchKitchen = (code, onData, onError) =>
  onSnapshot(
    ref(code),
    (snap) => {
      if (!snap.metadata.hasPendingWrites) onData(snap.exists() ? snap.data() : null);
    },
    onError,
  );
