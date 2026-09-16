import { enviarPerguntaMagaluParaKommo } from "./importarMagalu.mjs";

async function testar() {
  const resultado = await enviarPerguntaMagaluParaKommo({
    message_id: "teste-" + Date.now(),
    item_id: "TESTE123",
    item_titulo: "Produto de teste Magalu",
    remetente_id: "999999",
    remetente_nome: "Cliente de Teste Magalu",
    destinatario_id: null,
    quando: new Date().toISOString(),
    texto: "Essa e uma pergunta de teste, gerada manualmente, sem cliente real.",
  });

  console.log("status:", resultado?.status);
  console.log("resposta:", resultado?.texto);
}

testar().catch((e) => {
  console.log("ERRO:", e?.message || e);
});
