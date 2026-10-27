import { showToast } from './ui.js';

export async function pickFromContacts() {
  if ('contacts' in navigator && 'ContactsManager' in window) {
    try {
      const props = ['name', 'tel'];
      const contacts = await navigator.contacts.select(props, { multiple: false });
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        if (c.name && c.name.length > 0 && !document.getElementById('staffNameInput').value.trim()) {
          document.getElementById('staffNameInput').value = c.name[0];
        }
        if (c.tel && c.tel.length > 0) {
          document.getElementById('staffContactInput').value = c.tel[0];
        }
        showToast("Контакт загружен из телефонной книги!", "success");
        return;
      }
    } catch (err) {
      console.warn("Contact picker closed or failed:", err);
    }
  }

  showToast("В Safari: выберите .vcf или нажмите на поле телефона для клавиатуры", "info");
  document.getElementById('vcfContactInput').click();
}

export function handleVcfFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const parsed = parseVcfContact(text);
    
    let filledCount = 0;
    if (parsed.name && !document.getElementById('staffNameInput').value.trim()) {
      document.getElementById('staffNameInput').value = parsed.name;
      filledCount++;
    }
    if (parsed.tel) {
      document.getElementById('staffContactInput').value = parsed.tel;
      filledCount++;
    }

    if (filledCount > 0) {
      showToast(`Контакт импортирован (${parsed.name || parsed.tel})`, "success");
    } else {
      showToast("Не удалось извлечь имя или номер из vCard", "error");
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function parseVcfContact(vcfText) {
  let name = '';
  let tel = '';
  const lines = vcfText.split(/\r\n|\r|\n/);

  for (let line of lines) {
    line = line.trim();
    if (!name && (line.startsWith('FN:') || line.startsWith('FN;'))) {
      name = line.substring(line.indexOf(':') + 1).trim();
    }
    if (!tel && line.startsWith('TEL')) {
      tel = line.substring(line.indexOf(':') + 1).trim();
    }
  }
  return { name, tel };
}