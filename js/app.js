import { initStorageAndFirebase, state, saveRecord, deleteRecord } from './db.js';
import { ROLE_WEIGHTS } from './config.js';
import { formatCampDateRange } from './calc.js';
import { pickFromContacts, handleVcfFileSelected } from './contacts.js';
import { exportXLSX } from './export.js';
import { initGrantProjectDemo, renderSchoolQuotasCheckin } from './grant.js';
import { 
  openSmartPairingModal, 
  closePairingModal, 
  generateAutoPairs, 
  saveFormedPairs 
} from './pairing.js';
import { 
  checkGuestUrlParams, 
  submitGuestFeedback, 
  openQrModal, 
  closeQrModal, 
  switchQrType, 
  copyQrLink, 
  openSurveyOnCurrentDevice 
} from './survey.js';
import { 
  showToast, 
  showConfirmDialog, 
  switchTab, 
  updateAllViews, 
  renderStaffRegistry, 
  setSort, 
  viewDossier, 
  closeDossierModal, 
  viewCampDossier, 
  closeCampDossierModal,
  openRosterModal,
  closeRosterModal,
  renderRosterModalContent,
  addSelectedStaffToRoster,
  removeStaffFromRoster,
  activeRosterCampId,
  setActiveRosterCampId
} from './ui.js';

let evalSessionCampId = null;
let evalSessionStaffId = null;
let evalSessionExistingDocId = null;

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  checkGuestUrlParams();

  initStorageAndFirebase(
    () => {
      initGrantProjectDemo();
      updateAllViews();
    },
    (isOnline) => {
      const text = document.getElementById('cloudStatusText');
      const dot = document.getElementById('cloudStatusDot');
      if (text && dot) {
        text.textContent = isOnline ? 'Cloud Firestore' : 'Локальный режим';
        dot.className = isOnline ? 'w-2 h-2 rounded-full bg-emerald-400' : 'w-2 h-2 rounded-full bg-amber-400';
      }
    }
  );

  setupRoleDropdowns();
  bindDOMEvents();
});

