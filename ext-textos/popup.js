'use strict';

let templates = [];
const STORAGE_KEY = 'templates';

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function showToast(msg) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1200);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadTemplates() {
  const data = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
  templates = data[STORAGE_KEY];
}

async function saveTemplates() {
  await chrome.storage.local.set({ [STORAGE_KEY]: templates });
}

// --- Funções de Importação e Exportação ---

function exportTemplates() {
  const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_textos_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exportado com sucesso!');
}

function importTemplates() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          const existingIds = new Set(templates.map(t => t.id));
          const newItems = imported.filter(item => !existingIds.has(item.id));
          
          templates = [...newItems, ...templates];
          await saveTemplates();
          renderList();
          showToast(`${newItems.length} textos importados!`);
        }
      } catch (err) {
        showToast('Erro ao ler arquivo.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// --- Interface e Listagem ---

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    msgEl.textContent = message;
    modal.hidden = false;
    const cleanup = (res) => { modal.hidden = true; yesBtn.onclick = null; noBtn.onclick = null; resolve(res); };
    yesBtn.onclick = () => cleanup(true);
    noBtn.onclick = () => cleanup(false);
  });
}

function renderList(filter = '') {
  const listEl = document.getElementById('list');
  if (!listEl) return;
  listEl.innerHTML = '';
  const q = filter.trim().toLowerCase();

  templates
    // CORREÇÃO: Busca apenas no título (label)
    .filter(t => !q || t.label.toLowerCase().includes(q))
    .forEach(t => {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = `
        <div class="info">
          <strong class="title">${escapeHtml(t.label)}</strong>
          <span class="preview">${escapeHtml(t.text)}</span>
        </div>
        <div class="actions"></div>
      `;

      const actions = li.querySelector('.actions');

      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn primary';
      copyBtn.textContent = 'Copiar';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(t.text).then(() => {
          showToast('Copiado!');
          setTimeout(() => window.close(), 300);
        });
      };

      const editBtn = document.createElement('button');
      editBtn.className = 'btn ghost';
      editBtn.textContent = 'Editar';
      editBtn.onclick = () => {
        document.getElementById('editId').value = t.id;
        document.getElementById('editLabel').value = t.label;
        document.getElementById('editText').value = t.text;
        document.getElementById('addPanel').hidden = true;
        document.getElementById('editPanel').hidden = false;
        document.getElementById('editLabel').focus();
      };

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn danger ghost';
      removeBtn.textContent = 'Remover';
      removeBtn.onclick = async () => {
        if (await showConfirm(`Remover "${t.label}"?`)) {
          templates = templates.filter(x => x.id !== t.id);
          await saveTemplates();
          renderList(document.getElementById('search').value);
        }
      };

      actions.append(copyBtn, editBtn, removeBtn);
      listEl.appendChild(li);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchEl = document.getElementById('search');
  const fabMenu = document.getElementById('fab-menu');
  const btnAdd = document.getElementById('btnAdd');

  await loadTemplates();
  renderList();
  
  searchEl.focus();

  btnAdd.onclick = (e) => {
    e.stopPropagation();
    fabMenu.classList.toggle('show');
  };
  
  document.onclick = () => fabMenu.classList.remove('show');

  // Eventos do Menu
  document.getElementById('mi-add-text').onclick = () => {
    document.getElementById('editPanel').hidden = true;
    document.getElementById('addPanel').hidden = false;
    document.getElementById('newLabel').value = '';
    document.getElementById('newText').value = '';
    document.getElementById('newLabel').focus();
  };

  document.getElementById('mi-import').onclick = () => {
    importTemplates();
    fabMenu.classList.remove('show');
  };

  document.getElementById('mi-export').onclick = () => {
    exportTemplates();
    fabMenu.classList.remove('show');
  };

  // Botões de Ação (Salvar/Cancelar)
  document.getElementById('saveAdd').onclick = async () => {
    const label = document.getElementById('newLabel').value.trim();
    const text = document.getElementById('newText').value.trim();
    if (!label || !text) return;
    templates.unshift({ id: uid(), label, text });
    await saveTemplates();
    document.getElementById('addPanel').hidden = true;
    renderList(searchEl.value);
  };

  document.getElementById('saveEdit').onclick = async () => {
    const id = document.getElementById('editId').value;
    const label = document.getElementById('editLabel').value.trim();
    const text = document.getElementById('editText').value.trim();
    const idx = templates.findIndex(t => t.id === id);
    if (idx !== -1) {
      templates[idx] = { id, label, text };
      await saveTemplates();
      document.getElementById('editPanel').hidden = true;
      renderList(searchEl.value);
      showToast('Atualizado');
    }
  };

  document.getElementById('cancelAdd').onclick = () => document.getElementById('addPanel').hidden = true;
  document.getElementById('cancelEdit').onclick = () => document.getElementById('editPanel').hidden = true;
  
  searchEl.oninput = (e) => renderList(e.target.value);
});