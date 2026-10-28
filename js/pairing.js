import { state, saveRecord } from './db.js';
import { calculateStaffMultiCampK } from './calc.js';
import { ROLE_WEIGHTS } from './config.js';
import { showToast } from './ui.js';

let activePairingCampId = null;
let currentPairsList = [];

export function openSmartPairingModal(campId) {
  activePairingCampId = campId;
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  document.getElementById('pairingModalTitle').innerHTML = `
    <i data-lucide="sparkles" class="text-amber-400 w-5 h-5"></i> Подбор пар: ${camp.name}
  `;

  if (Array.isArray(camp.formedPairs) && camp.formedPairs.length > 0) {
    currentPairsList = JSON.parse(JSON.stringify(camp.formedPairs));
  } else {
    currentPairsList = autoGeneratePairs(campId);
  }

  renderPairingCards();
  document.getElementById('pairingModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closePairingModal() {
  activePairingCampId = null;
  document.getElementById('pairingModal').classList.add('hidden');
}

export function autoGeneratePairs(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return [];

  const roster = Array.isArray(camp.roster) ? camp.roster : [];
  const candidates = state.staff.filter(s => roster.includes(s.id) && ['counselor', 'trainee', 'lead', 'organizer'].includes(s.primaryRole));

  const seniorPool = [];
  const juniorPool = [];

  candidates.forEach(staff => {
    const m = calculateStaffMultiCampK(staff.id);
    const isSenior = m.overallK >= 4.0 || m.count >= 2 || staff.primaryRole === 'lead';
    if (isSenior) seniorPool.push({ staff, m });
    else juniorPool.push({ staff, m });
  });

  seniorPool.sort((a, b) => b.m.overallK - a.m.overallK);
  juniorPool.sort((a, b) => a.m.overallK - b.m.overallK);

  const pairs = [];
  while (seniorPool.length > 0 && juniorPool.length > 0) {
    const senior = seniorPool.shift();
    const junior = juniorPool.shift();
    pairs.push({
      id1: senior.staff.id,
      id2: junior.staff.id,
      score: 95,
      tag: "Наставник + Стажёр",
      desc: "Опыт СПО «Белый Пеликан» компенсирует нехватку практики у новичка."
    });
  }

  const remaining = [...seniorPool, ...juniorPool];
  for (let i = 0; i < remaining.length; i += 2) {
    if (i + 1 < remaining.length) {
      pairs.push({
        id1: remaining[i].staff.id,
        id2: remaining[i + 1].staff.id,
        score: 85,
        tag: "Рабочая пара",
        desc: "Сбалансированная связка для ведения отрядной сетки."
      });
    } else {
      // Обработка нечётного кандидата
      pairs.push({
        id1: remaining[i].staff.id,
        id2: null,
        score: 70,
        tag: "Резерв / Третий в отряд",
        desc: "Кандидат закрепляется за отрядом повышенной сложности или штабом."
      });
    }
  }

  return pairs;
}

export function renderPairingCards() {
  const container = document.getElementById('pairingCardsContainer');
  container.innerHTML = '';

  if (currentPairsList.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">Недостаточно вожатых в ростере слёта.</div>';
    return;
  }

  currentPairsList.forEach((pair, idx) => {
    const s1 = state.staff.find(s => s.id === pair.id1);
    const s2 = pair.id2 ? state.staff.find(s => s.id === pair.id2) : null;
    if (!s1) return;

    const m1 = calculateStaffMultiCampK(s1.id);
    const m2 = s2 ? calculateStaffMultiCampK(s2.id) : null;

    const card = document.createElement('div');
    card.className = 'bg-slate-900/80 border border-slate-700/80 p-3.5 rounded-2xl space-y-2';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-white flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 flex items-center justify-center text-[10px]">${idx + 1}</span>
          Связка отряда #${idx + 1}
        </span>
        <span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40">
          ${pair.tag} (${pair.score}%)
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div><div class="font-bold text-white">${s1.name}</div><div class="text-[10px] text-slate-400">${ROLE_WEIGHTS[s1.primaryRole]?.label || s1.primaryRole}</div></div>
          <span class="font-black text-indigo-400">K = ${m1.overallK || '—'}</span>
        </div>
        ${s2 ? `
          <div class="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div><div class="font-bold text-white">${s2.name}</div><div class="text-[10px] text-slate-400">${ROLE_WEIGHTS[s2.primaryRole]?.label || s2.primaryRole}</div></div>
            <span class="font-black text-indigo-400">K = ${m2?.overallK || '—'}</span>
          </div>
        ` : `
          <div class="bg-slate-800/40 p-2 rounded-xl border border-dashed border-slate-700 text-slate-500 flex items-center justify-center text-xs">
            Без напарника (В резерв штаба)
          </div>
        `}
      </div>
      <p class="text-[11px] text-slate-400">${pair.desc}</p>
    `;
    container.appendChild(card);
  });
}

export function generateAutoPairs() {
  if (!activePairingCampId) return;
  currentPairsList = autoGeneratePairs(activePairingCampId);
  renderPairingCards();
  showToast("Пары пересчитаны!", "info");
}

export async function saveFormedPairs() {
  if (!activePairingCampId) return;
  await saveRecord('camps', activePairingCampId, { formedPairs: currentPairsList });
  showToast("Связки пар зафиксированы в слёте!", "success");
  closePairingModal();
}