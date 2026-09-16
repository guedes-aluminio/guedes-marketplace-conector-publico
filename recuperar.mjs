import { chamar, cfg } from "./shopee.mjs";
import { jaProcessada, registrarMensagem } from "./armazenamento.mjs";
import { traduzir } from "./mensagem.mjs";
import { enviarParaKommo } from "./importar.mjs";

export async function recuperarPerdidas() {
  console.log("[recuperacao] procurando mensagens nao importadas...");

  const lista = await chamar("/api/v2/sellerchat/get_conversation_list", {
    direction: "older",
    type: "all",
    page_size: "20",
  });

  if (lista?.error) {
    console.log("[recuperacao] falhou ao listar:", JSON.stringify(lista));
    return;
  }

  const conversas = lista?.response?.conversations || [];
  let recuperadas = 0;

  for (const conv of conversas) {
    const msgs = await chamar("/api/v2/sellerchat/get_message", {
      conversation_id: String(conv.conversation_id),
      page_size: "20",
    });

    const arr = msgs?.response?.messages || [];

    for (const c of arr.slice().reverse()) {
      const mid = String(c.message_id);

      if (String(c.from_id) === String(cfg.id_usuario_loja)) continue;
      if (jaProcessada(mid)) continue;

      const m = traduzir(c);

      try {
        await enviarParaKommo(m);
      } catch (e) {
        console.log("[recuperacao] erro em", mid, e.message);
        continue;
      }

      registrarMensagem({
        message_id: m.message_id,
        conversation_id: m.conversation_id,
        comprador_id: m.comprador_id,
        comprador_nome: m.comprador_nome,
        quando: m.quando,
      });

      recuperadas++;
      console.log("[recuperacao] importada:", m.quando, m.comprador_nome);
    }
  }

  console.log("[recuperacao] concluida. mensagens recuperadas:", recuperadas);
}

if (process.argv[1] && process.argv[1].endsWith("recuperar.mjs")) {
  await recuperarPerdidas();
}
