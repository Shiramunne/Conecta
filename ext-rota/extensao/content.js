// ==============================================================
// CONFIGURAÇÃO
// ==============================
const CONFIG = {
  sequenciaPortas: [58080, 3239, 80, 443, 8080],
  regexTecnologia: /- (Fibra|Wireless|Radio|Rádio)/i,
  baseUrl: "https://intranetclt01.mgconecta.com.br:8443/"
};

let AppData = { servicos: [], painelAtivo: null, ultimoBotaoClicado: null };

// ==============================================================
// CSS (ESTÉTICA DE ELEMENTOS SOLTOS)
// ==============================
const style = document.createElement('style');
style.textContent = `
  :root {
    --bg-btn: rgba(15, 23, 42, 0.9);
    --primary: #6366f1;
    --text: #f8fafc;
    --border: rgba(255, 255, 255, 0.1);
    --success: #10b981;
  }

  .ce-container { 
    position: fixed; right: 25px; bottom: 25px; z-index: 2147483647; 
    display: flex; flex-direction: row; align-items: flex-end; gap: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .ce-wrapper { 
    display: flex; flex-direction: row; gap: 10px; align-items: center;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .ce-button { 
    background: var(--bg-btn); color: var(--text); border: 1px solid var(--border);
    padding: 12px 18px; border-radius: 10px; cursor: pointer; font-size: 13px; 
    font-weight: 600; min-width: 100px; backdrop-filter: blur(8px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); transition: all 0.2s;
    position: relative;
  }

  .ce-button:hover { 
    background: var(--primary); transform: translateY(-4px); 
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
  }

  /* Botão Toggle com mesmo tamanho/estilo dos outros */
  .ce-toggle { 
    background: var(--bg-btn); color: var(--text); border: 1px solid var(--border);
    width: 45px; height: 43px; border-radius: 10px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-size: 22px; font-weight: bold; transition: 0.2s;
  }

  /* Painel de Serviços SOLTOS (Sem fundo) */
  .ce-panel { 
    position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; gap: 8px; background: transparent; 
    padding: 0; border: none; min-width: 160px; pointer-events: auto;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } }

  .ce-service-btn { 
    background: var(--bg-btn); color: var(--text); border: 1px solid var(--border);
    padding: 12px 16px; border-radius: 10px; cursor: pointer; font-size: 12px; 
    text-align: left; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s; white-space: nowrap;
  }
  .ce-service-btn:hover { background: var(--success); transform: scale(1.05); }

  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #64748b; position: absolute; right: 8px; top: 8px; }
  .active-dot { background: var(--success); box-shadow: 0 0 8px var(--success); }

  .hidden { opacity: 0; transform: translateX(30px) scale(0.8); pointer-events: none; }
`;
document.head.appendChild(style);

// ==============================================================
// LÓGICA DE FUNCIONAMENTO
// ==============================

function getID() {
  return new URLSearchParams(window.location.search).get('id');
}

async function buscarIPServico(id, codigoServico) {
  try {
    const url = `${CONFIG.baseUrl}servicos_fibra_alterar.php?id=${id}&id_servico=${codigoServico}`;
    const res = await fetch(url, { credentials: "include" });
    const text = await res.text();
    const match = text.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
    return match ? match[0] : null;
  } catch (e) { return null; }
}

async function testarEAbrirDuplo(ip, codigo) {
  let portaDetectada = 58080;
  for (let porta of CONFIG.sequenciaPortas) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      await fetch(`http://${ip}:${porta}`, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeout);
      portaDetectada = porta;
      break;
    } catch (e) { continue; }
  }
  window.open(`http://${ip}:${portaDetectada}`, `http_${codigo}`, "width=1000,height=800,top=50,left=50");
  setTimeout(() => window.open(`https://${ip}:${portaDetectada}`, `https_${codigo}`, "width=1000,height=800,top=100,left=100"), 300);
}