function setupRoleDropdowns() {
  const staffRoleSelect = document.getElementById('staffPrimaryRoleInput');
  const evalRoleSelect = document.getElementById('evalRoleSelect');
  const roleHtml = Object.entries(ROLE_WEIGHTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  if (staffRoleSelect) staffRoleSelect.innerHTML = roleHtml;
  if (evalRoleSelect) evalRoleSelect.innerHTML = roleHtml;
}

function bindDOMEvents() {
  // Навигация
  document.getElementById('tabBtn-registry')?.addEventListener('click', () => switchTab('registry'));
  document.getElementById('tabBtn-camps')?.addEventListener('click', () => switchTab('camps'));
  document.getElementById('tabBtn-grant')?.addEventListener('click', () => switchTab('grant'));
  document.getElementById('tabBtn-mts')?.addEventListener('click', () => switchTab('mts'));

  document.getElementById('btnStartEvalHeader')?.addEventListener('click', () => startEvaluationFlow());
  document.getElementById('btnExportXlsx')?.addEventListener('click', () => exportXLSX(state.staff, state.camps, state.evaluations));

  // Поиск и сортировка
  document.getElementById('searchInput')?.addEventListener('input', () => renderStaffRegistry());
  document.getElementById('roleFilter')?.addEventListener('change', () => renderStaffRegistry());
  document.getElementById('sortSelect')?.addEventListener('change', () => renderStaffRegistry());
  document.getElementById('sortHeadName')?.addEventListener('click', () => setSort('name_asc'));
  document.getElementById('sortHeadCamps')?.addEventListener('click', () => setSort('camps_desc'));
  document.getElementById('sortHeadPed')?.addEventListener('click', () => setSort('ped_desc'));
  document.getElementById('sortHeadOrg')?.addEventListener('click', () => setSort('org_desc'));
  document.getElementById('sortHeadTech')?.addEventListener('click', () => setSort('tech_desc'));
  document.getElementById('sortHeadK')?.addEventListener('click', () => setSort('k_desc'));

  // Сотрудники
  document.getElementById('btnOpenAddStaff')?.addEventListener('click', () => openStaffModal());
  document.getElementById('btnCloseStaffModal')?.addEventListener('click', () => closeStaffModal());
  document.getElementById('btnCancelStaffModal')?.addEventListener('click', () => closeStaffModal());
  document.getElementById('staffForm')?.addEventListener('submit', handleStaffSubmit);
  document.getElementById('btnPickContacts')?.addEventListener('click', pickFromContacts);
  document.getElementById('vcfContactInput')?.addEventListener('change', handleVcfFileSelected);

  // Слёты
  document.getElementById('btnOpenAddCamp')?.addEventListener('click', () => openCampModal());
  document.getElementById('btnCloseCampModal')?.addEventListener('click', () => closeCampModal());
  document.getElementById('btnCancelCampModal')?.addEventListener('click', () => closeCampModal());
  document.getElementById('campForm')?.addEventListener('submit', handleCampSubmit);

  // Состав слёта (Ростер)
  document.getElementById('btnCloseRosterModal')?.addEventListener('click', () => closeRosterModal());
  document.getElementById('btnAddStaffToRoster')?.addEventListener('click', addSelectedStaffToRoster);
  document.getElementById('rosterSortSelect')?.addEventListener('change', () => renderRosterModalContent(activeRosterCampId));
  document.getElementById('btnOpenPairingFromRoster')?.addEventListener('click', () => openSmartPairingModal(activeRosterCampId));

  // Оценка Шаг 1 и 2
  document.getElementById('step1CampSelect')?.addEventListener('change', checkStep1EvaluationStatus);
  document.getElementById('step1StaffSelect')?.addEventListener('change', checkStep1EvaluationStatus);
  document.getElementById('step1ProceedBtn')?.addEventListener('click', proceedToEvaluationFields);
  document.getElementById('btnCloseEvalSelectModal')?.addEventListener('click', closeEvalSelectModal);
  document.getElementById('btnCancelEvalSelect')?.addEventListener('click', closeEvalSelectModal);
  document.getElementById('btnBackToStep1')?.addEventListener('click', backToStep1Selection);
  document.getElementById('btnCloseEvalModal')?.addEventListener('click', closeEvaluationModal);
  document.getElementById('evalWizardForm')?.addEventListener('submit', saveEvaluation);
  document.getElementById('deleteCurrentEvalBtn')?.addEventListener('click', deleteCurrentEvaluationFromModal);

  // Ползунки
  ['D', 'A', 'S', 'T', 'F', 'L'].forEach(v => {
    document.getElementById(`slider_${v}`)?.addEventListener('input', calculateWizardScore);
  });
  document.getElementById('slider_360_partner')?.addEventListener('input', calculateWizardScore);
  document.getElementById('slider_360_squad')?.addEventListener('input', calculateWizardScore);
  document.getElementById('evalRoleSelect')?.addEventListener('change', calculateWizardScore);
  document.getElementById('eval360Mode')?.addEventListener('change', toggle360Panel);
  ['modSolo', 'modHardAge', 'modSaveCamp', 'penLate', 'penDisrupt', 'stopFactor'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', calculateWizardScore);
  });

  // Модальные окна досье
  document.getElementById('btnCloseDossierModal')?.addEventListener('click', closeDossierModal);
  document.getElementById('btnCloseCampDossierModal')?.addEventListener('click', closeCampDossierModal);

  // Подбор пар
  document.getElementById('btnClosePairingModal')?.addEventListener('click', closePairingModal);
  document.getElementById('btnCancelPairing')?.addEventListener('click', closePairingModal);
  document.getElementById('btnRegeneratePairs')?.addEventListener('click', generateAutoPairs);
  document.getElementById('btnSavePairing')?.addEventListener('click', saveFormedPairs);

  // QR Modal
  document.getElementById('btnCloseQrModal')?.addEventListener('click', closeQrModal);
  document.getElementById('qrBtnTypePartner')?.addEventListener('click', () => switchQrType('partner'));
  document.getElementById('qrBtnTypeSquad')?.addEventListener('click', () => switchQrType('squad'));
  document.getElementById('btnCopyQrLink')?.addEventListener('click', copyQrLink);
  document.getElementById('btnOpenSurveyDevice')?.addEventListener('click', openSurveyOnCurrentDevice);

  // Гостевой опрос
  document.getElementById('guestFeedbackForm')?.addEventListener('submit', submitGuestFeedback);

  // График ночных дежурств
  document.getElementById('btnOpenNightShiftModal')?.addEventListener('click', openNightShiftModal);
  document.getElementById('btnCloseNightShiftModal')?.addEventListener('click', closeNightShiftModal);
  document.getElementById('btnSaveNightShifts')?.addEventListener('click', saveNightShifts);
}

