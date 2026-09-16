import { chamar } from "./shopee.mjs";

const r = await chamar("/api/v2/sellerchat/get_conversation_list", {
  direction: "older",
  type: "all",
  page_size: "3",
});

if (r.error) {
  console.log("ERRO:", JSON.stringify(r));
} else {
  const convs = r.response?.conversations || [];
  console.log("deu certo, conversas retornadas:", convs.length);
  for (const c of convs) {
    console.log(new Date(Number(c.last_message_timestamp) / 1e6).toLocaleString("pt-BR"), "| nao lidas:", c.unread_count);
  }
}