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
      console.warn("Contact picker closed:", err);
    }
  }

  showToast("В Safari: выберите карточку .vcf или нажмите на поле телефона", "info");
  document.getElementById('vcfContactInput').click();
}

export function handleVcfFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const parsed = parseVcf(text);
    if (parsed.name && !document.getElementById('staffNameInput').value.trim()) {
      document.getElementById('staffNameInput').value = parsed.name;
    }
    if (parsed.tel) {
      document.getElementById('staffContactInput').value = parsed.tel;
    }
    showToast("Контакт успешно импортирован!", "success");
    event.target.value = '';
  };
  reader.readAsText(file);
}

function parseVcf(text) {
  let name = '', tel = '';
  text.split(/\r\n|\r|\n/).forEach(line => {
    line = line.trim();
    if (!name && (line.startsWith('FN:') || line.startsWith('FN;'))) name = line.substring(line.indexOf(':') + 1).trim();
    if (!tel && line.startsWith('TEL')) tel = line.substring(line.indexOf(':') + 1).trim();
  });
  return { name, tel };
}