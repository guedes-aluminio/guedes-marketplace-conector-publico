import { chamarKommoMagalu, cfgMagaluKommo } from "./kommoMagalu.mjs";

const AMOJO_ID_DA_CONTA =
  "4e1ef268-8892-4708-a21c-f0f848f11b02";

async function conectar() {
  if (!cfgMagaluKommo.channel_id) {
    console.log(
      "ERRO: MAGALU_KOMMO_CHANNEL_ID nao configurado"
    );
    return;
  }

  if (!cfgMagaluKommo.channel_secret) {
    console.log(
      "ERRO: MAGALU_KOMMO_CHANNEL_SECRET nao configurado"
    );
    return;
  }

  const r = await chamarKommoMagalu(
    "POST",
    `/v2/origin/custom/${cfgMagaluKommo.channel_id}/connect`,
    {
      account_id: AMOJO_ID_DA_CONTA,
      title: "Magalu Guedes",
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
      "Copie esse valor para a variavel MAGALU_KOMMO_SCOPE_ID no Render."
    );
  }
}

conectar().catch((e) => {
  console.log("ERRO ao conectar:", e?.message || e);
});
