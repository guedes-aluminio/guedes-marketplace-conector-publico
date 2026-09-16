import { chamar } from "./kommo.mjs";
import { cfg } from "./shopee.mjs";

const agora = Math.floor(Date.now() / 1000);

const r = await chamar("POST", `/v2/origin/custom/${cfg.kommo_scope_id}`, {
  event_type: "new_message",
  payload: {
    timestamp: agora,
    msec_timestamp: Date.now(),
    msgid: "teste-" + agora,
    conversation_id: "conversa-teste-1",
    sender: {
      id: "comprador-teste-1",
      name: "Comprador de Teste",
    },
    message: {
      type: "text",
      text: "Mensagem de teste vinda do conector, ignore.",
    },
    silent: false,
  },
});

console.log("HTTP", r.status);
console.log(r.texto);
