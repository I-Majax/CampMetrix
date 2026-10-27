import { state, deleteRecord, saveRecord } from './db.js';
import { 
  calculateStaffMultiCampK, 
  getCampEvaluations, 
  formatCampDateRange, 
  getCategoryBadge, 
  getStrongestVector, 
  getWeakestVector 
} from './calc.js';
import { ROLE_WEIGHTS } from './config.js';

let radarChartInstance = null;
let campRadarChartInstance = null;
let currentSort = 'k_desc';
export let activeRosterCampId = null;

export function setActiveRosterCampId(id) {
  activeRosterCampId = id;
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  let borderClass = 'border-emerald-500/50 bg-slate-900/95 text-emerald-300';
  let icon = 'check-circle';
  if (type === 'error') {
    borderClass = 'border-rose-500/50 bg-slate-900/95 text-rose-300';
    icon = 'alert-triangle';
  } else if (type === 'info') {
    borderClass = 'border-indigo-500/50 bg-slate-900/95 text-indigo-300';
    icon = 'info';
  }

  toast.className = `pointer-events-auto p-3 rounded-xl border ${borderClass} shadow-xl flex items-center gap-2.5 text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function showConfirmDialog({ title, message, confirmText = 'Подтвердить', isDanger = true, onConfirm }) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;
  const btn = document.getElementById('confirmModalActionBtn');
  btn.textContent = confirmText;
  btn.className = isDanger
    ? 'px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-sm'
    : 'px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm';
  btn.onclick = () => {
    closeConfirmDialog();
    if (onConfirm) onConfirm();
  };
  modal.classList.remove('hidden');
  lucide.createIcons();
}

export function closeConfirmDialog() {
  document.getElementById('confirmModal').classList.add('hidden');
}

export function switchTab(tabId) {
  document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
  const targetSec = document.getElementById(`tab-${tabId}`);
  if (targetSec) targetSec.classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`tabBtn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-indigo-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  if (tabId === 'camps') renderCampsList();
  else if (tabId === 'registry') renderStaffRegistry();
  lucide.createIcons();
}

export function updateAllViews() {
  renderSummaryCards();
  renderStaffRegistry();
  renderCampsList();
  lucide.createIcons();
}

export function renderSummaryCards() {
  document.getElementById('statTotalStaff').textContent = state.staff.length;
  document.getElementById('statTotalCamps').textContent = state.camps.length;

  let core = 0;
  let stop = 0;
  state.staff.forEach(s => {
    const m = calculateStaffMultiCampK(s.id);
    if (m.isStopListed) stop++;
    else if (m.overallK >= 4.3) core++;
  });

  document.getElementById('statCoreStaff').textContent = core;
  document.getElementById('statStopList').textContent = stop;
}

export function setSort(sortKey) {
  currentSort = sortKey;
  document.getElementById('sortSelect').value = sortKey;
  renderStaffRegistry();
}

export function renderStaffRegistry() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('roleFilter')?.value || 'all';
  currentSort = document.getElementById('sortSelect')?.value || 'k_desc';

  let filtered = state.staff.filter(s => {
    const nameStr = (s.name || '').toLowerCase();
    const nickStr = (s.nickname || '').toLowerCase();
    const matchesSearch = nameStr.includes(search) || nickStr.includes(search);
    if (!matchesSearch) return false;

    const m = calculateStaffMultiCampK(s.id);
    if (roleFilter === 'stop') return m.isStopListed;
    if (roleFilter === 'pedagogical') return m.pedK !== null;
    if (roleFilter === 'organizer') return m.orgK !== null;
    if (roleFilter === 'technical') return m.techK !== null;
    return true;
  });

  filtered.sort((a, b) => {
    const ma = calculateStaffMultiCampK(a.id);
    const mb = calculateStaffMultiCampK(b.id);
    if (currentSort === 'k_desc') return mb.overallK - ma.overallK;
    if (currentSort === 'k_asc') return ma.overallK - mb.overallK;
    if (currentSort === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'ru');
    if (currentSort === 'camps_desc') return mb.count - ma.count;
    if (currentSort === 'ped_desc') return (mb.pedK || 0) - (ma.pedK || 0);
    if (currentSort === 'org_desc') return (mb.orgK || 0) - (ma.orgK || 0);
    if (currentSort === 'tech_desc') return (mb.techK || 0) - (ma.techK || 0);
    return 0;
  });

  const emptyNotice = document.getElementById('emptyStaffNotice');
  if (filtered.length === 0) emptyNotice?.classList.remove('hidden');
  else emptyNotice?.classList.add('hidden');

  renderDesktopTable(filtered);
  renderMobileCards(filtered);
  lucide.createIcons();
}

