import crypto from "node:crypto";

/*
 * Credenciais do canal "Magalu Guedes" no Kommo.
 * Ainda NAO preenchidas: aguardando registrar o canal
 * com o suporte do Kommo, do mesmo jeito que foi feito
 * com Shopee Guedes e Mercado Livre Guedes.
 *
 * Quando chegar, criar no Render as variaveis:
 *   MAGALU_KOMMO_CHANNEL_ID
 *   MAGALU_KOMMO_CHANNEL_SECRET
 *   MAGALU_KOMMO_SCOPE_ID (preenchido so depois de rodar
 *     o script de conexao do canal)
 */
export const cfgMagaluKommo = {
  channel_id: process.env.MAGALU_KOMMO_CHANNEL_ID || "",
  scope_id: process.env.MAGALU_KOMMO_SCOPE_ID || "",
  channel_secret: process.env.MAGALU_KOMMO_CHANNEL_SECRET || "",
};

function md5(texto) {
  return crypto
    .createHash("md5")
    .update(texto, "utf8")
    .digest("hex");
}

function montarCabecalhosMagalu(metodo, caminho, corpo) {
  const data = new Date().toUTCString();
  const contentType = "application/json";
  const contentMd5 = md5(corpo || "");

  const base =
    metodo.toUpperCase() + "\n" +
    contentMd5 + "\n" +
    contentType + "\n" +
    data + "\n" +
    caminho;

  const assinatura = crypto
    .createHmac("sha1", cfgMagaluKommo.channel_secret)
    .update(base, "utf8")
    .digest("hex");

  return {
    Date: data,
    "Content-Type": contentType,
    "Content-MD5": contentMd5,
    "X-Signature": assinatura,
  };
}

export async function chamarKommoMagalu(metodo, caminho, dados) {
  const corpo = dados ? JSON.stringify(dados) : "";
  const cabecalhos = montarCabecalhosMagalu(metodo, caminho, corpo);

  const resposta = await fetch(
    `https://amojo.kommo.com${caminho}`,
    {
      method: metodo,
      headers: cabecalhos,
      body: corpo || undefined,
    }
  );

  const texto = await resposta.text();

  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = null;
  }

  return {
    status: resposta.status,
    texto,
    json,
  };
}

/*
 * Validacao dos webhooks que o Kommo enviar para o canal
 * Magalu. Mesma regra descoberta na Shopee/Mercado Livre:
 * assinar o corpo SEM o \n final que o Kommo as vezes anexa.
 */
export function webhookValidoMagalu(assinatura, corpoBruto) {
  if (!assinatura) {
    return false;
  }

  const corpoLimpo =
    Buffer.isBuffer(corpoBruto)
      ? corpoBruto.toString("utf8").trim()
      : String(corpoBruto || "").trim();

  const calculada = crypto
    .createHmac("sha1", cfgMagaluKommo.channel_secret)
    .update(corpoLimpo, "utf8")
    .digest("hex");

  return calculada === assinatura;
}
