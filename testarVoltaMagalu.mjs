import crypto from "node:crypto";

const CHANNEL_SECRET = process.env.MAGALU_KOMMO_CHANNEL_SECRET;
const SCOPE_ID = process.env.MAGALU_KOMMO_SCOPE_ID;

const corpo = JSON.stringify({
  message: {
    receiver: {
      id: "d437f231-5352-43fa-910d-d90b2e80f92d",
      name: "Cliente de Teste Magalu",
      client_id: "999999",
    },
    sender: {
      id: "algum-id-do-atendente",
      name: "Atendente Teste",
    },
    conversation: {
      id: "8401a0eb-bcc5-4fc9-a2c5-c5111e9d01d7",
      client_id: "pergunta-magalu-507f1f77bcf86cd799439011",
    },
    timestamp: Math.floor(Date.now() / 1000),
    msec_timestamp: Date.now(),
    message: {
      id: "msg-teste-volta",
      type: "text",
      text: "Resposta de teste, simulando o atendente no Kommo.",
    },
  },
});

const assinatura = crypto
  .createHmac("sha1", CHANNEL_SECRET)
  .update(corpo.trim(), "utf8")
  .digest("hex");

async function testar() {
  if (!CHANNEL_SECRET || !SCOPE_ID) {
    console.log(
      "ERRO: MAGALU_KOMMO_CHANNEL_SECRET ou MAGALU_KOMMO_SCOPE_ID nao configurados no ambiente"
    );
    return;
  }

  const resposta = await fetch(
    `https://shopee-kommo-conector.onrender.com/webhooks/kommo/magalu/${SCOPE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": assinatura,
      },
      body: corpo,
    }
  );

  const texto = await resposta.text();

  console.log("status HTTP da nossa rota:", resposta.status);
  console.log("resposta da nossa rota:", texto);
  console.log("");
  console.log(
    "Veja os logs do Render para conferir o processamento completo (validacao, identificacao, chamada ao Magalu)."
  );
}

testar().catch((e) => {
  console.log("ERRO:", e?.message || e);
});
