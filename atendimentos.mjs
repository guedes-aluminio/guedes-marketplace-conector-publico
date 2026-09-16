import fs from "node:fs";

const ARQUIVO =
  process.env.ATENDIMENTOS_ARQUIVO ||
  (fs.existsSync("/var/data")
    ? "/var/data/atendimentos.json"
    : "./atendimentos.json");


function carregar() {
  try {
    if (!fs.existsSync(ARQUIVO)) {
      return [];
    }

    const conteudo =
      fs.readFileSync(ARQUIVO, "utf8");

    if (!conteudo.trim()) {
      return [];
    }

    const dados = JSON.parse(conteudo);

    return Array.isArray(dados)
      ? dados
      : [];

  } catch (e) {
    console.log(
      "[atendimentos] erro ao carregar:",
      e?.message || e
    );

    return [];
  }
}


function salvar(lista) {
  try {
    fs.writeFileSync(
      ARQUIVO,
      JSON.stringify(lista, null, 2),
      "utf8"
    );

    return true;

  } catch (e) {
    console.log(
      "[atendimentos] erro ao salvar:",
      e?.message || e
    );

    return false;
  }
}


/* =====================================================
   LOCALIZA ATENDIMENTO
   ===================================================== */

function localizarAtendimento(
  lista,
  {
    conversationId,
    compradorId,
    marketplace,
  }
) {
  /*
   * Se temos conversation_id, ele deve ser a chave
   * principal. Isso evita misturar dois pedidos,
   * perguntas ou reclamações do mesmo comprador.
   */
  if (conversationId) {
    const encontrado = lista.find(
      (item) =>
        String(item.conversation_id || "") ===
        String(conversationId)
    );

    if (encontrado) {
      return encontrado;
    }

    /*
     * Se existe conversationId e não encontramos,
     * NÃO fazemos fallback pelo comprador.
     *
     * O mesmo comprador pode ter várias conversas.
     */
    return null;
  }

  /*
   * Fallback apenas quando realmente não existe
   * identificador de conversa.
   */
  if (compradorId) {
    return (
      lista.find((item) => {
        const mesmoComprador =
          String(item.comprador_id || "") ===
          String(compradorId);

        const mesmoMarketplace =
          !marketplace ||
          String(item.marketplace || "") ===
          String(marketplace);

        return (
          mesmoComprador &&
          mesmoMarketplace
        );
      }) || null
    );
  }

  return null;
}


/* =====================================================
   REGISTRAR MENSAGEM RECEBIDA
   ===================================================== */

