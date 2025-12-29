chrome.runtime.onMessage.addListener((message) => {
  if (message.texto) {
    try {
      // Conecta ao host, envia e desconecta (fire and forget)
      const port = chrome.runtime.connectNative("com.yuri.vbsbridge");
      port.postMessage({ texto: message.texto });
      
      // Desconecta após 500ms para garantir que o Python recebeu
      setTimeout(() => port.disconnect(), 500);
    } catch (e) {
      console.error("Erro comunicação host:", e);
    }
  }
});