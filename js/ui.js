import { state, deleteRecord } from './db.js';
import { 
  calculateStaffMultiCampK, 
  getCampEvaluations, 
  formatCampDateRange, 
  getCategoryBadge, 
  getStrongestVector, 
  getWeakestVector 
} from './calc.js';
import { ROLE_WEIGHTS } from './config.js';
import { 
  calculateGrantKPI, 
  renderWalkieTalkieList, 
  renderVolunteerLedgerSummary, 
  renderSchoolQuotasCheckin 
} from './grant.js';

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
  const borderClass = type === 'error' ? 'border-rose-500/50 bg-slate-900/95 text-rose-300' : 'border-emerald-500/50 bg-slate-900/95 text-emerald-300';
  toast.className = `p-3 rounded-xl border ${borderClass} shadow-xl flex items-center gap-2 text-xs font-semibold transform transition-all duration-300 translate-y-2 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showConfirmDialog({ title, message, onConfirm }) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;
  const btn = document.getElementById('confirmModalActionBtn');
  btn.onclick = () => {
    document.getElementById('confirmModal').classList.add('hidden');
    if (onConfirm) onConfirm();
  };
  modal.classList.remove('hidden');
}

export function switchTab(tabId) {
  ['registry', 'camps', 'grant', 'mts'].forEach(id => {
    document.getElementById(`tab-${id}`)?.classList.toggle('hidden', id !== tabId);
    document.getElementById(`tabBtn-${id}`)?.classList.toggle('bg-indigo-600', id !== tabId ? false : true);
    document.getElementById(`tabBtn-${id}`)?.classList.toggle('text-white', id !== tabId ? false : true);
    document.getElementById(`tabBtn-${id}`)?.classList.toggle('text-slate-400', id !== tabId ? true : false);
  });

  if (tabId === 'camps') renderCampsList();
  else if (tabId === 'registry') renderStaffRegistry();
  else if (tabId === 'grant') renderGrantTab();
  else if (tabId === 'mts') renderMtsTab();
  lucide.createIcons();
}

export function updateAllViews() {
  document.getElementById('statTotalStaff').textContent = state.staff.length;
  document.getElementById('statTotalCamps').textContent = state.camps.length;
  document.getElementById('statCoreStaff').textContent = state.staff.filter(s => calculateStaffMultiCampK(s.id).overallK >= 4.3).length;
  document.getElementById('statStopList').textContent = state.staff.filter(s => calculateStaffMultiCampK(s.id).isStopListed).length;

  renderStaffRegistry();
  renderCampsList();
  lucide.createIcons();
}

export function setSort(key) {
  currentSort = key;
  document.getElementById('sortSelect').value = key;
  renderStaffRegistry();
}

export function renderStaffRegistry() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('roleFilter')?.value || 'all';

  const filtered = state.staff.filter(s => {
    const match = (s.name || '').toLowerCase().includes(search) || (s.nickname || '').toLowerCase().includes(search);
    if (!match) return false;
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
    return 0;
  });

  renderDesktopTable(filtered);
  renderMobileCards(filtered);
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
        <div class="font-bold text-white">${member.name || 'Без имени'} ${member.nickname ? '«'+member.nickname+'»' : ''}</div>
        <div class="text-xs text-slate-400">${ROLE_WEIGHTS[member.primaryRole]?.label || member.primaryRole}</div>
      </td>
      <td class="py-3 px-3 text-center text-slate-300 font-semibold">${m.count}</td>
      <td class="py-3 px-3 text-center font-bold text-indigo-400">${m.pedK !== null ? m.pedK : '—'}</td>
      <td class="py-3 px-3 text-center font-bold text-purple-400">${m.orgK !== null ? m.orgK : '—'}</td>
      <td class="py-3 px-3 text-center font-bold text-amber-400">${m.techK !== null ? m.techK : '—'}</td>
      <td class="py-3 px-3 text-center font-black text-base ${m.isStopListed ? 'text-rose-400' : 'text-white'}">${m.count > 0 ? (m.isStopListed ? '0.00' : m.overallK) : '—'}</td>
      <td class="py-3 px-3 text-center text-xs text-slate-300 font-semibold">${m.trend}</td>
      <td class="py-3 px-3 text-center"><span class="text-[11px] px-2 py-0.5 rounded-full font-semibold ${badge.class}">${badge.label}</span></td>
      <td class="py-3 px-4 text-right space-x-1">
        <button onclick="window.app.viewDossier('${member.id}')" class="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-indigo-300" title="Досье"><i data-lucide="file-text" class="w-4 h-4"></i></button>
        <button onclick="window.app.startEvaluationFlow(null, '${member.id}')" class="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white" title="Оценить"><i data-lucide="award" class="w-4 h-4"></i></button>
        <button onclick="window.app.openStaffModal('${member.id}')" class="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300" title="Редактировать"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button onclick="window.app.deleteStaff('${member.id}')" class="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300" title="Удалить"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
    card.className = 'bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 space-y-3';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <div class="font-bold text-white text-sm">${member.name || 'Без имени'} ${member.nickname ? '«'+member.nickname+'»' : ''}</div>
          <div class="text-[11px] text-slate-400">${ROLE_WEIGHTS[member.primaryRole]?.label || member.primaryRole} • ${member.contact || '—'}</div>
        </div>
        <div class="text-right">
          <div class="text-base font-black ${m.isStopListed ? 'text-rose-400' : 'text-white'}">${m.count > 0 ? (m.isStopListed ? '0.00' : m.overallK) : '—'}</div>
          <span class="text-[9px] px-2 py-0.5 rounded-full font-semibold ${badge.class}">${badge.label}</span>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-1 text-center bg-slate-900/60 p-2 rounded-lg text-[10px]">
        <div><span class="text-slate-500">Слётов</span><div class="font-bold text-white">${m.count}</div></div>
        <div><span class="text-slate-500">Пед. K</span><div class="font-bold text-indigo-400">${m.pedK || '—'}</div></div>
        <div><span class="text-slate-500">Орг. K</span><div class="font-bold text-purple-400">${m.orgK || '—'}</div></div>
        <div><span class="text-slate-500">Тех. K</span><div class="font-bold text-amber-400">${m.techK || '—'}</div></div>
      </div>
      <div class="flex gap-1.5 pt-1">
        <button onclick="window.app.viewDossier('${member.id}')" class="flex-1 py-1.5 bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold">Досье</button>
        <button onclick="window.app.startEvaluationFlow(null, '${member.id}')" class="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Оценить</button>
      </div>
    `;
    container.appendChild(card);
  });
}

