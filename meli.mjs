import fs from "node:fs";
import { arquivo } from "./caminhos.mjs";

const API = "https://api.mercadolibre.com";

export const cfgMeli = {
  client_id: process.env.MELI_CLIENT_ID || "",
  client_secret: process.env.MELI_CLIENT_SECRET || "",
  redirect_uri: process.env.MELI_REDIRECT_URI || "",
};

function lerTokens() {
  try {
    return JSON.parse(fs.readFileSync(arquivo("meli-tokens.json"), "utf8"));
  } catch {
    return null;
  }
}

function salvarTokens(t) {
  fs.writeFileSync(arquivo("meli-tokens.json"), JSON.stringify(t, null, 2));
}

export function temTokens() {
  return Boolean(lerTokens()?.refresh_token);
}

/* Troca o codigo da autorizacao pelos tokens iniciais */
export async function trocarCodigo(codigo) {
  const resp = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfgMeli.client_id,
      client_secret: cfgMeli.client_secret,
      code: codigo,
      redirect_uri: cfgMeli.redirect_uri,
    }),
  });

  const d = await resp.json();
  if (!d.access_token) throw new Error("Falha ao trocar codigo: " + JSON.stringify(d));

  salvarTokens({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    user_id: d.user_id,
    expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 21600),
  });

  return d.user_id;
}

/* Renova o token quando esta perto de vencer */
export async function token() {
  const t = lerTokens();
  if (!t) throw new Error("Mercado Livre ainda nao autorizado");

  const faltam = (t.expires_at || 0) - Math.floor(Date.now() / 1000);
  if (faltam > 600) return t.access_token;

  const resp = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cfgMeli.client_id,
      client_secret: cfgMeli.client_secret,
      refresh_token: t.refresh_token,
    }),
  });

  const d = await resp.json();
  if (!d.access_token) throw new Error("Falha ao renovar: " + JSON.stringify(d));

  const novos = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || t.refresh_token,
    user_id: d.user_id || t.user_id,
    expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 21600),
  };
  salvarTokens(novos);
  console.log("[meli] token renovado");
  return novos.access_token;
}

export function userId() {
  return lerTokens()?.user_id;
}

/* Chamada generica a API do Mercado Livre */
export async function chamar(caminho, opcoes = {}) {
  const acc = await token();
  const resp = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${acc}`,
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });
  const texto = await resp.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* nem sempre e json */ }
  return { status: resp.status, json, texto };
}
