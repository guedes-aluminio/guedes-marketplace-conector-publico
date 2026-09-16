import { cfg } from "./shopee.mjs";

export function traduzir(c) {
  const base = {
    message_id: String(c.message_id),
    conversation_id: String(c.conversation_id),
    comprador_id: String(c.from_id),
    comprador_nome: c.from_user_name,
    tipo: c.message_type,
    quando: new Date(c.created_timestamp * 1000).toISOString(),
  };

  const d = c.content || {};

  switch (c.message_type) {
    case "text":
      return { ...base, texto: d.text || "", anexo: null };

    case "image":
      return {
        ...base,
        texto: "[imagem]",
        anexo: { tipo: "imagem", url: d.url || null },
      };

    case "sticker":
      return { ...base, texto: "[figurinha]", anexo: null };

    case "item": {
      const link = d.item_id
        ? `https://shopee.com.br/product/${d.shop_id || cfg.shop_id}/${d.item_id}`
        : null;

      return {
        ...base,
        texto: `[produto ${d.item_id || "?"}]`,
        anexo: link ? { tipo: "produto", url: link } : null,
      };
    }

    case "variation_card": {
      const link = d.item_id
        ? `https://shopee.com.br/product/${d.shop_id || cfg.shop_id}/${d.item_id}`
        : null;

      return {
        ...base,
        texto: `[produto com variacao selecionada${d.item_id ? " " + d.item_id : ""}]`,
        anexo: link ? { tipo: "produto", url: link } : null,
        cru: link ? undefined : d,
      };
    }

    case "order": {
      const pedido = d.order_sn || d.orderid || d.order_id || null;

      return {
        ...base,
        texto: pedido
          ? `[mensagem automatica sobre o pedido ${pedido}]`
          : "[mensagem automatica sobre um pedido]",
        anexo: null,
        cru: d,
      };
    }

    default:
      return {
        ...base,
        texto: `[mensagem do tipo ${c.message_type}, ainda nao tratada]`,
        anexo: null,
        cru: d,
      };
  }
}
