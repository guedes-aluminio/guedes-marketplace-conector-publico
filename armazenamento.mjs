import fs from "node:fs";
import { arquivo } from "./caminhos.mjs";

const ARQUIVO = arquivo("dados.json");

function ler() {
  try {
    const d = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));

    /*
     * Arquivos antigos podem nao ter o campo "anexos" ainda.
     * Garante que ele sempre exista, sem quebrar o que ja tinha.
     */
    if (!d.anexos) {
      d.anexos = {};
    }

    return d;
  } catch {
    return { mensagens: {}, conversas: {}, anexos: {}, saidas: {} };
  }
}

function salvar(d) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(d, null, 2));
}

export function jaProcessada(messageId) {
  return Boolean(ler().mensagens[messageId]);
}

export function registrarMensagem(m) {
  const d = ler();
  d.mensagens[m.message_id] = {
    conversation_id: m.conversation_id,
    comprador_id: m.comprador_id,
    quando: m.quando,
    processada_em: new Date().toISOString(),
  };
  d.conversas[m.conversation_id] = {
    comprador_id: m.comprador_id,
    comprador_nome: m.comprador_nome,
    ultima_mensagem_em: m.quando,
    total: (d.conversas[m.conversation_id]?.total || 0) + 1,
  };
  salvar(d);
}

export function resumo() {
  const d = ler();
  return {
    mensagens: Object.keys(d.mensagens).length,
    conversas: Object.keys(d.conversas).length,
  };
}

/*
 * Controle de anexos conhecidos, para a rota /meli/anexo/:id
 * so servir arquivos que o sistema realmente processou numa
 * mensagem de verdade, e nao virar um "proxy aberto" para
 * qualquer nome de arquivo do Mercado Livre.
 */
export function registrarAnexoConhecido(nomeArquivo, origem) {
  const d = ler();

  d.anexos[nomeArquivo] = {
    origem: origem || null,
    registrado_em: new Date().toISOString(),
  };

  salvar(d);
}

export function anexoConhecido(nomeArquivo) {
  return Boolean(ler().anexos[nomeArquivo]);
}

export function jaSaidaProcessada(id) {
  if (!id) return false;

  const d = ler();
  return Boolean(d.saidas?.[String(id)]);
}

export function registrarSaida({
  id,
  canal,
  conversation_id,
  texto = null,
}) {
  if (!id) {
    throw new Error("ID da saida obrigatorio");
  }

  const d = ler();

  if (!d.saidas) {
    d.saidas = {};
  }

  d.saidas[String(id)] = {
    canal: canal || null,
    conversation_id: conversation_id
      ? String(conversation_id)
      : null,
    texto,
    processada_em: new Date().toISOString(),
  };

  salvar(d);
}