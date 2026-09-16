const PARTNER_ID    = "2038203";
const PARTNER_KEY   = "shpk664e4c746b62446f455057494b4f5550515950786772484f576164485274";
const SHOP_ID       = "1309234375";
const REFRESH_TOKEN = "eyJhbGciOiJIUzI1NiJ9.CLuzfBABGMeppfAEIAIoqbaX1AYw0bj8tAw4AUABSAk._jZoHPlbhl8Mt_1FkrB4dxWAD3pnc24iCUfbmsM_9Ns";

import crypto from "node:crypto";

const host = "https://partner.shopeemobile.com";
const path = "/api/v2/auth/access_token/get";
const ts   = Math.floor(Date.now() / 1000);

const base = `${PARTNER_ID}${path}${ts}`;
const sign = crypto.createHmac("sha256", PARTNER_KEY).update(base).digest("hex");

const url = `${host}${path}?partner_id=${PARTNER_ID}&timestamp=${ts}&sign=${sign}`;

const resp = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    shop_id: Number(SHOP_ID),
    refresh_token: REFRESH_TOKEN,
    partner_id: Number(PARTNER_ID),
  }),
});

const dados = await resp.json();

console.log("HTTP", resp.status);
console.log("");

if (dados.access_token) {
  const validade = new Date(Date.now() + (dados.expire_in || 14400) * 1000);
  console.log("=== COPIE ESTES TRES VALORES PARA O BASE44 AGORA ===");
  console.log("");
  console.log("access_token:");
  console.log(dados.access_token);
  console.log("");
  console.log("refresh_token:");
  console.log(dados.refresh_token);
  console.log("");
  console.log("expires_at:");
  console.log(validade.toISOString());
} else {
  console.log("NAO RENOVOU. Resposta da Shopee:");
  console.log(JSON.stringify(dados));
}