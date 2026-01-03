let selectedIndex = -1;
let filteredTemplates = [];
let currentQuery = "";
let activeElement = null;
let searchTimeout = null;
const TRIGGER = "> "; 

const menu = document.createElement('div');
menu.id = 'txt-pronto-floating-menu';
document.body.appendChild(menu);

// --- Funções Auxiliares ---
function isEditable(el) {
  return el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.contentEditable === 'true');
}

function getElementText(el) {
  return el.value !== undefined ? el.value : el.innerText;
}

function getCursorPosition(el) {
  try { return el.selectionStart !== undefined ? el.selectionStart : window.getSelection().anchorOffset; } 
  catch(e) { return 0; }
}

function hideMenu() {
  menu.classList.remove('visible');
  selectedIndex = -1;
  currentQuery = "";
}

// Fechar ao clicar fora
document.addEventListener('mousedown', (e) => {
  if (!menu.contains(e.target)) hideMenu();
});

// Fechar com ESC e Navegação por setas (Keydown para evitar conflito com busca)
document.addEventListener('keydown', (e) => {
  if (!menu.classList.contains('visible')) return;

  if (e.key === 'Escape') {
    hideMenu();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % filteredTemplates.length;
    renderMenu();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = (selectedIndex <= 0) ? filteredTemplates.length - 1 : selectedIndex - 1;
    renderMenu();
  } else if (e.key === 'Enter' && selectedIndex !== -1) {
    e.preventDefault();
    insertText(filteredTemplates[selectedIndex].text);
  }
});

// Lógica de busca (Keyup apenas para texto)
document.addEventListener('keyup', (e) => {
  const el = e.target;
  if (!isEditable(el)) return;

  // Ignora teclas de comando para não resetar a busca/piscar
  const ignoreKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Control', 'Alt', 'Shift'];
  if (ignoreKeys.includes(e.key)) return;

  const fullText = getElementText(el);
  const pos = getCursorPosition(el);
  const textBeforeCursor = fullText.slice(0, pos);
  const triggerIdx = textBeforeCursor.lastIndexOf(TRIGGER);
  
  if (triggerIdx !== -1) {
    activeElement = el;
    const newQuery = textBeforeCursor.slice(triggerIdx + TRIGGER.length).toLowerCase();

    if (newQuery !== currentQuery) {
      currentQuery = newQuery;
      clearTimeout(searchTimeout);
      
      searchTimeout = setTimeout(async () => {
        if (currentQuery.length === 0) { hideMenu(); return; }

        const data = await chrome.storage.local.get({ 'templates': [] });
        filteredTemplates = data.templates.filter(t => 
          t.label.toLowerCase().includes(currentQuery)
        ).slice(0, 5);

        if (filteredTemplates.length > 0) {
          renderMenu();
          showMenu(el);
        } else {
          hideMenu();
        }
      }, 50); 
    }
  } else {
    hideMenu();
  }
});

function renderMenu() {
  // Mapeia os itens sem apagar o container pai para evitar flicker
  const itemsHTML = filteredTemplates.map((t, i) => `
    <div class="txt-item ${i === selectedIndex ? 'active' : ''}" data-index="${i}">
      <strong>${t.label}</strong>
      <span>${t.text.substring(0, 45)}...</span>
    </div>
  `).join('');
  
  menu.innerHTML = itemsHTML;

  // Evento de clique nos novos itens
  menu.querySelectorAll('.txt-item').forEach(item => {
    item.onmousedown = (e) => {
      e.preventDefault();
      const idx = item.getAttribute('data-index');
      insertText(filteredTemplates[idx].text);
    };
  });
}

function showMenu(el) {
  const rect = el.getBoundingClientRect();
  const menuHeight = menu.offsetHeight || 150;
  menu.style.left = `${rect.left + window.scrollX}px`;
  menu.style.top = `${rect.top + window.scrollY - menuHeight - 15}px`;
  menu.classList.add('visible');
}

function insertText(text) {
  if (!activeElement) return;
  const fullText = getElementText(activeElement);
  const pos = getCursorPosition(activeElement);
  const textBefore = fullText.slice(0, pos);
  const triggerIdx = textBefore.lastIndexOf(TRIGGER);
  
  if (triggerIdx !== -1) {
    const start = fullText.slice(0, triggerIdx);
    const end = fullText.slice(pos);
    const result = start + text + end;
    
    if (activeElement.value !== undefined) {
      activeElement.value = result;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      activeElement.innerText = result;
    }
    hideMenu();
    activeElement.focus();
  }
}