import { chamar } from "./kommo.mjs";
import { cfg } from "./shopee.mjs";

export async function enviarParaKommo(m) {

  let mensagem;

  if (m.anexo?.tipo === "imagem" && m.anexo?.url) {
    mensagem = {
      type: "picture",
      media: m.anexo.url,
      file_name: "imagem-shopee.jpg",
    };
  }

  else {
    const texto = m.anexo
      ? (m.texto ? m.texto + " " : "") + m.anexo.url
      : m.texto;

    mensagem = {
      type: "text",
      text: texto || "[mensagem sem conteudo]",
    };
  }

  const r = await chamar(
    "POST",
    `/v2/origin/custom/${cfg.kommo_scope_id}`,
    {
      event_type: "new_message",
      payload: {
        timestamp: Math.floor(
          new Date(m.quando).getTime() / 1000
        ),
        msec_timestamp: new Date(m.quando).getTime(),
        msgid: m.message_id,
        conversation_id: m.conversation_id,

        sender: {
          id: m.comprador_id,
          name: m.comprador_nome,
        },

        message: mensagem,

        silent: false,
      },
    }
  );

  if (r.status === 200) {
    console.log("-> enviado ao Kommo");
  } else {
    console.log(
      "-> FALHOU no Kommo:",
      r.status,
      r.texto
    );
  }

  return r;
}

export async function espelharRespostaCentralNoKommo({
  conversationId,
  compradorId,
  compradorNome = null,
  texto,
  respondenteAmojoId,
  respondenteNome = "Suporte",
  msgid,
}) {
  const agora = Date.now();

  return chamar(
    "POST",
    `/v2/origin/custom/${cfg.kommo_scope_id}`,
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
            `Cliente ${compradorId}`,
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
