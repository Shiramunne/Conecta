const MENU_ID      = "validate-selection";
const TEMPLATE_URL = "https://intranetclt01.mgconecta.com.br:8443/cadastro_pesquisar_resultados_pop.php?codigo=&cliente=&cpf={query}&telefone=&endereco=&numero=&cidade=&id=&email_contato=&obs_cadastro=";
const ERROR_URL    = "https://intranetclt01.mgconecta.com.br:8443/cadastro_pesquisar_pop.php?id=";

// Função Unificada para Limpar e Validar CPF/CNPJ
function getValidDocument(text) {
  const clean = text.replace(/\D/g, "");
  
  // Se for CPF (11) ou CNPJ (14), consideramos válido para a pesquisa
  if (clean.length === 11 || clean.length === 14) {
    return clean;
  }
  return null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Pesquisar CPF/CNPJ",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;

  const query = getValidDocument(info.selectionText.trim());
  const finalUrl = query ? TEMPLATE_URL.replace("{query}", encodeURIComponent(query)) : ERROR_URL;

  const width = 1000;
  const height = 700;

  // 1. Pegamos a janela onde a aba atual (onde o usuário clicou) está
  chrome.windows.get(tab.windowId, (currentWindow) => {
    
    // 2. Pegamos informações de todos os monitores
    chrome.system.display.getInfo((displays) => {
      
      // 3. Identificamos qual monitor contém o centro da janela atual
      const windowCenterX = currentWindow.left + (currentWindow.width / 2);
      const windowCenterY = currentWindow.top + (currentWindow.height / 2);

      const activeDisplay = displays.find(d => {
        return windowCenterX >= d.bounds.left && 
               windowCenterX <= (d.bounds.left + d.bounds.width) &&
               windowCenterY >= d.bounds.top &&
               windowCenterY <= (d.bounds.top + d.bounds.height);
      }) || displays[0]; // Fallback para o primeiro monitor se algo falhar

      // 4. Calculamos o centro do monitor ativo
      const left = Math.round(activeDisplay.workArea.left + (activeDisplay.workArea.width - width) / 2);
      const top = Math.round(activeDisplay.workArea.top + (activeDisplay.workArea.height - height) / 2);

      // 5. Criamos o popup
      chrome.windows.create({
        url: finalUrl,
        type: "popup",
        width: width,
        height: height,
        left: left,
        top: top,
        focused: true
      });
    });
  });
});