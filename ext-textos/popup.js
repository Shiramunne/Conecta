'use strict';

let templates = [];
let deleteId = null;
const STORAGE_KEY = 'templates';

// Utilitários
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function showToast(msg) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

// Armazenamento
async function loadTemplates() {
  const data = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
  templates = data[STORAGE_KEY];
}
async function saveTemplates() {
  await chrome.storage.local.set({ [STORAGE_KEY]: templates });
}

// Renderização da Lista
function renderList(query = '') {
  const list = document.getElementById('list');
  // Salva a posição do scroll atual antes de renderizar
  const scrollPos = window.scrollY;
  
  list.innerHTML = '';

  const q = query.toLowerCase();
  const filtered = templates.filter(t => 
    t.label.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<li style="text-align:center; color:var(--muted); padding:20px;">Nenhum texto encontrado.</li>`;
    return;
  }

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `
      <div class="item-content">
        <div class="title">${escapeHtml(t.label)}</div>
        <div class="preview">${escapeHtml(t.text)}</div>
      </div>
      <div class="item-actions">
        <button class="btn primary btn-copy" data-text="${escapeHtml(t.text)}">Copiar</button>
        <button class="btn ghost btn-edit" data-id="${t.id}">Editar</button>
        <button class="btn danger btn-delete" data-id="${t.id}">Remover</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Eventos dos botões da lista
  list.querySelectorAll('.btn-copy').forEach(btn => {
    btn.onclick = async () => {
      const text = btn.getAttribute('data-text'); // Pega o texto bruto do atributo
      // Decodifica HTML entities se necessário, mas aqui pegamos o atributo que já tratamos
      // Uma abordagem melhor para copiar: usar o texto original do array
      const itemText = btn.parentElement.parentElement.querySelector('.preview').innerText; 
      
      // Maneira mais segura: achar no array pelo ID (mas aqui simplificamos)
      try {
        await navigator.clipboard.writeText(text); // Tenta copiar do atributo
        showToast('Copiado!');
      } catch (err) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copiado!');
      }
      window.close();
    };
  });

  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const t = templates.find(x => x.id === id);
      if (t) {
        document.getElementById('editId').value = t.id;
        document.getElementById('editLabel').value = t.label;
        document.getElementById('editText').value = t.text;
        document.getElementById('editModal').hidden = false;
        document.getElementById('editLabel').focus();
      }
    };
  });

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => {
      deleteId = btn.getAttribute('data-id');
      document.getElementById('confirmModal').hidden = false;
    };
  });

  // Restaura o scroll para onde estava
  window.scrollTo(0, scrollPos);
}

// Inicialização e Eventos Globais
document.addEventListener('DOMContentLoaded', async () => {
  await loadTemplates();
  const searchEl = document.getElementById('search');
  renderList();

  searchEl.oninput = () => renderList(searchEl.value);

  // Menu Flutuante (FAB)
  const btnAdd = document.getElementById('btnAdd');
  const fabMenu = document.getElementById('fab-menu');
  
  btnAdd.onclick = (e) => {
    e.stopPropagation();
    fabMenu.classList.toggle('show');
  };
  document.onclick = (e) => {
    if (!fabMenu.contains(e.target) && e.target !== btnAdd) {
      fabMenu.classList.remove('show');
    }
  };

  // Menu Actions
  document.getElementById('mi-add-text').onclick = () => {
    document.getElementById('addPanel').hidden = false;
    document.getElementById('newLabel').focus();
    fabMenu.classList.remove('show');
  };

  document.getElementById('mi-import').onclick = () => {
    importTemplates();
    fabMenu.classList.remove('show');
  };

  document.getElementById('mi-export').onclick = () => {
    exportTemplates();
    fabMenu.classList.remove('show');
  };

  // --- ADICIONAR NOVO ---
  document.getElementById('saveAdd').onclick = async () => {
    const label = document.getElementById('newLabel').value.trim();
    const text = document.getElementById('newText').value.trim();
    if (!label || !text) return;
    
    templates.unshift({ id: uid(), label, text });
    await saveTemplates();
    
    // Limpa
    document.getElementById('newLabel').value = '';
    document.getElementById('newText').value = '';
    document.getElementById('addPanel').hidden = true;
    
    renderList(searchEl.value);
    showToast('Texto criado!');
  };
  document.getElementById('cancelAdd').onclick = () => {
    document.getElementById('addPanel').hidden = true;
  };

  // --- EDITAR (MODAL) ---
  document.getElementById('saveEdit').onclick = async () => {
    const id = document.getElementById('editId').value;
    const label = document.getElementById('editLabel').value.trim();
    const text = document.getElementById('editText').value.trim();
    
    const idx = templates.findIndex(t => t.id === id);
    if (idx !== -1 && label && text) {
      templates[idx] = { id, label, text };
      await saveTemplates();
      document.getElementById('editModal').hidden = true;
      renderList(searchEl.value); // O renderList agora preserva o scroll
      showToast('Atualizado!');
    }
  };
  document.getElementById('cancelEdit').onclick = () => {
    document.getElementById('editModal').hidden = true;
  };

  // --- DELETAR (MODAL) ---
  document.getElementById('confirmDelete').onclick = async () => {
    if (deleteId) {
      templates = templates.filter(t => t.id !== deleteId);
      await saveTemplates();
      deleteId = null;
      document.getElementById('confirmModal').hidden = true;
      renderList(searchEl.value);
      showToast('Removido');
    }
  };
  document.getElementById('cancelDelete').onclick = () => {
    deleteId = null;
    document.getElementById('confirmModal').hidden = true;
  };
});

// Import/Export (Lógica Mantida Simples)
function exportTemplates() {
  const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_textos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
  a.click();
}

function importTemplates() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          // Merge simples evitando duplicatas exatas de ID, mas permitindo novos
          const currentIds = new Set(templates.map(t => t.id));
          const newItems = json.filter(item => item.label && item.text).map(item => {
             if (!item.id || currentIds.has(item.id)) item.id = uid();
             return item;
          });
          templates = [...newItems, ...templates];
          await saveTemplates();
          renderList();
          showToast(`${newItems.length} textos importados!`);
        }
      } catch (err) {
        showToast('Erro no arquivo JSON');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}