function renderDesktopTable(list) {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach(member => {
    const m = calculateStaffMultiCampK(member.id);
    const badge = getCategoryBadge(m);
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/80 transition';

    tr.innerHTML = `
      <td class="py-3 px-4">
        <div class="font-bold text-white flex items-center gap-1.5">
          ${member.name || 'Без имени'}
          ${member.nickname ? '<span class="text-xs text-slate-400 font-normal">«'+member.nickname+'»</span>' : ''}
        </div>
        <div class="text-xs text-slate-400">${ROLE_WEIGHTS[member.primaryRole]?.label || member.primaryRole}</div>
      </td>
      <td class="py-3 px-3 text-center text-slate-300 font-semibold">${m.count}</td>
      <td class="py-3 px-3 text-center font-bold text-indigo-400">${m.pedK !== null ? m.pedK : '—'}</td>
      <td class="py-3 px-3 text-center font-bold text-purple-400">${m.orgK !== null ? m.orgK : '—'}</td>
      <td class="py-3 px-3 text-center font-bold text-amber-400">${m.techK !== null ? m.techK : '—'}</td>
      <td class="py-3 px-3 text-center font-black text-base ${m.isStopListed ? 'text-rose-400' : 'text-white'}">
        ${m.count > 0 ? (m.isStopListed ? '0.00' : m.overallK) : '—'}
      </td>
      <td class="py-3 px-3 text-center text-xs text-slate-300 font-semibold">${m.trend}</td>
      <td class="py-3 px-3 text-center">
        <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold ${badge.class}">${badge.label}</span>
      </td>
      <td class="py-3 px-4 text-right space-x-1">
        <button onclick="window.app.viewDossier('${member.id}')" class="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-indigo-300 transition" title="Досье"><i data-lucide="file-text" class="w-4 h-4"></i></button>
        <button onclick="window.app.startEvaluationFlow(null, '${member.id}')" class="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition" title="Оценить"><i data-lucide="award" class="w-4 h-4"></i></button>
        <button onclick="window.app.openStaffModal('${member.id}')" class="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition" title="Редактировать"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button onclick="window.app.deleteStaff('${member.id}')" class="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/40 transition" title="Удалить"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMobileCards(list) {
  const container = document.getElementById('staffCardsContainer');
  if (!container) return;
  container.innerHTML = '';

  list.forEach(member => {
    const m = calculateStaffMultiCampK(member.id);
    const badge = getCategoryBadge(m);
    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 space-y-3 shadow-sm';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="font-bold text-white text-sm flex items-center gap-1.5">
            ${member.name || 'Без имени'}
            ${member.nickname ? '<span class="text-xs text-slate-400 font-normal">«'+member.nickname+'»</span>' : ''}
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">${ROLE_WEIGHTS[member.primaryRole]?.label || member.primaryRole} • ${member.contact || 'Нет контакта'}</div>
        </div>
        <div class="text-right flex flex-col items-end">
          <div class="text-lg font-black ${m.isStopListed ? 'text-rose-400' : 'text-white'}">
            ${m.count > 0 ? (m.isStopListed ? '0.00' : m.overallK) : '—'}
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.class}">${badge.label}</span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-2 rounded-lg text-center text-[10px]">
        <div><div class="text-slate-500 uppercase">Слётов</div><div class="font-bold text-white mt-0.5">${m.count}</div></div>
        <div><div class="text-slate-500 uppercase">Пед. K</div><div class="font-bold text-indigo-400 mt-0.5">${m.pedK !== null ? m.pedK : '—'}</div></div>
        <div><div class="text-slate-500 uppercase">Орг. K</div><div class="font-bold text-purple-400 mt-0.5">${m.orgK !== null ? m.orgK : '—'}</div></div>
        <div><div class="text-slate-500 uppercase">Тех. K</div><div class="font-bold text-amber-400 mt-0.5">${m.techK !== null ? m.techK : '—'}</div></div>
      </div>

      <div class="flex items-center gap-1.5 pt-1">
        <button onclick="window.app.viewDossier('${member.id}')" class="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-indigo-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1">Досье</button>
        <button onclick="window.app.startEvaluationFlow(null, '${member.id}')" class="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1">Оценить</button>
        <button onclick="window.app.openStaffModal('${member.id}')" class="p-1.5 bg-slate-700 text-slate-300 rounded-lg"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.app.deleteStaff('${member.id}')" class="p-1.5 bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded-lg"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </div>
    `;
    container.appendChild(card);
  });
}

