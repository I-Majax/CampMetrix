import { state, deleteRecord } from './db.js';
import { calculateStaffMetrics } from './calc.js';
import { ROLE_WEIGHTS } from './config.js';

// Всплывающие уведомления (Toast)
export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const colors = type === 'error' ? 'border-rose-500/50 bg-slate-900/95 text-rose-300' : 'border-emerald-500/50 bg-slate-900/95 text-emerald-300';
  toast.className = `p-3 rounded-xl border ${colors} shadow-2xl flex items-center gap-2.5 text-xs font-semibold transform transition-all duration-300 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Отрисовка списка сотрудников (в виде понятных карточек)
export function renderStaffList() {
  const container = document.getElementById('staffListContainer');
  const search = document.getElementById('registrySearchInput').value.toLowerCase();
  const filter = document.getElementById('registryRoleFilter').value;

  container.innerHTML = '';

  const filtered = state.staff.filter(s => {
    const match = s.name.toLowerCase().includes(search) || (s.nickname && s.nickname.toLowerCase().includes(search));
    if (!match) return false;
    const m = calculateStaffMetrics(s.id);
    if (filter === 'stop') return m.isStop;
    if (filter === 'pedagogical') return m.pedK !== null;
    if (filter === 'organizer') return m.orgK !== null;
    if (filter === 'technical') return m.techK !== null;
    return true;
  });

  filtered.forEach(s => {
    const m = calculateStaffMetrics(s.id);
    const card = document.createElement('div');
    card.className = 'bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3 relative hover:border-slate-700 transition';

    let badgeClass = 'bg-slate-800 text-slate-300';
    let badgeText = 'Новичок';
    if (m.isStop) { badgeClass = 'bg-rose-950 text-rose-300 border border-rose-600/40'; badgeText = 'Стоп-лист'; }
    else if (m.overallK >= 4.3) { badgeClass = 'bg-amber-950 text-amber-300 border border-amber-500/40'; badgeText = 'Золотой фонд'; }
    else if (m.overallK >= 3.6) { badgeClass = 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'; badgeText = 'Основа'; }

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <h3 class="font-bold text-white text-sm">${s.name} ${s.nickname ? '«' + s.nickname + '»' : ''}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">${ROLE_WEIGHTS[s.primaryRole]?.label || s.primaryRole}</p>
        </div>
        <div class="text-right">
          <div class="text-lg font-black ${m.isStop ? 'text-rose-400' : 'text-white'}">${m.count ? m.overallK : '—'}</div>
          <span class="text-[9px] px-2 py-0.5 rounded-full font-bold ${badgeClass}">${badgeText}</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 bg-slate-950/60 p-2 rounded-xl text-center text-[10px]">
        <div><span class="text-slate-500">Слётов</span><div class="font-bold text-slate-300">${m.count}</div></div>
        <div><span class="text-slate-500">Пед. K</span><div class="font-bold text-indigo-400">${m.pedK || '—'}</div></div>
        <div><span class="text-slate-500">Тренд</span><div class="font-bold text-slate-300">${m.trend}</div></div>
      </div>

      <div class="flex items-center gap-1.5 pt-1">
        <button onclick="window.startEvaluationFlow(null, '${s.id}')" class="flex-1 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition">Оценить</button>
        <button onclick="window.viewStaffDossier('${s.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Досье</button>
      </div>
    `;
    container.appendChild(card);
  });

  // Обновление цифр метрик
  document.getElementById('metricTotalStaff').textContent = state.staff.length;
  document.getElementById('metricTotalCamps').textContent = state.camps.length;
  document.getElementById('metricCoreStaff').textContent = state.staff.filter(s => calculateStaffMetrics(s.id).overallK >= 4.3).length;
  document.getElementById('metricStopList').textContent = state.staff.filter(s => calculateStaffMetrics(s.id).isStop).length;
}

// Отрисовка списка слётов
export function renderCampsList() {
  const container = document.getElementById('campsListContainer');
  container.innerHTML = '';

  state.camps.forEach(c => {
    const card = document.createElement('div');
    const rosterCount = (c.roster || []).length;
    card.className = 'bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-white text-base">${c.name}</h3>
          <p class="text-xs text-slate-400 mt-0.5">📍 ${c.location || 'Локация не указана'}</p>
        </div>
        <span class="text-xs text-indigo-400 font-bold bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/30">${rosterCount} вожатых</span>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-1">
        <button onclick="window.openPairingModal('${c.id}')" class="py-2 bg-gradient-to-r from-amber-500/20 to-indigo-600/20 hover:from-amber-500 hover:to-indigo-600 text-amber-200 hover:text-white rounded-xl text-xs font-bold transition border border-indigo-500/30 flex items-center justify-center gap-1.5">
          <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Пары на смену
        </button>
        <button onclick="window.openCampRoster('${c.id}')" class="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
          <i data-lucide="users" class="w-3.5 h-3.5"></i> Состав слёта
        </button>
      </div>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}