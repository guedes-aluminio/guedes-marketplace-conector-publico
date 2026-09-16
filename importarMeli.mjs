import { chamarKommoMeli, cfgMeliKommo } from "./kommoMeli.mjs";

export async function enviarPerguntaParaKommo(p) {
  if (!cfgMeliKommo.scope_id) {
    console.log(
      "[meli->kommo] scope_id ainda nao configurado, pulando envio"
    );
    return null;
  }

  const conversationId =
    `pergunta-${p.message_id}`;

  const texto = p.item_titulo
    ? `[Pergunta sobre: ${p.item_titulo}] ${p.texto}`
    : p.item_id
    ? `[Pergunta sobre o anuncio ${p.item_id}] ${p.texto}`
    : p.texto;

  const r = await chamarKommoMeli(
    "POST",
    `/v2/origin/custom/${cfgMeliKommo.scope_id}`,
    {
      event_type: "new_message",
      payload: {
        timestamp:
          Math.floor(new Date(p.quando).getTime() / 1000),

        msec_timestamp:
          new Date(p.quando).getTime(),

        msgid:
          `pergunta-${p.message_id}`,

        conversation_id:
          conversationId,

        sender: {
          id: String(p.remetente_id),
          name: `Comprador ML ${p.remetente_id}`,
        },

        message: {
          type: "text",
          text: texto || "[pergunta sem texto]",
        },

        silent: false,
      },
    }
  );

  if (r.status === 200) {
    console.log("[meli->kommo] pergunta enviada ao Kommo");
    console.log("[meli->kommo] resposta completa:", r.texto);
  } else {
    console.log(
      "[meli->kommo] FALHOU no Kommo:",
      r.status,
      r.texto
    );
  }

  return r;
}

/*
 * Envia uma mensagem POS-VENDA do Mercado Livre para o
 * canal "Mercado Livre Guedes" no Kommo.
 *
 * p e o objeto ja normalizado por processarNotificacaoMeli:
 * { message_id, item_id, pack_id, remetente_id, destinatario_id,
 *   quando, texto, anexos }
 *
 * anexos e uma lista opcional de { url, nome_original, tipo },
 * onde tipo e o content-type do arquivo (ex: "application/pdf",
 * "image/png"). Cada anexo vira uma mensagem PROPRIA no Kommo,
 * do tipo "file" (ou "picture" se for imagem), para aparecer
 * como anexo de verdade no chat, nao so um link em texto.
 *
 * Diferente da pergunta, aqui o conversation_id NAO pode ser
 * por mensagem: precisa ser o mesmo para todas as mensagens
 * do mesmo pedido, senao cada mensagem vira uma conversa nova
 * no Kommo. Usamos o pack_id quando existir; se nao vier,
 * caimos para uma combinacao fixa de comprador+vendedor.
 *
 * AINDA NAO TEM VOLTA (Kommo -> Mercado Livre) escrita para
 * mensagens pos-venda, so para perguntas. Isso fica para depois.
 */
export async function enviarMensagemParaKommo(p) {
  if (!cfgMeliKommo.scope_id) {
    console.log(
      "[meli->kommo] scope_id ainda nao configurado, pulando envio"
    );
    return null;
  }

  const conversationId = p.pack_id
    ? `posvenda-pack-${p.pack_id}`
    : `posvenda-${p.destinatario_id}-${p.remetente_id}`;

  const nomeRemetente = p.pack_id
    ? `Venda ${p.pack_id}`
    : `Comprador ML ${p.remetente_id}`;

  const sender = {
    id: String(p.remetente_id),
    name: nomeRemetente,
  };

  const timestamp = Math.floor(new Date(p.quando).getTime() / 1000);
  const msecTimestamp = new Date(p.quando).getTime();

  const resultados = [];

  const temTexto = p.texto && String(p.texto).trim();

  if (temTexto) {
    const texto = p.item_titulo
      ? `[Mensagem sobre: ${p.item_titulo}] ${p.texto}`
      : p.item_id
      ? `[Mensagem sobre o anuncio ${p.item_id}] ${p.texto}`
      : p.texto;

    const rTexto = await chamarKommoMeli(
      "POST",
      `/v2/origin/custom/${cfgMeliKommo.scope_id}`,
      {
        event_type: "new_message",
        payload: {
          timestamp,
          msec_timestamp: msecTimestamp,
          msgid: `posvenda-${p.message_id}`,
          conversation_id: conversationId,
          sender,
          message: {
            type: "text",
            text: texto,
          },
          silent: false,
        },
      }
    );

    if (rTexto.status === 200) {
      console.log("[meli->kommo] mensagem pos-venda (texto) enviada ao Kommo");
    } else {
      console.log(
        "[meli->kommo] FALHOU no Kommo (mensagem pos-venda texto):",
        rTexto.status,
        rTexto.texto
      );
    }

    resultados.push(rTexto);
  }

  const anexos = Array.isArray(p.anexos) ? p.anexos : [];

  for (let i = 0; i < anexos.length; i++) {
    const anexo = anexos[i];

    const ehImagem =
      typeof anexo?.tipo === "string" && anexo.tipo.startsWith("image/");

    const rAnexo = await chamarKommoMeli(
      "POST",
      `/v2/origin/custom/${cfgMeliKommo.scope_id}`,
      {
        event_type: "new_message",
        payload: {
          timestamp,
          msec_timestamp: msecTimestamp,
          msgid: `posvenda-${p.message_id}-anexo-${i}`,
          conversation_id: conversationId,
          sender,
          message: {
            type: ehImagem ? "picture" : "file",
            media: anexo.url,
            file_name: anexo.nome_original || `arquivo-${i + 1}`,
          },
          silent: false,
        },
      }
    );

    if (rAnexo.status === 200) {
      console.log(
        "[meli->kommo] anexo enviado ao Kommo:",
        anexo.nome_original || anexo.url
      );
    } else {
      console.log(
        "[meli->kommo] FALHOU no Kommo (anexo):",
        rAnexo.status,
        rAnexo.texto
      );
    }

    resultados.push(rAnexo);
  }

  if (!temTexto && anexos.length === 0) {
    console.log(
      "[meli->kommo] mensagem pos-venda sem texto e sem anexo, nada enviado"
    );
  }

  return resultados;
}

