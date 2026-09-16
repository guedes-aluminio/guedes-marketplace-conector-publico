import fs from "node:fs";

const vistos = new Map();

for (const l of fs.readFileSync("pushes.log", "utf8").trim().split("\n")) {
  let j;
  try { j = JSON.parse(JSON.parse(l).corpo); } catch { continue; }
  const c = j?.data?.content;
  if (!c?.message_type) continue;
  if (!vistos.has(c.message_type)) vistos.set(c.message_type, c.content);
}

for (const [tipo, conteudo] of vistos) {
  console.log("=== tipo:", tipo, "===");
  console.log(JSON.stringify(conteudo, null, 2));
  console.log("");
}