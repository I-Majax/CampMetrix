import { initDB, state, saveRecord, deleteRecord } from './db.js';
import { renderStaffList, renderCampsList, showToast } from './ui.js';
import { openEvaluationWizard } from './eval.js';
import { autoPairCounselors } from './calc.js';

// Делаем функции глобально доступными для HTML-кнопок
window.switchTab = (tabId) => {
  document.getElementById('view-registry').classList.toggle('hidden', tabId !== 'registry');
  document.getElementById('view-camps').classList.toggle('hidden', tabId !== 'camps');
  
  const bottomNavReg = document.getElementById('bottomNavRegistry');
  const bottomNavCamps = document.getElementById('bottomNavCamps');
  if (bottomNavReg && bottomNavCamps) {
    bottomNavReg.className = tabId === 'registry' ? 'flex flex-col items-center gap-1 text-indigo-400 font-semibold text-[10px]' : 'flex flex-col items-center gap-1 text-slate-400 text-[10px]';
    bottomNavCamps.className = tabId === 'camps' ? 'flex flex-col items-center gap-1 text-indigo-400 font-semibold text-[10px]' : 'flex flex-col items-center gap-1 text-slate-400 text-[10px]';
  }
};

window.startEvaluationFlow = (campId, staffId) => openEvaluationWizard(campId, staffId);
window.openEvaluationModal = () => openEvaluationWizard(null, null);

// Умный подбор пар
window.openPairingModal = (campId) => {
  const pairs = autoPairCounselors(campId);
  if (!pairs.length) {
    showToast("Недостаточно вожатых в составе для формирования связок", "error");
    return;
  }
  alert(`Сформировано ${pairs.length} пар! Первая связка: ${pairs[0].lead.name} + ${pairs[0].partner.name} (${pairs[0].note})`);
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  initDB(
    () => {
      renderStaffList();
      renderCampsList();
    },
    (isOnline) => {
      const badge = document.getElementById('cloudStatusBadge');
      badge.className = isOnline ? 'w-2 h-2 rounded-full bg-emerald-400' : 'w-2 h-2 rounded-full bg-amber-400';
    }
  );

  // Навешивание обработчиков событий
  document.getElementById('btnStartEvalHeader').onclick = () => openEvaluationWizard();
  document.getElementById('registrySearchInput').oninput = renderStaffList;
  document.getElementById('registryRoleFilter').onchange = renderStaffList;

  document.getElementById('btnOpenAddStaff').onclick = async () => {
    const name = prompt("ФИО нового сотрудника:");
    if (name) {
      await saveRecord('staff', null, { name, primaryRole: 'counselor' });
      showToast("Сотрудник добавлен!");
    }
  };

  document.getElementById('btnOpenAddCamp').onclick = async () => {
    const name = prompt("Название слёта:");
    if (name) {
      await saveRecord('camps', null, { name, roster: [] });
      showToast("Слёт создан!");
    }
  };
});