/*
 * Envia uma mensagem de RECLAMACAO do Mercado Livre para o
 * canal "Mercado Livre Guedes" no Kommo.
 *
 * p e o objeto normalizado por processarReclamacaoMeli:
 * { message_id, claim_id, reason_id, tipo, remetente_id,
 *   destinatario_id, quando, texto }
 *
 * O conversation_id usa o claim_id, para manter todas as
 * mensagens da mesma reclamacao na mesma conversa no Kommo.
 */
export async function enviarReclamacaoParaKommo(p) {
  if (!cfgMeliKommo.scope_id) {
    console.log(
      "[meli->kommo] scope_id ainda nao configurado, pulando envio"
    );
    return null;
  }

  const conversationId = `reclamacao-${p.claim_id}`;

  const prefixo = p.reason_id
    ? `[Reclamacao #${p.claim_id} - motivo ${p.reason_id}]`
    : `[Reclamacao #${p.claim_id}]`;

  const texto = p.alerta_prazo
    ? `${p.alerta_prazo}\n${prefixo} ${p.texto}`
    : `${prefixo} ${p.texto}`;

  const r = await chamarKommoMeli(
    "POST",
    `/v2/origin/custom/${cfgMeliKommo.scope_id}`,
    {
      event_type: "new_message",
      payload: {
        timestamp:
          Math.floor(new Date(p.quando).getTime() / 1000),

        msec_timestamp:
          new Date(p.quando).getTime(),

        msgid:
          `reclamacao-${p.message_id}`,

        conversation_id:
          conversationId,

        sender: {
          id: String(p.remetente_id),
          name: `Reclamacao ${p.claim_id}`,
        },

        message: {
          type: "text",
          text: texto || "[reclamacao sem texto]",
        },

        silent: false,
      },
    }
  );

  if (r.status === 200) {
    console.log("[meli->kommo] reclamacao enviada ao Kommo");
  } else {
    console.log(
      "[meli->kommo] FALHOU no Kommo (reclamacao):",
      r.status,
      r.texto
    );
  }

  return r;
}

export async function espelharRespostaCentralNoKommoMeli({
  conversationId,
  compradorId,
  compradorNome = null,
  texto,
  respondenteAmojoId,
  respondenteNome = "Suporte",
  msgid,
}) {
  if (!cfgMeliKommo.scope_id) {
    throw new Error("MELI_KOMMO_SCOPE_ID nao configurado");
  }

  const agora = Date.now();

  return chamarKommoMeli(
    "POST",
    `/v2/origin/custom/${cfgMeliKommo.scope_id}`,
    {
      event_type: "new_message",
      payload: {
        timestamp: Math.floor(agora / 1000),
        msec_timestamp: agora,

        msgid,
        conversation_id: String(conversationId),

        sender: {
          id: "central-guedes",
          name: respondenteNome,
          ref_id: respondenteAmojoId,
        },

        receiver: {
          id: String(compradorId),
          name:
            compradorNome ||
            `Comprador ML ${compradorId}`,
        },

        message: {
          type: "text",
          text: String(texto),
        },

        silent: true,
      },
    }
  );
}
