import { state } from './db.js';
import { ROLE_WEIGHTS } from './config.js';

export function formatCampDateRange(camp) {
  if (!camp) return 'Даты не указаны';

  if (camp.startDate && camp.endDate) {
    const s = new Date(camp.startDate);
    const e = new Date(camp.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const sDay = s.getDate();
      const eDay = e.getDate();
      const sMonth = s.toLocaleDateString('ru-RU', { month: 'short' });
      const eMonth = e.toLocaleDateString('ru-RU', { month: 'short' });
      const sYear = s.getFullYear();
      const eYear = e.getFullYear();

      if (sYear === eYear && sMonth === eMonth) {
        return `${sDay}–${eDay} ${eMonth} ${sYear}`;
      } else if (sYear === eYear) {
        return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYear}`;
      } else {
        return `${s.toLocaleDateString('ru-RU')} – ${e.toLocaleDateString('ru-RU')}`;
      }
    }
  } else if (camp.startDate) {
    const s = new Date(camp.startDate);
    if (!isNaN(s.getTime())) return `с ${s.toLocaleDateString('ru-RU')}`;
  }
  return camp.dates || 'Даты не указаны';
}

export function getCampEvaluations(campId) {
  const camp = state.camps.find(c => c.id === campId);
  const roster = Array.isArray(camp?.roster) ? camp.roster : [];
  const evals = state.evaluations.filter(e => e.campId === campId);

  const validMap = new Map();
  evals.forEach(ev => {
    const staffExists = state.staff.some(s => s.id === ev.staffId);
    const inRoster = roster.length === 0 || roster.includes(ev.staffId);
    if (staffExists && inRoster) {
      if (!validMap.has(ev.staffId) || (ev.timestamp || 0) > (validMap.get(ev.staffId).timestamp || 0)) {
        validMap.set(ev.staffId, ev);
      }
    }
  });
  return Array.from(validMap.values());
}

export function calculateStaffMultiCampK(staffId) {
  const rawEvals = state.evaluations.filter(e => e.staffId === staffId && state.camps.some(c => c.id === e.campId));

  const campEvalMap = new Map();
  rawEvals.forEach(ev => {
    const camp = state.camps.find(c => c.id === ev.campId);
    const roster = Array.isArray(camp?.roster) ? camp.roster : [];
    const inRoster = roster.length === 0 || roster.includes(staffId);
    if (inRoster) {
      if (!campEvalMap.has(ev.campId) || (ev.timestamp || 0) > (campEvalMap.get(ev.campId).timestamp || 0)) {
        campEvalMap.set(ev.campId, ev);
      }
    }
  });

  const evals = Array.from(campEvalMap.values());

  if (evals.length === 0) {
    return {
      overallK: 0,
      pedK: null,
      orgK: null,
      techK: null,
      trend: '—',
      count: 0,
      isStopListed: false,
      avgVectors: { D: 0, A: 0, S: 0, T: 0, F: 0, L: 0 }
    };
  }

  evals.sort((a, b) => {
    const campA = state.camps.find(c => c.id === a.campId);
    const campB = state.camps.find(c => c.id === b.campId);
    const timeA = (campA && campA.startDate) ? new Date(campA.startDate).getTime() : (a.timestamp || 0);
    const timeB = (campB && campB.startDate) ? new Date(campB.startDate).getTime() : (b.timestamp || 0);
    return timeA - timeB;
  });

  let isStopListed = false;
  const pedScores = [];
  const orgScores = [];
  const techScores = [];
  const vectorSums = { D: 0, A: 0, S: 0, T: 0, F: 0, L: 0 };

  evals.forEach(ev => {
    if (ev.finalScore === 0 || ev.isStop) isStopListed = true;
    const roleType = ROLE_WEIGHTS[ev.role]?.type || 'ped';
    if (roleType === 'ped') pedScores.push(ev.finalScore);
    else if (roleType === 'org') orgScores.push(ev.finalScore);
    else techScores.push(ev.finalScore);

    if (ev.vectors) {
      for (let k in vectorSums) {
        vectorSums[k] += (Number(ev.vectors[k]) || 4.0);
      }
    }
  });

  const calcWeightedK = (scores) => {
    if (!scores.length) return null;
    let totalW = 0;
    let weightedSum = 0;
    scores.forEach((s, idx) => {
      const w = 1.0 + (idx * 0.15);
      weightedSum += s * w;
      totalW += w;
    });
    return totalW > 0 ? parseFloat((weightedSum / totalW).toFixed(2)) : null;
  };

  const pedK = calcWeightedK(pedScores);
  const orgK = calcWeightedK(orgScores);
  const techK = calcWeightedK(techScores);

  let overallK = 0;
  if (isStopListed) {
    overallK = 0.00;
  } else {
    let totalW = 0;
    let weightedSum = 0;
    evals.forEach((ev, idx) => {
      const w = 1.0 + (idx * 0.15);
      weightedSum += ev.finalScore * w;
      totalW += w;
    });
    overallK = totalW > 0 ? parseFloat((weightedSum / totalW).toFixed(2)) : 0;
  }

  let trend = '—';
  if (evals.length >= 2) {
    const latestScore = evals[evals.length - 1].finalScore;
    const prevScore = evals[evals.length - 2].finalScore;
    const delta = parseFloat((latestScore - prevScore).toFixed(2));
    if (delta >= 0.15) trend = `↗ +${delta}`;
    else if (delta <= -0.15) trend = `↘ ${delta}`;
    else trend = '→ Стабильно';
  }

  const avgVectors = {};
  for (let k in vectorSums) {
    avgVectors[k] = parseFloat((vectorSums[k] / evals.length).toFixed(1));
  }

  return {
    overallK,
    pedK,
    orgK,
    techK,
    trend,
    count: evals.length,
    isStopListed,
    avgVectors
  };
}

export function getCategoryBadge(m) {
  if (m.isStopListed) {
    return { label: 'Стоп-лист', class: 'bg-rose-950/80 text-rose-300 border border-rose-600/50' };
  }
  if (m.count === 0) {
    return { label: 'Новичок', class: 'bg-slate-700/80 text-slate-300 border border-slate-600' };
  }
  if (m.overallK >= 4.3) {
    return { label: 'Золотой фонд', class: 'bg-amber-950/80 text-amber-300 border border-amber-500/50' };
  }
  if (m.overallK >= 3.6) {
    return { label: 'Основа', class: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' };
  }
  return { label: 'Зона риска', class: 'bg-rose-950/80 text-rose-300 border border-rose-500/50' };
}

export function getStrongestVector(v) {
  const names = { D: 'дисциплина и тайминг', A: 'работа с залом и детьми', S: 'техника безопасности', T: 'командная выручка', F: 'стрессоустойчивость', L: 'обучаемость' };
  let maxK = 'D';
  for (let k in v) { if (v[k] > v[maxK]) maxK = k; }
  return names[maxK];
}

export function getWeakestVector(v) {
  const names = { D: 'контроле тайминга', A: 'вовлечении неактивных детей', S: 'бдительности по ТБ', T: 'коммуникации в штабе', F: 'реакции на форс-мажоры', L: 'исправлении правок' };
  let minK = 'D';
  for (let k in v) { if (v[k] < v[minK]) minK = k; }
  return names[minK];
}