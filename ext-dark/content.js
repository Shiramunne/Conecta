(function () {
  'use strict';

  const lightCSS = `:root { color-scheme: light only !important; }`;
  const darkCSS = `:root { color-scheme: dark only !important; }`;
  const STYLE_ID = 'dark-included-style';

  function injectCSS(cssText) {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.setAttribute('data-injected-by', 'dark-included-extension');
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = cssText;
  }

  function removeCSS() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  function updatePage(included, defaultMode) {
    const hostname = window.location.hostname;
    const isIncluded = included.some(d => hostname === d || hostname.endsWith('.' + d));

    if (defaultMode === 'light') {
      isIncluded ? injectCSS(darkCSS) : removeCSS();
    } else {
      !isIncluded ? injectCSS(lightCSS) : removeCSS();
    }
  }

  // Carga inicial
  chrome.storage.sync.get(['includedDomains', 'defaultMode'], (items) => {
    updatePage(items.includedDomains || ['github.com'], items.defaultMode || 'light');
  });

  // Ouvir mensagens do menu de contexto
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "toggle_mode") {
      chrome.storage.sync.get(['includedDomains', 'defaultMode'], (items) => {
        let domains = items.includedDomains || [];
        const host = window.location.hostname;
        
        if (domains.includes(host)) {
          domains = domains.filter(d => d !== host);
        } else {
          domains.push(host);
        }

        chrome.storage.sync.set({ includedDomains: domains }, () => {
          updatePage(domains, items.defaultMode || 'light');
        });
      });
    }
  });
})();