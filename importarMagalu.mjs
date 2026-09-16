import { chamarKommoMagalu, cfgMagaluKommo } from "./kommoMagalu.mjs";

/*
 * Envia uma pergunta de anuncio do Magalu para o canal
 * "Magalu Guedes" no Kommo.
 *
 * p e o objeto ja normalizado por traduzirPerguntaMagalu:
 * { message_id, item_id, item_titulo, remetente_id,
 *   remetente_nome, destinatario_id, quando, texto }
 *
 * cfgMagaluKommo.scope_id fica vazio ate o canal ser
 * registrado; enquanto isso a funcao so avisa no log
 * e nao faz a chamada.
 */
export async function enviarPerguntaMagaluParaKommo(p) {
  if (!cfgMagaluKommo.scope_id) {
    console.log(
      "[magalu->kommo] scope_id ainda nao configurado, pulando envio"
    );
    return null;
  }

  const conversationId = `pergunta-magalu-${p.message_id}`;

  const texto = p.item_titulo
    ? `[Pergunta sobre: ${p.item_titulo}] ${p.texto}`
    : p.item_id
    ? `[Pergunta sobre o anuncio ${p.item_id}] ${p.texto}`
    : p.texto;

  const r = await chamarKommoMagalu(
    "POST",
    `/v2/origin/custom/${cfgMagaluKommo.scope_id}`,
    {
      event_type: "new_message",
      payload: {
        timestamp:
          Math.floor(new Date(p.quando).getTime() / 1000),

        msec_timestamp:
          new Date(p.quando).getTime(),

        msgid:
          `pergunta-magalu-${p.message_id}`,

        conversation_id:
          conversationId,

        sender: {
          id: String(p.remetente_id),
          name: p.remetente_nome || `Comprador Magalu ${p.remetente_id}`,
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
    console.log("[magalu->kommo] pergunta enviada ao Kommo");
  } else {
    console.log(
      "[magalu->kommo] FALHOU no Kommo:",
      r.status,
      r.texto
    );
  }

  return r;
}

/*
 * Envia uma mensagem de CHAT/POS-VENDA do Magalu para o
 * canal "Magalu Guedes" no Kommo.
 *
 * p e o objeto ja normalizado por traduzirMensagemMagalu:
 * { message_id, conversation_id, item_titulo, remetente_id,
 *   remetente_nome, destinatario_id, quando, texto }
 *
 * O conversation_id que mandamos pro Kommo precisa ser o
 * mesmo para todas as mensagens da mesma conversa, senao
 * cada mensagem vira uma conversa nova. Usamos o
 * conversation_id do Magalu como base.
 */
export async function enviarMensagemMagaluParaKommo(p) {
  if (!cfgMagaluKommo.scope_id) {
    console.log(
      "[magalu->kommo] scope_id ainda nao configurado, pulando envio"
    );
    return null;
  }

  const conversationId = p.conversation_id
    ? `posvenda-magalu-${p.conversation_id}`
    : `posvenda-magalu-${p.destinatario_id}-${p.remetente_id}`;

  const texto = p.item_titulo
    ? `[Mensagem sobre: ${p.item_titulo}] ${p.texto}`
    : p.texto;

  const r = await chamarKommoMagalu(
    "POST",
    `/v2/origin/custom/${cfgMagaluKommo.scope_id}`,
    {
      event_type: "new_message",
      payload: {
        timestamp:
          Math.floor(new Date(p.quando).getTime() / 1000),

        msec_timestamp:
          new Date(p.quando).getTime(),

        msgid:
          `posvenda-magalu-${p.message_id}`,

        conversation_id:
          conversationId,

        sender: {
          id: String(p.remetente_id),
          name: p.conversation_id
            ? `Venda ${p.conversation_id}`
            : p.remetente_nome || `Comprador Magalu ${p.remetente_id}`,
        },

        message: {
          type: "text",
          text: texto || "[mensagem sem texto]",
        },

        silent: false,
      },
    }
  );

  if (r.status === 200) {
    console.log("[magalu->kommo] mensagem pos-venda enviada ao Kommo");
  } else {
    console.log(
      "[magalu->kommo] FALHOU no Kommo (mensagem pos-venda):",
      r.status,
      r.texto
    );
  }

  return r;
}
