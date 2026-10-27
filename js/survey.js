import { state, getFirestoreDB } from './db.js';
import { FIREBASE_CONFIG } from './config.js';
import { showToast } from './ui.js';

let activeQrCampId = null;
let activeQrStaffId = null;
let activeQrType = 'partner';

export function checkGuestUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const isGuest = urlParams.get('guest');
  const campId = urlParams.get('campId');
  const staffId = urlParams.get('staffId');
  const type = urlParams.get('type') || 'partner';

  if (isGuest && campId && staffId) {
    document.getElementById('adminApp').classList.add('hidden');
    document.getElementById('guestSurveyView').classList.remove('hidden');
    renderGuestSurveyForm(campId, staffId, type);
  }
}

export function renderGuestSurveyForm(campId, staffId, type) {
  document.getElementById('guestCampId').value = campId;
  document.getElementById('guestStaffId').value = staffId;
  document.getElementById('guestType').value = type;

  const questionsContainer = document.getElementById('guestQuestionsList');
  questionsContainer.innerHTML = '';

  if (type === 'partner') {
    document.getElementById('guestSurveyTitle').textContent = "Оценка напарника по отряду";
    document.getElementById('guestSurveySubtitle').textContent = "Экспресс-опрос для взаимной поддержки команды";

    const questions = [
      { id: 'q1', title: '1. Надёжность и подстраховка', desc: 'Чувствовалось ли, что на человека можно опереться в кризисе?' },
      { id: 'q2', title: '2. Разделение нагрузки', desc: 'Делили ли работу по отряду поровну (планёрки, отбой, режим)?' },
      { id: 'q3', title: '3. Атмосфера и поддержка', desc: 'Было ли комфортно психологически? Не сливал ли негатив?' },
      { id: 'q4', title: '4. Готовность работать снова', desc: 'Пошёл бы с этим вожатым в пару на следующий слёт?' }
    ];

    questions.forEach(q => {
      const block = document.createElement('div');
      block.className = 'bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 space-y-2';
      block.innerHTML = `
        <div class="flex justify-between items-center text-xs">
          <span class="font-bold text-white">${q.title}</span>
          <span id="guestVal_${q.id}" class="font-black text-indigo-400 text-sm">4.5</span>
        </div>
        <p class="text-[11px] text-slate-400">${q.desc}</p>
        <input type="range" id="guestSlider_${q.id}" min="1" max="5" step="0.5" value="4.5" 
               oninput="document.getElementById('guestVal_${q.id}').textContent = parseFloat(this.value).toFixed(1)"
               class="w-full accent-indigo-500 cursor-pointer">
      `;
      questionsContainer.appendChild(block);
    });
  } else {
    document.getElementById('guestSurveyTitle').textContent = "Отзыв отряда о вожатом";
    document.getElementById('guestSurveySubtitle').textContent = "Поделись впечатлениями о своём вожатом";

    const questions = [
      { id: 'q1', title: '1. Насколько было интересно и весело?', desc: 'Игры, свечки, вечерние дела и энергия вожатого' },
      { id: 'q2', title: '2. Чувствовал ли ты заботу и внимание?', desc: 'Помогал ли вожатый, слушал ли, защищал ли от буллинга?' },
      { id: 'q3', title: '3. Хочешь ли снова в отряд к нему?', desc: 'Поехал бы на следующий слёт с этим вожатым?' }
    ];

    questions.forEach(q => {
      const block = document.createElement('div');
      block.className = 'bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 space-y-2';
      block.innerHTML = `
        <div class="flex justify-between items-center text-xs">
          <span class="font-bold text-white">${q.title}</span>
          <span id="guestVal_${q.id}" class="font-black text-amber-400 text-sm">5.0</span>
        </div>
        <p class="text-[11px] text-slate-400">${q.desc}</p>
        <input type="range" id="guestSlider_${q.id}" min="1" max="5" step="0.5" value="5.0" 
               oninput="document.getElementById('guestVal_${q.id}').textContent = parseFloat(this.value).toFixed(1)"
               class="w-full accent-amber-500 cursor-pointer">
      `;
      questionsContainer.appendChild(block);
    });
  }
}

