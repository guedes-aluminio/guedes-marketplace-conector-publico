const PARTNER_ID   = "2038203";
const PARTNER_KEY  = "shpk664e4c746b62446f455057494b4f5550515950786772484f576164485274";
const SHOP_ID      = "1309234375";
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.CLuzfBABGMeppfAEIAEoqbaX1AYw5sa_1Ao4AUABSAk.k-wZv_GSoCWfVXEsQv3iZ-2AhynLus_Kbsd3YWMvTGI";

import crypto from "node:crypto";

const host = "https://partner.shopeemobile.com";

async function chamar(rotulo, path, extra) {
  const ts   = Math.floor(Date.now() / 1000);
  const base = `${PARTNER_ID}${path}${ts}${ACCESS_TOKEN}${SHOP_ID}`;
  const sign = crypto.createHmac("sha256", PARTNER_KEY).update(base).digest("hex");

  const url = `${host}${path}?partner_id=${PARTNER_ID}&timestamp=${ts}&sign=${sign}`
            + `&access_token=${ACCESS_TOKEN}&shop_id=${SHOP_ID}&${extra}`;

  const resp = await fetch(url);
  const texto = await resp.text();

  console.log(`===== ${rotulo} =====`);
  console.log("HTTP", resp.status);
  console.log(texto.substring(0, 900));
  console.log("");
}

const de  = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
const ate = Math.floor(Date.now() / 1000);

await chamar(
  "1 PEDIDOS (controle)",
  "/api/v2/order/get_order_list",
  `time_range_field=create_time&time_from=${de}&time_to=${ate}&page_size=1`
);

await chamar(
  "2 CHAT",
  "/api/v2/sellerchat/get_conversation_list",
  "direction=latest&type=all&page_size=10"
);