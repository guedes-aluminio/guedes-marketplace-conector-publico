import { chamar as chamarMeli } from "./meli.mjs";

/*
 * Consulta reclamacoes reais da loja, para ver o formato
 * de dados de verdade antes de construir a integracao.
 *
 * Rodar pelo Shell do Render com:
 *
 *   node listarReclamacoesMeli.mjs
 */

async function rodar() {
  console.log("--- Reclamacoes abertas (status=opened) ---");

  const abertas = await chamarMeli(
    "/post-purchase/v1/claims/search?status=opened"
  );

  console.log("status:", abertas.status);
  console.log("resposta:", abertas.texto?.slice(0, 5000));

  const primeira = abertas.json?.data?.[0];

  if (primeira?.id) {
    console.log("");
    console.log(
      `--- Detalhe da primeira reclamacao (id ${primeira.id}) ---`
    );

    const detalhe = await chamarMeli(
      `/post-purchase/v1/claims/${primeira.id}`
    );

    console.log("status:", detalhe.status);
    console.log("resposta:", detalhe.texto?.slice(0, 5000));

    console.log("");
    console.log("--- Mensagens dessa reclamacao ---");

    const mensagens = await chamarMeli(
      `/post-purchase/v1/claims/${primeira.id}/messages`
    );

    console.log("status:", mensagens.status);
    console.log("resposta:", mensagens.texto?.slice(0, 5000));
  } else {
    console.log("");
    console.log("Nenhuma reclamacao aberta encontrada.");

    for (const status of ["closed", "cancelled"]) {
      console.log("");
      console.log(`--- Tentando status=${status} ---`);

      const resultado = await chamarMeli(
        `/post-purchase/v1/claims/search?status=${status}`
      );

      console.log("status:", resultado.status);
      console.log("resposta:", resultado.texto?.slice(0, 3000));
    }
  }
}

rodar().catch((e) => {
  console.log("ERRO:", e?.message || e);
});
