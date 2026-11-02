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
  counselor: { D: 0.15, A: 0.30, S: 0.25, T: 0.15, F: 0.10, L: 0.05, label: "Линейный вожатый (СПО)", type: "ped" },
  lead:      { D: 0.20, A: 0.20, S: 0.25, T: 0.15, F: 0.15, L: 0.05, label: "Старший вожатый / Наставник", type: "ped" },
  organizer: { D: 0.25, A: 0.25, S: 0.15, T: 0.20, F: 0.15, L: 0.00, label: "Организатор мероприятий", type: "org" },
  sound:     { D: 0.30, A: 0.05, S: 0.25, T: 0.20, F: 0.10, L: 0.10, label: "Звукорежиссёр / Свет / DJ", type: "tech" },
  media:     { D: 0.25, A: 0.10, S: 0.10, T: 0.25, F: 0.15, L: 0.15, label: "Медиа-центр (Фото / Видео)", type: "tech" },
  admin:     { D: 0.35, A: 0.05, S: 0.25, T: 0.20, F: 0.10, L: 0.05, label: "Комендант / Логист", type: "tech" }
};

export const SQUAD_COLORS = [
  { id: 1, name: "1 Отряд", color: "#6366f1", bg: "bg-indigo-500/20", border: "border-indigo-500", label: "Синий" },
  { id: 2, name: "2 Отряд", color: "#ec4899", bg: "bg-pink-500/20", border: "border-pink-500", label: "Розовый" },
  { id: 3, name: "3 Отряд", color: "#eab308", bg: "bg-yellow-500/20", border: "border-yellow-500", label: "Жёлтый" },
  { id: 4, name: "4 Отряд", color: "#10b981", bg: "bg-emerald-500/20", border: "border-emerald-500", label: "Зелёный" }
];