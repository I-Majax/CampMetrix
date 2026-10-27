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
    currentPairsList = autoGeneratePairsForCamp(campId);
  }

  renderPairingCards();
  document.getElementById('pairingModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closePairingModal() {
  activePairingCampId = null;
  document.getElementById('pairingModal').classList.add('hidden');
}

export function autoGeneratePairsForCamp(campId) {
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
  const pairedIds = new Set();

  while (seniorPool.length > 0 && juniorPool.length > 0) {
    const senior = seniorPool.shift();
    const junior = juniorPool.shift();
    pairedIds.add(senior.staff.id);
    pairedIds.add(junior.staff.id);

    const compatibility = calculatePairCompatibility(senior, junior);
    pairs.push({
      id1: senior.staff.id,
      id2: junior.staff.id,
      score: compatibility.score,
      tag: compatibility.tag,
      desc: compatibility.desc
    });
  }

  const remaining = [...seniorPool, ...juniorPool];
  for (let i = 0; i < remaining.length; i += 2) {
    if (i + 1 < remaining.length) {
      const p1 = remaining[i];
      const p2 = remaining[i + 1];
      pairedIds.add(p1.staff.id);
      pairedIds.add(p2.staff.id);
      const comp = calculatePairCompatibility(p1, p2);
      pairs.push({
        id1: p1.staff.id,
        id2: p2.staff.id,
        score: comp.score,
        tag: comp.tag,
        desc: comp.desc
      });
    }
  }

  return pairs;
}

function calculatePairCompatibility(p1, p2) {
  const v1 = p1.m.avgVectors;
  const v2 = p2.m.avgVectors;

  const safetySum = (v1.S || 4.0) + (v2.S || 4.0);

  let score = 85;
  let tag = "Хорошая связка";
  let desc = "Сбалансированная нагрузка по отряду";

  if (safetySum < 7.0) {
    score = 65;
    tag = "Зона риска по ТБ";
    desc = "Оба вожатых имеют слабый контроль безопасности. Требуется кураторский надзор.";
  } else if (p1.m.overallK >= 4.2 && p2.m.count <= 1) {
    score = 96;
    tag = "Идеальный баланс: Наставник + Стажёр";
    desc = "Опытный вожатый обеспечивает контроль, новичок заряжает энергией.";
  } else if (Math.abs((v1.D || 4) - (v2.A || 4)) < 1.0) {
    score = 92;
    tag = "Тайминг + Творчество";
    desc = "Отличная комплементарность регламента и работы с детским залом.";
  }

  return { score, tag, desc };
}

export function renderPairingCards() {
  const container = document.getElementById('pairingCardsContainer');
  container.innerHTML = '';

  if (currentPairsList.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">Недостаточно вожатых для формирования пар.</div>';
    return;
  }

  currentPairsList.forEach((pair, idx) => {
    const s1 = state.staff.find(s => s.id === pair.id1);
    const s2 = state.staff.find(s => s.id === pair.id2);
    if (!s1 || !s2) return;

    const m1 = calculateStaffMultiCampK(s1.id);
    const m2 = calculateStaffMultiCampK(s2.id);

    const card = document.createElement('div');
    card.className = 'bg-slate-900/80 border border-slate-700/80 p-3.5 rounded-2xl space-y-2.5';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-white flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 flex items-center justify-center text-[10px]">${idx + 1}</span>
          Пара отряда #${idx + 1}
        </span>
        <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${pair.score >= 90 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : (pair.score >= 75 ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40')}">
          Совместимость ${pair.score}% • ${pair.tag}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <div class="font-bold text-white">${s1.name}</div>
            <div class="text-[10px] text-slate-400">${ROLE_WEIGHTS[s1.primaryRole]?.label || s1.primaryRole}</div>
          </div>
          <span class="font-extrabold text-sm text-indigo-400">K = ${m1.overallK || '—'}</span>
        </div>

        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <div class="font-bold text-white">${s2.name}</div>
            <div class="text-[10px] text-slate-400">${ROLE_WEIGHTS[s2.primaryRole]?.label || s2.primaryRole}</div>
          </div>
          <span class="font-extrabold text-sm text-indigo-400">K = ${m2.overallK || '—'}</span>
        </div>
      </div>

      <p class="text-[11px] text-slate-400 leading-tight">${pair.desc}</p>
    `;
    container.appendChild(card);
  });
}

export function generateAutoPairs() {
  if (!activePairingCampId) return;
  currentPairsList = autoGeneratePairsForCamp(activePairingCampId);
  renderPairingCards();
  showToast("Пары пересчитаны по компетенциям", "info");
}

export async function saveFormedPairs() {
  if (!activePairingCampId) return;
  const camp = state.camps.find(c => c.id === activePairingCampId);
  if (!camp) return;

  camp.formedPairs = currentPairsList;
  await saveRecord('camps', activePairingCampId, { formedPairs: currentPairsList });
  showToast("Связки пар успешно зафиксированы в слёте!", "success");
  closePairingModal();
}