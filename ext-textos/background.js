// ===== Configurações =====
const MENU_ID = 'textos_prontos_menu';
const POPUP_SIZE = { width: 430, height: 560 }; // ajuste se quiser

// ===== Menu de contexto =====
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Textos Prontos',
      contexts: ['all']
    });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_ID) {
    openPopupCentered().catch(console.error);
  }
});

// ===== Clique no ícone da extensão =====
chrome.action.onClicked.addListener(() => {
  openPopupCentered().catch(console.error);
});

// ===== Abrir popup centralizado =====
async function openPopupCentered() {
  // Janela que estava por último com foco (onde o usuário clicou)
  let baseWin = await chrome.windows.getLastFocused({ populate: false });

  // Se estiver minimizada, tenta outra janela visível
  if (baseWin.state === 'minimized') {
    const all = await chrome.windows.getAll({ populate: false });
    baseWin = all.find(w => w.state !== 'minimized') || baseWin;
  }

  // Garante que temos números para as métricas da janela base
  const left = Number.isFinite(baseWin.left) ? baseWin.left : 0;
  const top = Number.isFinite(baseWin.top) ? baseWin.top : 0;
  const width = Number.isFinite(baseWin.width) ? baseWin.width : 1280;
  const height = Number.isFinite(baseWin.height) ? baseWin.height : 800;

  // Calcula posição central baseada na janela do Chrome (cai no monitor correto)
  const popupLeft = Math.round(left + (width - POPUP_SIZE.width) / 2);
  const popupTop = Math.round(top + (height - POPUP_SIZE.height) / 2);

  // Abre a janela popup
  await chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: POPUP_SIZE.width,
    height: POPUP_SIZE.height,
    left: popupLeft,
    top: popupTop,
    focused: true
  });
}