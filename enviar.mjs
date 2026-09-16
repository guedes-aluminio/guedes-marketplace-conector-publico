import { chamar } from "./shopee.mjs";

export async function enviarTextoShopee(paraId, texto) {
  if (!paraId) {
    throw new Error("ID do comprador Shopee ausente");
  }

  if (!texto || !String(texto).trim()) {
    throw new Error("Texto da mensagem vazio");
  }

  const r = await chamar(
    "/api/v2/sellerchat/send_message",
    {},
    {
      to_id: Number(paraId),
      message_type: "text",
      content: {
        text: String(texto),
      },
    }
  );

  if (r?.error) {
    throw new Error(
      `Shopee retornou erro: ${r.error}${r.message ? " - " + r.message : ""}`
    );
  }

  return r;
}