export function submitGuestFeedback(e) {
  e.preventDefault();
  const campId = document.getElementById('guestCampId').value;
  const staffId = document.getElementById('guestStaffId').value;
  const type = document.getElementById('guestType').value;

  const sliders = document.querySelectorAll('#guestQuestionsList input[type="range"]');
  let sum = 0;
  sliders.forEach(s => sum += parseFloat(s.value));
  const finalScore = parseFloat((sum / sliders.length).toFixed(1));

  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const firestore = firebase.firestore();

    firestore.collection('evaluations_feedback').add({
      campId,
      staffId,
      type,
      score: finalScore,
      timestamp: Date.now()
    });

    firestore.collection('evaluations').where('campId', '==', campId).where('staffId', '==', staffId).get().then(snap => {
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();
        const eval360 = data.eval360 || { curatorScore: 4.0, partnerScore: 4.0, squadScore: 4.0 };
        if (type === 'partner') eval360.partnerScore = finalScore;
        else eval360.squadScore = finalScore;

        doc.ref.update({
          is360: true,
          eval360: eval360
        });
      }
    });
  } catch (err) {
    console.warn("Guest submit offline:", err);
  }

  document.getElementById('guestFeedbackForm').classList.add('hidden');
  document.getElementById('guestSuccessBox').classList.remove('hidden');
}

export function openQrModal(campId, staffId) {
  activeQrCampId = campId;
  activeQrStaffId = staffId;
  activeQrType = 'partner';

  const staff = state.staff.find(s => s.id === staffId);
  document.getElementById('qrStaffName').textContent = staff ? staff.name : 'Сотрудник';

  renderLiveQrCode();
  document.getElementById('qrModal').classList.remove('hidden');
  lucide.createIcons();
}

export function closeQrModal() {
  activeQrCampId = null;
  activeQrStaffId = null;
  document.getElementById('qrModal').classList.add('hidden');
}

export function switchQrType(type) {
  activeQrType = type;
  const btnPartner = document.getElementById('qrBtnTypePartner');
  const btnSquad = document.getElementById('qrBtnTypeSquad');

  if (type === 'partner') {
    btnPartner.className = 'flex-1 py-1.5 rounded-md font-semibold transition bg-indigo-600 text-white';
    btnSquad.className = 'flex-1 py-1.5 rounded-md font-semibold transition text-slate-400 hover:text-white';
  } else {
    btnPartner.className = 'flex-1 py-1.5 rounded-md font-semibold transition text-slate-400 hover:text-white';
    btnSquad.className = 'flex-1 py-1.5 rounded-md font-semibold transition bg-indigo-600 text-white';
  }

  renderLiveQrCode();
}

function getGuestSurveyUrl() {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?guest=1&campId=${activeQrCampId}&staffId=${activeQrStaffId}&type=${activeQrType}`;
}

function renderLiveQrCode() {
  const container = document.getElementById('qrcodeCanvas');
  container.innerHTML = '';

  const targetUrl = getGuestSurveyUrl();

  try {
    new QRCode(container, {
      text: targetUrl,
      width: 180,
      height: 180,
      colorDark: "#090d16",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (err) {
    container.innerHTML = `<a href="${targetUrl}" target="_blank" class="text-xs text-indigo-600 underline">Открыть анкету</a>`;
  }
}

export function copyQrLink() {
  const url = getGuestSurveyUrl();
  navigator.clipboard.writeText(url).then(() => {
    showToast("Ссылка на опрос скопирована!", "success");
  }).catch(() => {
    showToast(url, "info");
  });
}

export function openSurveyOnCurrentDevice() {
  const url = getGuestSurveyUrl();
  window.open(url, '_blank');
}