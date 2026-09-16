/*
 * Traduz os dados de uma pergunta do Magalu (retorno de
 * GET /v0/questions/{id}, mesmo formato do campo "data"
 * que vem no webhook ps-chat-notification) para o formato
 * interno usado no resto do projeto.
 */
export function traduzirPerguntaMagalu(dados) {
  const q = dados?.question || {};
  const a = dados?.answer || null;

  return {
    message_id: dados?.id || q?.external_id || null,
    item_id: dados?.subject?.id || q?.product?.sku || null,
    item_titulo:
      dados?.subject?.extra?.name || q?.product?.description || null,
    remetente_id: q?.owner?.customer_id || q?.owner?.ref_key || null,
    remetente_nome: q?.owner?.name || null,
    destinatario_id: null,
    quando: q?.when_at || null,
    texto: q?.message || "",
    status: dados?.status || null,
    ja_respondida: Boolean(a?.message),
  };
}

/*
 * Traduz uma mensagem de chat (POS-VENDA) do Magalu.
 *
 * "mensagem" e o objeto Message (retorno de buscar mensagem
 * por conversa/id). "conversa" e o objeto Conversation
 * (opcional, usado so para pegar o display_name como
 * identificacao amigavel, tipo "Venda X" no Mercado Livre).
 */
export function traduzirMensagemMagalu(mensagem, conversa) {
  return {
    message_id: mensagem?.id || mensagem?.external_id || null,
    conversation_id: conversa?.id || null,
    item_titulo: conversa?.display_name || null,
    remetente_id: mensagem?.from_user?.id || null,
    remetente_tipo: mensagem?.from_user?.type || null,
    remetente_nome: mensagem?.from_user?.full_name || null,
    destinatario_id: mensagem?.to_user?.id || null,
    quando: mensagem?.when_at || null,
    texto: mensagem?.content || "",
  };
}

/*
 * Uma mensagem de chat pode ter sido enviada pelo proprio
 * vendedor (por exemplo, se alguem responder direto pelo
 * painel do Magalu, sem passar pelo Kommo). Usamos isso
 * para evitar processar/reenviar a propria mensagem.
 */
export function ehMensagemDoCliente(mensagem) {
  return mensagem?.from_user?.type === "CUSTOMER";
}