function mostrarPainel(e, label, callback) {
  // Se clicar no mesmo botão que já está aberto, ele fecha e limpa
  if (AppData.painelAtivo && AppData.ultimoBotaoClicado === label) {
    AppData.painelAtivo.remove();
    AppData.painelAtivo = null;
    AppData.ultimoBotaoClicado = null;
    return;
  }

  // Remove painel existente antes de abrir novo
  if (AppData.painelAtivo) AppData.painelAtivo.remove();

  const panel = document.createElement("div");
  panel.className = "ce-panel";
  
  AppData.servicos.forEach(s => {
    const b = document.createElement("button");
    b.className = "ce-service-btn";
    b.innerHTML = s.ip ? `<b>${s.codigo}</b><br><span style="opacity:0.6">${s.ip}</span>` : `<b>${s.codigo}</b><br><small>Buscando...</small>`;
    if (!s.ip) b.disabled = true;
    b.onclick = (event) => { event.stopPropagation(); callback(s); panel.remove(); AppData.painelAtivo = null; };
    panel.appendChild(b);
  });

  e.currentTarget.appendChild(panel);
  AppData.painelAtivo = panel;
  AppData.ultimoBotaoClicado = label;
  e.stopPropagation();
}

// ==============================================================
// MONTAGEM DA INTERFACE
// ==============================
(async function() {
  const id = getID();
  if (!id) return;

  const temBloqueio = document.body.innerText.includes("Nível de atendimento recomendado é Avançado");
  const container = document.createElement("div");
  container.className = "ce-container";
  
  const wrapper = document.createElement("div");
  wrapper.className = "ce-wrapper";
  
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "ce-toggle";
  toggleBtn.textContent = "›"; 

  toggleBtn.onclick = () => {
    const isHidden = wrapper.classList.toggle("hidden");
    toggleBtn.textContent = isHidden ? "‹" : "›";
  };

  if (temBloqueio) {
    const btnPop = document.createElement("button");
    btnPop.className = "ce-button btn-pop";
    btnPop.textContent = "POP";
    btnPop.onclick = () => window.location.href = `${CONFIG.baseUrl}cadastro_pop.php?id=${id}&pop=-1`;
    wrapper.appendChild(btnPop);
  } else {
    const menuItems = [
      { label: "Add. Rota", act: (e) => mostrarPainel(e, "Add. Rota", s => s.ip && chrome.runtime.sendMessage({ texto: `rota://${s.ip}` })), status: true },
      { label: "Ping", act: (e) => mostrarPainel(e, "Ping", s => s.ip && chrome.runtime.sendMessage({ texto: `ping://${s.ip}` })) },
      { label: "Manual", act: async () => {
          const t = await navigator.clipboard.readText();
          if(t) chrome.runtime.sendMessage({ texto: `rota://${t.trim()}` });
      }},
      { label: "Roteador", act: (e) => mostrarPainel(e, "Roteador", s => s.ip && testarEAbrirDuplo(s.ip, s.codigo)) },
      { label: "Copiar", act: (e) => mostrarPainel(e, "Copiar", s => navigator.clipboard.writeText(s.codigo)) }
    ];

    let dotStatus = null;
    menuItems.forEach(m => {
      const btn = document.createElement("button");
      btn.className = "ce-button";
      btn.textContent = m.label;
      btn.onclick = m.act;
      if (m.status) {
        dotStatus = document.createElement("div");
        dotStatus.className = "status-dot";
        btn.appendChild(dotStatus);
      }
      wrapper.appendChild(btn);
    });

    const rows = Array.from(document.querySelectorAll("tr"));
    AppData.servicos = rows.filter(tr => CONFIG.regexTecnologia.test(tr.innerText)).map(tr => {
      const td = tr.querySelector("th") || tr.querySelector("td");
      return { codigo: td ? td.textContent.trim().split(/\s+/)[0].replace(/\D/g,'') : null, ip: null };
    }).filter(s => s.codigo?.length > 2);

    for (let i = 0; i < AppData.servicos.length; i++) {
      const s = AppData.servicos[i];
      s.ip = await buscarIPServico(id, s.codigo);
      if (i === 0 && s.ip) {
        chrome.runtime.sendMessage({ texto: `rota://${s.ip}` });
        dotStatus?.classList.add("active-dot");
      }
    }
  }

  container.append(wrapper, toggleBtn);
  document.body.appendChild(container);

  // Fecha painéis ao clicar em qualquer lugar da página
  document.addEventListener("click", () => {
    if (AppData.painelAtivo) {
      AppData.painelAtivo.remove();
      AppData.painelAtivo = null;
      AppData.ultimoBotaoClicado = null;
    }
  });
})();