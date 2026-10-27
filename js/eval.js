import { state, saveRecord } from './db.js';
import { ROLE_WEIGHTS } from './config.js';
import { showToast } from './ui.js';

let evalSession = { campId: null, staffId: null, step: 1 };

// Открытие пошагового визарда
export function openEvaluationWizard(campId, staffId) {
  evalSession = { campId, staffId, step: 1 };
  renderWizardModal();
}

function renderWizardModal() {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div id="evalWizardBackdrop" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto touch-scroll">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Оценка за слёт</h3>
            <p class="text-[11px] text-slate-400" id="wizardStepDesc">Шаг 1 из 3: Выбор смены и роли</p>
          </div>
          <button onclick="document.getElementById('evalWizardBackdrop').remove()" class="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <form id="wizardInnerForm" class="space-y-4">
          <!-- Шаг 1: Выбор слёта и сотрудника -->
          <div id="wizardStep1" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Слёт / Смена</label>
              <select id="wCampSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white">
                ${state.camps.map(c => `<option value="${c.id}" ${c.id === evalSession.campId ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Сотрудник</label>
              <select id="wStaffSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white">
                ${state.staff.map(s => `<option value="${s.id}" ${s.id === evalSession.staffId ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Роль на этой смене</label>
              <select id="wRoleSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white">
                ${Object.entries(ROLE_WEIGHTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Шаг 2: Базовые компетенции -->
          <div id="wizardStep2" class="hidden space-y-3.5">
            <div class="space-y-1">
              <div class="flex justify-between text-xs"><span class="text-slate-300">Дисциплина и тайминг</span><span id="vD" class="font-bold text-indigo-400">4.5</span></div>
              <input type="range" id="sD" min="1" max="5" step="0.5" value="4.5" oninput="document.getElementById('vD').textContent=this.value" class="w-full accent-indigo-500">
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs"><span class="text-slate-300">Работа с детьми / залом</span><span id="vA" class="font-bold text-indigo-400">4.5</span></div>
              <input type="range" id="sA" min="1" max="5" step="0.5" value="4.5" oninput="document.getElementById('vA').textContent=this.value" class="w-full accent-indigo-500">
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs"><span class="text-slate-300">Безопасность и контроль ТБ</span><span id="vS" class="font-bold text-indigo-400">4.8</span></div>
              <input type="range" id="sS" min="1" max="5" step="0.5" value="4.8" oninput="document.getElementById('vS').textContent=this.value" class="w-full accent-indigo-500">
            </div>
          </div>

          <!-- Шаг 3: Команда, 360° и стоп-факторы -->
          <div id="wizardStep3" class="hidden space-y-3.5">
            <div class="space-y-1">
              <div class="flex justify-between text-xs"><span class="text-slate-300">Командность и партнерство</span><span id="vT" class="font-bold text-indigo-400">4.0</span></div>
              <input type="range" id="sT" min="1" max="5" step="0.5" value="4.0" oninput="document.getElementById('vT').textContent=this.value" class="w-full accent-indigo-500">
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs"><span class="text-slate-300">Стресс-тест и форс-мажор</span><span id="vF" class="font-bold text-indigo-400">4.0</span></div>
              <input type="range" id="sF" min="1" max="5" step="0.5" value="4.0" oninput="document.getElementById('vF').textContent=this.value" class="w-full accent-indigo-500">
            </div>
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 font-bold cursor-pointer">
              <input type="checkbox" id="wStopFactor" class="rounded accent-rose-600">
              <span>СТОП-ФАКТОР (Грубое ТБ, алкоголь) → K = 0</span>
            </label>
          </div>

          <!-- Кнопки навигации -->
          <div class="flex justify-between pt-2">
            <button type="button" id="wPrevBtn" class="hidden px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Назад</button>
            <button type="button" id="wNextBtn" class="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">Далее</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setupWizardEvents();
}

function setupWizardEvents() {
  const nextBtn = document.getElementById('wNextBtn');
  const prevBtn = document.getElementById('wPrevBtn');
  const stepDesc = document.getElementById('wizardStepDesc');

  nextBtn.onclick = async () => {
    if (evalSession.step === 1) {
      evalSession.step = 2;
      document.getElementById('wizardStep1').classList.add('hidden');
      document.getElementById('wizardStep2').classList.remove('hidden');
      prevBtn.classList.remove('hidden');
      stepDesc.textContent = "Шаг 2 из 3: Педагогика и безопасность";
    } else if (evalSession.step === 2) {
      evalSession.step = 3;
      document.getElementById('wizardStep2').classList.add('hidden');
      document.getElementById('wizardStep3').classList.remove('hidden');
      nextBtn.textContent = "Зафиксировать оценку";
      stepDesc.textContent = "Шаг 3 из 3: Команда и сдача смены";
    } else {
      // Сохранение оценки
      await finishEvaluation();
    }
  };

  prevBtn.onclick = () => {
    if (evalSession.step === 3) {
      evalSession.step = 2;
      document.getElementById('wizardStep3').classList.add('hidden');
      document.getElementById('wizardStep2').classList.remove('hidden');
      nextBtn.textContent = "Далее";
    } else if (evalSession.step === 2) {
      evalSession.step = 1;
      document.getElementById('wizardStep2').classList.add('hidden');
      document.getElementById('wizardStep1').classList.remove('hidden');
      prevBtn.classList.add('hidden');
    }
  };
}

async function finishEvaluation() {
  const campId = document.getElementById('wCampSelect').value;
  const staffId = document.getElementById('wStaffSelect').value;
  const role = document.getElementById('wRoleSelect').value;
  const isStop = document.getElementById('wStopFactor').checked;

  const D = parseFloat(document.getElementById('sD').value);
  const A = parseFloat(document.getElementById('sA').value);
  const S = parseFloat(document.getElementById('sS').value);
  const T = parseFloat(document.getElementById('sT').value);
  const F = parseFloat(document.getElementById('sF').value);

  const w = ROLE_WEIGHTS[role];
  const finalScore = isStop ? 0.00 : parseFloat(((D * w.D) + (A * w.A) + (S * w.S) + (T * w.T) + (F * w.F)).toFixed(2));

  await saveRecord('evaluations', null, {
    campId,
    staffId,
    role,
    finalScore,
    isStop,
    vectors: { D, A, S, T, F, L: 4.0 },
    timestamp: Date.now()
  });

  document.getElementById('evalWizardBackdrop').remove();
  showToast("Оценка успешно внесена в систему!", "success");
}