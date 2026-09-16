const SUBDOMINIO = "guedesaluminio355";

const LONG_LIVED_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ijg4OWIxNjZjMmNhY2U4NmUwY2RhMTFiZTAwNDhlMTM3M2EwZGYzMmM1NTEzMDFkOTU4MjgxZjhmODllM2UyZmNmNGVlNWU1NDM5NmI1NjFhIn0.eyJhdWQiOiJkMjI3ZTM0Zi0wZDcxLTQzY2QtODI0Yy05MDM1YjZiOTRiODIiLCJqdGkiOiI4ODliMTY2YzJjYWNlODZlMGNkYTExYmUwMDQ4ZTEzNzNhMGRmMzJjNTUxMzAxZDk1ODI4MWY4Zjg5ZTNlMmZjZjRlZTVlNTQzOTZiNTYxYSIsImlhdCI6MTc4OTM4NjI3NSwibmJmIjoxNzg5Mzg2Mjc1LCJleHAiOjE5Mzk3NjY0MDAsInN1YiI6IjExNjAxNDMxIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMzMTc3OTI3LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiNWY2YTBiZWEtZDVkYS00ODlkLThjNWEtZWZlMjNiNTQ2OGU5IiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.gXEa97126VGoepac-p2KfPjOZk6o65uvSoLzgn-gRiu7CzXE3BKRrmgFGchsipxS1RmIetAVP5WguBB2SWeitQRBzXFninMct5skq8zuhDlZT9tQRww_iqbJejBAp8khI9XAVnbpG5yh29hxlYau44oAsgTdXItYskjlYBoVz_iOaXu1jBjLjLk30w8QdCS5r7uaYRwh3yI8xtlZ1cOOmlGDugzzLyx9VMK9qLmMKSDLq_283hZWMX6DtcIEjmO9-SCPFXyz-RYfdQoR-9y4fP6opqXIHwkHM4vfYdBPIIvZk_fzoLvHOO2bSMKdKDvyVdQrb4UkMUOOo4VPi7an5g";

async function checarUltimoLead() {
  const listaResp = await fetch(
    `https://${SUBDOMINIO}.kommo.com/api/v4/leads?order[created_at]=desc&limit=1`,
    {
      headers: { Authorization: `Bearer ${LONG_LIVED_TOKEN}` },
    }
  );

  const listaJson = await listaResp.json();
  const ultimoLead = listaJson?._embedded?.leads?.[0];

  if (!ultimoLead) {
    console.log("Nenhum lead encontrado.");
    return;
  }

  console.log("Ultimo lead:", ultimoLead.id, ultimoLead.name);
  console.log(
    "Criado em:",
    new Date(ultimoLead.created_at * 1000).toLocaleString("pt-BR")
  );

  const detalheResp = await fetch(
    `https://${SUBDOMINIO}.kommo.com/api/v4/leads/${ultimoLead.id}?with=source`,
    {
      headers: { Authorization: `Bearer ${LONG_LIVED_TOKEN}` },
    }
  );

  const detalheTexto = await detalheResp.text();
  console.log("");
  console.log("detalhe completo:", detalheTexto);
}

checarUltimoLead().catch((e) => {
  console.log("ERRO:", e?.message || e);
});
