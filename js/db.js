import { FIREBASE_CONFIG } from './config.js';

let db = null;

// Локальное кэширование
export const storage = {
  get: (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }
};

export const state = {
  staff: storage.get('cm_staff', []),
  camps: storage.get('cm_camps', []),
  evaluations: storage.get('cm_evals', [])
};

// Инициализация базы данных
export function initDB(onUpdate, onStatusChange) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    onStatusChange(true);

    // Подписка на коллекции в реальном времени
    db.collection('camps').onSnapshot(snap => {
      state.camps = [];
      snap.forEach(doc => state.camps.push({ id: doc.id, ...doc.data() }));
      storage.set('cm_camps', state.camps);
      onUpdate();
    });

    db.collection('staff').onSnapshot(snap => {
      state.staff = [];
      snap.forEach(doc => state.staff.push({ id: doc.id, ...doc.data() }));
      storage.set('cm_staff', state.staff);
      onUpdate();
    });

    db.collection('evaluations').onSnapshot(snap => {
      state.evaluations = [];
      snap.forEach(doc => state.evaluations.push({ id: doc.id, ...doc.data() }));
      storage.set('cm_evals', state.evaluations);
      onUpdate();
    });
  } catch (err) {
    console.warn("Работа в локальном режиме:", err);
    onStatusChange(false);
  }
}

// Методы сохранения в облако
export async function saveRecord(collection, id, data) {
  if (id) {
    if (db) await db.collection(collection).doc(id).set(data, { merge: true });
    const list = state[collection];
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...data };
  } else {
    const newDoc = { ...data, createdAt: Date.now() };
    if (db) {
      const ref = await db.collection(collection).add(newDoc);
      newDoc.id = ref.id;
    } else {
      newDoc.id = collection + '_' + Date.now();
    }
    state[collection].push(newDoc);
  }
  storage.set('cm_' + collection, state[collection]);
}

export async function deleteRecord(collection, id) {
  if (db) await db.collection(collection).doc(id).delete();
  state[collection] = state[collection].filter(item => item.id !== id);
  storage.set('cm_' + collection, state[collection]);
}