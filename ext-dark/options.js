// options.js
document.addEventListener('DOMContentLoaded', () => {
  const domainsEl = document.getElementById('domains');
  const defaultModeEl = document.getElementById('defaultMode');
  const saveBtn = document.getElementById('save');
  const restoreBtn = document.getElementById('restore');
  const statusEl = document.getElementById('status');

  const DEFAULTS = {
    includedDomains: ['github.com'],
    defaultMode: 'light'
  };

  function showStatus(msg, timeout = 2000) {
    statusEl.textContent = msg;
    setTimeout(() => { statusEl.textContent = ''; }, timeout);
  }

  function loadOptions() {
    chrome.storage.sync.get(DEFAULTS, (items) => {
      domainsEl.value = (items.includedDomains || DEFAULTS.includedDomains).join('\n');
      defaultModeEl.value = items.defaultMode || DEFAULTS.defaultMode;
    });
  }

  function saveOptions() {
    const domains = domainsEl.value
      .split('\n')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const defaultMode = defaultModeEl.value === 'dark' ? 'dark' : 'light';

    chrome.storage.sync.set({
      includedDomains: domains,
      defaultMode: defaultMode
    }, () => {
      showStatus('Salvo');
    });
  }

  function restoreDefaults() {
    chrome.storage.sync.set(DEFAULTS, () => {
      loadOptions();
      showStatus('Restaurado para padrão');
    });
  }

  saveBtn.addEventListener('click', saveOptions);
  restoreBtn.addEventListener('click', restoreDefaults);

  loadOptions();
});