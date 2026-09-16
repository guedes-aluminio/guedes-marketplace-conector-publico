import { chamarKommoMeli, cfgMeliKommo } from "./kommoMeli.mjs";

const AMOJO_ID_DA_CONTA =
  "4e1ef268-8892-4708-a21c-f0f848f11b02";

async function desconectar() {
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
    "DELETE",
    `/v2/origin/custom/${cfgMeliKommo.channel_id}/disconnect`,
    {
      account_id: AMOJO_ID_DA_CONTA,
    }
  );

  console.log("status:", r.status);
  console.log("resposta:", r.texto);

  if (r.status === 200) {
    console.log("");
    console.log(
      "Canal desconectado. Agora rode: node conectarMeli.mjs"
    );
  }
}

desconectar().catch((e) => {
  console.log("ERRO ao desconectar:", e?.message || e);
});