export function renderCampsList() {
  const container = document.getElementById('campsContainer');
  if (!container) return;
  container.innerHTML = '';

  state.camps.forEach(c => {
    const rosterCount = (Array.isArray(c.roster) ? c.roster : []).length;
    const evals = getCampEvaluations(c.id);
    const avg = evals.length ? (evals.reduce((a, b) => a + b.finalScore, 0) / evals.length).toFixed(2) : '—';

    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl space-y-3';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-white text-base">${c.name}</h3>
          <p class="text-xs text-slate-400 mt-0.5">📍 ${c.location || 'Локация не указана'} • 📅 ${formatCampDateRange(c)}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="window.app.openCampModal('${c.id}')" class="p-1 rounded bg-slate-700 text-slate-300"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button onclick="window.app.deleteCamp('${c.id}')" class="p-1 rounded bg-rose-950/60 text-rose-300"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </div>
      <div class="flex justify-between items-center text-xs border-t border-slate-700/60 pt-2">
        <span class="text-indigo-400 font-semibold">В составе: ${rosterCount}</span>
        <span class="text-emerald-400 font-semibold">Оценено: ${evals.length}</span>
        <span class="text-amber-300 font-bold">Ср. балл слёта: ${avg}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button onclick="window.app.openRosterModal('${c.id}')" class="py-2 bg-indigo-600/20 text-indigo-300 hover:text-white rounded-lg text-xs font-bold border border-indigo-500/30">Состав (${rosterCount})</button>
        <button onclick="window.app.viewCampDossier('${c.id}')" class="py-2 bg-slate-700 text-slate-200 rounded-lg text-xs font-bold">Досье слёта</button>
      </div>
    `;
    container.appendChild(card);
  });
}

export function renderGrantTab() {
  const kpi = calculateGrantKPI();
  document.getElementById('grantKpiValue').textContent = `${kpi.percent}%`;
  document.getElementById('grantParticipantsTotal').textContent = `${kpi.totalCount} / 240`;
  renderVolunteerLedgerSummary();
  renderSchoolQuotasCheckin();

  const filterSelect = document.getElementById('grantCampFilterSelect');
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">Все слёты серии</option>' + state.camps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  const container = document.getElementById('grantSquadsProgressList');
  if (!container) return;
  container.innerHTML = '';

  [1, 2, 3, 4].forEach(sq => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1 text-xs';
    card.innerHTML = `
      <div class="flex justify-between font-bold text-white"><span>Отряд #${sq}</span><span class="text-emerald-400">72% решено</span></div>
      <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1"><div class="bg-emerald-500 h-full w-[72%]"></div></div>
      <p class="text-[10px] text-slate-400 mt-1">Продукт: сдан на 100%</p>
    `;
    container.appendChild(card);
  });
}

export function renderMtsTab() {
  renderWalkieTalkieList();
}

export function viewDossier(staffId) {
  const member = state.staff.find(s => s.id === staffId);
  if (!member) return;

  const m = calculateStaffMultiCampK(staffId);
  document.getElementById('dosName').textContent = member.name;
  document.getElementById('dosMeta').textContent = `${ROLE_WEIGHTS[member.primaryRole]?.label || member.primaryRole} • ${member.contact || '—'}`;
  document.getElementById('dosPedK').textContent = m.pedK || '—';
  document.getElementById('dosOrgK').textContent = m.orgK || '—';
  document.getElementById('dosTechK').textContent = m.techK || '—';
  document.getElementById('dosTotalK').textContent = m.overallK || '—';

  const historyDiv = document.getElementById('dosCampsHistory');
  historyDiv.innerHTML = '';
  state.evaluations.filter(e => e.staffId === staffId).forEach(ev => {
    const c = state.camps.find(camp => camp.id === ev.campId) || { name: 'Слёт' };
    const row = document.createElement('div');
    row.className = 'flex justify-between p-2 rounded bg-slate-900 border border-slate-700 text-xs';
    row.innerHTML = `<span>${c.name} (${ROLE_WEIGHTS[ev.role]?.label || ev.role})</span><span class="font-bold text-indigo-400">K = ${ev.finalScore}</span>`;
    historyDiv.appendChild(row);
  });

  document.getElementById('dosDebriefScript').innerHTML = `«Сотрудник ${member.name}. Сильная сторона — <b>${getStrongestVector(m.avgVectors)}</b>. Точка роста — <b>${getWeakestVector(m.avgVectors)}</b>.»`;

  // Очистка предыдущего холста Chart.js
  const canvas = document.getElementById('radarChart');
  canvas.width = canvas.width;
  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: ['D', 'A', 'S', 'T', 'F', 'L'],
      datasets: [{
        label: 'Баллы вожатого',
        data: [m.avgVectors.D, m.avgVectors.A, m.avgVectors.S, m.avgVectors.T, m.avgVectors.F, m.avgVectors.L],
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#6366f1'
      }]
    },
    options: { maintainAspectRatio: false, scales: { r: { min: 1, max: 5 } } }
  });

  document.getElementById('dossierModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closeDossierModal() {
  if (radarChartInstance) radarChartInstance.destroy();
  document.getElementById('dossierModal').classList.add('hidden');
}

export function viewCampDossier(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  const evals = getCampEvaluations(campId);
  document.getElementById('campDosTitle').textContent = camp.name;
  document.getElementById('campDosMeta').textContent = `Локация: ${camp.location || '—'} • ${formatCampDateRange(camp)}`;
  document.getElementById('campDosAvgK').textContent = evals.length ? (evals.reduce((a, b) => a + b.finalScore, 0) / evals.length).toFixed(2) : '—';
  document.getElementById('campDosRosterCount').textContent = (camp.roster || []).length;
  document.getElementById('campDosEvaluatedPercent').textContent = `${Math.round((evals.length / (camp.roster?.length || 1)) * 100)}%`;
  document.getElementById('campDosGoldCount').textContent = evals.filter(e => e.finalScore >= 4.3).length;

  const list = document.getElementById('campDosParticipantsList');
  list.innerHTML = '';
  evals.sort((a, b) => b.finalScore - a.finalScore).forEach(e => {
    const st = state.staff.find(s => s.id === e.staffId);
    const row = document.createElement('div');
    row.className = 'flex justify-between p-2 rounded bg-slate-900 border border-slate-700 text-xs';
    row.innerHTML = `<span>${st?.name || 'Вожатый'}</span><span class="font-bold text-amber-400">K = ${e.finalScore}</span>`;
    list.appendChild(row);
  });

  const canvas = document.getElementById('campRadarChart');
  canvas.width = canvas.width;
  if (campRadarChartInstance) campRadarChartInstance.destroy();

  campRadarChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: ['D', 'A', 'S', 'T', 'F', 'L'],
      datasets: [{
        label: 'Командный профиль',
        data: [4.2, 4.4, 4.6, 4.1, 4.0, 4.3],
        backgroundColor: 'rgba(168, 85, 247, 0.25)',
        borderColor: '#a855f7'
      }]
    },
    options: { maintainAspectRatio: false, scales: { r: { min: 1, max: 5 } } }
  });

  document.getElementById('campDossierModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closeCampDossierModal() {
  if (campRadarChartInstance) campRadarChartInstance.destroy();
  document.getElementById('campDossierModal').classList.add('hidden');
}

export function renderRosterModalContent(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  document.getElementById('rosterCampTitle').textContent = `Состав: ${camp.name}`;
  document.getElementById('rosterCampMeta').textContent = `База: ${camp.location || '—'} • ${formatCampDateRange(camp)}`;

  const select = document.getElementById('rosterAddStaffSelect');
  const roster = camp.roster || [];
  select.innerHTML = state.staff.filter(s => !roster.includes(s.id)).map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  const list = document.getElementById('rosterStaffList');
  list.innerHTML = '';
  roster.forEach(sId => {
    const st = state.staff.find(s => s.id === sId);
    if (!st) return;
    const ev = state.evaluations.find(e => e.campId === campId && e.staffId === sId);
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-700 text-xs';
    row.innerHTML = `
      <div><span class="font-bold text-white">${st.name}</span><span class="ml-2 text-indigo-400">${ev ? `(K = ${ev.finalScore})` : '(Ожидает)'}</span></div>
      <div class="flex gap-1.5">
        <button onclick="window.app.openQrModal('${campId}', '${st.id}')" class="p-1 rounded bg-purple-950 text-purple-300"><i data-lucide="qr-code" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.app.closeRosterModal(); window.app.startEvaluationFlow('${campId}', '${st.id}');" class="p-1 rounded bg-indigo-600 text-white"><i data-lucide="award" class="w-3.5 h-3.5"></i></button>
        <button onclick="window.app.removeStaffFromRoster('${campId}', '${st.id}')" class="p-1 rounded bg-rose-950 text-rose-300"><i data-lucide="user-minus" class="w-3.5 h-3.5"></i></button>
      </div>
    `;
    list.appendChild(row);
  });
  lucide.createIcons();
}

export function addSelectedStaffToRoster() {
  const campId = activeRosterCampId;
  const staffId = document.getElementById('rosterAddStaffSelect').value;
  if (!campId || !staffId) return;

  const camp = state.camps.find(c => c.id === campId);
  if (camp && (!camp.roster || !camp.roster.includes(staffId))) {
    camp.roster = [...(camp.roster || []), staffId];
    saveRecord('camps', campId, { roster: camp.roster });
    renderRosterModalContent(campId);
    updateAllViews();
    showToast("Включён в состав слёта!");
  }
}

export function removeStaffFromRoster(campId, staffId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  camp.roster = (camp.roster || []).filter(id => id !== staffId);
  saveRecord('camps', campId, { roster: camp.roster });
  renderRosterModalContent(campId);
  updateAllViews();
  showToast("Удалён из состава смены", "info");
}

export function openRosterModal(campId) {
  setActiveRosterCampId(campId);
  renderRosterModalContent(campId);
  document.getElementById('rosterModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closeRosterModal() {
  setActiveRosterCampId(null);
  document.getElementById('rosterModal').classList.add('hidden');
}