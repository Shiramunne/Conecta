// ==============================
// Utilitárias e seletores
// ==============================
function getCodigoCadastro() {
  const h6 = document.querySelector(".m-portlet__head-title h6.m-portlet__head-text");
  if (h6 && h6.textContent) {
    const texto = h6.textContent.trim();
    const match = texto.match(/:\s*(\d+)/);
    if (match) return match[1];
    const m2 = texto.match(/^\s*(\d+)\s*-/);
    if (m2) return m2[1];
  }
  const ths = Array.from(document.querySelectorAll("th"));
  for (const th of ths) {
    const txt = (th.textContent || "").toLowerCase();
    if (txt.includes("código") || txt.includes("codigo")) {
      const tr = th.closest("tr");
      if (tr) {
        const h2 = tr.querySelector("h2");
        if (h2 && h2.textContent) return h2.textContent.trim();
      }
    }
  }
  return null;
}

// Helper: protocolo do atendimento (primeiro número antes de :)
function getProtocoloAtendimento() {
  const h6 = document.querySelector("h6.m-portlet__head-text");
  if (h6 && h6.textContent) {
    const texto = h6.textContent.trim();
    const match = texto.match(/^(\d+):/);
    if (match) return match[1];
  }
  return null;
}

async function fetchCadastroDoc(codigo) {
  const urlCadastro = `https://intranetclt01.mgconecta.com.br:8443/cadastro.php?id=${codigo}`;
  const res = await fetch(urlCadastro, { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar cadastro");
  const html = await res.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

function getValorDireto(doc, label) {
  const rows = Array.from(doc.querySelectorAll("tr"));
  for (const tr of rows) {
    const th = tr.querySelector("th");
    if (!th) continue;
    const thText = (th.textContent || "").replace(/\u00a0/g, " ").trim().toLowerCase();
    if (thText.startsWith(label.toLowerCase())) {
      const tds = tr.querySelectorAll("td");
      if (tds.length > 0) {
        const td = tds[tds.length - 1];
        const clone = td.cloneNode(true);
        Array.from(clone.querySelectorAll("input,button,select,textarea,strong,a,span,h2")).forEach(el => el.remove());
        return (clone.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
      }
    }
  }
  return null;
}

// ==============================
// Leitura de nome bruto (sem sanitização)
// ==============================
function getNomeClienteDoServico(doc) {
  if (!doc) doc = document;
  const h6 = doc.querySelector("h6.m-portlet__head-text");
  if (h6 && h6.textContent) {
    const raw = h6.textContent.trim();
    // tenta padrão "codigo : 1234 - Nome - ..."
    const m = raw.match(/:\s*\d+\s*-\s*([^-\n\r]+)/) || raw.match(/^\s*\d+\s*-\s*([^-\n\r]+)/);
    if (m && m[1]) return m[1].trim();
    const parts = raw.split("-").map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[1];
    return raw;
  }
  const input = doc.querySelector("input[name='cliente']");
  if (input) {
    const attr = input.getAttribute("value");
    if (attr !== null && attr !== undefined && String(attr).trim() !== "") return String(attr).trim();
    if (input.value !== undefined && String(input.value).trim() !== "") return String(input.value).trim();
  }
  const rows = Array.from(doc.querySelectorAll("tr"));
  for (const tr of rows) {
    const th = tr.querySelector("th");
    if (!th) continue;
    const thText = (th.textContent || "").replace(/\u00A0/g, " ").trim().toLowerCase();
    if (thText.startsWith("cliente")) {
      const h2 = tr.querySelector("td h2");
      if (h2 && h2.textContent && h2.textContent.trim()) return h2.textContent.trim();
      const td = tr.querySelector("td");
      if (td && td.textContent && td.textContent.trim()) return td.textContent.trim();
    }
  }
  const candidate = doc.querySelector("[id*='cliente'], [class*='cliente']");
  if (candidate) {
    if (candidate.tagName === "INPUT" || candidate.tagName === "TEXTAREA") {
      const v = candidate.getAttribute("value") || candidate.value || "";
      if (v && String(v).trim()) return String(v).trim();
    } else {
      const t = candidate.textContent || "";
      if (t && t.trim()) return t.trim();
    }
  }
  return "";
}

// ==============================
// Extração de IP WAN
// ==============================
function extractIpWanStrong(doc) {
  if (!doc) doc = document;
  const ipv4 = /\b(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?:25[0-5]|2[0-4]\d|1?\d{1,2})){3}\b/;
  const rows = Array.from(doc.querySelectorAll("tr"));
  for (const tr of rows) {
    const th = tr.querySelector("th");
    if (!th) continue;
    const thText = (th.textContent || "").toLowerCase().replace(/\u00A0/g, " ").trim();
    if (thText.includes("endereço wan") || thText.includes("endereco wan") || thText.startsWith("endereço wan:") || thText.startsWith("endereco wan:")) {
      const td = tr.querySelector("td");
      if (!td) continue;
      const strong = td.querySelector("strong");
      if (strong && strong.textContent) {
        const txt = strong.textContent.trim();
        const m = txt.match(ipv4);
        if (m) return m[0];
        const tdText = td.textContent || "";
        const m2 = tdText.match(ipv4);
        if (m2) return m2[0];
      } else {
        const tdText = td.textContent || "";
        const m3 = tdText.match(ipv4);
        if (m3) return m3[0];
      }
    }
  }
  const strongs = Array.from(doc.querySelectorAll("td strong"));
  for (const s of strongs) {
    const txt = (s.textContent || "").trim();
    const m = txt.match(ipv4);
    if (m) return m[0];
  }
  const bodyText = (doc.body && doc.body.textContent) ? doc.body.textContent : "";
  const mAll = bodyText.match(ipv4);
  if (mAll) return mAll[0];
  return null;
}

// ==============================
// Coleta de dados do serviço e Zabbix (nome bruto)
// ==============================
async function coletarDadosServico(codigoCadastro, codigoServico) {
  const url = `https://intranetclt01.mgconecta.com.br:8443/servicos_fibra_alterar.php?id=${codigoCadastro}&id_servico=${codigoServico}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar serviço");
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const dados = {};
  const btnRouter = doc.querySelector("input[name='pppoe_server']");
  if (btnRouter) {
    const onclick = btnRouter.getAttribute("onclick") || "";
    const match = onclick.match(/'(http:\/\/[0-9.]+):\d+/);
    if (match) dados.router = match[1];
  }
  dados.olt = getValorDireto(doc, "OLT");
  dados.oltSlot = getValorDireto(doc, "OLT Slot");
  dados.slotPorta = getValorDireto(doc, "Slot Porta");
  dados.cto = getValorDireto(doc, "CTO");
  try { dados.ip = extractIpWanStrong(doc); } catch (err) { dados.ip = null; }
  return dados;
}

async function coletarDadosZabbix(codigoCadastro, codigoServico) {
  const url = `https://intranetclt01.mgconecta.com.br:8443/servicos_fibra_alterar.php?id=${codigoCadastro}&id_servico=${codigoServico}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar serviço");
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const rawNomeCliente = getNomeClienteDoServico(doc) || "";

  const olt = getValorDireto(doc, "OLT");
  const ctoRaw = getValorDireto(doc, "CTO");
  const cto = ctoRaw ? ctoRaw.replace(/\s*\/\s*\d+$/, "").trim() : null;

  let ip = null;
  try { ip = extractIpWanStrong(doc); } catch (err) { ip = null; }

  return { codigoCadastro, nomeCliente: rawNomeCliente, codigoServico, olt, cto, ip };
}

// ==============================
// Formatação de textos e cópia
// ==============================
function formatarDadosTextoSolicitacao(dados) {
  return [
    `Router: ${dados.router || "-"} <br>`,
    `OLT:        ${dados.olt || "-"} <br>`,
    `OLT Slot:   ${dados.oltSlot || "-"} <br>`,
    `Slot Porta: ${dados.slotPorta || "-"} <br>`,
    `CTO:        ${dados.cto || "-"} <br>`
  ].join("\n");
}

function formatarDadosZabbix(dados) {
  const partes = [
    dados.codigoCadastro,
    dados.nomeCliente,
    `Servico ${dados.codigoServico}`,
    dados.olt
  ];
  if (dados.cto) {
    if (dados.ip) partes.push(`CTO ${dados.cto} ${dados.ip}`);
    else partes.push(`CTO ${dados.cto}`);
  } else if (dados.ip) {
    partes.push(dados.ip);
  }
  return partes.filter(Boolean).join(" - ");
}

async function copyToClipboardRobusto(text) {
  try {
    if (text === undefined || text === null) return false;
    const str = String(text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(str); return true; } catch (err) {}
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = str;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      ta.setAttribute("aria-hidden", "true");
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return true;
    } catch (err) {}
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.4)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "2147483647";
    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.padding = "12px";
    box.style.borderRadius = "6px";
    box.style.maxWidth = "90%";
    box.style.width = "640px";
    box.style.boxShadow = "0 6px 24px rgba(0,0,0,0.3)";
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.style.width = "100%";
    ta.style.height = "200px";
    ta.style.fontSize = "13px";
    ta.style.padding = "8px";
    box.appendChild(ta);
    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.justifyContent = "flex-end";
    btns.style.gap = "8px";
    btns.style.marginTop = "8px";
    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar (Ctrl+C)";
    btnCopiar.style.padding = "6px 10px";
    btnCopiar.onclick = () => { ta.select(); try { document.execCommand("copy"); } catch(e) {} if (modal.parentNode) modal.parentNode.removeChild(modal); };
    const btnFechar = document.createElement("button");
    btnFechar.textContent = "Fechar";
    btnFechar.style.padding = "6px 10px";
    btnFechar.onclick = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
    btns.appendChild(btnCopiar);
    btns.appendChild(btnFechar);
    box.appendChild(btns);
    modal.appendChild(box);
    document.body.appendChild(modal);
    ta.focus();
    ta.select();
    return false;
  } catch (err) {
    return false;
  }
}
// ==============================
// Painel e posicionamento
// ==============================
let painelServicos = null;

function posicionarPainelFrenteDoBotao(botao, painel) {
  if (!botao || !painel) return;
  const rect = botao.getBoundingClientRect();
  painel.style.position = "absolute";
  painel.style.visibility = "hidden";
  
  // Adiciona ao body para calcular o tamanho real
  document.body.appendChild(painel);
  const temp = painel.getBoundingClientRect();
  
  const margem = 12; // Espaço entre o botão e o painel
  
  // Cálculo para centralizar horizontalmente e posicionar acima (vertical)
  const left = rect.left + window.scrollX + (rect.width / 2) - (temp.width / 2);
  const top = rect.top + window.scrollY - temp.height - margem;

  painel.style.left = `${Math.max(8, left)}px`;
  painel.style.top = `${Math.max(8, top)}px`;
  painel.style.visibility = "visible";
  
  // Adiciona animação de subida (opcional, se estiver no seu CSS)
  painel.style.animation = "slideUp 0.3s ease";
}

// ==============================
// Solicitação (mantido)
// ==============================
async function abrirSolicitacao() {
  const codigoCadastro = getCodigoCadastro();
  if (!codigoCadastro) { alert("Não foi possível encontrar o código do cliente."); return; }
  if (painelServicos) { painelServicos.remove(); painelServicos = null; }
  let doc;
  try { doc = await fetchCadastroDoc(codigoCadastro); } catch (e) { return; }
  const linhas = Array.from(doc.querySelectorAll("tbody tr"));
  const servicosFibra = [];
  linhas.forEach(tr => {
    const th = tr.querySelector("th");
    if (th && th.textContent && th.textContent.includes("Fibra")) {
      const textoServico = th.textContent.trim();
      const codigoServico = textoServico.split(" - ")[0];
      servicosFibra.push({ codigoServico });
    }
  });
  if (servicosFibra.length === 0) { alert("Nenhum serviço de Fibra encontrado no cadastro."); return; }

  painelServicos = document.createElement("div");
  painelServicos.style.position = "absolute";
  painelServicos.style.display = "flex";
  painelServicos.style.flexDirection = "row";
  painelServicos.style.gap = "6px";
  painelServicos.style.background = "transparent";
  painelServicos.style.zIndex = "2147483647";

  servicosFibra.forEach(({ codigoServico }) => {
    const btnServico = document.createElement("button");
    btnServico.className = "ce-button ce-service-button";
    btnServico.textContent = codigoServico;
    btnServico.addEventListener("click", async () => {
      try {
        const dados = await coletarDadosServico(codigoCadastro, codigoServico);
        const listaTexto = formatarDadosTextoSolicitacao(dados);
        await copyToClipboardRobusto(listaTexto);
      } finally {
        if (painelServicos) { painelServicos.remove(); painelServicos = null; }
      }
    });
    painelServicos.appendChild(btnServico);
  });

  const botaoSolicitacao = document.querySelector(".ce-buttons-container .ce-button:nth-child(2)");
  posicionarPainelFrenteDoBotao(botaoSolicitacao, painelServicos);
}
// Copiar dados
function abrirCopiarDados(e) {
  if (painelServicos) {
    painelServicos.remove();
    painelServicos = null;
  }

  // Criamos o painel vertical igual ao do Zabbix (Foto 2)
  painelServicos = document.createElement("div");
  painelServicos.style.position = "absolute";
  painelServicos.style.display = "flex";
  painelServicos.style.flexDirection = "column";
  painelServicos.style.gap = "6px";
  painelServicos.style.background = "transparent";
  painelServicos.style.zIndex = "2147483647";

  // Busca as tabelas de dados na página
  const tabelas = Array.from(document.querySelectorAll('table[width="750"]'));

  if (tabelas.length === 0) {
    const btnAviso = document.createElement("button");
    btnAviso.className = "ce-button ce-service-button";
    btnAviso.textContent = "Nenhum dado encontrado";
    painelServicos.appendChild(btnAviso);
  } else {
    tabelas.forEach((tabela) => {
      let nomeCliente = "";
      let endereco = "";

      const celulas = Array.from(tabela.querySelectorAll('th, td'));
      celulas.forEach((celula, index) => {
        const texto = (celula.textContent || "").trim().toLowerCase();
        if (texto.includes("cliente:")) {
          nomeCliente = celulas[index + 1]?.textContent.trim() || "";
        }
        if (texto.includes("endereço:")) {
          endereco = celulas[index + 1]?.textContent.trim() || "";
        }
      });

      if (endereco) {
        const btnServico = document.createElement("button");
        btnServico.className = "ce-button ce-service-button";
        
        // Estilo do botão: Apenas o endereço completo, sem o nome do cliente
        btnServico.style.textAlign = "center";
        btnServico.style.whiteSpace = "normal"; // Permite quebra de linha se o endereço for muito longo
        btnServico.style.lineHeight = "1.2";
        btnServico.style.padding = "10px 15px";
        btnServico.innerHTML = `<div style="font-size:11px; font-weight:600;">${endereco}</div>`;
        
        btnServico.addEventListener("click", async () => {
          // O texto copiado continua contendo o nome para a frase fazer sentido
          const textoFinal = `, só queria confirmar algumas informações com você. O cadastro está no nome de ${nomeCliente}, certo? E o endereço para atendimento é o ${endereco}?`;
          
          const copiou = await copyToClipboardRobusto(textoFinal);
          if (copiou || !copiou) {
            const originalHTML = btnServico.innerHTML;
            btnServico.innerHTML = "✅ Copiado!";
            setTimeout(() => {
              if (painelServicos) {
                painelServicos.remove();
                painelServicos = null;
              }
            }, 600);
          }
        });
        painelServicos.appendChild(btnServico);
      }
    });
  }

  // Posiciona o menu acima do botão "Copiar Dados"
  const botaoReferencia = e.target.closest(".ce-button");
  posicionarPainelFrenteDoBotao(botaoReferencia, painelServicos);
}// Links (Histórico / Link do At. / Serviço)
async function abrirLinks() {
  const codigoCadastro = getCodigoCadastro();
  if (!codigoCadastro) { alert("Não foi possível encontrar o código do cliente."); return; }

  // fecha painel anterior, se houver
  if (painelServicos) { painelServicos.remove(); painelServicos = null; }

  const botaoLinks = document.querySelector(".ce-buttons-container .ce-button:nth-child(1)");

  // painel com 3 opções empilhadas
  painelServicos = document.createElement("div");
  painelServicos.style.position = "absolute";
  painelServicos.style.display = "flex";
  painelServicos.style.flexDirection = "column";
  painelServicos.style.gap = "6px";
  painelServicos.style.background = "transparent";
  painelServicos.style.zIndex = "2147483647";

  // 1) Histórico (igual ao atual)
  const btnHistorico = document.createElement("button");
  btnHistorico.className = "ce-button ce-service-button";
  btnHistorico.textContent = "Histórico";
  btnHistorico.addEventListener("click", () => {
    window.open(
      `https://intranetclt01.mgconecta.com.br:8443/atendimento_historico_fechado.php?id=${codigoCadastro}`,
      "popupHistorico",
      "width=800,height=600,scrollbars=yes"
    );
    if (painelServicos) { painelServicos.remove(); painelServicos = null; }
  });

  // 2) Link do At. (usa protocolo antes do :)
  const btnLinkAt = document.createElement("button");
  btnLinkAt.className = "ce-button ce-service-button";
  btnLinkAt.textContent = "Link do At.";
  btnLinkAt.addEventListener("click", () => {
    const protocolo = getProtocoloAtendimento();
    if (!protocolo) { alert("Protocolo não encontrado."); return; }
    const url = `https://intranetclt01.mgconecta.com.br:8443/atendimento_iniciar_new.php?id=${protocolo}&id_cliente=${codigoCadastro}`;
    window.open(url, "popupAtendimento", "width=800,height=600,scrollbars=yes");
    if (painelServicos) { painelServicos.remove(); painelServicos = null; }
  });

  // 3) Serviço (lista serviços fibra e abre o escolhido)
  const btnServico = document.createElement("button");
  btnServico.className = "ce-button ce-service-button";
  btnServico.textContent = "Serviço";
  btnServico.addEventListener("click", async () => {
    painelServicos.innerHTML = "";
    let doc;
    try { doc = await fetchCadastroDoc(codigoCadastro); } catch (e) { alert("Erro ao carregar cadastro."); return; }
    const linhas = Array.from(doc.querySelectorAll("tbody tr"));
    const servicosFibra = [];
    linhas.forEach(tr => {
      const th = tr.querySelector("th");
      if (th && th.textContent && th.textContent.includes("Fibra")) {
        const textoServico = th.textContent.trim();
        const codigoServico = textoServico.split(" - ")[0];
        servicosFibra.push({ codigoServico });
      }
    });
    if (servicosFibra.length === 0) {
      alert("Nenhum serviço de Fibra encontrado no cadastro.");
      if (painelServicos) { painelServicos.remove(); painelServicos = null; }
      return;
    }
    servicosFibra.forEach(({ codigoServico }) => {
      const btn = document.createElement("button");
      btn.className = "ce-button ce-service-button";
      btn.textContent = codigoServico;
      btn.addEventListener("click", () => {
        const url = `https://intranetclt01.mgconecta.com.br:8443/servicos_fibra_alterar.php?id=${codigoCadastro}&id_servico=${codigoServico}`;
        window.open(url, "popupServico", "width=900,height=700,scrollbars=yes");
        if (painelServicos) { painelServicos.remove(); painelServicos = null; }
      });
      painelServicos.appendChild(btn);
    });

    posicionarPainelFrenteDoBotao(botaoLinks, painelServicos);
  });

  // monta painel
  painelServicos.appendChild(btnHistorico);
  painelServicos.appendChild(btnLinkAt);
  painelServicos.appendChild(btnServico);

  // posiciona junto ao primeiro botão
  posicionarPainelFrenteDoBotao(botaoLinks, painelServicos);
}

// ==============================
// Zabbix: primeiro mostra Dados/CTO empilhados, depois lista serviços
// ==============================
async function abrirZabbix() {
  const codigoCadastro = getCodigoCadastro();
  if (!codigoCadastro) {
    alert("Não foi possível encontrar o código do cliente.");
    return;
  }

  if (painelServicos) {
    painelServicos.remove();
    painelServicos = null;
  }

  const botaoZabbix = document.querySelector(".ce-buttons-container .ce-button:nth-child(3)");

  // painel inicial (Dados / CTO)
  painelServicos = document.createElement("div");
  painelServicos.style.position = "absolute";
  painelServicos.style.display = "flex";
  painelServicos.style.flexDirection = "column";
  painelServicos.style.gap = "6px";
  painelServicos.style.background = "transparent";
  painelServicos.style.zIndex = "2147483647";

  const btnDados = document.createElement("button");
  btnDados.className = "ce-button ce-service-button";
  btnDados.textContent = "Dados";
  btnDados.addEventListener("click", async () => {
    painelServicos.innerHTML = "";
    let doc;
    try { doc = await fetchCadastroDoc(codigoCadastro); } catch (e) { return; }
    const linhas = Array.from(doc.querySelectorAll("tbody tr"));
    const servicosFibra = [];
    linhas.forEach(tr => {
      const th = tr.querySelector("th");
      if (th && th.textContent && th.textContent.includes("Fibra")) {
        const textoServico = th.textContent.trim();
        const codigoServico = textoServico.split(" - ")[0];
        servicosFibra.push({ codigoServico });
      }
    });
    servicosFibra.forEach(({ codigoServico }) => {
      const btnServico = document.createElement("button");
      btnServico.className = "ce-button ce-service-button";
      btnServico.textContent = codigoServico;
      btnServico.addEventListener("click", async () => {
        try {
          const dados = await coletarDadosZabbix(codigoCadastro, codigoServico);
          const texto = formatarDadosZabbix(dados);
          await copyToClipboardRobusto(texto);
        } finally {
          if (painelServicos) { painelServicos.remove(); painelServicos = null; }
        }
      });
      painelServicos.appendChild(btnServico);
    });
    posicionarPainelFrenteDoBotao(botaoZabbix, painelServicos);
  });

  const btnCto = document.createElement("button");
  btnCto.className = "ce-button ce-service-button";
  btnCto.textContent = "CTO";
  btnCto.addEventListener("click", async () => {
    painelServicos.innerHTML = "";
    let doc;
    try { doc = await fetchCadastroDoc(codigoCadastro); } catch (e) { return; }
    const linhas = Array.from(doc.querySelectorAll("tbody tr"));
    const servicosFibra = [];
    linhas.forEach(tr => {
      const th = tr.querySelector("th");
      if (th && th.textContent && th.textContent.includes("Fibra")) {
        const textoServico = th.textContent.trim();
        const codigoServico = textoServico.split(" - ")[0];
        servicosFibra.push({ codigoServico });
      }
    });
    servicosFibra.forEach(({ codigoServico }) => {
      const btnServico = document.createElement("button");
      btnServico.className = "ce-button ce-service-button";
      btnServico.textContent = codigoServico;
      btnServico.addEventListener("click", async () => {
        try {
          const dados = await coletarDadosZabbix(codigoCadastro, codigoServico);
          if (dados.cto) {
            const numeroCto = dados.cto.replace(/\s*\/\s*\d+$/, "").trim();
            const urlMapa = `https://intranetclt01.mgconecta.com.br:8443/fibra_caixas_mapa.php?id_cto=${numeroCto}`;
            window.open(urlMapa, "popupCTO", "width=800,height=600,scrollbars=yes");
          } else {
            alert("CTO não encontrada para este serviço.");
          }
        } finally {
          if (painelServicos) { painelServicos.remove(); painelServicos = null; }
        }
      });
      painelServicos.appendChild(btnServico);
    });
    posicionarPainelFrenteDoBotao(botaoZabbix, painelServicos);
  });

  painelServicos.appendChild(btnDados);
  painelServicos.appendChild(btnCto);

  posicionarPainelFrenteDoBotao(botaoZabbix, painelServicos);
}
function abrirZabbixPopup() {
  const existente = document.querySelector(".ce-zabbix-popup");
  if (existente) existente.remove();

  const botaoZabbix = document.querySelector(".ce-buttons-container .ce-button:nth-child(1)");
  if (!botaoZabbix) { alert("Botão Zabbix não encontrado."); return; }

  const popup = document.createElement("div");
  popup.className = "ce-zabbix-popup";
  popup.style.position = "fixed";
  popup.style.background = "#fff";
  popup.style.padding = "12px";
  popup.style.borderRadius = "6px";
  popup.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
  popup.style.zIndex = "2147483647";
  popup.style.minWidth = "280px";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "8px";

  // campo para digitar código
  const campoCodigo = document.createElement("input");
  campoCodigo.type = "text";
  campoCodigo.placeholder = "Digite o código do cadastro";
  campoCodigo.style.width = "100%";
  campoCodigo.style.padding = "6px";
  popup.appendChild(campoCodigo);

  // botões
  const botoes = document.createElement("div");
  botoes.style.display = "flex";
  botoes.style.justifyContent = "flex-end";
  botoes.style.gap = "8px";

  const btnGerar = document.createElement("button");
  btnGerar.className = "ce-button";
  btnGerar.textContent = "Coletar";
  btnGerar.onclick = async () => {
    const codigoCadastro = campoCodigo.value.trim();
    if (!codigoCadastro) { alert("Digite um código válido."); return; }

    let doc;
    try { doc = await fetchCadastroDoc(codigoCadastro); } catch (e) { alert("Erro ao carregar cadastro."); return; }
    const linhas = Array.from(doc.querySelectorAll("tbody tr"));
    const servicosFibra = [];
    linhas.forEach(tr => {
      const th = tr.querySelector("th");
      if (th && th.textContent && th.textContent.includes("Fibra")) {
        const textoServico = th.textContent.trim();
        const codigoServico = textoServico.split(" - ")[0];
        servicosFibra.push({ codigoServico });
      }
    });
    if (servicosFibra.length === 0) { alert("Nenhum serviço de Fibra encontrado."); return; }

    const dados = await coletarDadosZabbix(codigoCadastro, servicosFibra[0].codigoServico);
    const texto = formatarDadosZabbix(dados);
    await copyToClipboardRobusto(texto);

    popup.remove();
  };

  const btnFechar = document.createElement("button");
  btnFechar.className = "ce-button";
  btnFechar.textContent = "Fechar";
  btnFechar.onclick = () => popup.remove();

  botoes.appendChild(btnGerar);
  botoes.appendChild(btnFechar);
  popup.appendChild(botoes);

  document.body.appendChild(popup);

  // ✅ Aceitar Enter para iniciar a coleta
  campoCodigo.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      btnGerar.click();
    }
  });

  // posiciona ao lado do botão
  const rect = botaoZabbix.getBoundingClientRect();
  const margem = 8;
  let left = rect.right + margem;
  let top = rect.top;
  const popupRect = popup.getBoundingClientRect();
  if (left + popupRect.width > window.innerWidth - 8) {
    left = rect.left - popupRect.width - margem;
    if (left < 8) left = 8;
  }
  if (top + popupRect.height > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - popupRect.height - 8);
  }
  if (top < 8) top = 8;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  // fecha ao clicar fora
  const onDocClick = (ev) => {
    if (!popup.contains(ev.target) && ev.target !== botaoZabbix) {
      popup.remove();
      document.removeEventListener("mousedown", onDocClick);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
}// ==============================
// ==============================
// Botão Monitoramento (Botão 4)
// ==============================
function abrirMonitoramento() {
  // fecha popup anterior, se existir
  const existente = document.querySelector(".ce-monitoramento-popup");
  if (existente) existente.remove();

  // encontra o botão Monitoramento (4º botão da coluna)
  const botaoMonitoramento = document.querySelector(".ce-buttons-container .ce-button:nth-child(4)");
  if (!botaoMonitoramento) return;

  // cria popup
  const popup = document.createElement("div");
  popup.className = "ce-monitoramento-popup";
  popup.style.position = "fixed"; 
  
  // CORES DO PAINEL (IGUAL DADOS/CTO)
  popup.style.background = "rgba(15, 23, 42, 0.98)"; 
  popup.style.padding = "12px";
  popup.style.borderRadius = "6px";
  popup.style.border = "1px solid rgba(255, 255, 255, 0.2)";
  popup.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
  popup.style.zIndex = "2147483647";
  popup.style.minWidth = "320px";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "8px";

  // Estilo dos inputs para o tema escuro
  const estiloInput = (el) => {
    el.style.background = "rgba(255,255,255,0.05)";
    el.style.border = "1px solid rgba(255,255,255,0.1)";
    el.style.color = "white";
    el.style.padding = "6px";
    el.style.borderRadius = "4px";
    el.style.fontSize = "12px";
    el.style.width = "100%";
    el.style.boxSizing = "border-box";
  };

  // campo principal
  const campoPrincipal = document.createElement("input");
  campoPrincipal.type = "text";
  campoPrincipal.placeholder = "Link principal";
  estiloInput(campoPrincipal);
  popup.appendChild(campoPrincipal);

  // 4 linhas empilhadas
  const camposComparativos = [];
  for (let i = 0; i < 4; i++) {
    const linha = document.createElement("div");
    linha.style.display = "flex";
    linha.style.gap = "6px";

    const campoLink = document.createElement("input");
    campoLink.placeholder = `Link ${i + 1}`;
    campoLink.style.flex = "2";
    estiloInput(campoLink);

    const campoCodigo = document.createElement("input");
    campoCodigo.placeholder = `Código ${i + 1}`;
    campoCodigo.style.flex = "1";
    estiloInput(campoCodigo);

    camposComparativos.push({ campoLink, campoCodigo });
    linha.appendChild(campoLink);
    linha.appendChild(campoCodigo);
    popup.appendChild(linha);
  }

  // BOTÃO GERAR (IGUAL DADOS/CTO)
  const btnGerar = document.createElement("button");
  
  // Adicionando a classe 'ce-service-button' para herdar o estilo de Dados/CTO
  btnGerar.className = "ce-button ce-service-button"; 
  btnGerar.textContent = "Gerar e Copiar Texto";
  
  // Ajustes de layout para manter o padrão do popup
  btnGerar.style.width = "100%";
  btnGerar.style.marginTop = "5px";
  btnGerar.style.cursor = "pointer";
  
  // Nota: Removi as cores manuais (rgba) para que ele use 
  // exatamente o que o seu CSS define para a classe ce-service-button

  btnGerar.onclick = () => {
    const linkPrincipal = campoPrincipal.value.trim();
    if (!linkPrincipal) return;

    let resultado = `<a href="${linkPrincipal}">Monitoramento</a>`;
    const comparativoAnchors = camposComparativos
      .map(({ campoLink, campoCodigo }) => {
        const link = campoLink.value.trim();
        const codigo = campoCodigo.value.trim();
        return link && codigo ? `<a href="${link}">${codigo}</a>` : null;
      }).filter(Boolean);

    resultado += comparativoAnchors.length > 0 ? `. Adicionados clientes ${comparativoAnchors.join(", ")}, para comparativo.` : ".";

    copyToClipboardRobusto(resultado);
    popup.remove();
  };

  popup.appendChild(btnGerar);
  document.body.appendChild(popup);

  // SUA LÓGICA DE POSICIONAMENTO ORIGINAL (MANTIDA 100%)
  const rect = botaoMonitoramento.getBoundingClientRect();
  const margem = 8;
  let left = rect.right + margem;
  let top = rect.top;

  const popupRect = popup.getBoundingClientRect();
  const overflowRight = left + popupRect.width - window.innerWidth;
  const overflowBottom = top + popupRect.height - window.innerHeight;

  if (overflowRight > 0) {
    left = rect.left - popupRect.width - margem;
    if (left < 8) left = 8;
  }
  if (overflowBottom > 0) {
    top = Math.max(8, window.innerHeight - popupRect.height - 8);
  }
  if (top < 8) top = 8;

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  const onDocClick = (ev) => {
    if (!popup.contains(ev.target) && ev.target !== botaoMonitoramento) {
      popup.remove();
      document.removeEventListener("mousedown", onDocClick);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
}// ==============================
// Criação dos botões fixos
// ==============================
function createButtonsWithToggle(buttonLabels, actions) {
  const existing = document.querySelector(".ce-container");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.className = "ce-container ce-buttons-container";

  const buttonsWrapper = document.createElement("div");
  buttonsWrapper.className = "ce-wrapper";

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "ce-toggle";
  toggleBtn.textContent = "›";

  buttonLabels.forEach((label, idx) => {
    const btn = document.createElement("button");
    btn.className = "ce-button";
    btn.textContent = label;
    
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      // LÓGICA DE TOGGLE:
      // Se já existe um painel e o botão clicado é o mesmo que o abriu, removemos e paramos.
      if (painelServicos && btn.getAttribute("data-active") === "true") {
        painelServicos.remove();
        painelServicos = null;
        btn.removeAttribute("data-active");
        return;
      }

      // Se clicar em um botão DIFERENTE enquanto um painel está aberto, limpa o anterior
      if (painelServicos) {
        painelServicos.remove();
        painelServicos = null;
      }

      // Marca qual botão está ativo
      document.querySelectorAll(".ce-button").forEach(b => b.removeAttribute("data-active"));
      btn.setAttribute("data-active", "true");
      
      actions[idx](e);
    });
    
    buttonsWrapper.appendChild(btn);
  });

  // Mantém a lógica do toggle lateral (esconder a barra)
  let visivel = true;
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    visivel = !visivel;
    if (visivel) {
      buttonsWrapper.classList.remove("hidden");
      toggleBtn.textContent = "›";
    } else {
      buttonsWrapper.classList.add("hidden");
      toggleBtn.textContent = "‹";
      if (painelServicos) { painelServicos.remove(); painelServicos = null; }
    }
  });

  container.appendChild(buttonsWrapper);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);
} // <--- Esta chave fecha a função createButtonsWithToggle corretamente

