import { chamarMagalu } from "./magalu.mjs";

export async function responderPerguntaMagalu(questionId, texto) {
  const resposta = await chamarMagalu(
    `/v0/questions/${encodeURIComponent(questionId)}/answer`,
    {
      method: "POST",
      body: JSON.stringify({
        message: texto,
        owner: {
          name: "Guedes Aluminio",
          external_id: "guedes-aluminio",
        },
      }),
    }
  );

  return resposta;
}

export async function responderMensagemMagalu(conversationId, texto) {
  const resposta = await chamarMagalu(
    `/v0/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: texto,
      }),
    }
  );

  return resposta;
}
