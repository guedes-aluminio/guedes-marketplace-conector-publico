function jsonSeguro(valor) {
  return JSON.stringify(valor)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function renderizarPainelAtendimentos(dados) {
  const atendimentos =
    Array.isArray(dados.atendimentos)
      ? dados.atendimentos
      : [];

  const dadosPainel = {
    resumo: {
      total_conversas:
        Number(dados.total_conversas || 0),

      aguardando_resposta:
        Number(dados.aguardando_resposta || 0),

      respondidas:
        Number(dados.respondidas || 0),

      shopee_pendentes:
        Number(dados.shopee_pendentes || 0),

      mercado_livre_pendentes:
        Number(dados.mercado_livre_pendentes || 0),

      reclamacoes_pendentes:
        Number(dados.reclamacoes_pendentes || 0),
    },

    atendimentos,
  };

  return `
<!DOCTYPE html>

<html lang="pt-BR">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Guedes | Central de Atendimentos</title>
  <style>

    * {
      box-sizing: border-box;
    }

    :root {
      --fundo: #f5f6f8;
      --painel: #ffffff;
      --painel-secundario: #fafafa;
      --borda: #e5e7eb;
      --borda-forte: #d1d5db;

      --texto: #18181b;
      --texto-secundario: #71717a;
      --texto-suave: #a1a1aa;

      --preto: #111827;
      --preto-hover: #1f2937;

      --verde: #16a34a;
      --verde-fundo: #f0fdf4;

      --vermelho: #dc2626;
      --vermelho-fundo: #fef2f2;

      --amarelo: #d97706;
      --amarelo-fundo: #fffbeb;

      --azul: #2563eb;
      --azul-fundo: #eff6ff;

      --laranja: #ea580c;
      --laranja-fundo: #fff7ed;

      --sombra:
        0 1px 2px rgba(0,0,0,.04),
        0 4px 12px rgba(0,0,0,.04);
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: var(--fundo);
      color: var(--texto);
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
    }

    body {
      overflow: hidden;
    }

    button,
    input,
    textarea {
      font: inherit;
    }

    button {
      cursor: pointer;
    }


    /* =====================================================
       TOPO
       ===================================================== */

    .barra-topo {
      height: 64px;
      background: #111827;
      color: white;

      display: flex;
      align-items: center;
      justify-content: space-between;

      padding: 0 22px;

      border-bottom:
        1px solid rgba(255,255,255,.06);
    }

    .marca {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .marca-icone {
      width: 38px;
      height: 38px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 10px;

      background:
        rgba(255,255,255,.1);

      font-size: 18px;
      font-weight: 800;
    }

    .marca-texto strong {
      display: block;
      font-size: 15px;
      line-height: 1.2;
    }

    .marca-texto span {
      display: block;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 3px;
    }

    .topo-acoes {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .botao-topo {
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.08);
      color: white;

      border-radius: 8px;
      padding: 8px 12px;

      font-size: 12px;
      font-weight: 600;
    }

    .botao-topo:hover {
      background: rgba(255,255,255,.14);
    }


    /* =====================================================
       ESTRUTURA PRINCIPAL
       ===================================================== */

    .app {
      height:
        calc(100vh - 64px);

      display: grid;

      grid-template-columns:
        220px
        minmax(310px, 390px)
        minmax(500px, 1fr);
    }


    /* =====================================================
       MENU LATERAL
       ===================================================== */

    .sidebar {
      background: white;

      border-right:
        1px solid var(--borda);

      padding: 18px 12px;

      overflow-y: auto;
    }

    .sidebar-titulo {
      padding: 0 10px;
      margin-bottom: 9px;

      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;

      color: var(--texto-suave);
      font-weight: 700;
    }

    .filtro {
      width: 100%;

      display: flex;
      align-items: center;
      justify-content: space-between;

      border: 0;
      background: transparent;

      padding: 10px 11px;

      border-radius: 8px;

      color: #3f3f46;

      font-size: 13px;
      text-align: left;

      margin-bottom: 2px;
    }

    .filtro:hover {
      background: #f4f4f5;
    }

    .filtro.ativo {
      background: #f0f1f3;
      color: #111827;
      font-weight: 700;
    }

    .filtro-info {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .filtro-icone {
      width: 18px;
      text-align: center;
    }

    .contador {
      min-width: 24px;

      padding: 2px 7px;

      border-radius: 999px;

      background: #f4f4f5;
      color: #71717a;

      font-size: 11px;
      text-align: center;
      font-weight: 600;
    }

    .filtro.ativo .contador {
      background: white;
      color: #18181b;
    }

    .sidebar-divisor {
      height: 1px;
      background: var(--borda);
      margin: 16px 10px;
    }


    /* =====================================================
       LISTA DE CONVERSAS
       ===================================================== */

    .coluna-conversas {
      background: #fafafa;

      border-right:
        1px solid var(--borda);

      display: flex;
      flex-direction: column;

      min-width: 0;
    }

    .conversas-topo {
      padding: 16px;

      border-bottom:
        1px solid var(--borda);

      background: white;
    }

    .conversas-titulo {
      display: flex;
      justify-content: space-between;
      align-items: center;

      margin-bottom: 13px;
    }

    .conversas-titulo strong {
      font-size: 16px;
    }

    .conversas-total {
      font-size: 12px;
      color: var(--texto-secundario);
    }

    .busca {
      width: 100%;

      border:
        1px solid var(--borda-forte);

      background: #fafafa;

      border-radius: 9px;

      padding: 10px 12px;

      outline: none;

      font-size: 13px;
    }

    .busca:focus {
      background: white;
      border-color: #9ca3af;

      box-shadow:
        0 0 0 3px rgba(17,24,39,.05);
    }

    .lista-conversas {
      flex: 1;
      overflow-y: auto;
    }

    .conversa-card {
      padding: 15px 16px;

      border-bottom:
        1px solid var(--borda);

      background: white;

      cursor: pointer;

      transition:
        background .12s ease,
        border .12s ease;
    }

    .conversa-card:hover {
      background: #fafafa;
    }

    .conversa-card.ativo {
      background: #f4f4f5;
      box-shadow:
        inset 3px 0 0 #111827;
    }

    .conversa-card.aguardando {
      border-left:
        3px solid var(--vermelho);
    }

    .conversa-card.respondido {
      border-left:
        3px solid var(--verde);
    }

    .conversa-linha1 {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .nome-cliente {
      font-size: 13px;
      font-weight: 700;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hora-lista {
      flex-shrink: 0;

      font-size: 10px;
      color: var(--texto-suave);
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;

      margin-top: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;

      padding: 3px 7px;

      border-radius: 999px;

      font-size: 9px;
      font-weight: 700;
    }

    .badge-meli {
      background: #fff7cc;
      color: #725c00;
    }

    .badge-shopee {
      background: #fff0eb;
      color: #c2410c;
    }

    .badge-tipo {
      background: #f4f4f5;
      color: #52525b;
    }

    .badge-alerta {
      background: var(--vermelho-fundo);
      color: var(--vermelho);
    }

    .preview {
      margin-top: 9px;

      color: #71717a;

      font-size: 12px;
      line-height: 1.45;

      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;

      overflow: hidden;
    }

    .produto-preview {
      margin-top: 8px;

      color: #3f3f46;

      font-size: 11px;
      font-weight: 600;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .aguardando-info {
      margin-top: 8px;

      font-size: 10px;
      color: var(--vermelho);
      font-weight: 700;
    }

    .lista-vazia {
      padding: 40px 20px;

      text-align: center;
      color: var(--texto-secundario);

      font-size: 13px;
    }


    /* =====================================================
       CONVERSA
       ===================================================== */

    .painel-conversa {
      min-width: 0;

      background: var(--fundo);

      display: flex;
      flex-direction: column;
    }

    .conversa-vazia {
      flex: 1;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      color: var(--texto-secundario);

      text-align: center;
      padding: 30px;
    }

    .conversa-vazia-icone {
      width: 58px;
      height: 58px;

      display: flex;
      align-items: center;
      justify-content: center;

      background: white;

      border: 1px solid var(--borda);
      border-radius: 16px;

      margin-bottom: 14px;

      font-size: 24px;
    }

    .detalhe {
      height: 100%;

      display: none;
      flex-direction: column;
    }

    .detalhe.visivel {
      display: flex;
    }


    /* =====================================================
       CABEÇALHO DA CONVERSA
       ===================================================== */

    .detalhe-topo {
      min-height: 74px;

      padding: 14px 20px;

      background: white;

      border-bottom:
        1px solid var(--borda);

      display: flex;
      justify-content: space-between;
      align-items: center;

      gap: 16px;
    }

    .detalhe-cliente {
      min-width: 0;
    }

    .detalhe-cliente strong {
      display: block;

      font-size: 15px;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .detalhe-cliente-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;

      margin-top: 6px;
    }

    .status-pill {
      padding: 5px 9px;

      border-radius: 999px;

      font-size: 10px;
      font-weight: 700;
    }

    .status-aguardando {
      background: var(--vermelho-fundo);
      color: var(--vermelho);
    }

    .status-respondido {
      background: var(--verde-fundo);
      color: var(--verde);
    }


    /* =====================================================
       CORPO
       ===================================================== */

    .detalhe-corpo {
      flex: 1;
      min-height: 0;

      display: grid;

      grid-template-columns:
        minmax(320px, 1fr)
        280px;
    }


    /* =====================================================
       CHAT
       ===================================================== */

    .chat-area {
      min-width: 0;

      display: flex;
      flex-direction: column;

      background:
        linear-gradient(
          180deg,
          #f8f9fa 0%,
          #f4f5f7 100%
        );
    }

    .historico {
      flex: 1;

      overflow-y: auto;

      padding:
        22px 28px;

      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .mensagem-linha {
      display: flex;
      width: 100%;
    }

    .mensagem-linha.cliente {
      justify-content: flex-start;
    }

    .mensagem-linha.atendente {
      justify-content: flex-end;
    }

    .bolha {
      max-width: 72%;

      padding:
        10px 13px 8px;

      border-radius: 12px;

      font-size: 13px;
      line-height: 1.5;

      white-space: pre-wrap;
      overflow-wrap: anywhere;

      box-shadow:
        0 1px 2px rgba(0,0,0,.05);
    }

    .cliente .bolha {
      background: white;

      border:
        1px solid var(--borda);

      border-bottom-left-radius: 4px;
    }

    .atendente .bolha {
      background: #111827;
      color: white;

      border-bottom-right-radius: 4px;
    }

    .mensagem-hora {
      margin-top: 5px;

      font-size: 9px;

      opacity: .6;

      text-align: right;
    }

    .separador-historico {
      text-align: center;

      color: var(--texto-suave);

      font-size: 10px;

      margin: 4px 0;
    }


    /* =====================================================
       RESPOSTA
       ===================================================== */

    .composer {
      background: white;

      border-top:
        1px solid var(--borda);

      padding: 14px 18px;
    }

    .composer-box {
      border:
        1px solid var(--borda-forte);

      border-radius: 11px;

      background: white;

      overflow: hidden;
    }

    .campo-resposta {
      display: block;

      width: 100%;
      min-height: 82px;

      resize: vertical;

      border: 0;
      outline: none;

      padding: 13px 14px;

      font-size: 13px;
      line-height: 1.45;

      color: var(--texto);
    }

    .composer-rodape {
      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 10px;

      padding:
        9px 10px;

      border-top:
        1px solid #f4f4f5;

      background:
        #fafafa;
    }

    .composer-status {
      font-size: 11px;

      color: var(--texto-secundario);
    }

    .composer-status.sucesso {
      color: var(--verde);
      font-weight: 700;
    }

    .composer-status.erro {
      color: var(--vermelho);
      font-weight: 700;
    }

    .botao-enviar {
      border: 0;

      background: #111827;
      color: white;

      padding: 9px 16px;

      border-radius: 7px;

      font-size: 12px;
      font-weight: 700;
    }

    .botao-enviar:hover {
      background: #1f2937;
    }

    .botao-enviar:disabled {
      opacity: .5;
      cursor: wait;
    }


    /* =====================================================
       CONTEXTO
       ===================================================== */

    .contexto {
      background: white;

      border-left:
        1px solid var(--borda);

      overflow-y: auto;

      padding: 18px;
    }

    .contexto-titulo {
      font-size: 11px;

      text-transform: uppercase;
      letter-spacing: .07em;

      color: var(--texto-suave);

      font-weight: 700;

      margin-bottom: 10px;
    }

    .contexto-bloco {
      border:
        1px solid var(--borda);

      border-radius: 10px;

      overflow: hidden;

      margin-bottom: 14px;

      background: white;
    }

    .contexto-bloco-titulo {
      padding:
        10px 12px;

      background:
        #fafafa;

      border-bottom:
        1px solid var(--borda);

      font-size: 11px;
      font-weight: 700;

      color: #52525b;
    }

    .contexto-conteudo {
      padding: 12px;
    }

    .produto-titulo {
      font-size: 12px;
      font-weight: 700;

      line-height: 1.4;

      margin-bottom: 9px;
    }

    .dado {
      display: flex;
      justify-content: space-between;

      gap: 12px;

      padding: 6px 0;

      border-bottom:
        1px solid #f4f4f5;

      font-size: 11px;
    }

    .dado:last-child {
      border-bottom: 0;
    }

    .dado span:first-child {
      color: var(--texto-secundario);
    }

    .dado span:last-child {
      color: var(--texto);

      font-weight: 600;

      text-align: right;

      overflow-wrap: anywhere;
    }

    .botao-link {
      width: 100%;

      border:
        1px solid var(--borda-forte);

      background: white;

      padding: 8px 10px;

      border-radius: 7px;

      font-size: 11px;
      font-weight: 700;

      margin-top: 10px;
    }

    .botao-link:hover {
      background: #fafafa;
    }


    /* =====================================================
       MOBILE
       ===================================================== */

    @media (max-width: 1050px) {

      .app {
        grid-template-columns:
          190px
          340px
          minmax(450px, 1fr);
      }

      .detalhe-corpo {
        grid-template-columns: 1fr;
      }

      .contexto {
        display: none;
      }

    }


    @media (max-width: 760px) {

      body {
        overflow: auto;
      }

      .barra-topo {
        height: 58px;
        padding: 0 14px;
      }

      .marca-texto span {
        display: none;
      }

      .app {
        height:
          calc(100vh - 58px);

        display: block;
      }

      .sidebar {
        display: none;
      }

      .coluna-conversas {
        height: 42%;
        border-right: 0;
        border-bottom:
          1px solid var(--borda);
      }

      .painel-conversa {
        height: 58%;
      }

      .detalhe-topo {
        min-height: 60px;
      }

      .historico {
        padding:
          16px 14px;
      }

      .bolha {
        max-width: 88%;
      }

    }

    /* =====================================================
   CORRECAO FINAL DE ROLAGEM E RESPONSIVIDADE
   ===================================================== */

html,
body {
  height: 100%;
}

body {
  overflow: hidden !important;
}

.app {
  height: calc(100dvh - 64px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.sidebar,
.coluna-conversas,
.painel-conversa,
.detalhe,
.detalhe-corpo,
.chat-area,
.historico {
  min-height: 0 !important;
}

.coluna-conversas,
.painel-conversa,
.detalhe,
.chat-area {
  overflow: hidden !important;
}

.coluna-conversas {
  display: flex;
  flex-direction: column;
}

.lista-conversas {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;

  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.historico {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;

  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

@media (max-width: 760px) {

  body {
    overflow: hidden !important;
  }

  .app {
    height: calc(100dvh - 58px) !important;

    display: grid !important;

    grid-template-columns:
      1fr !important;

    grid-template-rows:
      minmax(180px, 38%)
      minmax(0, 62%) !important;
  }

  .sidebar {
    display: none !important;
  }

  .coluna-conversas,
  .painel-conversa {
    height: auto !important;
    min-height: 0 !important;
  }

  .lista-conversas,
  .historico {
    -webkit-overflow-scrolling: touch;
  }
}

/* =====================================================
   VISUAL PROFISSIONAL - CENTRAL GUEDES
   Somente aparencia. Nao altera funcionamento.
   ===================================================== */

body {
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Arial,
    sans-serif;

  background: #f4f6f8;
  color: #17212b;
}


/* =========================
   TOPO
   ========================= */

.barra-topo {
  background:
    linear-gradient(
      135deg,
      #111827 0%,
      #182231 100%
    );

  border-bottom:
    1px solid rgba(255,255,255,.06);

  box-shadow:
    0 1px 8px rgba(0,0,0,.12);

  position: relative;
  z-index: 20;
}

.marca-icone {
  box-shadow:
    0 3px 10px rgba(0,0,0,.2);

  border:
    1px solid rgba(255,255,255,.15);
}

.marca-texto strong {
  letter-spacing: -.2px;
  font-weight: 700;
}

.marca-texto span {
  opacity: .68;
}


/* =========================
   ESTRUTURA PRINCIPAL
   ========================= */

.app {
  background: #eef1f4;
}

.sidebar {
  background: #ffffff;

  border-right:
    1px solid #e4e8ed;
}

.coluna-conversas {
  background: #ffffff;

  border-right:
    1px solid #e1e5ea;
}

.painel-conversa {
  background: #f7f8fa;
}


/* =========================
   LISTA DE CONVERSAS
   ========================= */

.lista-conversas {
  background: #ffffff;
}

.conversa-card {
  margin: 4px 8px;

  border:
    1px solid transparent;

  border-radius: 10px;

  transition:
    background .15s ease,
    border-color .15s ease,
    box-shadow .15s ease,
    transform .15s ease;
}

.conversa-card:hover {
  background: #f6f8fa;

  border-color: #e4e8ed;
}

.conversa-card.ativo {
  background: #f0f6ff;

  border-color: #cbdcf5;

  box-shadow:
    0 2px 8px rgba(20, 60, 110, .08);

  position: relative;
}

.conversa-card.ativo::before {
  content: "";

  position: absolute;

  left: -1px;
  top: 10px;
  bottom: 10px;

  width: 3px;

  border-radius: 0 3px 3px 0;

  background: #2563eb;
}

.nome-cliente {
  font-weight: 650;
  color: #17212b;
}


/* =========================
   CABECALHO DA CONVERSA
   ========================= */

.detalhe-topo {
  background: rgba(255,255,255,.97);

  border-bottom:
    1px solid #e4e8ed;

  box-shadow:
    0 1px 3px rgba(15,23,42,.035);

  backdrop-filter: blur(8px);

  position: relative;
  z-index: 5;
}


/* =========================
   AREA DO CHAT
   ========================= */

.chat-area {
  background: #f5f7f9;
}

.historico {
  padding:
    26px 34px !important;

  gap:
    8px !important;

  background:
    radial-gradient(
      circle at top,
      rgba(255,255,255,.9),
      rgba(246,248,250,.85) 55%,
      #f3f5f7 100%
    );
}


/* =========================
   BOLHAS
   ========================= */

.bolha {
  max-width:
    min(72%, 680px);

  padding:
    10px 13px 7px !important;

  border-radius:
    12px !important;

  line-height:
    1.45;

  font-size:
    13px;

  box-shadow:
    0 1px 2px rgba(15,23,42,.08);

  word-break:
    break-word;
}

.mensagem-linha.cliente .bolha {
  background: #ffffff;

  color: #1f2937;

  border:
    1px solid #e1e5ea;

  border-bottom-left-radius:
    4px !important;
}

.mensagem-linha.atendente .bolha {
  background: #e9f2ff;

  color: #17212b;

  border:
    1px solid #cbdcf5;

  border-bottom-right-radius:
    4px !important;
}

.mensagem-hora {
  margin-top: 5px;

  font-size: 9px !important;

  opacity: .52 !important;

  font-weight: 500;
}


/* =========================
   CAMPO DE RESPOSTA
   ========================= */

.composer {
  background: #ffffff;

  border-top:
    1px solid #dfe4ea !important;

  padding:
    14px 18px 16px !important;

  box-shadow:
    0 -3px 12px rgba(15,23,42,.035);
}

.composer-box {
  border:
    1px solid #d1d7de !important;

  border-radius:
    12px !important;

  box-shadow:
    0 1px 3px rgba(15,23,42,.04);

  transition:
    border-color .15s ease,
    box-shadow .15s ease;
}

.composer-box:focus-within {
  border-color:
    #7aa7e8 !important;

  box-shadow:
    0 0 0 3px rgba(37,99,235,.08);
}

.campo-resposta {
  font-family: inherit;

  font-size:
    13px;

  line-height:
    1.5;
}

.campo-resposta::placeholder {
  color: #9aa3ad;
}


/* =========================
   BOTAO ENVIAR
   ========================= */

.botao-enviar {
  border: 0;

  border-radius:
    8px !important;

  font-weight:
    600;

  letter-spacing:
    -.1px;

  box-shadow:
    0 1px 3px rgba(0,0,0,.12);

  transition:
    transform .12s ease,
    box-shadow .12s ease,
    opacity .12s ease;
}

.botao-enviar:hover:not(:disabled) {
  transform:
    translateY(-1px);

  box-shadow:
    0 3px 8px rgba(0,0,0,.15);
}

.botao-enviar:active:not(:disabled) {
  transform:
    translateY(0);
}


/* =========================
   SCROLLBARS
   ========================= */

.lista-conversas,
.historico {
  scrollbar-width:
    thin;

  scrollbar-color:
    #c8ced6 transparent;
}

.lista-conversas::-webkit-scrollbar,
.historico::-webkit-scrollbar {
  width: 7px;
}

.lista-conversas::-webkit-scrollbar-thumb,
.historico::-webkit-scrollbar-thumb {
  background: #c8ced6;

  border-radius: 20px;
}

.lista-conversas::-webkit-scrollbar-thumb:hover,
.historico::-webkit-scrollbar-thumb:hover {
  background: #aab2bc;
}


/* =========================
   RESPONSIVIDADE VISUAL
   ========================= */

@media (max-width: 1100px) {

  .historico {
    padding:
      20px 22px !important;
  }

  .bolha {
    max-width:
      82%;
  }
}

@media (max-width: 760px) {

  .historico {
    padding:
      14px 12px !important;
  }

  .bolha {
    max-width:
      90%;
  }

  .composer {
    padding:
      10px !important;
  }
}

  </style>

</head>


<body>


  <header class="barra-topo">

    <div class="marca">

      <div class="marca-icone">
        G
      </div>

      <div class="marca-texto">

        <strong>
          Guedes | Central de Atendimentos
        </strong>

        <span>
          Shopee + Mercado Livre
        </span>

      </div>

    </div>


    <div class="topo-acoes">

      <button
        type="button"
        class="botao-topo"
        onclick="window.location.reload()"
      >
        Atualizar
      </button>

    </div>

  </header>


  <main class="app">


    <!-- ==================================================
         MENU LATERAL
         ================================================== -->

    <aside class="sidebar">

      <div class="sidebar-titulo">
        Atendimentos
      </div>

      <button
        class="filtro ativo"
        data-filtro="todos"
        onclick="aplicarFiltro('todos', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">☰</span>
          Todos
        </span>

        <span
          class="contador"
          id="contador-todos"
        >
          0
        </span>
      </button>


      <button
        class="filtro"
        data-filtro="aguardando"
        onclick="aplicarFiltro('aguardando', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">●</span>
          Aguardando
        </span>

        <span
          class="contador"
          id="contador-aguardando"
        >
          0
        </span>
      </button>


      <button
        class="filtro"
        data-filtro="respondido"
        onclick="aplicarFiltro('respondido', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">✓</span>
          Respondidos
        </span>

        <span
          class="contador"
          id="contador-respondidos"
        >
          0
        </span>
      </button>


      <div class="sidebar-divisor"></div>


      <div class="sidebar-titulo">
        Marketplace
      </div>


      <button
        class="filtro"
        data-filtro="meli"
        onclick="aplicarFiltro('meli', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">M</span>
          Mercado Livre
        </span>

        <span
          class="contador"
          id="contador-meli"
        >
          0
        </span>
      </button>


      <button
        class="filtro"
        data-filtro="shopee"
        onclick="aplicarFiltro('shopee', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">S</span>
          Shopee
        </span>

        <span
          class="contador"
          id="contador-shopee"
        >
          0
        </span>
      </button>


      <div class="sidebar-divisor"></div>


      <div class="sidebar-titulo">
        Tipo
      </div>


      <button
        class="filtro"
        data-filtro="reclamacao"
        onclick="aplicarFiltro('reclamacao', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">!</span>
          Reclamações
        </span>

        <span
          class="contador"
          id="contador-reclamacoes"
        >
          0
        </span>
      </button>


      <button
        class="filtro"
        data-filtro="pergunta"
        onclick="aplicarFiltro('pergunta', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">?</span>
          Perguntas
        </span>

        <span
          class="contador"
          id="contador-perguntas"
        >
          0
        </span>
      </button>


      <button
        class="filtro"
        data-filtro="pos-venda"
        onclick="aplicarFiltro('pos-venda', this)"
      >
        <span class="filtro-info">
          <span class="filtro-icone">↳</span>
          Pós-venda
        </span>

        <span
          class="contador"
          id="contador-posvenda"
        >
          0
        </span>
      </button>

    </aside>



    <!-- ==================================================
         LISTA DE CONVERSAS
         ================================================== -->

    <section class="coluna-conversas">

      <div class="conversas-topo">

        <div class="conversas-titulo">

          <strong>
            Conversas
          </strong>

          <span
            class="conversas-total"
            id="quantidade-exibida"
          >
          </span>

        </div>

        <input
          id="busca"
          class="busca"
          type="search"
          placeholder="Buscar cliente, pedido, produto..."
          oninput="renderizarLista()"
        >

      </div>


      <div
        id="lista-conversas"
        class="lista-conversas"
      >
      </div>

    </section>



    <!-- ==================================================
         DETALHE
         ================================================== -->

    <section class="painel-conversa">

      <div
        id="conversa-vazia"
        class="conversa-vazia"
      >

        <div class="conversa-vazia-icone">
          💬
        </div>

        <strong>
          Selecione um atendimento
        </strong>

        <span style="
          margin-top:6px;
          font-size:12px;
        ">
          Escolha uma conversa ao lado para
          visualizar o histórico completo.
        </span>

      </div>


      <div
        id="detalhe"
        class="detalhe"
      >

        <div class="detalhe-topo">

          <div class="detalhe-cliente">

            <strong id="detalhe-nome">
            </strong>

            <div
              id="detalhe-badges"
              class="detalhe-cliente-meta"
            >
            </div>

          </div>


          <div
            id="detalhe-status"
            class="status-pill"
          >
          </div>

        </div>


        <div class="detalhe-corpo">


          <div class="chat-area">

            <div
              id="historico"
              class="historico"
            >
            </div>


            <div class="composer">

              <div class="composer-box">

                <textarea
                  id="campo-resposta"
                  class="campo-resposta"
                  placeholder="Digite sua resposta para o cliente..."
                ></textarea>


                <div class="composer-rodape">

                  <span
                    id="resultado-envio"
                    class="composer-status"
                  >
                    Envie a resposta diretamente para o marketplace.
                  </span>


                  <button
                    id="botao-enviar"
                    type="button"
                    class="botao-enviar"
                    onclick="enviarResposta()"
                  >
                    Enviar resposta
                  </button>

                </div>

              </div>

            </div>

          </div>


          <aside class="contexto">

            <div class="contexto-titulo">
              Contexto
            </div>


            <div class="contexto-bloco">

              <div class="contexto-bloco-titulo">
                Produto / anúncio
              </div>

              <div
                id="contexto-produto"
                class="contexto-conteudo"
              >
              </div>

            </div>


            <div class="contexto-bloco">

              <div class="contexto-bloco-titulo">
                Pedido
              </div>

              <div
                id="contexto-pedido"
                class="contexto-conteudo"
              >
              </div>

            </div>


            <div class="contexto-bloco">

              <div class="contexto-bloco-titulo">
                Atendimento
              </div>

              <div
                id="contexto-atendimento"
                class="contexto-conteudo"
              >
              </div>

            </div>

          </aside>

        </div>

      </div>

    </section>

  </main>



<script>

  const DADOS =
    ${jsonSeguro(dadosPainel)};

  let filtroAtual =
    "todos";

  let atendimentoSelecionado =
    null;


  function texto(valor) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "-";
    }

    return String(valor);
  }


  function formatarData(data) {
    if (!data) {
      return "-";
    }

    try {
      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          timeZone:
            "America/Sao_Paulo",

          day: "2-digit",
          month: "2-digit",
          year: "2-digit",

          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(
        new Date(data)
      );

    } catch {
      return String(data);
    }
  }


  function formatarHora(data) {
    if (!data) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          timeZone:
            "America/Sao_Paulo",

          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(
        new Date(data)
      );

    } catch {
      return "";
    }
  }


  function tempoEspera(data) {
    if (!data) {
      return "";
    }

    const inicio =
      new Date(data).getTime();

    if (!Number.isFinite(inicio)) {
      return "";
    }

    const diferenca =
      Math.max(
        0,
        Date.now() - inicio
      );

    const minutos =
      Math.floor(
        diferenca / 60000
      );

    if (minutos < 1) {
      return "agora";
    }

    if (minutos < 60) {
      return minutos + " min";
    }

    const horas =
      Math.floor(
        minutos / 60
      );

    if (horas < 24) {
      return horas + " h";
    }

    const dias =
      Math.floor(
        horas / 24
      );

    return dias + " d";
  }


  function tipoAtendimento(item) {

    if (item.tipo_atendimento) {
      const tipo =
        String(
          item.tipo_atendimento
        ).toLowerCase();

      if (tipo === "pergunta") {
        return "Pergunta";
      }

      if (
        tipo === "pos-venda" ||
        tipo === "posvenda"
      ) {
        return "Pós-venda";
      }

      if (tipo === "reclamacao") {
        return "Reclamação";
      }
    }

    const conversa =
      String(
        item.conversation_id || ""
      );

    if (
      conversa.startsWith(
        "pergunta-"
      )
    ) {
      return "Pergunta";
    }

    if (
      conversa.startsWith(
        "posvenda-"
      )
    ) {
      return "Pós-venda";
    }

    if (
      conversa.startsWith(
        "reclamacao-"
      )
    ) {
      return "Reclamação";
    }

    return "Chat";
  }


  function tipoFiltro(item) {
    return tipoAtendimento(item)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\\u0300-\\u036f]/g,
        ""
      )
      .replace(
        "pos-venda",
        "pos-venda"
      );
  }


  function nomeCliente(item) {
    return (
      item.comprador_nome ||
      item.comprador_id ||
      "Cliente"
    );
  }


  function marketplaceClasse(item) {
    return item.marketplace ===
      "Mercado Livre"
        ? "badge-meli"
        : "badge-shopee";
  }


  function statusClasse(item) {
    return item.status ===
      "aguardando_resposta"
        ? "aguardando"
        : "respondido";
  }


  function atendimentoPassaFiltro(
    item
  ) {

    if (filtroAtual === "todos") {
      return true;
    }

    if (
      filtroAtual === "aguardando"
    ) {
      return item.status ===
        "aguardando_resposta";
    }

    if (
      filtroAtual === "respondido"
    ) {
      return item.status ===
        "respondido";
    }

    if (filtroAtual === "meli") {
      return item.marketplace ===
        "Mercado Livre";
    }

    if (filtroAtual === "shopee") {
      return item.marketplace ===
        "Shopee";
    }

    if (
      filtroAtual === "reclamacao"
    ) {
      return tipoFiltro(item) ===
        "reclamacao";
    }

    if (
      filtroAtual === "pergunta"
    ) {
      return tipoFiltro(item) ===
        "pergunta";
    }

    if (
      filtroAtual === "pos-venda"
    ) {
      return tipoFiltro(item) ===
        "pos-venda";
    }

    return true;
  }


  function atendimentoPassaBusca(
    item
  ) {

    const campo =
      document
        .getElementById("busca");

    const busca =
      String(
        campo?.value || ""
      )
        .trim()
        .toLowerCase();

    if (!busca) {
      return true;
    }

    const conteudo = [
      item.comprador_nome,
      item.comprador_id,
      item.marketplace,
      item.item_id,
      item.item_titulo,
      item.pedido_id,
      item.pack_id,
      item.claim_id,
      item.conversation_id,
      item.ultima_mensagem,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return conteudo.includes(busca);
  }


  function aplicarFiltro(
    filtro,
    botao
  ) {

    filtroAtual =
      filtro;

    document
      .querySelectorAll(
        ".filtro"
      )
      .forEach(
        (elemento) =>
          elemento.classList.remove(
            "ativo"
          )
      );

    if (botao) {
      botao.classList.add(
        "ativo"
      );
    }

    renderizarLista();
  }


  function atualizarContadores() {

    const lista =
      DADOS.atendimentos;

    const qtd =
      (filtro) =>
        lista.filter(filtro).length;

    document
      .getElementById(
        "contador-todos"
      )
      .textContent =
        lista.length;

    document
      .getElementById(
        "contador-aguardando"
      )
      .textContent =
        qtd(
          (x) =>
            x.status ===
            "aguardando_resposta"
        );

    document
      .getElementById(
        "contador-respondidos"
      )
      .textContent =
        qtd(
          (x) =>
            x.status ===
            "respondido"
        );

    document
      .getElementById(
        "contador-meli"
      )
      .textContent =
        qtd(
          (x) =>
            x.marketplace ===
            "Mercado Livre"
        );

    document
      .getElementById(
        "contador-shopee"
      )
      .textContent =
        qtd(
          (x) =>
            x.marketplace ===
            "Shopee"
        );

    document
      .getElementById(
        "contador-reclamacoes"
      )
      .textContent =
        qtd(
          (x) =>
            tipoFiltro(x) ===
            "reclamacao"
        );

    document
      .getElementById(
        "contador-perguntas"
      )
      .textContent =
        qtd(
          (x) =>
            tipoFiltro(x) ===
            "pergunta"
        );

    document
      .getElementById(
        "contador-posvenda"
      )
      .textContent =
        qtd(
          (x) =>
            tipoFiltro(x) ===
            "pos-venda"
        );
  }


  function criarBadge(
    textoBadge,
    classe
  ) {

    const span =
      document.createElement(
        "span"
      );

    span.className =
      "badge " + classe;

    span.textContent =
      textoBadge;

    return span;
  }


  function renderizarLista() {

    const container =
      document.getElementById(
        "lista-conversas"
      );

    container.innerHTML =
      "";

    const lista =
      DADOS.atendimentos
        .filter(
          atendimentoPassaFiltro
        )
        .filter(
          atendimentoPassaBusca
        );

    document
      .getElementById(
        "quantidade-exibida"
      )
      .textContent =
        lista.length +
        " atendimento" +
        (
          lista.length === 1
            ? ""
            : "s"
        );

    if (!lista.length) {

      const vazio =
        document.createElement(
          "div"
        );

      vazio.className =
        "lista-vazia";

      vazio.textContent =
        "Nenhum atendimento encontrado.";

      container.appendChild(
        vazio
      );

      return;
    }


    lista.forEach(
      (item) => {

        const card =
          document.createElement(
            "div"
          );

        card.className =
          "conversa-card " +
          statusClasse(item);

        if (
          atendimentoSelecionado &&
          atendimentoSelecionado
            .conversation_id ===
            item.conversation_id
        ) {
          card.classList.add(
            "ativo"
          );
        }


        const linha1 =
          document.createElement(
            "div"
          );

        linha1.className =
          "conversa-linha1";


        const nome =
          document.createElement(
            "div"
          );

        nome.className =
          "nome-cliente";

        nome.textContent =
          nomeCliente(item);


        const hora =
          document.createElement(
            "div"
          );

        hora.className =
          "hora-lista";

        hora.textContent =
          formatarHora(
            item.ultima_mensagem_em
          );


        linha1.append(
          nome,
          hora
        );


        const badges =
          document.createElement(
            "div"
          );

        badges.className =
          "badges";

        badges.appendChild(
          criarBadge(
            item.marketplace ||
              "Marketplace",

            marketplaceClasse(item)
          )
        );

        badges.appendChild(
          criarBadge(
            tipoAtendimento(item),
            "badge-tipo"
          )
        );

        if (
          item.tipo_atendimento ===
          "reclamacao"
        ) {
          badges.appendChild(
            criarBadge(
              "Atenção",
              "badge-alerta"
            )
          );
        }


        const preview =
          document.createElement(
            "div"
          );

        preview.className =
          "preview";

        preview.textContent =
          item.ultima_mensagem ||
          "Sem mensagem registrada";


        card.append(
          linha1,
          badges,
          preview
        );


        if (item.item_titulo) {

          const produto =
            document.createElement(
              "div"
            );

          produto.className =
            "produto-preview";

          produto.textContent =
            item.item_titulo;

          card.appendChild(
            produto
          );
        }


        if (
          item.status ===
          "aguardando_resposta"
        ) {

          const espera =
            document.createElement(
              "div"
            );

          espera.className =
            "aguardando-info";

          espera.textContent =
            "Aguardando há " +
            tempoEspera(
              item.ultima_mensagem_em
            );

          card.appendChild(
            espera
          );
        }


        card.addEventListener(
          "click",
          () =>
            abrirAtendimento(item)
        );


        container.appendChild(
          card
        );
      }
    );
  }


  function adicionarDado(
    container,
    rotulo,
    valor
  ) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return;
    }

    const linha =
      document.createElement(
        "div"
      );

    linha.className =
      "dado";


    const chave =
      document.createElement(
        "span"
      );

    chave.textContent =
      rotulo;


    const conteudo =
      document.createElement(
        "span"
      );

    conteudo.textContent =
      String(valor);


    linha.append(
      chave,
      conteudo
    );

    container.appendChild(
      linha
    );
  }


  function renderizarHistorico(
    item
  ) {

    const container =
      document.getElementById(
        "historico"
      );

    container.innerHTML =
      "";


    let historico =
      Array.isArray(
        item.historico
      )
        ? item.historico
        : [];


    if (
      historico.length === 0 &&
      item.ultima_mensagem
    ) {

      historico = [
        {
          autor: "cliente",
          texto:
            item.ultima_mensagem,

          quando:
            item.ultima_mensagem_em,
        },
      ];
    }


    if (!historico.length) {

      const vazio =
        document.createElement(
          "div"
        );

      vazio.className =
        "separador-historico";

      vazio.textContent =
        "Sem histórico disponível.";

      container.appendChild(
        vazio
      );

      return;
    }


    historico.forEach(
      (mensagem) => {

        const autor =
          mensagem.autor ===
          "atendente"
            ? "atendente"
            : "cliente";


        const linha =
          document.createElement(
            "div"
          );

        linha.className =
          "mensagem-linha " +
          autor;


        const bolha =
          document.createElement(
            "div"
          );

        bolha.className =
          "bolha";


        const textoMensagem =
          document.createElement(
            "div"
          );

        textoMensagem.textContent =
          mensagem.texto ||
          "[mensagem sem conteúdo]";


        const hora =
          document.createElement(
            "div"
          );

        hora.className =
          "mensagem-hora";

        hora.textContent =
          (
            autor === "atendente"
              ? "Atendente · "
              : "Cliente · "
          ) +
          formatarData(
            mensagem.quando
          );


        bolha.append(
          textoMensagem,
          hora
        );

        linha.appendChild(
          bolha
        );

        container.appendChild(
          linha
        );
      }
    );


    setTimeout(
      () => {
        container.scrollTop =
          container.scrollHeight;
      },
      0
    );
  }


 function renderizarContexto(
  item
) {

  const produto =
    document.getElementById(
      "contexto-produto"
    );

  produto.innerHTML = "";


  /* FOTO DO PRODUTO */

  if (item.item_imagem) {

    const imagemBox =
      document.createElement(
        "div"
      );

    imagemBox.style.width = "100%";
    imagemBox.style.height = "170px";
    imagemBox.style.display = "flex";
    imagemBox.style.alignItems = "center";
    imagemBox.style.justifyContent = "center";
    imagemBox.style.background = "#f8f8f8";
    imagemBox.style.borderRadius = "8px";
    imagemBox.style.marginBottom = "12px";
    imagemBox.style.overflow = "hidden";


    const imagem =
      document.createElement(
        "img"
      );

    imagem.src =
      item.item_imagem;

    imagem.alt =
      item.item_titulo ||
      "Produto";

    imagem.style.maxWidth = "100%";
    imagem.style.maxHeight = "100%";
    imagem.style.objectFit = "contain";

    imagem.onerror =
      function () {
        imagemBox.style.display =
          "none";
      };


    imagemBox.appendChild(
      imagem
    );

    produto.appendChild(
      imagemBox
    );
  }


  /* TÍTULO */

  if (item.item_titulo) {

    const titulo =
      document.createElement(
        "div"
      );

    titulo.className =
      "produto-titulo";

    titulo.textContent =
      item.item_titulo;

    produto.appendChild(
      titulo
    );
  }


  /* PREÇO */

  if (
    item.item_preco !== null &&
    item.item_preco !== undefined &&
    item.item_preco !== ""
  ) {

    const preco =
      document.createElement(
        "div"
      );

    preco.style.fontSize = "18px";
    preco.style.fontWeight = "800";
    preco.style.margin = "8px 0 12px";
    preco.style.color = "#18181b";

    try {
      preco.textContent =
        new Intl.NumberFormat(
          "pt-BR",
          {
            style: "currency",
            currency: "BRL",
          }
        ).format(
          Number(item.item_preco)
        );

    } catch {
      preco.textContent =
        "R$ " +
        String(item.item_preco);
    }


    produto.appendChild(
      preco
    );
  }


  adicionarDado(
    produto,
    "Item",
    item.item_id
  );


  if (
    !item.item_titulo &&
    !item.item_id &&
    !item.item_imagem
  ) {

    const semProduto =
      document.createElement(
        "div"
      );

    semProduto.style.fontSize =
      "11px";

    semProduto.style.color =
      "#71717a";

    semProduto.textContent =
      "Nenhuma informação de produto registrada.";

    produto.appendChild(
      semProduto
    );
  }


  /* BOTÃO ABRIR ANÚNCIO */

  if (item.anuncio_url) {

    const botao =
      document.createElement(
        "button"
      );

    botao.className =
      "botao-link";

    botao.textContent =
      "Abrir anúncio no Mercado Livre";

    botao.onclick =
      () =>
        window.open(
          item.anuncio_url,
          "_blank"
        );

    produto.appendChild(
      botao
    );
  }


  /* PEDIDO */

  const pedido =
    document.getElementById(
      "contexto-pedido"
    );

  pedido.innerHTML = "";

  adicionarDado(
    pedido,
    "Pedido",
    item.pedido_id
  );

  adicionarDado(
    pedido,
    "Pack",
    item.pack_id
  );

  adicionarDado(
    pedido,
    "Reclamação",
    item.claim_id
  );


  if (
    !item.pedido_id &&
    !item.pack_id &&
    !item.claim_id
  ) {

    const vazio =
      document.createElement(
        "div"
      );

    vazio.style.fontSize =
      "11px";

    vazio.style.color =
      "#71717a";

    vazio.textContent =
      "Nenhum pedido vinculado.";

    pedido.appendChild(
      vazio
    );
  }


  /* ATENDIMENTO */

  const atendimento =
    document.getElementById(
      "contexto-atendimento"
    );

  atendimento.innerHTML = "";

  adicionarDado(
    atendimento,
    "Cliente",
    nomeCliente(item)
  );

  adicionarDado(
    atendimento,
    "ID cliente",
    item.comprador_id
  );

  adicionarDado(
    atendimento,
    "Conversa",
    item.conversation_id
  );

  adicionarDado(
    atendimento,
    "Recebidas",
    Number(
      item.mensagens_recebidas || 0
    )
  );

  adicionarDado(
    atendimento,
    "Enviadas",
    Number(
      item.mensagens_enviadas || 0
    )
  );

  adicionarDado(
    atendimento,
    "Primeira mensagem",
    formatarData(
      item.primeira_mensagem_em
    )
  );

  adicionarDado(
    atendimento,
    "Última mensagem",
    formatarData(
      item.ultima_mensagem_em
    )
  );

  if (item.ultima_resposta_em) {

    adicionarDado(
      atendimento,
      "Última resposta",
      formatarData(
        item.ultima_resposta_em
      )
    );
  }
}

  async function carregarHistoricoRemoto(
  item
) {
  if (!item) {
    return;
  }

  const marketplace =
    String(
      item.marketplace || ""
    ).toLowerCase();

  const conversationId =
    String(
      item.conversation_id || ""
    );

  /*
   * Por enquanto o historico remoto esta
   * habilitado somente para pos-venda ML.
   */
  if (
    marketplace !== "mercado livre" ||
    !conversationId.startsWith(
      "posvenda-pack-"
    )
  ) {
    return;
  }

  const conversaSolicitada =
    conversationId;

  try {
    const params =
      new URLSearchParams({
        marketplace:
          "Mercado Livre",
        conversation_id:
          conversationId,
      });

    const resposta =
      await fetch(
        "/atendimentos/historico?" +
        params.toString(),
        {
          method: "GET",
          cache: "no-store",
        }
      );

    const dados =
      await resposta.json();

    if (
      !resposta.ok ||
      !dados?.ok ||
      !Array.isArray(
        dados.historico
      )
    ) {
      console.log(
        "[central] historico remoto indisponivel:",
        dados?.erro ||
        resposta.status
      );

      return;
    }

    /*
     * Se o atendente clicou em outra conversa
     * enquanto a API carregava, nao troca o
     * historico da conversa atual.
     */
    if (
      !atendimentoSelecionado ||
      String(
        atendimentoSelecionado
          .conversation_id || ""
      ) !== conversaSolicitada
    ) {
      return;
    }

    if (
      dados.historico.length > 0
    ) {
      item.historico =
        dados.historico;

      atendimentoSelecionado =
        item;

      renderizarHistorico(
        item
      );

      const container =
        document.getElementById(
          "historico"
        );

      if (container) {
        container.scrollTop =
          container.scrollHeight;
      }

      console.log(
        "[central] historico remoto carregado:",
        dados.historico.length,
        "mensagens"
      );
    }

  } catch (e) {
    console.log(
      "[central] erro ao carregar historico remoto:",
      e?.message || e
    );
  }
}

  function abrirAtendimento(
    item
  ) {

    atendimentoSelecionado =
      item;

    document
      .getElementById(
        "conversa-vazia"
      )
      .style.display =
        "none";

    document
      .getElementById(
        "detalhe"
      )
      .classList.add(
        "visivel"
      );


    document
      .getElementById(
        "detalhe-nome"
      )
      .textContent =
        nomeCliente(item);


    const badges =
      document.getElementById(
        "detalhe-badges"
      );

    badges.innerHTML =
      "";

    badges.appendChild(
      criarBadge(
        item.marketplace ||
          "Marketplace",

        marketplaceClasse(item)
      )
    );

    badges.appendChild(
      criarBadge(
        tipoAtendimento(item),
        "badge-tipo"
      )
    );


    const status =
      document.getElementById(
        "detalhe-status"
      );


    if (
      item.status ===
      "aguardando_resposta"
    ) {

      status.className =
        "status-pill status-aguardando";

      status.textContent =
        "Aguardando resposta";

    } else {

      status.className =
        "status-pill status-respondido";

      status.textContent =
        "Respondido";
    }


    const campo =
      document.getElementById(
        "campo-resposta"
      );

    campo.value =
      "";

    campo.disabled =
      false;


    const botao =
      document.getElementById(
        "botao-enviar"
      );

    botao.disabled =
      false;

    botao.textContent =
      "Enviar resposta";


    const resultado =
      document.getElementById(
        "resultado-envio"
      );

    resultado.className =
      "composer-status";

    resultado.textContent =
      "Envie a resposta diretamente para o marketplace.";


    renderizarHistorico(
      item
    );

    carregarHistoricoRemoto(
    item
    );

    renderizarContexto(
      item
    );

    renderizarLista();
  }


  async function enviarResposta() {

    if (!atendimentoSelecionado) {
      return;
    }


    const campo =
      document.getElementById(
        "campo-resposta"
      );

    const botao =
      document.getElementById(
        "botao-enviar"
      );

    const resultado =
      document.getElementById(
        "resultado-envio"
      );


    const textoResposta =
      campo.value.trim();


    if (!textoResposta) {

      resultado.textContent =
        "Digite uma resposta.";

      resultado.className =
        "composer-status erro";

      campo.focus();

      return;
    }


    botao.disabled =
      true;

    botao.textContent =
      "Enviando...";

    resultado.textContent =
      "Enviando resposta...";

    resultado.className =
      "composer-status";


    try {

      const resposta =
        await fetch(
          "/atendimentos/responder",
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                marketplace:
                  atendimentoSelecionado
                    .marketplace,

                conversation_id:
                  atendimentoSelecionado
                    .conversation_id,

                comprador_id:
                  atendimentoSelecionado
                    .comprador_id,

                comprador_nome:
                  atendimentoSelecionado
                    .comprador_nome,

                texto:
                  textoResposta,
              }),
          }
        );


      const dados =
        await resposta.json();


      if (
        !resposta.ok ||
        !dados.ok
      ) {
        throw new Error(
          dados.erro ||
          "Não foi possível enviar a resposta."
        );
      }


      resultado.textContent =
        "Resposta enviada com sucesso.";

      resultado.className =
        "composer-status sucesso";

      campo.disabled =
        true;

      botao.textContent =
        "Enviado";


      setTimeout(
        () => {
          window.location.reload();
        },
        700
      );


    } catch (erro) {

      resultado.textContent =
        erro?.message ||
        "Erro ao enviar resposta.";

      resultado.className =
        "composer-status erro";

      botao.disabled =
        false;

      botao.textContent =
        "Enviar resposta";
    }
  }


  let atualizacaoAutomaticaEmAndamento =
    false;


  async function atualizarAutomaticamente() {

    if (
      document.hidden ||
      atualizacaoAutomaticaEmAndamento
    ) {
      return;
    }

    atualizacaoAutomaticaEmAndamento =
      true;

    try {

      const selecionadoAntes =
        atendimentoSelecionado
          ? {
              marketplace:
                atendimentoSelecionado.marketplace,

              conversation_id:
                atendimentoSelecionado.conversation_id,

              atualizado_em:
                atendimentoSelecionado.atualizado_em,
            }
          : null;

      const resposta =
        await fetch(
          "/atendimentos/dados",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );

      if (!resposta.ok) {
        return;
      }

      const dados =
        await resposta.json();

      if (
        !Array.isArray(
          dados.atendimentos
        )
      ) {
        return;
      }

      DADOS.atendimentos =
        dados.atendimentos;

      atualizarContadores();

      if (selecionadoAntes) {

        const atualizado =
          DADOS.atendimentos.find(
            (item) =>
              String(
                item.conversation_id
              ) ===
                String(
                  selecionadoAntes
                    .conversation_id
                ) &&
              String(
                item.marketplace
              ) ===
                String(
                  selecionadoAntes
                    .marketplace
                )
          );

        if (atualizado) {

          const mudou =
            String(
              atualizado.atualizado_em ||
                ""
            ) !==
            String(
              selecionadoAntes
                .atualizado_em ||
                ""
            );

          atendimentoSelecionado =
            atualizado;

          if (mudou) {

            renderizarHistorico(
              atualizado
            );

            renderizarContexto(
              atualizado
            );

            if (
              atualizado.marketplace ===
              "Mercado Livre"
            ) {
              carregarHistoricoRemoto(
                atualizado
              );
            }
          }
        }

      } else if (
        DADOS.atendimentos.length
      ) {

        abrirAtendimento(
          DADOS.atendimentos[0]
        );
      }

      renderizarLista();

    } catch (erro) {

      console.log(
        "[central] falha na atualizacao automatica:",
        erro?.message || erro
      );

    } finally {

      atualizacaoAutomaticaEmAndamento =
        false;
    }
  }


  setInterval(
    atualizarAutomaticamente,
    3000
  );

  atualizarContadores();

  renderizarLista();


  if (
    DADOS.atendimentos.length
  ) {
    abrirAtendimento(
      DADOS.atendimentos[0]
    );
  }

</script>


</body>

</html>
`;
}