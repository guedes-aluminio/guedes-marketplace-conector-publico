import fs from "node:fs";

const linhas = fs.readFileSync("pushes.log", "utf8").trim().split("\n");

const achado = linhas
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean)
  .reverse()
  .map((r) => { try { return JSON.parse(r.corpo); } catch { return null; } })
  .filter((j) => j?.data?.content?.message_type === "image")
  .shift();

if (!achado) {
  console.log("Nenhuma mensagem de imagem encontrada no log.");
} else {
  const c = achado.data.content;
  console.log("message_type:", c.message_type);
  console.log("");
  console.log("content:");
  console.log(JSON.stringify(c.content, null, 2));
  console.log("");
  console.log("source_content:");
  console.log(JSON.stringify(c.source_content, null, 2));
}