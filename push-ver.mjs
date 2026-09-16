import { cfg } from "./shopee.mjs";
import { token } from "./shopee.mjs";
import crypto from "node:crypto";

const HOST = "https://partner.shopeemobile.com";
const path = "/api/v2/push/get_app_push_config";
const ts = Math.floor(Date.now() / 1000);
const base = `${cfg.partner_id}${path}${ts}`;
const sign = crypto.createHmac("sha256", cfg.partner_key).update(base).digest("hex");

const url = `${HOST}${path}?partner_id=${cfg.partner_id}&timestamp=${ts}&sign=${sign}`;
const r = await fetch(url);
console.log(JSON.stringify(await r.json(), null, 2));
