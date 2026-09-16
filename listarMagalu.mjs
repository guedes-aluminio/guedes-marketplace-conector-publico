import { chamarMagalu } from "./magalu.mjs";

/*
 * Consulta perguntas e conversas reais da loja, para
 * confirmar o formato de dados que a API realmente devolve
 * (a documentacao nao mostrou o schema completo em alguns
 * pontos, entao aqui vemos o dado de verdade).
 *
 * Testa nos dois dominios (services e marketplace), porque
 * ja descobrimos que a documentacao geral nem sempre bate
 * com o dominio certo na pratica.
 *
 * Rodar pelo Shell do Render com:
 *
 *   node listarMagalu.mjs
 */

async function testar(nome, caminho, base) {
  console.log(`--- ${nome} (base: ${base || "services"}) ---`);

  try {
    const opcoes = base ? { base } : {};
    const resposta = await chamarMagalu(caminho, opcoes);

    console.log("status:", resposta.status);
    console.log("resposta:", resposta.texto?.slice(0, 3000));
  } catch (e) {
    console.log("ERRO:", e?.message || e);
  }

  console.log("");
}

async function rodar() {
  await testar("GET /v0/questions (services)", "/v0/questions");
  await testar(
    "GET /v0/questions (marketplace)",
    "/v0/questions",
    "marketplace"
  );
  await testar("GET /v0/conversations (services)", "/v0/conversations");
  await testar(
    "GET /v0/conversations (marketplace)",
    "/v0/conversations",
    "marketplace"
  );
}

rodar().catch((e) => {
  console.log("ERRO GERAL:", e?.message || e);
});