// ==============================
// Inicialização e Lógica de Fechamento
// ==============================

document.addEventListener("mousedown", (ev) => {
  if (painelServicos) {
    const clicouNoBotaoPrincipal = ev.target.closest(".ce-button");
    const clicouNoPopupZabbix = ev.target.closest(".ce-zabbix-popup");
    const clicouNoPopupMonitoramento = ev.target.closest(".ce-monitoramento-popup");

    if (!painelServicos.contains(ev.target) && 
        !clicouNoBotaoPrincipal && 
        !clicouNoPopupZabbix && 
        !clicouNoPopupMonitoramento) {
      
      painelServicos.remove();
      painelServicos = null;

      document.querySelectorAll(".ce-button").forEach(b => b.removeAttribute("data-active"));
    }
  }
});

const url = window.location.href;

// Regra 1: Atendimento New
if (url.startsWith("https://intranetclt01.mgconecta.com.br:8443/atendimento_usuarios_new_ajax.php")) {
  createButtonsWithToggle(
    ["Links", "Solicitação", "Zabbix", "Monitoramento"],
    [abrirLinks, abrirSolicitacao, abrirZabbix, abrirMonitoramento]
  );
} 
// Regra 2: Mapa de Caixas
else if (url.startsWith("https://intranetclt01.mgconecta.com.br:8443/fibra_caixas_mapa.php?")) {
  createButtonsWithToggle(
    ["Zabbix"],
    [abrirZabbixPopup]
  );
}
// Regra 3: NOVO - Pesquisa de Cadastro e Resultados
else if (url.includes("cadastro_pesquisar_pop.php") || url.includes("cadastro_pesquisar_resultados_pop.php")) {
  createButtonsWithToggle(
    ["Copiar Dados"],
    [abrirCopiarDados]
  );
}