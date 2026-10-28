import { calculateStaffMultiCampK, getCampEvaluations, formatCampDateRange, getCategoryBadge } from './calc.js';
import { ROLE_WEIGHTS } from './config.js';
import { showToast } from './ui.js';

export function exportXLSX(staffList, campsList, evaluationsList) {
  if (staffList.length === 0) {
    showToast("Нет данных для экспорта", "error");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Лист 1: Реестр оргсостава
  const staffRows = staffList.map(s => {
    const m = calculateStaffMultiCampK(s.id);
    const badge = getCategoryBadge(m);
    return {
      "ФИО": s.name || "Без имени",
      "Позывной": s.nickname || "",
      "Специализация": ROLE_WEIGHTS[s.primaryRole]?.label || s.primaryRole,
      "Контакты": s.contact || "",
      "Слётов пройдено": Number(m.count) || 0,
      "Педагогический K": m.pedK !== null ? Number(m.pedK) : "",
      "Организаторский K": m.orgK !== null ? Number(m.orgK) : "",
      "Технический K": m.techK !== null ? Number(m.techK) : "",
      "Итоговый K-индекс": m.isStopListed ? 0 : Number(m.overallK) || 0,
      "Тренд": m.trend,
      "Статус": badge.label
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows), "Реестр команды");

  // Лист 2: Оценки слётов
  const evalRows = evaluationsList.map(e => {
    const staff = staffList.find(s => s.id === e.staffId);
    const camp = campsList.find(c => c.id === e.campId);
    return {
      "Сотрудник": staff ? (staff.name || "Без имени") : e.staffId,
      "Слёт": camp ? camp.name : e.campId,
      "Роль": ROLE_WEIGHTS[e.role]?.label || e.role,
      "Оценка K": Number(e.finalScore) || 0,
      "D (Тайминг)": Number(e.vectors?.D) || 0,
      "A (Аудитория)": Number(e.vectors?.A) || 0,
      "S (Безопасность)": Number(e.vectors?.S) || 0,
      "T (Командность)": Number(e.vectors?.T) || 0,
      "F (Форс-мажор)": Number(e.vectors?.F) || 0,
      "L (Обучаемость)": Number(e.vectors?.L) || 0,
      "Режим 360°": e.is360 ? "Да" : "Нет"
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evalRows), "Оценки 360°");

  // Лист 3: Волонтёрский вклад (Софинансирование 552 861 ₽)
  const volRows = [
    { "Статья софинансирования": "Вожатые на отрядах (8 чел)", "Часов на слёт": 50, "Слётов": 3, "Сумма вклада": 244140 },
    { "Статья софинансирования": "Медиа-служба / Фото-видео (2 чел)", "Часов на слёт": 50, "Слётов": 3, "Сумма вклада": 176250 },
    { "Статья софинансирования": "Техническая служба МТС (1 чел)", "Часов на слёт": 50, "Слётов": 3, "Сумма вклада": 52368 },
    { "Статья софинансирования": "Дизайнер полиграфии и бейджей", "Часов на слёт": 5, "Слётов": 3, "Сумма вклада": 4503 },
    { "Статья софинансирования": "Оборудование команды (ноутбук, камеры)", "Часов на слёт": "—", "Слётов": 3, "Сумма вклада": 75600 },
    { "ИТОГО СОБСТВЕННЫЙ ВКЛАД": "Грантовый проект «Бесконечная история»", "Часов на слёт": "—", "Слётов": 3, "Сумма вклада": 552861 }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(volRows), "Табель софинансирования");

  XLSX.writeFile(wb, `CampMetrix_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast("Отчёт выгружен в Excel!", "success");
}