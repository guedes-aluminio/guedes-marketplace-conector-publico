const PARTNER_ID   = "2038203";
const PARTNER_KEY  = "shpk664e4c746b62446f455057494b4f5550515950786772484f576164485274";
const SHOP_ID      = "1309234375";
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.CLuzfBABGMeppfAEIAEoqbaX1AYw5sa_1Ao4AUABSAk.k-wZv_GSoCWfVXEsQv3iZ-2AhynLus_Kbsd3YWMvTGI";

import crypto from "node:crypto";
const host = "https://partner.shopeemobile.com";

const path = "/api/v2/sellerchat/get_conversation_list";
const ts   = Math.floor(Date.now() / 1000);
const base = `${PARTNER_ID}${path}${ts}${ACCESS_TOKEN}${SHOP_ID}`;
const sign = crypto.createHmac("sha256", PARTNER_KEY).update(base).digest("hex");

const url = `${host}${path}?partner_id=${PARTNER_ID}&timestamp=${ts}&sign=${sign}`
          + `&access_token=${ACCESS_TOKEN}&shop_id=${SHOP_ID}&direction=latest&type=all&page_size=20`;

const r = await fetch(url);
const j = await r.json();

const convs = j?.response?.conversations || [];
console.log("conversas retornadas:", convs.length);
console.log("");

for (const c of convs) {
  const ns = Number(c.last_message_timestamp);
  const data = new Date(ns / 1e6);
  console.log(data.toISOString().substring(0, 16), "| nao lidas:", c.unread_count);
}