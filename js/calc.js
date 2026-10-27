import { state } from './db.js';
import { ROLE_WEIGHTS } from './config.js';

// Расчет накопительного K и тренда для сотрудника
export function calculateStaffMetrics(staffId) {
  const staffEvals = state.evaluations.filter(e => e.staffId === staffId);
  
  if (!staffEvals.length) {
    return { overallK: 0, count: 0, trend: '—', isStop: false, pedK: null, orgK: null, techK: null };
  }

  // Сортировка по времени проведения слёта
  staffEvals.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  let isStop = false;
  const ped = [];
  const org = [];
  const tech = [];

  staffEvals.forEach(e => {
    if (e.finalScore === 0 || e.isStop) isStop = true;
    const type = ROLE_WEIGHTS[e.role]?.type || 'ped';
    if (type === 'ped') ped.push(e.finalScore);
    else if (type === 'org') org.push(e.finalScore);
    else tech.push(e.finalScore);
  });

  const calcWeighted = (arr) => {
    if (!arr.length) return null;
    let sum = 0, weightTotal = 0;
    arr.forEach((val, idx) => {
      const w = 1 + (idx * 0.15); // Чем свежее слёт, тем выше вес
      sum += val * w;
      weightTotal += w;
    });
    return parseFloat((sum / weightTotal).toFixed(2));
  };

  const overallK = isStop ? 0.00 : calcWeighted(staffEvals.map(e => e.finalScore));

  // Тренд эффективности
  let trend = '—';
  if (staffEvals.length >= 2) {
    const diff = staffEvals[staffEvals.length - 1].finalScore - staffEvals[staffEvals.length - 2].finalScore;
    if (diff >= 0.15) trend = `↗ +${diff.toFixed(2)}`;
    else if (diff <= -0.15) trend = `↘ ${diff.toFixed(2)}`;
    else trend = '→ Стабильно';
  }

  return {
    overallK,
    count: staffEvals.length,
    trend,
    isStop,
    pedK: calcWeighted(ped),
    orgK: calcWeighted(org),
    techK: calcWeighted(tech)
  };
}

// Умный алгоритм подбора пар напарников
export function autoPairCounselors(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp || !camp.roster) return [];

  const candidates = state.staff
    .filter(s => camp.roster.includes(s.id) && ['counselor', 'trainee', 'lead'].includes(s.primaryRole))
    .map(s => ({ ...s, metrics: calculateStaffMetrics(s.id) }));

  // Пул опытных и начинающих
  const seniors = candidates.filter(c => c.metrics.overallK >= 4.0 || c.metrics.count >= 2);
  const juniors = candidates.filter(c => !seniors.includes(c));

  seniors.sort((a, b) => b.metrics.overallK - a.metrics.overallK);
  juniors.sort((a, b) => a.metrics.overallK - b.metrics.overallK);

  const pairs = [];
  while (seniors.length && juniors.length) {
    const s = seniors.shift();
    const j = juniors.shift();
    pairs.push({
      lead: s,
      partner: j,
      compatibility: 95,
      note: "Идеальный баланс: Опытный наставник + Стажёр"
    });
  }

  const remaining = [...seniors, ...juniors];
  for (let i = 0; i < remaining.length; i += 2) {
    if (i + 1 < remaining.length) {
      pairs.push({
        lead: remaining[i],
        partner: remaining[i + 1],
        compatibility: 80,
        note: "Рабочая связка"
      });
    }
  }

  return pairs;
}