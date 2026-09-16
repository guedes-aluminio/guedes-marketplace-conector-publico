const URL_CALLBACK = "https://each-solved-mon-holidays.trycloudflare.com/shopee";
const PUSH_KEY     = "4a7a6547445056596c4756726f535549516246436b45597648486f4967676c49";

import crypto from "node:crypto";
import fs from "node:fs";

const linhas = fs.readFileSync("pushes.log", "utf8").trim().split("\n");
const reg = linhas.map(l => JSON.parse(l)).reverse()
  .find(r => r.headers?.authorization && r.corpo);

if (!reg) { console.log("Nenhum push com assinatura no log."); process.exit(0); }

const esperado = reg.headers.authorization;
const corpo = reg.corpo;

const candidatos = {
  "url|corpo":  URL_CALLBACK + "|" + corpo,
  "url+corpo":  URL_CALLBACK + corpo,
  "so corpo":   corpo,
};

console.log("assinatura recebida:", esperado);
console.log("");

for (const [nome, base] of Object.entries(candidatos)) {
  const calc = crypto.createHmac("sha256", PUSH_KEY).update(base).digest("hex");
  console.log(calc === esperado ? "*** BATEU ***" : "nao bateu ", "|", nome);
}