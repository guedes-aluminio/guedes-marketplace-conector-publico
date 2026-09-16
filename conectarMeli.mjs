import { chamarKommoMeli, cfgMeliKommo } from "./kommoMeli.mjs";


const AMOJO_ID_DA_CONTA =
  "4e1ef268-8892-4708-a21c-f0f848f11b02";

async function conectar() {
  if (!cfgMeliKommo.channel_id) {
    console.log(
      "ERRO: MELI_KOMMO_CHANNEL_ID nao configurado"
    );
    return;
  }

  if (!cfgMeliKommo.channel_secret) {
    console.log(
      "ERRO: MELI_KOMMO_CHANNEL_SECRET nao configurado"
    );
    return;
  }

  const r = await chamarKommoMeli(
    "POST",
    `/v2/origin/custom/${cfgMeliKommo.channel_id}/connect`,
    {
      account_id: AMOJO_ID_DA_CONTA,
      title: "Mercado Livre Guedes",
      hook_api_version: "v2",
    }
  );

  console.log("status:", r.status);
  console.log("resposta:", r.texto);

  if (r.json?.scope_id) {
    console.log("");
    console.log(
      "SCOPE_ID:",
      r.json.scope_id
    );
    console.log("");
    console.log(
      "Copie esse valor para a variavel MELI_KOMMO_SCOPE_ID no Render."
    );
  }
}

conectar().catch((e) => {
  console.log("ERRO ao conectar:", e?.message || e);
});
