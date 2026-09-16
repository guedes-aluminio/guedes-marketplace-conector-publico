const PARTNER_ID   = "2038203";
const PARTNER_KEY  = "shpk664e4c746b62446f455057494b4f5550515950786772484f576164485274";
const SHOP_ID      = "1309234375";
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.CLuzfBABGMeppfAEIAEoqbaX1AYw5sa_1Ao4AUABSAk.k-wZv_GSoCWfVXEsQv3iZ-2AhynLus_Kbsd3YWMvTGI";

import crypto from "node:crypto";
const host = "https://partner.shopeemobile.com";

async function get(path, extra) {
  const ts   = Math.floor(Date.now() / 1000);
  const base = `${PARTNER_ID}${path}${ts}${ACCESS_TOKEN}${SHOP_ID}`;
  const sign = crypto.createHmac("sha256", PARTNER_KEY).update(base).digest("hex");
  const url  = `${host}${path}?partner_id=${PARTNER_ID}&timestamp=${ts}&sign=${sign}`
             + `&access_token=${ACCESS_TOKEN}&shop_id=${SHOP_ID}&${extra}`;
  const r = await fetch(url);
  return { status: r.status, json: await r.json().catch(() => null) };
}

const lista = await get("/api/v2/sellerchat/get_conversation_list", "direction=latest&type=all&page_size=1");
const conv = lista.json?.response?.conversations?.[0];

if (!conv) {
  console.log("Nao veio conversa. Resposta:", JSON.stringify(lista.json));
  process.exit(0);
}

console.log("conversation_id:", conv.conversation_id);
console.log("");

const msgs = await get("/api/v2/sellerchat/get_message", `conversation_id=${conv.conversation_id}&page_size=5`);
console.log("HTTP", msgs.status);

if (msgs.json?.error) {
  console.log("RESPOSTA:", JSON.stringify(msgs.json));
  process.exit(0);
}

const arr = msgs.json?.response?.messages || [];
console.log("chaves da resposta:", Object.keys(msgs.json?.response || {}));
console.log("mensagens encontradas:", arr.length);
console.log("");

for (const m of arr) {
  console.log({
    campos: Object.keys(m),
    message_id: m.message_id,
    from_id: m.from_id,
    to_id: m.to_id,
    message_type: m.message_type,
    created_timestamp: m.created_timestamp,
    source: m.source,
    chaves_do_content: m.content ? Object.keys(m.content) : null,
  });
}