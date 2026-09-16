import { chamar as chamarMeli } from "./meli.mjs";

/*
 * Responde a uma pergunta de anuncio do Mercado Livre.
 *
 * POST /answers
 * { question_id, text }
 */
export async function responderPerguntaMeli(questionId, texto) {
  const resposta = await chamarMeli("/answers", {
    method: "POST",
    body: JSON.stringify({
      question_id: Number(questionId),
      text: texto,
    }),
  });

  return resposta;
}

/*
 * Responde uma mensagem POS-VENDA (dentro de um pedido).
 *
 * Usa o endpoint direto de mensagens, porque o comprador
 * ja iniciou a conversa (nao estamos puxando assunto,
 * entao NAO usamos o fluxo de action_guide/motivo).
 *
 * POST /messages/packs/{pack_id}/sellers/{seller_id}?tag=post_sale
 * { from: {user_id}, to: {user_id}, text }
 */
export async function responderMensagemPosVenda(
  packId,
  sellerId,
  buyerId,
  texto
) {
  const resposta = await chamarMeli(
    `/messages/packs/${encodeURIComponent(packId)}/sellers/${encodeURIComponent(sellerId)}?tag=post_sale`,
    {
      method: "POST",
      body: JSON.stringify({
        from: {
          user_id: Number(sellerId),
        },
        to: {
          user_id: Number(buyerId),
        },
        text: texto,
      }),
    }
  );

  return resposta;
}

/*
 * Responde uma mensagem dentro de uma RECLAMACAO.
 *
 * POST /post-purchase/v1/claims/{claim_id}/messages
 * { receiver_role: "complainant", message }
 *
 * Um player (vendedor ou comprador) so pode enviar mensagem
 * se tiver a acao "send_message" liberada naquele momento
 * da reclamacao. Se nao tiver, o Mercado Livre recusa a
 * chamada (normalmente com 400 ou 403).
 */
export async function responderReclamacaoMeli(claimId, texto) {
  const resposta = await chamarMeli(
    `/post-purchase/v1/claims/${encodeURIComponent(claimId)}/actions/message`,
    {
      method: "POST",
      body: JSON.stringify({
        receiver_role: "complainant",
        message: texto,
      }),
    }
  );

  return resposta;
}
