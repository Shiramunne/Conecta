// options.js
const STORAGE_KEY = 'ce_targetUrl';
const input = document.getElementById('targetUrl');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

function restore() {
  chrome.storage.sync.get([STORAGE_KEY], (res) => {
    input.value = res[STORAGE_KEY] || '';
  });
}

saveBtn.addEventListener('click', () => {
  const val = input.value.trim();
  chrome.storage.sync.set({ [STORAGE_KEY]: val }, () => {
    saveBtn.textContent = 'Salvo!';
    setTimeout(() => saveBtn.textContent = 'Salvar', 1000);
  });
});

clearBtn.addEventListener('click', () => {
  chrome.storage.sync.remove([STORAGE_KEY], () => {
    input.value = '';
    clearBtn.textContent = 'Limpo!';
    setTimeout(() => clearBtn.textContent = 'Limpar', 1000);
  });
});

restore();