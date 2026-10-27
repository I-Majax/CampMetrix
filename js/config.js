export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCCVxogvgq3ly3gQ9rPKsvhV1m38faHZyU",
  authDomain: "campmetrix-web.firebaseapp.com",
  projectId: "campmetrix-web",
  storageBucket: "campmetrix-web.firebasestorage.app",
  messagingSenderId: "239092051588",
  appId: "1:239092051588:web:d0f31f9c45f0ea5ed55cd1"
};

export const ROLE_WEIGHTS = {
  trainee:   { D: 0.25, A: 0.15, S: 0.20, T: 0.15, F: 0.05, L: 0.20, label: "Стажёр", type: "ped" },
  counselor: { D: 0.15, A: 0.30, S: 0.25, T: 0.15, F: 0.10, L: 0.05, label: "Линейный вожатый", type: "ped" },
  lead:      { D: 0.20, A: 0.20, S: 0.25, T: 0.15, F: 0.15, L: 0.05, label: "Старший вожатый", type: "ped" },
  organizer: { D: 0.25, A: 0.25, S: 0.15, T: 0.20, F: 0.15, L: 0.00, label: "Организатор мероприятий", type: "org" },
  sound:     { D: 0.30, A: 0.05, S: 0.25, T: 0.20, F: 0.10, L: 0.10, label: "Звукорежиссёр / DJ", type: "tech" },
  media:     { D: 0.25, A: 0.10, S: 0.10, T: 0.25, F: 0.15, L: 0.15, label: "Медиа-центр", type: "tech" },
  admin:     { D: 0.35, A: 0.05, S: 0.25, T: 0.20, F: 0.10, L: 0.05, label: "Комендант / Техперсонал", type: "tech" }
};