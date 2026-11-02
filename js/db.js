import { FIREBASE_CONFIG } from './config.js';

let db = null;

export const state = {
  staff: [],
  camps: [],
  evaluations: [],
  participants: [],
  schools: [],
  nightShifts: []
};

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

export function initStorageAndFirebase(onUpdate, onStatusChange) {
  // Загрузка всех списков из локального хранилища
  state.staff = storage.get('cm_cached_staff', []);
  state.camps = storage.get('cm_cached_camps', []);
  state.evaluations = storage.get('cm_cached_evals', []);
  state.participants = storage.get('cm_cached_parts', []);
  state.schools = storage.get('cm_cached_schools', []);
  state.nightShifts = storage.get('cm_cached_nightShifts', []);
  onUpdate();

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    onStatusChange(true);

    // Подписки Firestore
    db.collection('camps').onSnapshot(snap => {
      const remote = [];
      snap.forEach(doc => remote.push({ id: doc.id, ...doc.data() }));
      state.camps = remote;
      storage.set('cm_cached_camps', state.camps);
      onUpdate();
    }, err => console.warn(err));

    db.collection('staff').onSnapshot(snap => {
      const remote = [];
      snap.forEach(doc => remote.push({ id: doc.id, ...doc.data() }));
      state.staff = remote;
      storage.set('cm_cached_staff', state.staff);
      onUpdate();
    }, err => console.warn(err));

    db.collection('evaluations').onSnapshot(snap => {
      const remote = [];
      snap.forEach(doc => remote.push({ id: doc.id, ...doc.data() }));
      state.evaluations = remote;
      storage.set('cm_cached_evals', state.evaluations);
      onUpdate();
    }, err => console.warn(err));

    db.collection('schools').onSnapshot(snap => {
      const remote = [];
      snap.forEach(doc => remote.push({ id: doc.id, ...doc.data() }));
      state.schools = remote;
      storage.set('cm_cached_schools', state.schools);
      onUpdate();
    }, err => console.warn(err));

    db.collection('nightShifts').onSnapshot(snap => {
      const remote = [];
      snap.forEach(doc => remote.push({ id: doc.id, ...doc.data() }));
      state.nightShifts = remote;
      storage.set('cm_cached_nightShifts', state.nightShifts);
      onUpdate();
    }, err => console.warn(err));

  } catch (err) {
    console.warn("Локальный режим базы данных:", err);
    onStatusChange(false);
  }
}

export async function saveRecord(collection, id, data) {
  const list = state[collection] || [];
  if (id) {
    data.id = id;
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) list[idx] = { ...list[idx], ...data };
    else list.push(data);
    if (db) await db.collection(collection).doc(id).set(data, { merge: true });
  } else {
    const newId = collection + '_' + Date.now();
    data.id = newId;
    data.createdAt = Date.now();
    list.push(data);
    if (db) await db.collection(collection).doc(newId).set(data);
  }
  state[collection] = list;
  storage.set('cm_cached_' + collection, list);
}

export async function deleteRecord(collection, id) {
  state[collection] = (state[collection] || []).filter(item => item.id !== id);
  storage.set('cm_cached_' + collection, state[collection]);
  if (db) await db.collection(collection).doc(id).delete().catch(e => {});
}

export function getFirestoreDB() {
  return db;
}