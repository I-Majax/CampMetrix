import { state, getFirestoreDB } from './db.js';
import { FIREBASE_CONFIG } from './config.js';
import { showToast } from './ui.js';

let activeQrCampId = null;
let activeQrStaffId = null;
let activeQrType = 'partner';

export function checkGuestUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const isGuest = params.get('guest');
  const campId = params.get('campId');
  const staffId = params.get('staffId');
  const type = params.get('type') || 'partner';

  if (isGuest && campId && staffId) {
    document.getElementById('adminApp')?.classList.add('hidden');
    document.getElementById('guestSurveyView')?.classList.remove('hidden');
    renderGuestSurveyForm(campId, staffId, type);
  }
}

export function renderGuestSurveyForm(campId, staffId, type) {
  document.getElementById('guestCampId').value = campId;
  document.getElementById('guestStaffId').value = staffId;
  document.getElementById('guestType').value = type;

  const container = document.getElementById('guestQuestionsList');
  container.innerHTML = '';

  const questions = type === 'partner' ? [
    { id: 'q1', title: '1. Надёжность и подстраховка в паре', desc: 'Делили ли нагрузку поровну?' },
    { id: 'q2', title: '2. Атмосфера и взаимопомощь', desc: 'Было ли комфортно работать?' },
    { id: 'q3', title: '3. Готовность работать снова', desc: 'Пошёл бы в пару на следующий слёт?' }
  ] : [
    { id: 'q1', title: '1. Насколько было интересно и весело?', desc: 'Игры, вечерние дела и энергия' },
    { id: 'q2', title: '2. Чувствовал ли ты заботу и внимание?', desc: 'Помогал ли вожатый при трудностях?' },
    { id: 'q3', title: '3. Хочешь ли снова в отряд к нему?', desc: 'Поехал бы на слёт с ним снова?' }
  ];

  questions.forEach(q => {
    const block = document.createElement('div');
    block.className = 'bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 space-y-1';
    block.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold text-white">${q.title}</span>
        <span id="gVal_${q.id}" class="font-black text-indigo-400 text-sm">4.5</span>
      </div>
      <p class="text-[10px] text-slate-400">${q.desc}</p>
      <input type="range" min="1" max="5" step="0.5" value="4.5" 
             oninput="document.getElementById('gVal_${q.id}').textContent = parseFloat(this.value).toFixed(1)"
             class="w-full accent-indigo-500 cursor-pointer">
    `;
    container.appendChild(block);
  });
}

export function submitGuestFeedback(e) {
  e.preventDefault();
  const campId = document.getElementById('guestCampId').value;
  const staffId = document.getElementById('guestStaffId').value;
  const type = document.getElementById('guestType').value;

  const sliders = document.querySelectorAll('#guestQuestionsList input[type="range"]');
  let sum = 0;
  sliders.forEach(s => sum += parseFloat(s.value));
  const avg = parseFloat((sum / sliders.length).toFixed(1));

  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const firestore = firebase.firestore();

    firestore.collection('evaluations_feedback').add({
      campId, staffId, type, score: avg, timestamp: Date.now()
    });

    // Реактивное обновление в основной таблице evaluations
    firestore.collection('evaluations')
      .where('campId', '==', campId)
      .where('staffId', '==', staffId)
      .get().then(snap => {
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          const eval360 = data.eval360 || { curatorScore: 4.0, partnerScore: 4.0, squadScore: 4.0 };
          if (type === 'partner') eval360.partnerScore = avg;
          else eval360.squadScore = avg;

          // Мгновенный пересчет finalScore
          const finalScore = parseFloat(((eval360.curatorScore * 0.45) + (eval360.partnerScore * 0.30) + (eval360.squadScore * 0.25)).toFixed(2));
          doc.ref.update({ is360: true, eval360, finalScore });
        }
      });
  } catch (err) {
    console.warn(err);
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
  document.getElementById('qrModal').classList.add('hidden');
}

export function switchQrType(type) {
  activeQrType = type;
  document.getElementById('qrBtnTypePartner').className = type === 'partner' ? 'flex-1 py-1.5 rounded-md font-semibold bg-indigo-600 text-white' : 'flex-1 py-1.5 rounded-md font-semibold text-slate-400';
  document.getElementById('qrBtnTypeSquad').className = type === 'squad' ? 'flex-1 py-1.5 rounded-md font-semibold bg-indigo-600 text-white' : 'flex-1 py-1.5 rounded-md font-semibold text-slate-400';
  renderLiveQrCode();
}

function renderLiveQrCode() {
  const container = document.getElementById('qrcodeCanvas');
  container.innerHTML = '';
  const url = `${window.location.origin}${window.location.pathname}?guest=1&campId=${activeQrCampId}&staffId=${activeQrStaffId}&type=${activeQrType}`;

  try {
    new QRCode(container, { text: url, width: 170, height: 170, colorDark: "#090d16", colorLight: "#ffffff" });
  } catch {
    container.innerHTML = `<a href="${url}" target="_blank" class="text-xs text-indigo-600 underline">Ссылка на опрос</a>`;
  }
}

export function copyQrLink() {
  const url = `${window.location.origin}${window.location.pathname}?guest=1&campId=${activeQrCampId}&staffId=${activeQrStaffId}&type=${activeQrType}`;
  navigator.clipboard.writeText(url).then(() => showToast("Ссылка скопирована!", "success"));
}

export function openSurveyOnCurrentDevice() {
  const url = `${window.location.origin}${window.location.pathname}?guest=1&campId=${activeQrCampId}&staffId=${activeQrStaffId}&type=${activeQrType}`;
  window.open(url, '_blank');
}