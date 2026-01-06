chrome.runtime.onMessage.addListener((message) => {
  if (message.texto) {
    try {
      const port = chrome.runtime.connectNative("com.yuri.vbsbridge");

      // --- TRECHO NOVO: Tratamento de erro silencioso ---
      // Isso "engole" o erro se o Host fechar antes do tempo
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          // Apenas acessamos a variável para o Chrome não marcar como "Unchecked"
          // console.log("Host encerrou (normal):", chrome.runtime.lastError.message);
        }
      });
      // --------------------------------------------------

      port.postMessage({ texto: message.texto });
      
      // Mantém o timeout que garante o funcionamento do Ping
      setTimeout(() => {
        try { port.disconnect(); } catch(e) {}
      }, 500);

    } catch (e) {
      console.error("Erro comunicação host:", e);
    }
  }
});