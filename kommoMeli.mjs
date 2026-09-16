import crypto from "node:crypto";


export const cfgMeliKommo = {
  channel_id: process.env.MELI_KOMMO_CHANNEL_ID || "",
  scope_id: process.env.MELI_KOMMO_SCOPE_ID || "",
  channel_secret: process.env.MELI_KOMMO_CHANNEL_SECRET || "",
};

function md5(texto) {
  return crypto
    .createHash("md5")
    .update(texto, "utf8")
    .digest("hex");
}

function montarCabecalhosMeli(metodo, caminho, corpo) {
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
    .createHmac("sha1", cfgMeliKommo.channel_secret)
    .update(base, "utf8")
    .digest("hex");

  return {
    Date: data,
    "Content-Type": contentType,
    "Content-MD5": contentMd5,
    "X-Signature": assinatura,
  };
}

export async function chamarKommoMeli(metodo, caminho, dados) {
  const corpo = dados ? JSON.stringify(dados) : "";
  const cabecalhos = montarCabecalhosMeli(metodo, caminho, corpo);

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


export function webhookValidoMeli(assinatura, corpoBruto) {
  if (!assinatura) {
    return false;
  }

  const corpoLimpo =
    Buffer.isBuffer(corpoBruto)
      ? corpoBruto.toString("utf8").trim()
      : String(corpoBruto || "").trim();

  const calculada = crypto
    .createHmac("sha1", cfgMeliKommo.channel_secret)
    .update(corpoLimpo, "utf8")
    .digest("hex");

  return calculada === assinatura;
}