export function renderCampsList() {
  const container = document.getElementById('campsContainer');
  const emptyNotice = document.getElementById('emptyCampsNotice');
  if (!container) return;

  container.innerHTML = '';

  if (state.camps.length === 0) {
    if (emptyNotice) emptyNotice.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }
  
  if (emptyNotice) emptyNotice.classList.add('hidden');
  container.classList.remove('hidden');

  const sortedCamps = [...state.camps].sort((a, b) => {
    const timeA = a.startDate ? new Date(a.startDate).getTime() : (a.createdAt || 0);
    const timeB = b.startDate ? new Date(b.startDate).getTime() : (b.createdAt || 0);
    return timeB - timeA;
  });

  sortedCamps.forEach(c => {
    const rosterCount = (Array.isArray(c.roster) ? c.roster : []).length;
    const campEvals = getCampEvaluations(c.id);
    const evalsCount = campEvals.length;
    
    let avgScore = '—';
    if (campEvals.length > 0) {
      const sum = campEvals.reduce((acc, curr) => acc + curr.finalScore, 0);
      avgScore = (sum / campEvals.length).toFixed(2);
    }

    const dateRangeStr = formatCampDateRange(c);

    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 border border-slate-700/60 p-3.5 sm:p-4 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-slate-600 transition';
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-2">
          <div class="font-bold text-white text-sm sm:text-base leading-tight">${c.name || 'Слёт без названия'}</div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button onclick="window.app.openCampModal('${c.id}')" class="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition" title="Редактировать"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
            <button onclick="window.app.deleteCamp('${c.id}')" class="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 border border-rose-800/40 transition" title="Удалить"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </div>
        
        <div class="text-[11px] text-slate-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          <span>📍 ${c.location || 'Локация не указана'}</span>
          <span class="text-indigo-300">📅 ${dateRangeStr}</span>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-700/60 text-xs">
          <div class="flex items-center gap-3">
            <span class="text-indigo-400 font-semibold flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i> Состав: ${rosterCount}</span>
            <span class="text-emerald-400 font-semibold flex items-center gap-1"><i data-lucide="award" class="w-3.5 h-3.5"></i> Оценено: ${evalsCount}</span>
          </div>
          <span class="text-amber-300 font-bold ml-auto">Средний K: ${avgScore}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-1">
        <button onclick="window.app.openRosterModal('${c.id}')" class="py-2 px-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-indigo-500/30">
          <i data-lucide="users" class="w-3.5 h-3.5"></i> Состав (${rosterCount})
        </button>
        <button onclick="window.app.viewCampDossier('${c.id}')" class="py-2 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5">
          <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i> Досье слёта
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

export function renderRosterModalContent(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  document.getElementById('rosterCampTitle').innerHTML = `<i data-lucide="users" class="text-indigo-400 w-5 h-5"></i> ${camp.name}`;
  document.getElementById('rosterCampMeta').textContent = `Локация: ${camp.location || '—'} • Даты: ${formatCampDateRange(camp)}`;

  const roster = Array.isArray(camp.roster) ? camp.roster : [];
  document.getElementById('rosterCountBadge').textContent = `${roster.length} человек`;

  const select = document.getElementById('rosterAddStaffSelect');
  const available = state.staff.filter(s => !roster.includes(s.id));
  if (available.length === 0) {
    select.innerHTML = '<option value="" disabled selected>Все люди из реестра уже добавлены</option>';
  } else {
    select.innerHTML = '<option value="" disabled selected>Выберите человека из реестра...</option>' +
      available.map(s => `<option value="${s.id}">${s.name || 'Без имени'} ${s.nickname ? '«'+s.nickname+'»' : ''}</option>`).join('');
  }

  const listContainer = document.getElementById('rosterStaffList');
  listContainer.innerHTML = '';

  if (roster.length === 0) {
    listContainer.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">В этот слёт пока никто не записан.</div>';
    return;
  }

  const sortMode = document.getElementById('rosterSortSelect')?.value || 'k_desc';
  const sortedRoster = [...roster].sort((aId, bId) => {
    const staffA = state.staff.find(s => s.id === aId);
    const staffB = state.staff.find(s => s.id === bId);
    const evA = state.evaluations.find(e => e.campId === campId && e.staffId === aId);
    const evB = state.evaluations.find(e => e.campId === campId && e.staffId === bId);
    
    const hasScoreA = evA !== undefined;
    const hasScoreB = evB !== undefined;
    const scoreA = evA ? evA.finalScore : -1;
    const scoreB = evB ? evB.finalScore : -1;

    if (sortMode === 'k_desc') {
      if (hasScoreA && hasScoreB) return scoreB - scoreA;
      if (hasScoreA) return -1;
      if (hasScoreB) return 1;
      return (staffA?.name || '').localeCompare(staffB?.name || '', 'ru');
    } else if (sortMode === 'k_asc') {
      if (hasScoreA && hasScoreB) return scoreA - scoreB;
      if (hasScoreA) return -1;
      if (hasScoreB) return 1;
      return (staffA?.name || '').localeCompare(staffB?.name || '', 'ru');
    } else if (sortMode === 'pending_first') {
      if (!hasScoreA && hasScoreB) return -1;
      if (hasScoreA && !hasScoreB) return 1;
      return (staffA?.name || '').localeCompare(staffB?.name || '', 'ru');
    } else {
      return (staffA?.name || '').localeCompare(staffB?.name || '', 'ru');
    }
  });

  sortedRoster.forEach(staffId => {
    const staff = state.staff.find(s => s.id === staffId);
    if (!staff) return;

    const ev = state.evaluations.find(e => e.campId === campId && e.staffId === staffId);
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60';

    let evalBadge = '';
    if (ev) {
      evalBadge = `<span class="text-xs px-2 py-0.5 rounded font-black ${ev.finalScore >= 4.3 ? 'bg-amber-950/80 text-amber-300' : (ev.finalScore >= 3.6 ? 'bg-emerald-950/80 text-emerald-300' : 'bg-rose-950/80 text-rose-300')}">K = ${ev.finalScore.toFixed(2)}</span>`;
    } else {
      evalBadge = `<span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Ожидает</span>`;
    }

    item.innerHTML = `
      <div>
        <div class="font-bold text-xs sm:text-sm text-white">${staff.name || 'Без имени'}</div>
        <div class="text-[11px] text-slate-400">${ROLE_WEIGHTS[staff.primaryRole]?.label || staff.primaryRole}</div>
      </div>
      <div class="flex items-center gap-1.5">
        ${evalBadge}
        <button onclick="window.app.openQrModal('${campId}', '${staff.id}')" class="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800/40 transition" title="QR-код 360°"><i data-lucide="qr-code" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.app.closeRosterModal(); window.app.startEvaluationFlow('${campId}', '${staff.id}');" class="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 transition" title="Оценить"><i data-lucide="award" class="w-3.5 h-3.5"></i></button>
        ${ev ? `
          <button onclick="window.app.deleteEvaluation('${ev.id}')" class="p-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900 text-amber-300 border border-amber-800/40 transition" title="Сбросить оценку"><i data-lucide="eraser" class="w-3.5 h-3.5"></i></button>
        ` : ''}
        <button onclick="window.app.removeStaffFromRoster('${campId}', '${staff.id}')" class="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 border border-rose-800/40 transition" title="Исключить"><i data-lucide="user-minus" class="w-3.5 h-3.5"></i></button>
      </div>
    `;
    listContainer.appendChild(item);
  });
  lucide.createIcons();
}

export function viewDossier(staffId) {
  const member = state.staff.find(s => s.id === staffId);
  if (!member) return;

  const m = calculateStaffMultiCampK(staffId);
  document.getElementById('dosName').textContent = (member.name || 'Без имени') + (member.nickname ? ` («${member.nickname}»)` : '');
  document.getElementById('dosMeta').textContent = `Специализация: ${ROLE_WEIGHTS[member.primaryRole]?.label || member.primaryRole} • Контакт: ${member.contact || '—'}`;

  document.getElementById('dosPedK').textContent = m.pedK !== null ? m.pedK : '—';
  document.getElementById('dosOrgK').textContent = m.orgK !== null ? m.orgK : '—';
  document.getElementById('dosTechK').textContent = m.techK !== null ? m.techK : '—';
  document.getElementById('dosTotalK').textContent = m.isStopListed ? '0.00' : (m.count > 0 ? m.overallK : '—');

  const badge = document.getElementById('dosCategoryBadge');
  if (m.isStopListed) {
    badge.textContent = "В СТОП-ЛИСТЕ";
    badge.className = "text-[10px] text-rose-400 font-bold";
  } else if (m.overallK >= 4.3) {
    badge.textContent = "Ядро / Золотой фонд";
    badge.className = "text-[10px] text-amber-400 font-bold";
  } else if (m.overallK >= 3.6) {
    badge.textContent = "Надёжная основа";
    badge.className = "text-[10px] text-emerald-400 font-bold";
  } else {
    badge.textContent = "Зона риска";
    badge.className = "text-[10px] text-rose-400 font-bold";
  }

  const userEvals = state.evaluations.filter(e => e.staffId === staffId && state.camps.some(c => c.id === e.campId));
  userEvals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const histDiv = document.getElementById('dosCampsHistory');
  histDiv.innerHTML = '';
  if (userEvals.length === 0) {
    histDiv.innerHTML = '<div class="text-xs text-slate-500 p-3 bg-slate-900/40 rounded-lg border border-slate-800">Нет сохранённых оценок со слётов.</div>';
  } else {
    userEvals.forEach(ev => {
      const c = state.camps.find(camp => camp.id === ev.campId) || { name: 'Слёт #' + ev.campId };
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2.5 rounded-lg bg-slate-900/70 text-xs border border-slate-700/60';
      item.innerHTML = `
        <div>
          <div class="font-bold text-white">${c.name}</div>
          <div class="text-slate-400">${ROLE_WEIGHTS[ev.role]?.label || ev.role} • ${formatCampDateRange(c)}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-black text-sm ${ev.finalScore >= 4.3 ? 'text-amber-400' : (ev.finalScore >= 3.6 ? 'text-emerald-400' : 'text-rose-400')}">
            K = ${ev.finalScore.toFixed(2)}
          </span>
          <button onclick="window.app.closeDossierModal(); window.app.startEvaluationFlow('${ev.campId}', '${staffId}');" class="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" title="Изменить"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button onclick="window.app.deleteEvaluation('${ev.id}')" class="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40" title="Удалить"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      `;
      histDiv.appendChild(item);
    });
  }

  const scriptBox = document.getElementById('dosDebriefScript');
  if (m.isStopListed) {
    scriptBox.innerHTML = `«Сотрудник дисквалифицирован за критическое нарушение безопасности/дисциплины. Допуск на следующие смены закрыт.»`;
  } else if (m.count === 0) {
    scriptBox.innerHTML = `«Новичок в штабе. Рекомендуется ставить в пару к опытному вожатому из "Золотого фонда" для адаптации.»`;
  } else {
    scriptBox.innerHTML = `«Привет! Спасибо за отдачу. Твой общий коэффициент — <b>${m.overallK}</b> (${badge.textContent}). Твоя ведущая суперсила — <b>${getStrongestVector(m.avgVectors)}</b>. На следующем слёте сделай акцент на <b>${getWeakestVector(m.avgVectors)}</b>.»`;
  }

  renderRadar(m.avgVectors);
  document.getElementById('dossierModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closeDossierModal() {
  if (radarChartInstance) {
    radarChartInstance.destroy();
    radarChartInstance = null;
  }
  document.getElementById('dossierModal').classList.add('hidden');
}

function renderRadar(v) {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Дисциплина (D)', 'Аудитория (A)', 'Безопасность (S)', 'Командность (T)', 'Стресс (F)', 'Обучаемость (L)'],
      datasets: [{
        label: 'Профиль сотрудника',
        data: [v.D, v.A, v.S, v.T, v.F, v.L],
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: 'rgba(99, 102, 241, 1)',
        pointBackgroundColor: '#fbbf24',
        borderWidth: 2
      }, {
        label: 'Эталон',
        data: [4.0, 4.0, 4.5, 4.0, 4.0, 4.0],
        borderColor: 'rgba(148, 163, 184, 0.35)',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, display: false },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#94a3b8', font: { size: 10 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

export function viewCampDossier(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  document.getElementById('campDosTitle').innerHTML = `<i data-lucide="tent" class="text-indigo-400 w-5 h-5"></i> ${camp.name}`;
  document.getElementById('campDosMeta').textContent = `Локация: ${camp.location || '—'} • Даты: ${formatCampDateRange(camp)}`;

  const roster = Array.isArray(camp.roster) ? camp.roster : [];
  const campEvals = getCampEvaluations(campId);
  
  document.getElementById('campDosRosterCount').textContent = roster.length;
  
  let avgK = '—';
  let goldCount = 0;
  const teamVectors = { D: 0, A: 0, S: 0, T: 0, F: 0, L: 0 };

  if (campEvals.length > 0) {
    const sum = campEvals.reduce((acc, curr) => acc + curr.finalScore, 0);
    avgK = (sum / campEvals.length).toFixed(2);
    goldCount = campEvals.filter(e => e.finalScore >= 4.3).length;

    campEvals.forEach(ev => {
      if (ev.vectors) {
        for (let k in teamVectors) teamVectors[k] += (Number(ev.vectors[k]) || 4.0);
      }
    });
    for (let k in teamVectors) teamVectors[k] = parseFloat((teamVectors[k] / campEvals.length).toFixed(1));
  }

  document.getElementById('campDosAvgK').textContent = avgK;
  document.getElementById('campDosGoldCount').textContent = goldCount;

  const evalPercent = roster.length > 0 ? Math.round((campEvals.length / roster.length) * 100) : 0;
  document.getElementById('campDosEvaluatedPercent').textContent = evalPercent + '%';
  document.getElementById('campDosParticipantsBadge').textContent = `${campEvals.length} оценок`;

  const sortedRoster = [...roster].sort((aId, bId) => {
    const evA = campEvals.find(e => e.staffId === aId);
    const evB = campEvals.find(e => e.staffId === bId);
    const scoreA = evA ? evA.finalScore : -1;
    const scoreB = evB ? evB.finalScore : -1;
    return scoreB - scoreA;
  });

  const listDiv = document.getElementById('campDosParticipantsList');
  listDiv.innerHTML = '';
  if (roster.length === 0) {
    listDiv.innerHTML = '<div class="text-xs text-slate-500 p-3 bg-slate-900/40 rounded-xl">В состав слёта ещё никто не включён.</div>';
  } else {
    sortedRoster.forEach(staffId => {
      const staff = state.staff.find(s => s.id === staffId);
      if (!staff) return;
      const ev = campEvals.find(e => e.staffId === staffId);
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/60 text-xs';
      
      let scoreHtml = '';
      if (ev) {
        scoreHtml = `
          <div class="flex items-center gap-2">
            <span class="font-black text-sm ${ev.finalScore >= 4.3 ? 'text-amber-400' : (ev.finalScore >= 3.6 ? 'text-emerald-400' : 'text-rose-400')}">K = ${ev.finalScore.toFixed(2)}</span>
            <button onclick="window.app.closeCampDossierModal(); window.app.startEvaluationFlow('${campId}', '${staffId}');" class="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" title="Изменить"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
            <button onclick="window.app.deleteEvaluation('${ev.id}')" class="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40" title="Удалить"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        `;
      } else {
        scoreHtml = `<button onclick="window.app.closeCampDossierModal(); window.app.startEvaluationFlow('${campId}', '${staffId}');" class="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition font-medium">Оценить</button>`;
      }

      item.innerHTML = `
        <div>
          <div class="font-bold text-white flex items-center gap-1.5">${staff.name || 'Без имени'} ${staff.nickname ? '«'+staff.nickname+'»' : ''}</div>
          <div class="text-[11px] text-slate-400">${ROLE_WEIGHTS[staff.primaryRole]?.label || staff.primaryRole}</div>
        </div>
        <div>${scoreHtml}</div>
      `;
      listDiv.appendChild(item);
    });
  }

  renderCampRadar(teamVectors);
  document.getElementById('campDossierModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closeCampDossierModal() {
  if (campRadarChartInstance) {
    campRadarChartInstance.destroy();
    campRadarChartInstance = null;
  }
  document.getElementById('campDossierModal').classList.add('hidden');
}

function renderCampRadar(v) {
  const canvas = document.getElementById('campRadarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (campRadarChartInstance) campRadarChartInstance.destroy();

  campRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Дисциплина (D)', 'Аудитория (A)', 'Безопасность (S)', 'Командность (T)', 'Стресс (F)', 'Обучаемость (L)'],
      datasets: [{
        label: 'Средний профиль команды слёта',
        data: [v.D, v.A, v.S, v.T, v.F, v.L],
        backgroundColor: 'rgba(168, 85, 247, 0.25)',
        borderColor: 'rgba(168, 85, 247, 1)',
        pointBackgroundColor: '#a855f7',
        borderWidth: 2
      }, {
        label: 'Эталон',
        data: [4.0, 4.0, 4.5, 4.0, 4.0, 4.0],
        borderColor: 'rgba(148, 163, 184, 0.35)',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, display: false },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#94a3b8', font: { size: 10 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}