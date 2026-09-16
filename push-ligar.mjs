import { cfg } from "./shopee.mjs";
import crypto from "node:crypto";

const HOST = "https://partner.shopeemobile.com";
const path = "/api/v2/push/set_app_push_config";
const ts = Math.floor(Date.now() / 1000);
const sign = crypto.createHmac("sha256", cfg.partner_key)
  .update(`${cfg.partner_id}${path}${ts}`).digest("hex");

const url = `${HOST}${path}?partner_id=${cfg.partner_id}&timestamp=${ts}&sign=${sign}`;

const r = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    callback_url: cfg.url_callback,
    set_push_config_on: [10],
  }),
});

console.log("enviando callback_url:", cfg.url_callback);
console.log(JSON.stringify(await r.json(), null, 2));
