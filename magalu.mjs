import fs from "node:fs";
import { arquivo } from "./caminhos.mjs";

const API_MARKETPLACE = "https://api.magalu.com";
const API_SERVICES = "https://services.magalu.com";
const ID_MAGALU = "https://id.magalu.com";

export const cfgMagalu = {
  client_id: process.env.MAGALU_CLIENT_ID || "",
  client_secret: process.env.MAGALU_CLIENT_SECRET || "",
  redirect_uri: process.env.MAGALU_REDIRECT_URI || "",
};

function lerTokens() {
  try {
    return JSON.parse(
      fs.readFileSync(arquivo("magalu-tokens.json"), "utf8")
    );
  } catch {
    return null;
  }
}

function salvarTokens(t) {
  fs.writeFileSync(
    arquivo("magalu-tokens.json"),
    JSON.stringify(t, null, 2)
  );
}

export function temTokensMagalu() {
  return Boolean(lerTokens()?.refresh_token);
}

export async function trocarCodigoMagalu(codigo) {
  const resp = await fetch(`${ID_MAGALU}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: cfgMagalu.client_id,
      client_secret: cfgMagalu.client_secret,
      redirect_uri: cfgMagalu.redirect_uri,
      code: codigo,
      grant_type: "authorization_code",
    }),
  });

  const d = await resp.json();

  if (!d.access_token) {
    throw new Error(
      "Falha ao trocar codigo Magalu: " + JSON.stringify(d)
    );
  }

  salvarTokens({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at:
      Math.floor(Date.now() / 1000) + (d.expires_in || 7200),
  });

  return true;
}

export async function tokenMagalu() {
  const t = lerTokens();

  if (!t) {
    throw new Error("Magalu ainda nao autorizado");
  }

  const faltam = (t.expires_at || 0) - Math.floor(Date.now() / 1000);

  if (faltam > 300) {
    return t.access_token;
  }

  const resp = await fetch(`${ID_MAGALU}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cfgMagalu.client_id,
      client_secret: cfgMagalu.client_secret,
      refresh_token: t.refresh_token,
    }),
  });

  const d = await resp.json();

  if (!d.access_token) {
    throw new Error(
      "Falha ao renovar token Magalu: " + JSON.stringify(d)
    );
  }

  const novos = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || t.refresh_token,
    expires_at:
      Math.floor(Date.now() / 1000) + (d.expires_in || 7200),
  };

  salvarTokens(novos);

  console.log("[magalu] token renovado");

  return novos.access_token;
}

export async function chamarMagalu(caminho, opcoes = {}) {
  const acc = await tokenMagalu();

  const base =
    opcoes.base === "marketplace" ? API_MARKETPLACE : API_SERVICES;

  const { base: _base, ...opcoesFetch } = opcoes;

  const resp = await fetch(`${base}${caminho}`, {
    ...opcoesFetch,
    headers: {
      Authorization: `Bearer ${acc}`,
      "Content-Type": "application/json",
      ...(opcoesFetch.headers || {}),
    },
  });

  const texto = await resp.text();

  let json = null;

  try {
    json = JSON.parse(texto);
  } catch {
  }

  return { status: resp.status, json, texto };
}
