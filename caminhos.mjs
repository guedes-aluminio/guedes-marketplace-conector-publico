import path from "node:path";

export const PASTA_DADOS = process.env.DATA_DIR || ".";

export function arquivo(nome) {
  return path.join(PASTA_DADOS, nome);
}
