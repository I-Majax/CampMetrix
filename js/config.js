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
  admin:     { D: 0.35, A: 0.05, S: 0.25, T: 0.20, F: 0.10, L: 0.05, label: "Комендант / МТС / Логист", type: "tech" }
};

// Цветовое кодирование 4 отрядов проекта (ленты 80 см, браслеты)
export const SQUAD_COLORS = [
  { id: 1, name: "1 Отряд", color: "#6366f1", bg: "bg-indigo-500/20", border: "border-indigo-500", label: "Синий" },
  { id: 2, name: "2 Отряд", color: "#ec4899", bg: "bg-pink-500/20", border: "border-pink-500", label: "Розовый" },
  { id: 3, name: "3 Отряд", color: "#eab308", bg: "bg-yellow-500/20", border: "border-yellow-500", label: "Жёлтый" },
  { id: 4, name: "4 Отряд", color: "#10b981", bg: "bg-emerald-500/20", border: "border-emerald-500", label: "Зелёный" }
];

// Нормативы волонтёрского труда по гранту (50 часов на слёт)
export const VOLUNTEER_RATES = {
  counselor: { hours: 50, ratePerShift: 10172.5 }, // 81 380 ₽ на 8 человек
  media:     { hours: 50, ratePerShift: 29375.0 }, // 58 750 ₽ на 2 человек
  tech:      { hours: 50, ratePerShift: 17456.0 }, // 17 456 ₽ на 1 человека
  designer:  { hours: 5,  ratePerShift: 1501.0 }   // 1 501 ₽ на 1 человека
};

// Сетка 12 радиостанций Baofeng UV-5R
export const RADIOS_LIST = [
  { id: 1, name: "Рация 1", role: "Вожатые 1 отряда", channel: "CH 01 (433.075 МГц)" },
  { id: 2, name: "Рация 2", role: "Вожатые 2 отряда", channel: "CH 01 (433.075 МГц)" },
  { id: 3, name: "Рация 3", role: "Вожатые 3 отряда", channel: "CH 01 (433.075 МГц)" },
  { id: 4, name: "Рация 4", role: "Вожатые 4 отряда", channel: "CH 01 (433.075 МГц)" },
  { id: 5, name: "Рация 5", role: "Организатор смены 1", channel: "CH 02 (433.100 МГц)" },
  { id: 6, name: "Рация 6", role: "Организатор смены 2", channel: "CH 02 (433.100 МГц)" },
  { id: 7, name: "Рация 7", role: "Организатор смены 3", channel: "CH 02 (433.100 МГц)" },
  { id: 8, name: "Рация 8", role: "Дьячков В.Е. (Руководитель)", channel: "CH 03 (Штабной)" },
  { id: 9, name: "Рация 9", role: "Корнеева С.Д. (Отряды)", channel: "CH 03 (Штабной)" },
  { id: 10, name: "Рация 10", role: "Кузнецов Н.С. (Мероприятия)", channel: "CH 03 (Штабной)" },
  { id: 11, name: "Рация 11", role: "Кутейникова Н.М. (Медиа)", channel: "CH 03 (Штабной)" },
  { id: 12, name: "Рация 12", role: "Родина З.А. (Наставник)", channel: "CH 03 (Штабной)" }
];