export function registrarAtendimento(m) {
  const lista = carregar();

  const conversationId =
    m.conversation_id
      ? String(m.conversation_id)
      : "";

  const compradorId =
    m.comprador_id
      ? String(m.comprador_id)
      : "";

  const marketplace =
    m.marketplace || "Shopee";

  let atendimento =
    localizarAtendimento(lista, {
      conversationId,
      compradorId,
      marketplace,
    });

  const agora =
    new Date().toISOString();

  const quandoMensagem =
    m.quando || agora;

  const textoMensagem =
    String(m.texto || "");

  const mensagemHistorico = {
    autor: "cliente",
    texto: textoMensagem,
    quando: quandoMensagem,
  };


  /* =====================================================
     NOVO ATENDIMENTO
     ===================================================== */

  if (!atendimento) {
    atendimento = {

      /* ORIGEM */

      marketplace,

      tipo_atendimento:
        m.tipo_atendimento || null,


      /* CONVERSA / CLIENTE */

      conversation_id:
        m.conversation_id || null,

      comprador_id:
        m.comprador_id || null,

      comprador_nome:
        m.comprador_nome || null,


      /* =================================================
         CONTEXTO DO ANÚNCIO / PEDIDO
         ================================================= */

      item_id:
        m.item_id || null,

      item_titulo:
        m.item_titulo || null,

      anuncio_url:
        m.anuncio_url || null,

      item_imagem:
        m.item_imagem || null,

      item_preco:
        m.item_preco ?? null,

      pedido_id:
        m.pedido_id || null,

      pack_id:
        m.pack_id || null,

      claim_id:
        m.claim_id || null,


      /* =================================================
         CONTROLE OPERACIONAL
         ================================================= */

      status:
        "aguardando_resposta",

      responsavel:
        null,

      setor:
        null,

      prioridade:
        "normal",

      resolvido_em:
        null,

      notas_internas:
        [],


      /* =================================================
         DATAS / CONTADORES
         ================================================= */

      primeira_mensagem_em:
        quandoMensagem,

      ultima_mensagem_em:
        quandoMensagem,

      ultima_mensagem:
        textoMensagem,

      mensagens_recebidas:
        1,

      mensagens_enviadas:
        0,

      ultima_resposta:
        null,

      ultima_resposta_em:
        null,


      /* =================================================
         HISTÓRICO
         ================================================= */

      historico: [
        mensagemHistorico
      ],

      criado_em:
        agora,

      atualizado_em:
        agora,
    };

    lista.push(atendimento);
  }


  /* =====================================================
     ATENDIMENTO JÁ EXISTENTE
     ===================================================== */

  else {

    /* ORIGEM */

    atendimento.marketplace =
      m.marketplace ||
      atendimento.marketplace ||
      "Shopee";

    atendimento.tipo_atendimento =
      m.tipo_atendimento ||
      atendimento.tipo_atendimento ||
      null;


    /* CLIENTE */

    atendimento.comprador_nome =
      m.comprador_nome ||
      atendimento.comprador_nome ||
      null;


    /* =================================================
       ATUALIZA CONTEXTO SE CHEGAR INFORMAÇÃO NOVA
       ================================================= */

    atendimento.item_id =
      m.item_id ||
      atendimento.item_id ||
      null;

    atendimento.item_titulo =
      m.item_titulo ||
      atendimento.item_titulo ||
      null;

    atendimento.anuncio_url =
      m.anuncio_url ||
      atendimento.anuncio_url ||
      null;

    atendimento.item_imagem =
      m.item_imagem ||
      atendimento.item_imagem ||
      null;

    atendimento.item_preco =
      m.item_preco ??
      atendimento.item_preco ??
      null;

    atendimento.pedido_id =
      m.pedido_id ||
      atendimento.pedido_id ||
      null;

    atendimento.pack_id =
      m.pack_id ||
      atendimento.pack_id ||
      null;

    atendimento.claim_id =
      m.claim_id ||
      atendimento.claim_id ||
      null;


    /* =================================================
       NOVA MENSAGEM DO CLIENTE REABRE O ATENDIMENTO
       ================================================= */

    atendimento.status =
      "aguardando_resposta";

    atendimento.resolvido_em =
      null;

    atendimento.ultima_mensagem =
      textoMensagem;

    atendimento.ultima_mensagem_em =
      quandoMensagem;

    atendimento.mensagens_recebidas =
      Number(
        atendimento.mensagens_recebidas || 0
      ) + 1;


    /* =================================================
       HISTÓRICO
       ================================================= */

    if (!Array.isArray(atendimento.historico)) {
      atendimento.historico = [];
    }

    atendimento.historico.push(
      mensagemHistorico
    );

    atendimento.atualizado_em =
      agora;
  }


  salvar(lista);

  console.log(
    "[atendimentos] aguardando resposta:",
    atendimento.comprador_nome ||
    atendimento.comprador_id ||
    atendimento.conversation_id
  );

  return atendimento;
}


/* =====================================================
   MARCAR COMO RESPONDIDO
   + REGISTRAR RESPOSTA NO HISTÓRICO
   ===================================================== */

