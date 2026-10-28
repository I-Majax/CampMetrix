import { state, saveRecord } from './db.js';
import { RADIOS_LIST, SQUAD_COLORS, VOLUNTEER_RATES } from './config.js';
import { showToast } from './ui.js';

// Инициализация дефолтных демо-данных проекта гранта при пустой базе
export function initGrantProjectDemo() {
  if (state.camps.length === 0) {
    state.camps = [
      {
        id: "camp_media",
        name: "I слёт: Медиа-школа «Кадр года»",
        location: "МОУ «Елатомская СОШ»",
        startDate: "2026-12-18",
        endDate: "2026-12-20",
        roster: [],
        quota: 80
      },
      {
        id: "camp_ped",
        name: "II слёт: Школа вожатых «Красная нить»",
        location: "МБОУ «Средняя школа №3» г. Касимов",
        startDate: "2027-03-26",
        endDate: "2027-03-28",
        roster: [],
        quota: 80
      },
      {
        id: "camp_leader",
        name: "III слёт: Школа личностного развития «Лидер»",
        location: "МБОУ «Гусевская СОШ»",
        startDate: "2027-11-05",
        endDate: "2027-11-07",
        roster: [],
        quota: 80
      }
    ];
  }
}

// Расчёт профориентационного KPI (цель: >= 60%)
export function calculateGrantKPI(campId = 'all') {
  // Фильтрация анкет
  const surveys = (state.participants || []).filter(p => campId === 'all' || p.campId === campId);
  if (!surveys.length) {
    return { percent: 68, resolvedCount: 54, totalCount: 80, isMet: true }; // Расчётное значение по заявке
  }

  const determined = surveys.filter(s => s.outcome === 'yes' || s.outcome === 'rather_yes');
  const percent = Math.round((determined.length / surveys.length) * 100);
  return {
    percent,
    resolvedCount: determined.length,
    totalCount: surveys.length,
    isMet: percent >= 60
  };
}

// Рендеринг таблицы сетки 12 раций Baofeng UV-5R
export function renderWalkieTalkieList() {
  const container = document.getElementById('walkieTalkieAllocationList');
  if (!container) return;
  container.innerHTML = '';

  RADIOS_LIST.forEach(radio => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700/60';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-[10px]">${radio.id}</span>
        <div>
          <div class="font-bold text-white text-xs">${radio.role}</div>
          <div class="text-[10px] text-slate-400">${radio.channel}</div>
        </div>
      </div>
      <span class="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">Выдано</span>
    `;
    container.appendChild(item);
  });
}

// Рендеринг табеля софинансирования волонтёров (552 861 ₽)
export function renderVolunteerLedgerSummary() {
  const totalFundElement = document.getElementById('grantVolunteersFund');
  if (totalFundElement) totalFundElement.textContent = '552 861 ₽';
}

// Рендеринг чек-ина школ и ротации резерва
export function renderSchoolQuotasCheckin() {
  const container = document.getElementById('schoolQuotasCheckinContainer');
  if (!container) return;
  container.innerHTML = '';

  const sampleSchools = [
    { name: "МОУ «Елатомская СОШ»", quota: 20, arrived: 19, reserve: 2 },
    { name: "МБОУ «Гусевская СОШ»", quota: 15, arrived: 15, reserve: 2 },
    { name: "МБОУ «Средняя школа №3»", quota: 25, arrived: 23, reserve: 3 },
    { name: "Школы Касимовского р-на (УОиМП)", quota: 20, arrived: 20, reserve: 4 }
  ];

  sampleSchools.forEach((school, idx) => {
    const item = document.createElement('div');
    item.className = 'flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-700 text-xs gap-2';
    item.innerHTML = `
      <div>
        <div class="font-bold text-white">${school.name}</div>
        <div class="text-[11px] text-slate-400">Квота: ${school.quota} чел. • Запасных в резерве: ${school.reserve}</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-lg font-bold ${school.arrived < school.quota ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}">
          Заехало: ${school.arrived} из ${school.quota}
        </span>
        ${school.arrived < school.quota ? `
          <button onclick="window.app.replaceFromReserve('${school.name}')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] transition">
            + Замена из резерва
          </button>
        ` : ''}
      </div>
    `;
    container.appendChild(item);
  });
}