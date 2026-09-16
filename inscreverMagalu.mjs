import { chamarMagalu } from "./magalu.mjs";

/*
 * Inscreve nosso servidor para receber webhooks do Magalu,
 * tanto de perguntas quanto de chat/pos-venda.
 *
 * So precisa ser rodado uma vez (ou de novo se a URL mudar).
 *
 * ATENCAO: o formato exato do corpo desta chamada nao estava
 * visivel na documentacao (pagina com schema dinamico). Este
 * e um palpite razoavel baseado no padrao de outras APIs de
 * webhook. Se der erro, o log vai mostrar a mensagem exata
 * do Magalu, e ajustamos o corpo a partir dai.
 *
 * Rodar pelo Shell do Render com:
 *
 *   node inscreverMagalu.mjs
 */

const URL_WEBHOOK =
  "https://shopee-kommo-conector.onrender.com/magalu/notificacoes";

const TOPICOS = ["ps-chat-notification", "ps-chat_conversation"];

async function inscrever() {
  console.log("--- Tentativa 4: webhook como string ---");

  const resposta = await chamarMagalu("/v0/onboarding/signup", {
    method: "PUT",
    base: "marketplace",
    body: JSON.stringify({
      webhook: URL_WEBHOOK,
      topics: TOPICOS,
    }),
  });

  console.log("status:", resposta.status);
  console.log("resposta:", resposta.texto);
}

inscrever().catch((e) => {
  console.log("ERRO ao inscrever webhook:", e?.message || e);
});
