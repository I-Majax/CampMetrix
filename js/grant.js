import { state, saveRecord, deleteRecord } from './db.js';
import { showToast, showConfirmDialog } from './ui.js';

// Вычисление процента определившихся с профессией участников
export function calculateGrantKPI(campId = 'all') {
  const surveys = (state.participants || []).filter(p => campId === 'all' || p.campId === campId);
  if (!surveys.length) {
    return { percent: 0, resolvedCount: 0, totalCount: 0 };
  }

  const determined = surveys.filter(s => s.outcome === 'yes' || s.outcome === 'rather_yes');
  const percent = Math.round((determined.length / surveys.length) * 100);
  return {
    percent,
    resolvedCount: determined.length,
    totalCount: surveys.length
  };
}

// Отрисовка списка направляющих школ
export function renderSchoolQuotasCheckin() {
  const container = document.getElementById('schoolQuotasCheckinContainer');
  const totalArrivedEl = document.getElementById('grantParticipantsTotal');
  const totalSchoolsEl = document.getElementById('grantSchoolsTotal');
  if (!container) return;

  container.innerHTML = '';
  const schools = state.schools || [];

  let totalArrived = 0;
  schools.forEach(s => totalArrived += Number(s.arrived || 0));

  if (totalArrivedEl) totalArrivedEl.textContent = totalArrived;
  if (totalSchoolsEl) totalSchoolsEl.textContent = schools.length;

  if (schools.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">Школы ещё не внесены. Нажмите «Добавить школу», чтобы зафиксировать квоты заезда.</div>';
    return;
  }

  schools.forEach(school => {
    const item = document.createElement('div');
    item.className = 'flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-700 text-xs gap-2';
    item.innerHTML = `
      <div>
        <div class="font-bold text-white text-sm">${school.name}</div>
        <div class="text-[11px] text-slate-400">Квота: ${school.quota} чел. • В резерве: ${school.reserve} чел.</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-lg font-bold ${school.arrived < school.quota ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}">
          Заехало: ${school.arrived} из ${school.quota}
        </span>
        ${school.arrived < school.quota && school.reserve > 0 ? `
          <button onclick="window.app.replaceFromReserve('${school.id}')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] transition">
            + Замена из резерва
          </button>
        ` : ''}
        <button onclick="window.app.deleteSchool('${school.id}')" class="p-1 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/40" title="Удалить школу">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
  lucide.createIcons();
}

// Замена выбывшего участника на резервиста в 1 клик
export async function replaceFromReserve(schoolId) {
  const school = (state.schools || []).find(s => s.id === schoolId);
  if (!school || school.reserve <= 0) return;

  school.arrived = Number(school.arrived || 0) + 1;
  school.reserve = Number(school.reserve) - 1;

  await saveRecord('schools', schoolId, school);
  showToast(`Участник из резерва школы «${school.name}» зачислен в отряд!`, 'success');
  renderSchoolQuotasCheckin();
}

// Удаление школы
export function deleteSchool(schoolId) {
  showConfirmDialog({
    title: "Удалить школу?",
    message: "Квоты и список заезда данной школы будут стёрты.",
    onConfirm: async () => {
      await deleteRecord('schools', schoolId);
      showToast("Школа удалена", "info");
      renderSchoolQuotasCheckin();
    }
  });
}

// Отрисовка графика ночных дежурств
export function renderNightShiftsList() {
  const container = document.getElementById('nightShiftTable');
  if (!container) return;
  container.innerHTML = '';

  const shifts = state.nightShifts || [];
  if (shifts.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">График дежурств пока пуст. Заполните форму выше.</div>';
    return;
  }

  shifts.forEach(shift => {
    const item = document.createElement('div');
    item.className = 'flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-700 text-xs';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-bold text-amber-300">${shift.time}</span>
        <span class="text-white font-medium">${shift.lead}</span>
        <span class="text-slate-400">(${shift.sector || 'Все отряды'})</span>
      </div>
      <button onclick="window.app.deleteNightShift('${shift.id}')" class="text-rose-400 hover:text-rose-300 p-1">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    `;
    container.appendChild(item);
  });
  lucide.createIcons();
}

export function deleteNightShift(shiftId) {
  deleteRecord('nightShifts', shiftId).then(() => {
    renderNightShiftsList();
    showToast("Смена дежурства удалена", "info");
  });
}