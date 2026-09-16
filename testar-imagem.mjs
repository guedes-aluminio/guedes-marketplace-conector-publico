import { chamar } from "./kommo.mjs";
import { cfg } from "./shopee.mjs";

const agora = Date.now();

const r = await chamar("POST", `/v2/origin/custom/${cfg.kommo_scope_id}`, {
  event_type: "new_message",
  payload: {
    timestamp: Math.floor(agora / 1000),
    msec_timestamp: agora,
    msgid: "teste-img-" + agora,
    conversation_id: "4706292482833670145",
    sender: { id: "1357798834", name: "arianeminguinisanga" },
    message: {
      type: "picture",
      media: "https://img.sp.mms.shopee.sg/br-11134231-820m2-ms9yd88ur2mc9f",
      file_name: "foto.jpg",
    },
    silent: false,
  },
});

console.log("HTTP", r.status);
console.log(r.texto);
