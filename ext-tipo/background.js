// background.js - MV3 - Versão Otimizada com Filtro de URL no Menu

// Configuração de onde o botão deve aparecer (ajuste os domínios se necessário)
const URL_PATTERNS = [
  "*://*/atendimento_iniciar_new.php*",
  "*://*/atendimento*" // Abrange a nova página que você mencionou
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "editarTipo",
    title: "Editar campo Tipo",
    contexts: ["page"],
    documentUrlPatterns: URL_PATTERNS // O botão só aparece nestas URLs
  });
});

// Helper para API de clique no ícone (opcional, mantém o funcionamento ao clicar no ícone da extensão)
function getActionApi() {
  if (typeof chrome !== 'undefined' && chrome.action) return chrome.action;
  return null;
}

const actionApi = getActionApi();
if (actionApi) {
  actionApi.onClicked.addListener((tab) => executarAcao(tab));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "editarTipo") {
    executarAcao(tab);
  }
});

async function executarAcao(tab) {
  try {
    if (!tab.id) return;

    // Injeta a lógica diretamente
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: processarAlteracaoDeTipo
    });

  } catch (err) {
    console.error("[Extensão] Erro ao executar:", err);
  }
}

// Esta função agora engloba a verificação e a alteração de uma vez
function processarAlteracaoDeTipo() {
  const novoHtml = `
    <label class="m-radio" style="display:block; margin-bottom:4px;"><input type="radio" name="tipo" value="1">&nbsp;Atendimento&nbsp;<span></span></label>
    <label class="m-radio" style="display:block; margin-bottom:4px;"><input type="radio" name="tipo" value="2">&nbsp;Técnico&nbsp;<span></span></label>
    <label class="m-radio" style="display:block; margin-bottom:4px;"><input type="radio" name="tipo" value="13" checked>&nbsp;Atendimento Huggy&nbsp;<span></span></label>
    <label class="m-radio" style="display:block; margin-bottom:4px;"><input type="radio" name="tipo" value="4">&nbsp;Interno&nbsp;<span></span></label>
    <label class="m-radio" style="display:block; margin-bottom:4px;"><input type="radio" name="tipo" value="15">&nbsp;Reparo Central&nbsp;<span></span></label>
  `;

  // 1. Tenta localizar por Tabela (TH "Tipo:") - Novo cenário
  const ths = Array.from(document.querySelectorAll('th'));
  const tipoTh = ths.find(el => el.textContent.trim().includes('Tipo:'));
  
  if (tipoTh && tipoTh.nextElementSibling) {
    tipoTh.nextElementSibling.innerHTML = novoHtml;
    return;
  }

  // 2. Tenta localizar por seletores de container (Cenário antigo)
  const containerSelectors = ['.m-radio-list', '.radio-list', 'div[data-field="tipo"]'];
  for (const sel of containerSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      el.innerHTML = novoHtml;
      return;
    }
  }

  // 3. Tenta localizar pelo input name e pegar o pai
  const input = document.querySelector('input[name="tipo"]');
  if (input) {
    input.parentElement.innerHTML = novoHtml;
    return;
  }
  
  console.warn("Campo 'Tipo' não encontrado nesta página.");
}