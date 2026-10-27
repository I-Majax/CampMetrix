import { initStorageAndFirebase, state, saveRecord, deleteRecord } from './db.js';
import { ROLE_WEIGHTS } from './config.js';
import { formatCampDateRange } from './calc.js';
import { pickFromContacts, handleVcfFileSelected } from './contacts.js';
import { exportXLSX } from './export.js';
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
  renderRosterModalContent, 
  viewDossier, 
  closeDossierModal, 
  viewCampDossier, 
  closeCampDossierModal,
  activeRosterCampId,
  setActiveRosterCampId
} from './ui.js';

let evalSessionCampId = null;
let evalSessionStaffId = null;
let evalSessionExistingDocId = null;

// Инициализация системы
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  checkGuestUrlParams();

  initStorageAndFirebase(
    () => updateAllViews(),
    (isOnline) => {
      const text = document.getElementById('cloudStatusText');
      const dot = document.getElementById('cloudStatusDot');
      if (isOnline) {
        text.textContent = 'Cloud Firestore';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      } else {
        text.textContent = 'Локальный режим';
        dot.className = 'w-2 h-2 rounded-full bg-amber-400';
      }
    }
  );

  setupRoleDropdowns();
  bindDOMEvents();
});

function setupRoleDropdowns() {
  const select = document.getElementById('staffPrimaryRoleInput');
  if (select) {
    select.innerHTML = Object.entries(ROLE_WEIGHTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  }
}

function bindDOMEvents() {
  // Навигация
  document.getElementById('tabBtn-registry')?.addEventListener('click', () => switchTab('registry'));
  document.getElementById('tabBtn-camps')?.addEventListener('click', () => switchTab('camps'));
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

  // Состав слёта
  document.getElementById('btnCloseRosterModal')?.addEventListener('click', () => closeRosterModal());
  document.getElementById('btnAddStaffToRoster')?.addEventListener('click', addSelectedStaffToRoster);
  document.getElementById('rosterSortSelect')?.addEventListener('change', () => renderRosterModalContent(activeRosterCampId));
  document.getElementById('btnOpenPairingFromRoster')?.addEventListener('click', () => openSmartPairingModal(activeRosterCampId));

  // Оценка Шаг 1 и Шаг 2
  document.getElementById('step1CampSelect')?.addEventListener('change', checkStep1EvaluationStatus);
  document.getElementById('step1StaffSelect')?.addEventListener('change', checkStep1EvaluationStatus);
  document.getElementById('step1ProceedBtn')?.addEventListener('click', proceedToEvaluationFields);
  document.getElementById('btnCloseEvalSelectModal')?.addEventListener('click', closeEvalSelectModal);
  document.getElementById('btnCancelEvalSelect')?.addEventListener('click', closeEvalSelectModal);
  document.getElementById('btnBackToStep1')?.addEventListener('click', backToStep1Selection);
  document.getElementById('btnCloseEvalModal')?.addEventListener('click', closeEvaluationModal);
  document.getElementById('evalWizardForm')?.addEventListener('submit', saveEvaluation);
  document.getElementById('deleteCurrentEvalBtn')?.addEventListener('click', deleteCurrentEvaluationFromModal);

  // Слайдеры оценки
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
}

// Пошаговый визард оценки
function startEvaluationFlow(campId = null, staffId = null) {
  if (state.camps.length === 0) {
    showToast("Сначала создайте хотя бы один слёт!", "error");
    return;
  }
  if (state.staff.length === 0) {
    showToast("Сначала добавьте хотя бы одного сотрудника в базу!", "error");
    return;
  }

  const campSelect = document.getElementById('step1CampSelect');
  const staffSelect = document.getElementById('step1StaffSelect');

  campSelect.innerHTML = state.camps.map(c => `<option value="${c.id}">${c.name} (${formatCampDateRange(c)})</option>`).join('');
  if (campId && state.camps.some(c => c.id === campId)) campSelect.value = campId;

  staffSelect.innerHTML = state.staff.map(s => `<option value="${s.id}">${s.name || 'Без имени'} ${s.nickname ? '«'+s.nickname+'»' : ''} (${ROLE_WEIGHTS[s.primaryRole]?.label || s.primaryRole})</option>`).join('');
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
  const camp = state.camps.find(c => c.id === campId);
  const staff = state.staff.find(s => s.id === staffId);
  const roster = Array.isArray(camp?.roster) ? camp.roster : [];
  const isEnrolledInRoster = roster.includes(staffId);

  if (existing) {
    statusBox.className = 'p-3 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-200 text-xs leading-relaxed';
    statusBox.innerHTML = `
      <div class="font-bold flex items-center gap-1.5 text-amber-300">
        <i data-lucide="refresh-cw" class="w-4 h-4"></i> Оценка уже существует (K = ${existing.finalScore.toFixed(2)})
      </div>
      <div class="mt-1 text-[11px] text-amber-200/80">
        Для сотрудника <b>${staff?.name}</b> на этом слёте уже сохранены баллы. Они будут автоматически загружены для редактирования.
      </div>
    `;
    proceedBtn.innerHTML = `<span>Редактировать оценку</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  } else {
    statusBox.className = 'p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/40 text-indigo-200 text-xs leading-relaxed';
    statusBox.innerHTML = `
      <div class="font-bold flex items-center gap-1.5 text-indigo-300">
        <i data-lucide="sparkles" class="w-4 h-4"></i> Новая оценка
      </div>
      <div class="mt-1 text-[11px] text-indigo-200/80">
        Сотрудник <b>${staff?.name}</b> ещё не оценивался на слёте «${camp?.name}». Форма откроется со стандартными чистыми полями.
        ${!isEnrolledInRoster ? '<br><span class="text-indigo-400 mt-1 inline-block">⭐ При оценке сотрудник автоматически добавится в состав слёта.</span>' : ''}
      </div>
    `;
    proceedBtn.innerHTML = `<span>Далее к критериям</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  }
  lucide.createIcons();
}

function proceedToEvaluationFields() {
  evalSessionCampId = document.getElementById('step1CampSelect').value;
  evalSessionStaffId = document.getElementById('step1StaffSelect').value;

  if (!evalSessionCampId || !evalSessionStaffId) {
    showToast("Укажите слёт и сотрудника!", "error");
    return;
  }

  closeEvalSelectModal();

  const camp = state.camps.find(c => c.id === evalSessionCampId);
  const staff = state.staff.find(s => s.id === evalSessionStaffId);

  document.getElementById('evalTargetCampName').textContent = camp ? camp.name : 'Слёт';
  document.getElementById('evalTargetStaffName').textContent = staff ? staff.name : 'Сотрудник';
  document.getElementById('evalModalHeaderSubtitle').textContent = `${camp?.name} • ${staff?.name}`;

  const roleSelect = document.getElementById('evalRoleSelect');
  roleSelect.innerHTML = Object.entries(ROLE_WEIGHTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

  const existing = state.evaluations.find(e => e.campId === evalSessionCampId && e.staffId === evalSessionStaffId);
  const modeBadge = document.getElementById('evalModeBadge');
  const submitBtn = document.getElementById('saveEvalSubmitBtn');
  const deleteBtn = document.getElementById('deleteCurrentEvalBtn');

  if (existing) {
    evalSessionExistingDocId = existing.id;
    modeBadge.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-500/50';
    modeBadge.textContent = 'Обновление оценки';
    document.getElementById('evalModalHeaderTitle').textContent = 'Редактирование оценки';
    submitBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Обновить оценку`;
    deleteBtn.classList.remove('hidden');

    roleSelect.value = existing.role || staff?.primaryRole || 'counselor';

    const v = existing.vectors || { D: 4.0, A: 4.0, S: 4.5, T: 4.0, F: 4.0, L: 4.0 };
    document.getElementById('slider_D').value = v.D ?? 4.0;
    document.getElementById('slider_A').value = v.A ?? 4.0;
    document.getElementById('slider_S').value = v.S ?? 4.5;
    document.getElementById('slider_T').value = v.T ?? 4.0;
    document.getElementById('slider_F').value = v.F ?? 4.0;
    document.getElementById('slider_L').value = v.L ?? 4.0;

    document.getElementById('modSolo').checked = !!existing.modifiers?.solo;
    document.getElementById('modHardAge').checked = !!existing.modifiers?.hardAge;
    document.getElementById('modSaveCamp').checked = !!existing.modifiers?.saveCamp;
    document.getElementById('penLate').checked = !!existing.penalties?.late;
    document.getElementById('penDisrupt').checked = !!existing.penalties?.disrupt;
    document.getElementById('stopFactor').checked = !!existing.isStop;

    const is360 = !!existing.is360;
    document.getElementById('eval360Mode').checked = is360;
    if (existing.eval360) {
      document.getElementById('slider_360_partner').value = existing.eval360.partnerScore ?? 4.0;
      document.getElementById('slider_360_squad').value = existing.eval360.squadScore ?? 4.5;
    }

    toggle360Panel();
    showToast("Существующие оценки успешно подгружены", "info");
  } else {
    evalSessionExistingDocId = null;
    modeBadge.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/50';
    modeBadge.textContent = 'Новая оценка';
    document.getElementById('evalModalHeaderTitle').textContent = 'Новая оценка';
    submitBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Сохранить`;
    deleteBtn.classList.add('hidden');

    roleSelect.value = staff?.primaryRole || 'counselor';
    document.getElementById('slider_D').value = 4.0;
    document.getElementById('slider_A').value = 4.0;
    document.getElementById('slider_S').value = 4.5;
    document.getElementById('slider_T').value = 4.0;
    document.getElementById('slider_F').value = 4.0;
    document.getElementById('slider_L').value = 4.0;

    document.getElementById('modSolo').checked = false;
    document.getElementById('modHardAge').checked = false;
    document.getElementById('modSaveCamp').checked = false;
    document.getElementById('penLate').checked = false;
    document.getElementById('penDisrupt').checked = false;
    document.getElementById('stopFactor').checked = false;
    
    document.getElementById('eval360Mode').checked = false;
    document.getElementById('slider_360_partner').value = 4.0;
    document.getElementById('slider_360_squad').value = 4.5;
    toggle360Panel();
  }

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
  const panel = document.getElementById('panel360Controls');
  if (is360) panel.classList.remove('hidden');
  else panel.classList.add('hidden');
  calculateWizardScore();
  lucide.createIcons();
}

function calculateWizardScore() {
  const role = document.getElementById('evalRoleSelect').value;
  const roleInfo = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.counselor;
  document.getElementById('roleFormulaLabel').textContent = roleInfo.label;

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

  const curatorBaseScore = (D * roleInfo.D) + (A * roleInfo.A) + (S * roleInfo.S) + (T * roleInfo.T) + (F * roleInfo.F) + (L * roleInfo.L);
  document.getElementById('val_360_curator').textContent = curatorBaseScore.toFixed(2);
  document.getElementById('bar_360_curator').style.width = `${Math.min(100, (curatorBaseScore / 5) * 100)}%`;

  const isStop = document.getElementById('stopFactor').checked;
  if (isStop) {
    document.getElementById('wizardKResult').textContent = "0.00";
    const b = document.getElementById('wizardKBadge');
    b.className = "text-xs px-2.5 py-0.5 rounded-full bg-rose-900/80 text-rose-300 font-bold border border-rose-600";
    b.textContent = "СТОП-ЛИСТ (АННУЛИРОВАНО)";
    return;
  }

  let baseScore = curatorBaseScore;

  const is360 = document.getElementById('eval360Mode').checked;
  if (is360) {
    const partnerScore = parseFloat(document.getElementById('slider_360_partner').value);
    const squadScore = parseFloat(document.getElementById('slider_360_squad').value);

    document.getElementById('val_360_partner').textContent = partnerScore.toFixed(1);
    document.getElementById('val_360_squad').textContent = squadScore.toFixed(1);

    baseScore = (curatorBaseScore * 0.45) + (partnerScore * 0.30) + (squadScore * 0.25);
  }

  if (document.getElementById('modSolo').checked) baseScore += 0.30;
  if (document.getElementById('modHardAge').checked) baseScore += 0.20;
  if (document.getElementById('modSaveCamp').checked) baseScore += 0.20;

  if (document.getElementById('penLate').checked) baseScore -= 0.30;
  if (document.getElementById('penDisrupt').checked) baseScore -= 0.40;

  baseScore = Math.max(1.0, Math.min(5.0, baseScore));
  const finalScore = parseFloat(baseScore.toFixed(2));

  document.getElementById('wizardKResult').textContent = finalScore.toFixed(2);
  const badge = document.getElementById('wizardKBadge');

  if (finalScore >= 4.3) {
    badge.className = "text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30";
    badge.textContent = "Золотой фонд";
  } else if (finalScore >= 3.6) {
    badge.className = "text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30";
    badge.textContent = "Основа команды";
  } else {
    badge.className = "text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30";
    badge.textContent = "Зона риска";
  }
}

async function saveEvaluation(e) {
  e.preventDefault();
  const campId = evalSessionCampId;
  const staffId = evalSessionStaffId;
  const role = document.getElementById('evalRoleSelect').value;
  const isStop = document.getElementById('stopFactor').checked;
  const is360 = document.getElementById('eval360Mode').checked;

  if (!campId || !staffId) {
    showToast("Ошибка сессии оценки!", "error");
    return;
  }

  const score = isStop ? 0 : parseFloat(document.getElementById('wizardKResult').textContent);
  const evalData = {
    staffId,
    campId,
    role,
    finalScore: score,
    vectors: {
      D: parseFloat(document.getElementById('slider_D').value),
      A: parseFloat(document.getElementById('slider_A').value),
      S: parseFloat(document.getElementById('slider_S').value),
      T: parseFloat(document.getElementById('slider_T').value),
      F: parseFloat(document.getElementById('slider_F').value),
      L: parseFloat(document.getElementById('slider_L').value)
    },
    modifiers: {
      solo: document.getElementById('modSolo').checked,
      hardAge: document.getElementById('modHardAge').checked,
      saveCamp: document.getElementById('modSaveCamp').checked
    },
    penalties: {
      late: document.getElementById('penLate').checked,
      disrupt: document.getElementById('penDisrupt').checked
    },
    isStop,
    is360,
    eval360: is360 ? {
      curatorScore: parseFloat(document.getElementById('val_360_curator').textContent),
      partnerScore: parseFloat(document.getElementById('slider_360_partner').value),
      squadScore: parseFloat(document.getElementById('slider_360_squad').value)
    } : null,
    timestamp: Date.now()
  };

  const camp = state.camps.find(c => c.id === campId);
  const roster = Array.isArray(camp?.roster) ? camp.roster : [];
  if (camp && !roster.includes(staffId)) {
    camp.roster = [...roster, staffId];
    await saveRecord('camps', campId, { roster: camp.roster });
  }

  const existing = state.evaluations.find(ev => ev.campId === campId && ev.staffId === staffId);
  const targetDocId = evalSessionExistingDocId || (existing ? existing.id : null);

  await saveRecord('evaluations', targetDocId, evalData);
  showToast("Оценка успешно зафиксирована!", "success");
  closeEvaluationModal();
  updateAllViews();
}

function deleteEvaluation(evalId) {
  if (!evalId) return;
  showConfirmDialog({
    title: "Удалить оценку?",
    message: "Оценка за этот слёт будет удалена, а общий K и счётчик «Оценено» пересчитаны.",
    confirmText: "Да, удалить",
    onConfirm: async () => {
      await deleteRecord('evaluations', evalId);
      showToast("Оценка успешно удалена", "info");
      closeEvaluationModal();
      updateAllViews();
      if (activeRosterCampId) renderRosterModalContent(activeRosterCampId);
    }
  });
}

function deleteCurrentEvaluationFromModal() {
  if (evalSessionExistingDocId) {
    deleteEvaluation(evalSessionExistingDocId);
  }
}

// CRUD Сотрудников
function openStaffModal(staffId = null) {
  const modal = document.getElementById('staffModal');
  const title = document.getElementById('staffModalTitle');
  const submitBtn = document.getElementById('staffModalSubmitBtn');
  const editInput = document.getElementById('staffEditId');

  if (staffId) {
    const member = state.staff.find(s => s.id === staffId);
    if (!member) return;
    editInput.value = member.id;
    document.getElementById('staffNameInput').value = member.name || '';
    document.getElementById('staffNicknameInput').value = member.nickname || '';
    document.getElementById('staffPrimaryRoleInput').value = member.primaryRole || 'counselor';
    document.getElementById('staffContactInput').value = member.contact || '';
    title.textContent = 'Редактировать сотрудника';
    submitBtn.textContent = 'Обновить';
  } else {
    editInput.value = '';
    document.getElementById('staffNameInput').value = '';
    document.getElementById('staffNicknameInput').value = '';
    document.getElementById('staffPrimaryRoleInput').value = 'counselor';
    document.getElementById('staffContactInput').value = '';
    title.textContent = 'Добавить сотрудника';
    submitBtn.textContent = 'Сохранить';
  }
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeStaffModal() {
  document.getElementById('staffModal').classList.add('hidden');
}

async function handleStaffSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('staffEditId').value;
  const data = {
    name: document.getElementById('staffNameInput').value.trim(),
    nickname: document.getElementById('staffNicknameInput').value.trim(),
    primaryRole: document.getElementById('staffPrimaryRoleInput').value,
    contact: document.getElementById('staffContactInput').value.trim()
  };

  await saveRecord('staff', editId || null, data);
  showToast(editId ? "Данные сотрудника обновлены" : "Новый сотрудник добавлен в базу", "success");
  closeStaffModal();
  updateAllViews();
}

function deleteStaff(staffId) {
  const member = state.staff.find(s => s.id === staffId);
  if (!member) return;

  showConfirmDialog({
    title: "Удалить сотрудника?",
    message: `Вы действительно хотите удалить "${member.name}"? Все его оценки со слётов также будут стёрты.`,
    confirmText: "Да, удалить",
    onConfirm: async () => {
      await deleteRecord('staff', staffId);
      const evalsToDelete = state.evaluations.filter(e => e.staffId === staffId);
      for (const ev of evalsToDelete) {
        await deleteRecord('evaluations', ev.id);
      }
      for (const camp of state.camps) {
        const current = Array.isArray(camp.roster) ? camp.roster : [];
        if (current.includes(staffId)) {
          camp.roster = current.filter(id => id !== staffId);
          await saveRecord('camps', camp.id, { roster: camp.roster });
        }
      }
      showToast("Сотрудник удалён из базы", "info");
      updateAllViews();
    }
  });
}

// CRUD Слётов
function openCampModal(campId = null) {
  const modal = document.getElementById('campModal');
  const title = document.getElementById('campModalTitle');
  const submitBtn = document.getElementById('campModalSubmitBtn');
  const editInput = document.getElementById('campEditId');

  if (campId) {
    const camp = state.camps.find(c => c.id === campId);
    if (!camp) return;
    editInput.value = camp.id;
    document.getElementById('campNameInput').value = camp.name || '';
    document.getElementById('campLocationInput').value = camp.location || '';
    document.getElementById('campStartDateInput').value = camp.startDate || '';
    document.getElementById('campEndDateInput').value = camp.endDate || '';
    title.textContent = 'Редактировать слёт';
    submitBtn.textContent = 'Обновить';
  } else {
    editInput.value = '';
    document.getElementById('campNameInput').value = '';
    document.getElementById('campLocationInput').value = '';
    const todayStr = new Date().toISOString().slice(0, 10);
    document.getElementById('campStartDateInput').value = todayStr;
    document.getElementById('campEndDateInput').value = todayStr;
    title.textContent = 'Создать новый слёт';
    submitBtn.textContent = 'Создать слёт';
  }
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeCampModal() {
  document.getElementById('campModal').classList.add('hidden');
}

async function handleCampSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('campEditId').value;
  const startDate = document.getElementById('campStartDateInput').value;
  const endDate = document.getElementById('campEndDateInput').value;

  if (startDate && endDate && startDate > endDate) {
    showToast("Дата начала не может быть позже даты окончания!", "error");
    return;
  }

  const data = {
    name: document.getElementById('campNameInput').value.trim(),
    location: document.getElementById('campLocationInput').value.trim(),
    startDate,
    endDate,
    startDateTimestamp: startDate ? new Date(startDate).getTime() : Date.now(),
    endDateTimestamp: endDate ? new Date(endDate).getTime() : Date.now()
  };

  if (!editId) data.roster = [];

  await saveRecord('camps', editId || null, data);
  showToast(editId ? "Слёт успешно обновлён" : "Новый слёт создан", "success");
  closeCampModal();
  updateAllViews();
}

function deleteCamp(campId) {
  const camp = state.camps.find(c => c.id === campId);
  if (!camp) return;

  showConfirmDialog({
    title: "Удалить слёт?",
    message: `Удалить слёт "${camp.name}"? Все выставленные на нём оценки будут аннулированы.`,
    confirmText: "Да, удалить",
    onConfirm: async () => {
      await deleteRecord('camps', campId);
      const evalsToDelete = state.evaluations.filter(e => e.campId === campId);
      for (const ev of evalsToDelete) {
        await deleteRecord('evaluations', ev.id);
      }
      showToast("Слёт удалён", "info");
      updateAllViews();
    }
  });
}

// Управление составом слёта
function openRosterModal(campId) {
  setActiveRosterCampId(campId);
  renderRosterModalContent(campId);
  document.getElementById('rosterModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeRosterModal() {
  setActiveRosterCampId(null);
  document.getElementById('rosterModal').classList.add('hidden');
}

async function addSelectedStaffToRoster() {
  if (!activeRosterCampId) return;
  const select = document.getElementById('rosterAddStaffSelect');
  const staffId = select.value;
  if (!staffId) return;

  const camp = state.camps.find(c => c.id === activeRosterCampId);
  if (!camp) return;

  const current = Array.isArray(camp.roster) ? camp.roster : [];
  if (!current.includes(staffId)) {
    camp.roster = [...current, staffId];
    await saveRecord('camps', activeRosterCampId, { roster: camp.roster });
    showToast("Сотрудник добавлен в состав слёта", "success");
    renderRosterModalContent(activeRosterCampId);
    updateAllViews();
  }
}

function removeStaffFromRoster(campId, staffId) {
  const camp = state.camps.find(c => c.id === campId);
  const staff = state.staff.find(s => s.id === staffId);
  if (!camp || !staff) return;

  showConfirmDialog({
    title: "Исключить из слёта?",
    message: `Убрать ${staff.name} из состава слёта "${camp.name}"? Оценки этого сотрудника за данный слёт также будут аннулированы.`,
    confirmText: "Исключить",
    onConfirm: async () => {
      const current = Array.isArray(camp.roster) ? camp.roster : [];
      camp.roster = current.filter(id => id !== staffId);
      await saveRecord('camps', campId, { roster: camp.roster });

      const evalsToDelete = state.evaluations.filter(e => e.campId === campId && e.staffId === staffId);
      for (const ev of evalsToDelete) {
        await deleteRecord('evaluations', ev.id);
      }

      showToast("Сотрудник исключён из слёта, оценка аннулирована", "info");
      renderRosterModalContent(campId);
      updateAllViews();
    }
  });
}

// Экспорт глобальных функций для вызова из встроенных атрибутов кнопок
window.app = {
  viewDossier,
  closeDossierModal,
  viewCampDossier,
  closeCampDossierModal,
  openRosterModal,
  closeRosterModal,
  removeStaffFromRoster,
  openStaffModal,
  deleteStaff,
  openCampModal,
  deleteCamp,
  startEvaluationFlow,
  deleteEvaluation,
  openQrModal
};