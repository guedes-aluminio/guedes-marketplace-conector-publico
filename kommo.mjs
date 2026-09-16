import crypto from "node:crypto";
import { cfg } from "./shopee.mjs";

const HOST = "amojo.kommo.com";

function md5(texto) {
  return crypto.createHash("md5").update(texto, "utf8").digest("hex");
}

export function montarCabecalhos(metodo, caminho, corpo) {
  const tipo = "application/json";
  const data = new Date().toUTCString();
  const hash = md5(corpo);
  const base = [metodo.toUpperCase(), hash, tipo, data, caminho].join("\n");
  const assinatura = crypto
    .createHmac("sha1", cfg.kommo_channel_secret)
    .update(base, "utf8")
    .digest("hex");
  return {
    Date: data,
    "Content-Type": tipo,
    "Content-MD5": hash,
    "X-Signature": assinatura,
  };
}

export async function chamar(metodo, caminho, dados = null) {
  const corpo = dados === null ? "" : JSON.stringify(dados);
  const cabecalhos = montarCabecalhos(metodo, caminho, corpo);
  const opcoes = { method: metodo.toUpperCase(), headers: cabecalhos };
  if (corpo) opcoes.body = corpo;
  const resp = await fetch(`https://${HOST}${caminho}`, opcoes);
  const texto = await resp.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* nem sempre e json */ }
  return { status: resp.status, json, texto };
}

export function webhookValido(assinaturaRecebida, corpoBruto) {
  if (!assinaturaRecebida) return false;

  const bytes = Buffer.isBuffer(corpoBruto)
    ? corpoBruto
    : Buffer.from(String(corpoBruto ?? ""), "utf8");


  const texto = bytes.toString("utf8").trim();

  const calculada = crypto
    .createHmac("sha1", String(cfg.kommo_channel_secret ?? ""))
    .update(texto, "utf8")
    .digest("hex")
    .toLowerCase();

  return calculada === String(assinaturaRecebida).trim().toLowerCase();
}
