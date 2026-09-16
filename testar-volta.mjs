import crypto from "node:crypto";
import { cfg } from "./shopee.mjs";

const corpo = JSON.stringify({
  account_id: cfg.kommo_amojo_id,
  time: Math.floor(Date.now() / 1000),
  message: {
    receiver: {
      id: "1357798834"
    },
    conversation: {
      client_id: "4706292482833670145"
    },
    message: {
      type: "text",
      text: "TESTE KOMMO PARA SHOPEE - pode ignorar"
    }
  }
});

const assinatura = crypto
  .createHmac("sha1", cfg.kommo_channel_secret)
  .update(corpo, "utf8")
  .digest("hex");

const url =
  `http://localhost:3000/webhooks/kommo/shopee/${cfg.kommo_scope_id}`;

const resp = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Signature": assinatura
  },
  body: corpo
});

console.log("HTTP:", resp.status);
console.log(await resp.text());