// Управление ночными дежурствами на матах
function openNightShiftModal() {
  const container = document.getElementById('nightShiftTable');
  container.innerHTML = '';
  const shifts = [
    { time: "23:00 – 01:00", lead: "Дьячков В.Е.", squad: "Вожатые 1 и 2 отрядов" },
    { time: "01:00 – 03:00", lead: "Кузнецов Н.С.", squad: "Вожатые 3 и 4 отрядов" },
    { time: "03:00 – 05:00", lead: "Дежурный организатор", squad: "Ночной дежурный вожатый" },
    { time: "05:00 – 07:00", lead: "Корнеева С.Д.", squad: "Подъём и медконтроль" }
  ];

  shifts.forEach((s, idx) => {
    const item = document.createElement('div');
    item.className = 'flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-700 text-xs';
    item.innerHTML = `
      <span class="font-bold text-amber-300">${s.time}</span>
      <span class="text-white">${s.lead}</span>
      <span class="text-slate-400">${s.squad}</span>
    `;
    container.appendChild(item);
  });

  document.getElementById('nightShiftModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeNightShiftModal() {
  document.getElementById('nightShiftModal').classList.add('hidden');
}

function saveNightShifts() {
  showToast("График дежурств на слёте сохранён!", "success");
  closeNightShiftModal();
}

// Замена из резерва школы
function replaceFromReserve(schoolName) {
  showToast(`Запасной участник из резерва школы «${schoolName}» зачислен в отряд!`, "success");
  renderSchoolQuotasCheckin();
}

// Работа мастера оценки
function startEvaluationFlow(campId = null, staffId = null) {
  if (state.camps.length === 0) {
    showToast("Сначала создайте слёт!", "error");
    return;
  }
  if (state.staff.length === 0) {
    showToast("Сначала добавьте сотрудника!", "error");
    return;
  }

  const campSelect = document.getElementById('step1CampSelect');
  const staffSelect = document.getElementById('step1StaffSelect');

  campSelect.innerHTML = state.camps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (campId && state.camps.some(c => c.id === campId)) campSelect.value = campId;

  staffSelect.innerHTML = state.staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (staffId && state.staff.some(s => s.id === staffId)) staffSelect.value = staffId;

  checkStep1EvaluationStatus();
  document.getElementById('evalSelectModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeEvalSelectModal() {
  document.getElementById('evalSelectModal').classList.add('hidden');
}

function checkStep1EvaluationStatus() {
  const campId = document.getElementById('step1CampSelect').value;
  const staffId = document.getElementById('step1StaffSelect').value;
  const statusBox = document.getElementById('step1StatusBox');
  const proceedBtn = document.getElementById('step1ProceedBtn');

  if (!campId || !staffId) {
    statusBox.className = 'hidden';
    return;
  }

  const existing = state.evaluations.find(e => e.campId === campId && e.staffId === staffId);
  if (existing) {
    statusBox.className = 'p-3 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-200 text-xs';
    statusBox.innerHTML = `⭐ Оценка за слёт уже выставлена (K = ${existing.finalScore}). Данные будут загружены для изменения.`;
    proceedBtn.innerHTML = `<span>Редактировать</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  } else {
    statusBox.className = 'p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/40 text-indigo-200 text-xs';
    statusBox.innerHTML = `Новая аттестация за слёт. Откроется стандартный бланк.`;
    proceedBtn.innerHTML = `<span>Далее</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  }
  lucide.createIcons();
}

function proceedToEvaluationFields() {
  evalSessionCampId = document.getElementById('step1CampSelect').value;
  evalSessionStaffId = document.getElementById('step1StaffSelect').value;

  closeEvalSelectModal();

  const camp = state.camps.find(c => c.id === evalSessionCampId);
  const staff = state.staff.find(s => s.id === evalSessionStaffId);

  document.getElementById('evalTargetCampName').textContent = camp ? camp.name : 'Слёт';
  document.getElementById('evalTargetStaffName').textContent = staff ? staff.name : 'Сотрудник';
  document.getElementById('evalModalHeaderSubtitle').textContent = `${camp?.name} • ${staff?.name}`;

  const existing = state.evaluations.find(e => e.campId === evalSessionCampId && e.staffId === evalSessionStaffId);
  const modeBadge = document.getElementById('evalModeBadge');
  const deleteBtn = document.getElementById('deleteCurrentEvalBtn');

  if (existing) {
    evalSessionExistingDocId = existing.id;
    modeBadge.textContent = 'Обновление';
    modeBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-500/50';
    deleteBtn.classList.remove('hidden');

    document.getElementById('evalRoleSelect').value = existing.role || staff?.primaryRole || 'counselor';
    ['D', 'A', 'S', 'T', 'F', 'L'].forEach(v => {
      document.getElementById(`slider_${v}`).value = existing.vectors?.[v] ?? 4.0;
    });

    document.getElementById('modSolo').checked = !!existing.modifiers?.solo;
    document.getElementById('modHardAge').checked = !!existing.modifiers?.hardAge;
    document.getElementById('modSaveCamp').checked = !!existing.modifiers?.saveCamp;
    document.getElementById('penLate').checked = !!existing.penalties?.late;
    document.getElementById('penDisrupt').checked = !!existing.penalties?.disrupt;
    document.getElementById('stopFactor').checked = !!existing.isStop;

    document.getElementById('eval360Mode').checked = !!existing.is360;
    if (existing.eval360) {
      document.getElementById('slider_360_partner').value = existing.eval360.partnerScore ?? 4.0;
      document.getElementById('slider_360_squad').value = existing.eval360.squadScore ?? 4.5;
    }
  } else {
    evalSessionExistingDocId = null;
    modeBadge.textContent = 'Новая';
    modeBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/50';
    deleteBtn.classList.add('hidden');

    document.getElementById('evalRoleSelect').value = staff?.primaryRole || 'counselor';
    ['D', 'A', 'S', 'T', 'F', 'L'].forEach(v => {
      document.getElementById(`slider_${v}`).value = 4.0;
    });
    document.getElementById('eval360Mode').checked = false;
  }

  toggle360Panel();
  calculateWizardScore();
  document.getElementById('evalModal').classList.remove('hidden');
  lucide.createIcons();
}

function backToStep1Selection() {
  closeEvaluationModal();
  startEvaluationFlow(evalSessionCampId, evalSessionStaffId);
}

function closeEvaluationModal() {
  document.getElementById('evalModal').classList.add('hidden');
}

function toggle360Panel() {
  const is360 = document.getElementById('eval360Mode').checked;
  document.getElementById('panel360Controls').classList.toggle('hidden', !is360);
  calculateWizardScore();
}

function calculateWizardScore() {
  const role = document.getElementById('evalRoleSelect').value;
  const w = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.counselor;
  document.getElementById('roleFormulaLabel').textContent = w.label;

  const D = parseFloat(document.getElementById('slider_D').value);
  const A = parseFloat(document.getElementById('slider_A').value);
  const S = parseFloat(document.getElementById('slider_S').value);
  const T = parseFloat(document.getElementById('slider_T').value);
  const F = parseFloat(document.getElementById('slider_F').value);
  const L = parseFloat(document.getElementById('slider_L').value);

  document.getElementById('val_D').textContent = D.toFixed(1);
  document.getElementById('val_A').textContent = A.toFixed(1);
  document.getElementById('val_S').textContent = S.toFixed(1);
  document.getElementById('val_T').textContent = T.toFixed(1);
  document.getElementById('val_F').textContent = F.toFixed(1);
  document.getElementById('val_L').textContent = L.toFixed(1);

  const curatorScore = (D * w.D) + (A * w.A) + (S * w.S) + (T * w.T) + (F * w.F) + (L * w.L);
  document.getElementById('val_360_curator').textContent = curatorScore.toFixed(2);
  document.getElementById('bar_360_curator').style.width = `${Math.min(100, (curatorScore / 5) * 100)}%`;

  if (document.getElementById('stopFactor').checked) {
    document.getElementById('wizardKResult').textContent = "0.00";
    document.getElementById('wizardKBadge').textContent = "СТОП-ЛИСТ";
    return;
  }

  let final = curatorScore;
  if (document.getElementById('eval360Mode').checked) {
    const p = parseFloat(document.getElementById('slider_360_partner').value);
    const sq = parseFloat(document.getElementById('slider_360_squad').value);
    document.getElementById('val_360_partner').textContent = p.toFixed(1);
    document.getElementById('val_360_squad').textContent = sq.toFixed(1);
    final = (curatorScore * 0.45) + (p * 0.30) + (sq * 0.25);
  }

  if (document.getElementById('modSolo').checked) final += 0.30;
  if (document.getElementById('modHardAge').checked) final += 0.20;
  if (document.getElementById('modSaveCamp').checked) final += 0.20;
  if (document.getElementById('penLate').checked) final -= 0.30;
  if (document.getElementById('penDisrupt').checked) final -= 0.40;

  final = Math.max(1.0, Math.min(5.0, final));
  document.getElementById('wizardKResult').textContent = final.toFixed(2);
}

async function saveEvaluation(e) {
  e.preventDefault();
  const campId = evalSessionCampId;
  const staffId = evalSessionStaffId;
  const isStop = document.getElementById('stopFactor').checked;
  const is360 = document.getElementById('eval360Mode').checked;

  const evalData = {
    staffId,
    campId,
    role: document.getElementById('evalRoleSelect').value,
    finalScore: isStop ? 0.00 : parseFloat(document.getElementById('wizardKResult').textContent),
    isStop,
    is360,
    vectors: {
      D: parseFloat(document.getElementById('slider_D').value),
      A: parseFloat(document.getElementById('slider_A').value),
      S: parseFloat(document.getElementById('slider_S').value),
      T: parseFloat(document.getElementById('slider_T').value),
      F: parseFloat(document.getElementById('slider_F').value),
      L: parseFloat(document.getElementById('slider_L').value)
    },
    eval360: is360 ? {
      curatorScore: parseFloat(document.getElementById('val_360_curator').textContent),
      partnerScore: parseFloat(document.getElementById('slider_360_partner').value),
      squadScore: parseFloat(document.getElementById('slider_360_squad').value)
    } : null,
    timestamp: Date.now()
  };

  const camp = state.camps.find(c => c.id === campId);
  if (camp && (!camp.roster || !camp.roster.includes(staffId))) {
    camp.roster = [...(camp.roster || []), staffId];
    await saveRecord('camps', campId, { roster: camp.roster });
  }

  await saveRecord('evaluations', evalSessionExistingDocId || null, evalData);
  showToast("Оценка успешно зафиксирована!", "success");
  closeEvaluationModal();
  updateAllViews();
}

function deleteEvaluation(evalId) {
  showConfirmDialog({
    title: "Удалить оценку?",
    message: "Баллы за данный слёт будут стёрты, а общий K пересчитан.",
    onConfirm: async () => {
      await deleteRecord('evaluations', evalId);
      showToast("Оценка удалена", "info");
      updateAllViews();
      if (activeRosterCampId) renderRosterModalContent(activeRosterCampId);
    }
  });
}

function deleteCurrentEvaluationFromModal() {
  if (evalSessionExistingDocId) {
    deleteEvaluation(evalSessionExistingDocId);
    closeEvaluationModal();
  }
}

// CRUD Персонала
function openStaffModal(staffId = null) {
  document.getElementById('staffEditId').value = staffId || '';
  if (staffId) {
    const s = state.staff.find(i => i.id === staffId);
    document.getElementById('staffNameInput').value = s.name || '';
    document.getElementById('staffNicknameInput').value = s.nickname || '';
    document.getElementById('staffPrimaryRoleInput').value = s.primaryRole || 'counselor';
    document.getElementById('staffContactInput').value = s.contact || '';
  } else {
    document.getElementById('staffForm').reset();
  }
  document.getElementById('staffModal').classList.remove('hidden');
}

function closeStaffModal() {
  document.getElementById('staffModal').classList.add('hidden');
}

async function handleStaffSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('staffEditId').value;
  const data = {
    name: document.getElementById('staffNameInput').value.trim(),
    nickname: document.getElementById('staffNicknameInput').value.trim(),
    primaryRole: document.getElementById('staffPrimaryRoleInput').value,
    contact: document.getElementById('staffContactInput').value.trim()
  };
  await saveRecord('staff', id || null, data);
  showToast("Сотрудник сохранён!");
  closeStaffModal();
  updateAllViews();
}

function deleteStaff(staffId) {
  showConfirmDialog({
    title: "Удалить сотрудника?",
    message: "Человек и вся история его смен будут удалены.",
    onConfirm: async () => {
      await deleteRecord('staff', staffId);
      updateAllViews();
      showToast("Удалено", "info");
    }
  });
}

// CRUD Слётов
function openCampModal(campId = null) {
  document.getElementById('campEditId').value = campId || '';
  if (campId) {
    const c = state.camps.find(i => i.id === campId);
    document.getElementById('campNameInput').value = c.name || '';
    document.getElementById('campLocationInput').value = c.location || '';
    document.getElementById('campStartDateInput').value = c.startDate || '';
    document.getElementById('campEndDateInput').value = c.endDate || '';
  } else {
    document.getElementById('campForm').reset();
  }
  document.getElementById('campModal').classList.remove('hidden');
}

function closeCampModal() {
  document.getElementById('campModal').classList.add('hidden');
}

async function handleCampSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('campEditId').value;
  const data = {
    name: document.getElementById('campNameInput').value.trim(),
    location: document.getElementById('campLocationInput').value.trim(),
    startDate: document.getElementById('campStartDateInput').value,
    endDate: document.getElementById('campEndDateInput').value
  };
  await saveRecord('camps', id || null, data);
  showToast("Слёт сохранён!");
  closeCampModal();
  updateAllViews();
}

function deleteCamp(campId) {
  showConfirmDialog({
    title: "Удалить слёт?",
    message: "Все выставленные на нём оценки будут аннулированы.",
    onConfirm: async () => {
      await deleteRecord('camps', campId);
      updateAllViews();
      showToast("Слёт удалён", "info");
    }
  });
}

// Экспорт всех методов в глобальную область window.app для предотвращения ошибок вызова из шаблонов
window.app = {
  viewDossier,
  closeDossierModal,
  viewCampDossier,
  closeCampDossierModal,
  openRosterModal,
  closeRosterModal,
  addSelectedStaffToRoster,
  removeStaffFromRoster,
  openStaffModal,
  deleteStaff,
  openCampModal,
  deleteCamp,
  startEvaluationFlow,
  deleteEvaluation,
  openQrModal,
  replaceFromReserve
};