export function marcarAtendimentoRespondido({
  compradorId,
  conversationId,
  marketplace = null,
  texto = null,
  respondenteId = null,
  respondenteNome = null,
  origemResposta = null,
}) {
  const lista = carregar();

  const atendimento =
    localizarAtendimento(lista, {
      conversationId,
      compradorId,
      marketplace,
    });

  if (!atendimento) {
    console.log(
      "[atendimentos] conversa nao encontrada para marcar como respondida:",
      conversationId || compradorId
    );

    return null;
  }

  const agora =
    new Date().toISOString();

  atendimento.status =
    "respondido";

  atendimento.ultima_resposta_em =
    agora;

  atendimento.atualizado_em =
    agora;


  /* =====================================================
     GUARDA RESPOSTA
     ===================================================== */

  const textoLimpo =
    texto
      ? String(texto).trim()
      : "";

  if (textoLimpo) {

    atendimento.ultima_resposta =
      textoLimpo;

    atendimento.mensagens_enviadas =
      Number(
        atendimento.mensagens_enviadas || 0
      ) + 1;

    if (!Array.isArray(atendimento.historico)) {
      atendimento.historico = [];
    }

    atendimento.historico.push({
      autor: "atendente",
      texto: textoLimpo,
      quando: agora,
      respondente_id: respondenteId,
      respondente_nome: respondenteNome,
      origem_resposta: origemResposta,
    });
  }


  salvar(lista);

  console.log(
    "[atendimentos] respondido:",
    atendimento.comprador_nome ||
    atendimento.comprador_id ||
    atendimento.conversation_id
  );

  return atendimento;
}

/* =====================================================
   ATUALIZAR DADOS OPERACIONAIS DO ATENDIMENTO
   Responsavel / Setor / Prioridade
   ===================================================== */

export function atualizarAtendimentoOperacional({
  compradorId,
  conversationId,
  marketplace = null,
  responsavel,
  setor,
  prioridade,
}) {
  const lista =
    carregar();

  const atendimento =
    localizarAtendimento(
      lista,
      {
        conversationId,
        compradorId,
        marketplace,
      }
    );

  if (!atendimento) {
    console.log(
      "[atendimentos] conversa nao encontrada para atualizar:",
      conversationId ||
      compradorId
    );

    return null;
  }


  /* =====================================================
     RESPONSAVEL
     ===================================================== */

  if (
    responsavel !==
    undefined
  ) {
    const valor =
      responsavel === null
        ? ""
        : String(
          responsavel
        ).trim();

    atendimento.responsavel =
      valor || null;
  }


  /* =====================================================
     SETOR
     ===================================================== */

  if (
    setor !==
    undefined
  ) {
    const valor =
      setor === null
        ? ""
        : String(
          setor
        ).trim();

    atendimento.setor =
      valor || null;
  }


  /* =====================================================
     PRIORIDADE
     ===================================================== */

  if (
    prioridade !==
    undefined
  ) {
    const valor =
      String(
        prioridade || ""
      )
        .trim()
        .toLowerCase();

    const permitidas = [
      "baixa",
      "normal",
      "alta",
      "urgente",
    ];

    if (
      !permitidas.includes(
        valor
      )
    ) {
      throw new Error(
        "Prioridade invalida"
      );
    }

    atendimento.prioridade =
      valor;
  }


  atendimento.atualizado_em =
    new Date().toISOString();


  salvar(
    lista
  );


  console.log(
    "[atendimentos] dados operacionais atualizados:",
    atendimento.conversation_id,
    {
      responsavel:
        atendimento.responsavel,

      setor:
        atendimento.setor,

      prioridade:
        atendimento.prioridade,
    }
  );


  return atendimento;
}

/* =====================================================
   ADICIONAR NOTA INTERNA
   Nunca e enviada ao cliente
   ===================================================== */

