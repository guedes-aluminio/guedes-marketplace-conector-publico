import fs from "node:fs";
import { chamar } from "./kommo.mjs";
import { cfg } from "./shopee.mjs";

const caminho = `/v2/origin/custom/${cfg.kommo_channel_id}/connect`;

const r = await chamar("POST", caminho, {
  account_id: cfg.kommo_amojo_id,
  title: "Shopee Guedes",
  hook_api_version: "v2",
});

console.log("HTTP", r.status);

if (r.json?.scope_id) {
  const c = JSON.parse(fs.readFileSync("config.json", "utf8"));
  c.kommo_scope_id = r.json.scope_id;
  fs.writeFileSync("config.json", JSON.stringify(c, null, 2));
  console.log("CONECTADO. scope_id gravado no config.json");
} else {
  console.log("nao conectou. resposta:");
  console.log(r.texto);
}
