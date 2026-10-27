import { calculateStaffMultiCampK, getCampEvaluations, formatCampDateRange, getCategoryBadge } from './calc.js';
import { ROLE_WEIGHTS } from './config.js';
import { showToast } from './ui.js';

export function exportXLSX(staffList, campsList, evaluationsList) {
  if (staffList.length === 0) {
    showToast("Нет данных для экспорта", "error");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Лист 1: Реестр команды
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
      "Статус в лагере": badge.label
    };
  });
  const wsStaff = XLSX.utils.json_to_sheet(staffRows);
  XLSX.utils.book_append_sheet(wb, wsStaff, "Реестр команды");

  // Лист 2: Оценки по слётам
  const evalRows = evaluationsList.map(e => {
    const staff = staffList.find(s => s.id === e.staffId);
    const camp = campsList.find(c => c.id === e.campId);
    return {
      "Сотрудник": staff ? (staff.name || "Без имени") : e.staffId,
      "Слёт / Смена": camp ? camp.name : e.campId,
      "Локация": camp ? (camp.location || "") : "",
      "Даты слёта": formatCampDateRange(camp),
      "Роль на смене": ROLE_WEIGHTS[e.role]?.label || e.role,
      "Оценка за слёт (K)": Number(e.finalScore) || 0,
      "Режим 360°": e.is360 ? "Да" : "Нет",
      "Куратор (360)": e.eval360?.curatorScore ?? "",
      "Напарник (360)": e.eval360?.partnerScore ?? "",
      "Отряд (360)": e.eval360?.squadScore ?? "",
      "D (Дисциплина)": e.vectors?.D !== undefined ? Number(e.vectors.D) : "",
      "A (Аудитория)": e.vectors?.A !== undefined ? Number(e.vectors.A) : "",
      "S (Безопасность)": e.vectors?.S !== undefined ? Number(e.vectors.S) : "",
      "T (Командность)": e.vectors?.T !== undefined ? Number(e.vectors.T) : "",
      "F (Стресс)": e.vectors?.F !== undefined ? Number(e.vectors.F) : "",
      "L (Обучаемость)": e.vectors?.L !== undefined ? Number(e.vectors.L) : "",
      "Дата фиксации": e.timestamp ? new Date(e.timestamp).toLocaleDateString('ru-RU') : ""
    };
  });
  const wsEvals = XLSX.utils.json_to_sheet(evalRows);
  XLSX.utils.book_append_sheet(wb, wsEvals, "Оценки по слётам");

  // Лист 3: Сводка слётов
  const campRows = campsList.map(c => {
    const rosterCount = (Array.isArray(c.roster) ? c.roster : []).length;
    const campEvals = getCampEvaluations(c.id);
    const avg = campEvals.length > 0 ? Number((campEvals.reduce((a, b) => a + b.finalScore, 0) / campEvals.length).toFixed(2)) : "";
    return {
      "Название слёта": c.name || "Без названия",
      "Локация / База": c.location || "",
      "Даты проведения": formatCampDateRange(c),
      "Дата начала": c.startDate || "",
      "Дата окончания": c.endDate || "",
      "Человек в составе": Number(rosterCount) || 0,
      "Оценено сотрудников": Number(campEvals.length) || 0,
      "Средний K команды": avg
    };
  });
  const wsCamps = XLSX.utils.json_to_sheet(campRows);
  XLSX.utils.book_append_sheet(wb, wsCamps, "Сводка слётов");

  const fileName = `CampMetrix_360_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
  showToast("Отчёт успешно выгружен в Excel (.xlsx)!", "success");
}