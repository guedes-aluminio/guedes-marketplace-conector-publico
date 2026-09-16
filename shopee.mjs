import fs from "node:fs";
import { arquivo } from "./caminhos.mjs";
import crypto from "node:crypto";

const HOST = "https://partner.shopeemobile.com";

function carregarConfigLocal() {
  try {
    return JSON.parse(fs.readFileSync(arquivo("config.json"), "utf8"));
  } catch {
    return {};
  }
}

const local = carregarConfigLocal();

export const cfg = {
  partner_id: process.env.SHOPEE_PARTNER_ID || local.partner_id,
  partner_key: process.env.SHOPEE_PARTNER_KEY || local.partner_key,
  shop_id: process.env.SHOPEE_SHOP_ID || local.shop_id,
  push_key: process.env.SHOPEE_PUSH_KEY || local.push_key,
  url_callback: process.env.SHOPEE_CALLBACK_URL || local.url_callback,
  id_usuario_loja: process.env.SHOPEE_USER_ID || local.id_usuario_loja,
  kommo_channel_id: process.env.KOMMO_CHANNEL_ID || local.kommo_channel_id,
  kommo_channel_secret: process.env.KOMMO_CHANNEL_SECRET || local.kommo_channel_secret,
  kommo_scope_id: process.env.KOMMO_SCOPE_ID || local.kommo_scope_id,
  kommo_amojo_id: process.env.KOMMO_AMOJO_ID || local.kommo_amojo_id,
};

function lerTokens() {
  try {
    return JSON.parse(fs.readFileSync(arquivo("tokens.json"), "utf8"));
  } catch {
    const t = {
      access_token: process.env.SHOPEE_ACCESS_TOKEN,
      refresh_token: process.env.SHOPEE_REFRESH_TOKEN,
      expires_at: Number(process.env.SHOPEE_TOKEN_EXPIRES_AT || 0),
    };
    if (!t.access_token || !t.refresh_token) {
      throw new Error("Tokens da Shopee não encontrados.");
    }
    return t;
  }
}

function salvarTokens(t) {
  fs.writeFileSync(
    arquivo("tokens.json"),
    JSON.stringify(t, null, 2)
  );
}

function assinar(base) {
  return crypto
    .createHmac("sha256", cfg.partner_key)
    .update(base)
    .digest("hex");
}

async function renovar() {
  const t = lerTokens();
  const path = "/api/v2/auth/access_token/get";
  const ts = Math.floor(Date.now() / 1000);
  const sign = assinar(`${cfg.partner_id}${path}${ts}`);

  const resp = await fetch(
    `${HOST}${path}?partner_id=${cfg.partner_id}&timestamp=${ts}&sign=${sign}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: Number(cfg.shop_id),
        refresh_token: t.refresh_token,
        partner_id: Number(cfg.partner_id),
      }),
    }
  );

  const d = await resp.json();

  if (!d.access_token) {
    throw new Error("Falha ao renovar: " + JSON.stringify(d));
  }

  const novos = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || t.refresh_token,
    expires_at:
      Math.floor(Date.now() / 1000) + (d.expire_in || 14400),
  };

  salvarTokens(novos);

  console.log(
    "[shopee] token renovado, vale ate",
    new Date(novos.expires_at * 1000).toLocaleString("pt-BR")
  );

  return novos;
}

export async function token() {
  const t = lerTokens();
  const faltam =
    (t.expires_at || 0) - Math.floor(Date.now() / 1000);

  if (faltam > 600) return t.access_token;

  const novos = await renovar();
  return novos.access_token;
}

export async function chamar(path, params = {}, corpo = null) {
  const acc = await token();
  const ts = Math.floor(Date.now() / 1000);
  const sign = assinar(
    `${cfg.partner_id}${path}${ts}${acc}${cfg.shop_id}`
  );

  const q = new URLSearchParams({
    partner_id: cfg.partner_id,
    timestamp: String(ts),
    sign,
    access_token: acc,
    shop_id: cfg.shop_id,
    ...params,
  });

  const opcoes = corpo
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      }
    : { method: "GET" };

  const resp = await fetch(`${HOST}${path}?${q}`, opcoes);
  return resp.json();
}
