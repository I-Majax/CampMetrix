import { calculateStaffMultiCampK, getCampEvaluations, formatCampDateRange, getCategoryBadge } from './calc.js';
import { ROLE_WEIGHTS } from './config.js';
import { showToast } from './ui.js';
import { state } from './db.js';

export function exportXLSX(staffList, campsList, evaluationsList) {
  if (staffList.length === 0 && campsList.length === 0) {
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
      "Категория": badge.label
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows), "Реестр команды");

  // Лист 2: Оценки слётов 360°
  const evalRows = evaluationsList.map(e => {
    const staff = staffList.find(s => s.id === e.staffId);
    const camp = campsList.find(c => c.id === e.campId);
    return {
      "Сотрудник": staff ? (staff.name || "Без имени") : e.staffId,
      "Слёт": camp ? camp.name : e.campId,
      "Роль": ROLE_WEIGHTS[e.role]?.label || e.role,
      "Итоговый балл K": Number(e.finalScore) || 0,
      "D (Тайминг)": Number(e.vectors?.D) || 0,
      "A (Аудитория)": Number(e.vectors?.A) || 0,
      "S (Безопасность)": Number(e.vectors?.S) || 0,
      "T (Командность)": Number(e.vectors?.T) || 0,
      "F (Форс-мажор)": Number(e.vectors?.F) || 0,
      "L (Обучаемость)": Number(e.vectors?.L) || 0,
      "Режим 360°": e.is360 ? "Да" : "Нет"
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evalRows), "Оценки слётов");

  // Лист 3: Реальные квоты школ и фактический заезд (вместо старого МТС)
  const schoolRows = (state.schools || []).map(school => ({
    "Образовательное учреждение": school.name,
    "Выделенная квота (чел)": Number(school.quota) || 0,
    "Фактически заехало (чел)": Number(school.arrived) || 0,
    "Остаток в резерве (чел)": Number(school.reserve) || 0,
    "Статус заполнения": (school.arrived >= school.quota) ? "Квота закрыта" : "Недобор"
  }));
  
  if (schoolRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schoolRows), "Квоты школ и заезд");
  }

  XLSX.writeFile(wb, `CampMetrix_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast("Отчёт выгружен в Excel!", "success");
}