export function adicionarNotaInterna({
  compradorId,
  conversationId,
  marketplace = null,
  texto,
  autor = null,
}) {
  const lista =
    carregar();

  const atendimento =
    localizarAtendimento(
      lista,
      {
        conversationId,
        compradorId,
        marketplace,
      }
    );

  if (!atendimento) {
    console.log(
      "[atendimentos] conversa nao encontrada para nota interna:",
      conversationId ||
      compradorId
    );

    return null;
  }


  const textoLimpo =
    String(
      texto || ""
    ).trim();

  if (!textoLimpo) {
    throw new Error(
      "Nota interna vazia"
    );
  }


  if (
    !Array.isArray(
      atendimento.notas_internas
    )
  ) {
    atendimento.notas_internas =
      [];
  }


  const agora =
    new Date().toISOString();

  const nota = {
    id:
      "nota-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 8),

    texto:
      textoLimpo,

    autor:
      autor
        ? String(
          autor
        ).trim()
        : (
          atendimento.responsavel ||
          "Atendente"
        ),

    quando:
      agora,
  };


  atendimento.notas_internas.push(
    nota
  );

  atendimento.atualizado_em =
    agora;


  salvar(
    lista
  );


  console.log(
    "[atendimentos] nota interna adicionada:",
    atendimento.conversation_id,
    nota.autor
  );


  return {
    atendimento,
    nota,
  };
}

/* =====================================================
   RESOLVER / REABRIR ATENDIMENTO
   ===================================================== */

export function definirResolucaoAtendimento({
  compradorId,
  conversationId,
  marketplace = null,
  resolvido = true,
}) {
  const lista =
    carregar();

  const atendimento =
    localizarAtendimento(
      lista,
      {
        conversationId,
        compradorId,
        marketplace,
      }
    );

  if (!atendimento) {
    console.log(
      "[atendimentos] conversa nao encontrada para alterar resolucao:",
      conversationId ||
      compradorId
    );

    return null;
  }


  const agora =
    new Date().toISOString();


  if (resolvido) {
    atendimento.status =
      "resolvido";

    atendimento.resolvido_em =
      agora;
  } else {
    atendimento.status =
      "aguardando_resposta";

    atendimento.resolvido_em =
      null;
  }


  atendimento.atualizado_em =
    agora;


  salvar(
    lista
  );


  console.log(
    resolvido
      ? "[atendimentos] atendimento resolvido:"
      : "[atendimentos] atendimento reaberto:",
    atendimento.conversation_id
  );


  return atendimento;
}

/* =====================================================
   LISTAGEM
   ===================================================== */

export function listarAtendimentos() {
  return carregar().sort((a, b) => {
    const dataA =
      new Date(
        a.atualizado_em ||
        a.ultima_mensagem_em ||
        0
      );

    const dataB =
      new Date(
        b.atualizado_em ||
        b.ultima_mensagem_em ||
        0
      );

    return dataB - dataA;
  });
}


export function listarPendentes() {
  return listarAtendimentos().filter(
    (item) =>
      item.status ===
      "aguardando_resposta"
  );
}


/* =====================================================
   RESUMO
   ===================================================== */

export function resumoAtendimentos() {
  const lista = carregar();

  const pendentes =
    lista.filter(
      (item) =>
        item.status ===
        "aguardando_resposta"
    );

  const respondidos =
    lista.filter(
      (item) =>
        item.status ===
        "respondido"
    );

  const resolvidos =
    lista.filter(
      (item) =>
        item.status ===
        "resolvido"
    );

  const shopeePendentes =
    pendentes.filter(
      (item) =>
        item.marketplace === "Shopee"
    );

  const meliPendentes =
    pendentes.filter(
      (item) =>
        item.marketplace ===
        "Mercado Livre"
    );

  const reclamacoesPendentes =
    pendentes.filter(
      (item) =>
        item.tipo_atendimento ===
        "reclamacao"
    );

  return {
    total_conversas:
      lista.length,

    aguardando_resposta:
      pendentes.length,

    respondidas:
      respondidos.length,

    resolvidas:
      resolvidos.length,

    shopee_pendentes:
      shopeePendentes.length,

    mercado_livre_pendentes:
      meliPendentes.length,

    reclamacoes_pendentes:
      reclamacoesPendentes.length,
  };
}