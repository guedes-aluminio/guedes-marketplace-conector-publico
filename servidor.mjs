import http from "node:http";
import fs from "node:fs";

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let catalogoProdutos = {};

try {
  catalogoProdutos = JSON.parse(
    fs.readFileSync(join(__dirname, "produtos.json"), "utf8")
  );

  console.log(
    "[meli] catalogo de produtos carregado:",
    Object.keys(catalogoProdutos).length,
    "itens"
  );
} catch (e) {
  console.log(
    "[meli] AVISO: nao foi possivel carregar produtos.json:",
    e?.message || e
  );
}

import crypto from "node:crypto";
import {
  registrarAtendimento,
  marcarAtendimentoRespondido,
  listarAtendimentos,
  resumoAtendimentos,
  atualizarAtendimentoOperacional,
  adicionarNotaInterna,
  definirResolucaoAtendimento,
} from "./atendimentos.mjs";
import {
  renderizarPainelAtendimentos,
} from "./painelAtendimentos.mjs";
import { responderPerguntaMeli, responderMensagemPosVenda, responderReclamacaoMeli } from "./responderMeli.mjs";
import { webhookValidoMeli, cfgMeliKommo } from "./kommoMeli.mjs";
import { enviarPerguntaParaKommo, enviarMensagemParaKommo, enviarReclamacaoParaKommo, espelharRespostaCentralNoKommoMeli } from "./importarMeli.mjs";

import {
  trocarCodigo,
  cfgMeli,
  temTokens,
  chamar as chamarMeli,
  userId as meliUserId,
  token as tokenMeli,
} from "./meli.mjs";

import { cfg, chamar as chamarShopee, token as tokenShopee } from "./shopee.mjs";

import {
  trocarCodigoMagalu,
  cfgMagalu,
  temTokensMagalu,
  chamarMagalu,
} from "./magalu.mjs";

import {
  traduzirPerguntaMagalu,
  traduzirMensagemMagalu,
  ehMensagemDoCliente,
} from "./mensagemMagalu.mjs";

import { webhookValidoMagalu, cfgMagaluKommo } from "./kommoMagalu.mjs";

import {
  enviarPerguntaMagaluParaKommo,
  enviarMensagemMagaluParaKommo,
} from "./importarMagalu.mjs";

import {
  responderPerguntaMagalu,
  responderMensagemMagalu,
} from "./responderMagalu.mjs";

import {
  jaProcessada,
  registrarMensagem,
  resumo,
  registrarAnexoConhecido,
  anexoConhecido,
  jaSaidaProcessada,
  registrarSaida,
} from "./armazenamento.mjs";

import { traduzir } from "./mensagem.mjs";
import {
  enviarParaKommo,
  espelharRespostaCentralNoKommo,
} from "./importar.mjs";
import { webhookValido } from "./kommo.mjs";
import { enviarTextoShopee } from "./enviar.mjs";

const PORTA =
  Number(process.env.PORT) || 3000;

const PAINEL_USUARIO =
  process.env.PAINEL_USUARIO;

const PAINEL_SENHA =
  process.env.PAINEL_SENHA;

const emAndamento = new Set();
const meliEmAndamento = new Set();

function loginPainelValido(req) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  try {
    const credenciais = Buffer
      .from(authorization.slice(6), "base64")
      .toString("utf8");

    const separador = credenciais.indexOf(":");

    if (separador === -1) {
      return false;
    }

    const usuario = credenciais.slice(0, separador);
    const senha = credenciais.slice(separador + 1);

    return (
      usuario === PAINEL_USUARIO &&
      senha === PAINEL_SENHA
    );
  } catch {
    return false;
  }
}

function assinaturaShopeeValida(assinatura, corpo) {
  if (!assinatura) {
    return false;
  }
  const calculada =
    crypto
      .createHmac("sha256", cfg.push_key)
      .update(cfg.url_callback + "|" + corpo, "utf8")
      .digest("hex");
  return calculada === assinatura;
}

async function aoReceberMensagemShopee(m) {
  console.log("--- MENSAGEM DO COMPRADOR ---");
  console.log(m);

  if (m.tipo === "order" && m.cru?.order_sn) {
    try {
      const detalhe = await chamarShopee(
        "/api/v2/order/get_order_detail",
        {
          order_sn_list: m.cru.order_sn,
          response_optional_fields: "item_list",
        }
      );

      console.log("--- DETALHE DO PEDIDO (SHOPEE) ---");
      console.log(JSON.stringify(detalhe)?.slice(0, 3000));

      const pedido = detalhe?.response?.order_list?.[0];
      const item = pedido?.item_list?.[0];

      if (item?.item_id) {
        const link = `https://shopee.com.br/product/${cfg.shop_id}/${item.item_id}`;

        m.texto = `[Cliente compartilhou o pedido ${m.cru.order_sn}] ${link}`;
      } else {
        m.texto = `[Cliente compartilhou o pedido ${m.cru.order_sn}]`;
      }
    } catch (e) {
      console.log(
        "-> ERRO ao buscar detalhe do pedido:",
        e?.message || e
      );
    }
  }

  try {
    await enviarParaKommo(m);
    console.log("-> enviado ao Kommo");
  } catch (e) {
    console.log("-> ERRO ao enviar ao Kommo:", e?.message || e);
    throw e;
  }
}

async function processarShopee(req, corpo) {
  if (!assinaturaShopeeValida(req.headers.authorization, corpo)) {
    console.log("assinatura Shopee invalida, ignorando");
    return;
  }
  let j;
  try {
    j = JSON.parse(corpo);
  } catch {
    console.log("JSON Shopee invalido");
    return;
  }
  if (j.code !== 10 || j?.data?.type !== "message") {
    return;
  }
  const c = j?.data?.content;
  if (!c) {
    console.log("evento Shopee sem content");
    return;
  }
  if (String(c.from_id) === String(cfg.id_usuario_loja)) {
    return;
  }
  const mid = String(c.message_id);
  if (jaProcessada(mid) || emAndamento.has(mid)) {
    console.log("mensagem repetida, ignorando");
    return;
  }
  emAndamento.add(mid);
  try {
    const m = traduzir(c);

    await aoReceberMensagemShopee(m);

    registrarAtendimento(m);

    registrarMensagem({
      message_id: m.message_id,
      conversation_id: m.conversation_id,
      comprador_id: m.comprador_id,
      comprador_nome: m.comprador_nome,
      quando: m.quando,
    });
    console.log("acumulado:", resumo());
  } catch (e) {
    console.log("-> ERRO no processamento Shopee:", e?.message || e);
  } finally {
    emAndamento.delete(mid);
  }
}

async function buscarContextoPackMeli(packId) {
  const vazio = {
    pedidoId: null,
    itemId: null,
    itemTitulo: null,
    compradorNome: null,
  };

  if (!packId) {
    return vazio;
  }

  async function contextoDaOrder(
    orderId,
    orderJaCarregada = null
  ) {
    if (!orderId) {
      return vazio;
    }

    let order = orderJaCarregada || {};

    /*
     * O resultado de /orders/search normalmente ja traz
     * order_items. Se nao trouxer, buscamos a order completa.
     */
    if (
      !Array.isArray(order?.order_items) ||
      order.order_items.length === 0
    ) {
      const orderResp = await chamarMeli(
        `/orders/${encodeURIComponent(orderId)}`
      );

      if (orderResp.status !== 200) {
        console.log(
          "[meli] erro ao consultar order:",
          orderResp.status,
          orderResp.texto?.slice(0, 1000)
        );

        return {
          pedidoId: String(orderId),
          itemId: null,
          itemTitulo: null,
        };
      }

      order = orderResp.json || {};
    }

    const orderItem =
      Array.isArray(order.order_items) &&
        order.order_items.length
        ? order.order_items[0]
        : null;

    const itemId =
      orderItem?.item?.id || null;

    const itemTitulo =
      orderItem?.item?.title || null;

    const compradorNomeCompleto = [
      order?.buyer?.first_name,
      order?.buyer?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const compradorNome =
      compradorNomeCompleto ||
      order?.buyer?.nickname ||
      null;

    return {
      pedidoId: String(orderId),
      itemId,
      itemTitulo,
      compradorNome,
    };
  }

  try {
    console.log(
      "[meli] buscando contexto do pack:",
      packId
    );

    /*
     * CAMINHO 1:
     * tenta resolver diretamente pelo recurso /packs
     */
    const packResp = await chamarMeli(
      `/packs/${encodeURIComponent(packId)}`
    );

    if (packResp.status === 200) {
      const pack = packResp.json || {};

      const orderId =
        Array.isArray(pack.orders) &&
          pack.orders.length
          ? pack.orders[0]?.id
          : null;

      if (orderId) {
        console.log(
          "[meli] order encontrada diretamente no pack:",
          orderId
        );

        const contexto =
          await contextoDaOrder(orderId);

        if (contexto.itemId) {
          console.log(
            "[meli] contexto encontrado diretamente:",
            contexto
          );

          return contexto;
        }
      } else {
        console.log(
          "[meli] pack encontrado, mas sem order_id:",
          packId
        );
      }
    } else {
      console.log(
        "[meli] pack direto indisponivel:",
        packResp.status,
        packResp.texto?.slice(0, 1000)
      );
    }

    /*
     * CAMINHO 2:
     * fallback pelas orders do vendedor.
     *
     * Alguns IDs usados nas conversas de mensagens podem
     * responder 404 no recurso /packs, mesmo existindo uma
     * venda relacionada. Entao buscamos as orders mais recentes
     * e comparamos o campo pack_id.
     */

    /*
 * CAMINHO 2:
 * Na mensageria do Mercado Livre, quando a venda nao possui
 * um pack_id real, o order_id pode ser usado no lugar dele
 * na rota /messages/packs/{id}.
 *
 * Portanto, antes de pesquisar centenas de orders,
 * tentamos o proprio ID da conversa como order_id.
 */
    console.log(
      "[meli] tentando id da conversa como order_id:",
      packId
    );

    const orderDiretaResp =
      await chamarMeli(
        `/orders/${encodeURIComponent(packId)}`
      );

    if (orderDiretaResp.status === 200) {
      const orderDireta =
        orderDiretaResp.json || {};

      console.log(
        "[meli] id da conversa confirmado como order_id:",
        orderDireta.id || packId
      );

      const contexto =
        await contextoDaOrder(
          orderDireta.id || packId,
          orderDireta
        );

      if (contexto.itemId) {
        console.log(
          "[meli] contexto recuperado diretamente pela order:",
          contexto
        );

        return contexto;
      }
    } else {
      console.log(
        "[meli] id da conversa nao e uma order:",
        orderDiretaResp.status
      );
    }

    const sellerId = meliUserId();

    if (!sellerId) {
      console.log(
        "[meli] seller_id indisponivel para fallback"
      );

      return vazio;
    }

    console.log(
      "[meli] tentando localizar pack nas orders:",
      packId
    );

    const limite = 50;
    const maxPaginas = 10;

    for (
      let pagina = 0;
      pagina < maxPaginas;
      pagina++
    ) {
      const offset =
        pagina * limite;

      console.log(
        "[meli] buscando orders para contexto:",
        {
          pagina: pagina + 1,
          offset,
          pack_id: packId,
        }
      );

      const buscaResp =
        await chamarMeli(
          `/orders/search?seller=${encodeURIComponent(
            sellerId
          )}&sort=date_desc&limit=${limite}&offset=${offset}`
        );

      if (buscaResp.status !== 200) {
        console.log(
          "[meli] erro no fallback de orders:",
          buscaResp.status,
          buscaResp.texto?.slice(0, 1500)
        );

        break;
      }

      const busca =
        buscaResp.json || {};

      const orders =
        Array.isArray(busca.results)
          ? busca.results
          : [];

      const orderEncontrada =
        orders.find((order) => {
          return (
            String(order?.pack_id || "") ===
            String(packId)
          );
        });

      if (orderEncontrada?.id) {
        console.log(
          "[meli] pack localizado via orders:",
          {
            pack_id: packId,
            order_id: orderEncontrada.id,
          }
        );

        const contexto =
          await contextoDaOrder(
            orderEncontrada.id,
            orderEncontrada
          );

        console.log(
          "[meli] contexto recuperado via fallback:",
          contexto
        );

        return contexto;
      }

      const total =
        Number(
          busca?.paging?.total || 0
        );

      if (
        orders.length === 0 ||
        (
          total > 0 &&
          offset + orders.length >= total
        )
      ) {
        break;
      }
    }

    console.log(
      "[meli] pack nao localizado nas orders:",
      packId
    );

    return vazio;

  } catch (e) {
    console.log(
      "[meli] erro ao buscar contexto do pack:",
      e?.message || e
    );

    return vazio;
  }
}

async function processarNotificacaoMeli(corpo) {
  let j;
  try {
    j = JSON.parse(corpo);
  } catch {
    console.log("[meli] notificacao com JSON invalido");
    return;
  }

  console.log("");
  console.log("=========================================");
  console.log("MELI - NOTIFICACAO RECEBIDA");
  console.log("=========================================");
  console.log(j);

  const topicoBruto = String(j?.topic || "").toLowerCase();

  if (topicoBruto.startsWith("claim")) {
    await processarReclamacaoMeli(j);
    return;
  }

  if (j?.topic !== "messages" && j?.topic !== "questions") {
    console.log("[meli] topico ignorado:", j?.topic);
    return;
  }

  const acoes = Array.isArray(j?.actions) ? j.actions : [];

  if (j?.topic === "messages" && !acoes.includes("created")) {
    console.log("[meli] notificacao de mensagem sem created:", acoes);
    return;
  }

  const vendedorId = meliUserId();

  if (vendedorId && String(j?.user_id) !== String(vendedorId)) {
    console.log("[meli] notificacao nao destinada ao vendedor");
    console.log("[meli] user_id recebido:", j?.user_id);
    console.log("[meli] vendedor:", vendedorId);
    return;
  }

  let recurso = String(j?.resource || "").trim();

  if (!recurso) {
    console.log("[meli] notificacao sem resource");
    return;
  }

  recurso = recurso.replace(/^\/+/, "");

  if (recurso.startsWith("messages/")) {
    recurso = recurso.substring("messages/".length);
  }

  const chaveNotificacao = String(j?._id || j?.id || recurso);

  if (meliEmAndamento.has(chaveNotificacao)) {
    console.log("[meli] notificacao ja esta em processamento, ignorando");
    return;
  }

  meliEmAndamento.add(chaveNotificacao);

  try {
    console.log("[meli] buscando mensagem:", recurso);

    let resposta;

    if (j?.topic === "questions") {
      resposta = await chamarMeli(
        `/questions/${encodeURIComponent(recurso.replace(/^questions\//, ""))}?api_version=4`
      );
    } else {
      resposta = await chamarMeli(
        `/messages/${encodeURIComponent(recurso)}?tag=post_sale`
      );
    }

    console.log("[meli] status detalhe:", resposta.status);

    if (resposta.status !== 200) {
      console.log("[meli] erro ao buscar mensagem:");
      console.log(resposta.texto?.slice(0, 3000));
      return;
    }

    const respostaJson = resposta.json || {};
    const ehPergunta = j?.topic === "questions";

    const d =
      ehPergunta
        ? respostaJson
        : (Array.isArray(respostaJson?.messages)
          ? respostaJson.messages[0]
          : {}) || {};

    const mensagemId = d.id || d.message_id || recurso;

    let itemId = d.item_id || null;
    let pedidoId = null;

    let itemTitulo = null;
    let compradorNome = null;
    let anuncioUrl = null;
    let itemImagem = null;
    let itemPreco = null;

    if (itemId) {
      itemTitulo =
        catalogoProdutos[itemId] || null;

      try {
        const itemResp =
          await chamarMeli(
            `/items/${encodeURIComponent(itemId)}`
          );

        if (itemResp.status === 200) {
          const itemDados =
            itemResp.json || {};

          itemTitulo =
            itemDados.title ||
            itemTitulo;

          anuncioUrl =
            itemDados.permalink ||
            null;

          itemImagem =
            itemDados.secure_thumbnail ||
            itemDados.thumbnail ||
            null;

          itemPreco =
            itemDados.price ??
            null;

          console.log(
            "[meli] contexto do anuncio:",
            {
              item_id: itemId,
              titulo: itemTitulo,
              anuncio_url: anuncioUrl,
              imagem: itemImagem,
              preco: itemPreco,
            }
          );
          console.log(
            "[meli] contexto do anuncio:",
            {
              item_id: itemId,
              titulo: itemTitulo,
              anuncio_url: anuncioUrl,
            }
          );
        } else {
          console.log(
            "[meli] nao foi possivel consultar anuncio:",
            itemResp.status
          );
        }

      } catch (e) {
        console.log(
          "[meli] erro ao consultar anuncio:",
          e?.message || e
        );
      }
    }

    const remetenteId = d?.from?.id || d?.from?.user_id || null;

    let destinatarioId =
      ehPergunta ? (d?.seller_id || null) : (d?.to?.user_id || null);

    if (!ehPergunta && !destinatarioId && Array.isArray(d?.to)) {
      destinatarioId = d.to[0]?.user_id || null;
    }

    let texto = "";

    if (typeof d?.text === "string") {
      texto = d.text;
    } else if (typeof d?.text?.plain === "string") {
      texto = d.text.plain;
    }

    /*
     * Mensagens pos-venda podem ter anexos (foto, PDF).
     * O Mercado Livre nao da uma URL publica direto, entao
     * usamos nosso proprio servidor como intermediario:
     * /meli/anexo/{arquivo} busca o anexo com nosso token
     * e serve numa URL publica que o Kommo consegue abrir.
     *
     * O campo certo, confirmado com dado real, e
     * "message_attachments" (nao "attachments").
     */
    let anexos = [];

    if (!ehPergunta && Array.isArray(d?.message_attachments) && d.message_attachments.length > 0) {
      anexos = d.message_attachments.map((anexo) => {
        const nomeArquivo =
          typeof anexo === "string"
            ? anexo
            : anexo?.filename || anexo?.name || String(anexo);

        /*
         * So autoriza a rota /meli/anexo a servir arquivos que
         * passaram por aqui de verdade, numa mensagem real que
         * processamos. Evita que a rota vire um proxy aberto
         * para qualquer nome de arquivo do Mercado Livre.
         */
        registrarAnexoConhecido(nomeArquivo, `mensagem-${mensagemId}`);

        return {
          url: `https://shopee-kommo-conector.onrender.com/meli/anexo/${encodeURIComponent(nomeArquivo)}`,
          nome_original:
            typeof anexo === "object" ? anexo?.original_filename : null,
          tipo: typeof anexo === "object" ? anexo?.type : null,
        };
      });

      console.log("[meli] anexos encontrados:", d.message_attachments);
    }

    const quando =
      d?.date_created ||
      d?.message_date?.received ||
      d?.message_date?.available ||
      d?.message_date?.created ||
      d?.date_received ||
      d?.date ||
      d?.date_available ||
      null;

    let packId = null;

    if (Array.isArray(d?.message_resources)) {
      const pack = d.message_resources.find(
        (x) =>
          x?.name === "packs" ||
          x?.name === "pack"
      );

      if (pack?.id) {
        packId = String(pack.id);
      }
    }

    if (!itemId && packId) {
      const contextoPack =
        await buscarContextoPackMeli(packId);

      compradorNome =
        contextoPack.compradorNome ||
        compradorNome ||
        null;

      pedidoId =
        contextoPack.pedidoId || null;

      itemId =
        contextoPack.itemId || null;

      itemTitulo =
        contextoPack.itemTitulo ||
        itemTitulo ||
        null;

      console.log(
        "[meli] contexto recuperado pelo pack:",
        {
          pack_id: packId,
          pedido_id: pedidoId,
          item_id: itemId,
          item_titulo: itemTitulo,
        }
      );
    }

    if (itemId) {

      itemTitulo =
        catalogoProdutos[itemId] ||
        itemTitulo ||
        null;

      if (
        !anuncioUrl ||
        !itemImagem ||
        itemPreco === null
      ) {
        try {

          const itemResp =
            await chamarMeli(
              `/items/${encodeURIComponent(itemId)}`
            );

          if (itemResp.status === 200) {

            const itemDados =
              itemResp.json || {};

            itemTitulo =
              catalogoProdutos[itemId] ||
              itemDados.title ||
              itemTitulo ||
              null;

            anuncioUrl =
              itemDados.permalink ||
              anuncioUrl ||
              null;

            itemImagem =
              itemDados.secure_thumbnail ||
              itemDados.thumbnail ||
              itemImagem ||
              null;

            itemPreco =
              itemDados.price ??
              itemPreco ??
              null;

            console.log(
              "[meli] anuncio enriquecido:",
              {
                item_id: itemId,
                titulo: itemTitulo,
                anuncio_url: anuncioUrl,
                imagem: itemImagem,
                preco: itemPreco,
              }
            );

          } else {

            console.log(
              "[meli] erro ao enriquecer anuncio:",
              itemResp.status
            );
          }

        } catch (e) {

          console.log(
            "[meli] erro ao enriquecer anuncio recuperado pelo pack:",
            e?.message || e
          );
        }
      }
    }

    console.log("");
    console.log("--- MELI MENSAGEM NORMALIZADA ---");
    console.log({
      message_id: String(mensagemId),
      item_id: itemId,
      pack_id: packId,
      remetente_id: remetenteId ? String(remetenteId) : null,
      destinatario_id: destinatarioId ? String(destinatarioId) : null,
      quando,
      texto,
      anexos,
    });

    console.log("");
    console.log("--- MELI RESPOSTA ORIGINAL ---");
    console.log(resposta.texto?.slice(0, 10000));

    console.log("[meli] mensagem recebida e normalizada.");

    if (ehPergunta) {
      if (respostaJson.status !== "UNANSWERED") {
        console.log(
          "[meli] pergunta ja respondida, nao enviando ao Kommo:",
          respostaJson.status
        );
      } else {
        const chaveDedupe = `meli-pergunta-${mensagemId}`;

        if (jaProcessada(chaveDedupe)) {
          console.log("[meli] pergunta ja enviada ao Kommo antes, ignorando");
        } else {
          const rEnvio = await enviarPerguntaParaKommo({
            message_id: mensagemId,
            item_id: itemId,
            item_titulo: itemTitulo,
            remetente_id: remetenteId,
            destinatario_id: destinatarioId,
            quando,
            texto,
          });

          if (rEnvio?.status === 200) {

            registrarAtendimento({
              marketplace: "Mercado Livre",

              tipo_atendimento: "pergunta",

              conversation_id: `pergunta-${mensagemId}`,

              comprador_id: remetenteId,
              comprador_nome: null,

              item_id: itemId,
              item_titulo: itemTitulo,
              anuncio_url: anuncioUrl,
              item_imagem: itemImagem,
              item_preco: itemPreco,

              pedido_id: pedidoId,
              pack_id: packId,
              claim_id: null,

              quando,
              texto,
            });

            registrarMensagem({
              message_id: chaveDedupe,
              conversation_id: `pergunta-${mensagemId}`,
              comprador_id: remetenteId,
              comprador_nome: null,
              quando,
            });
          } else {
            console.log(
              "[meli] ENVIO FALHOU, pergunta NAO registrada como processada (sera reprocessada se o Mercado Livre reenviar a notificacao)"
            );
          }
        }
      }
    } else {
      const chaveDedupe = `meli-mensagem-${mensagemId}`;

      if (jaProcessada(chaveDedupe)) {
        console.log(
          "[meli] mensagem pos-venda ja enviada ao Kommo antes, ignorando"
        );
      } else {
        const rEnvios = await enviarMensagemParaKommo({
          message_id: mensagemId,
          item_id: itemId,
          item_titulo: itemTitulo,
          pack_id: packId,
          remetente_id: remetenteId,
          destinatario_id: destinatarioId,
          quando,
          texto,
          anexos,
        });

        /*
         * Uma mensagem pos-venda pode virar mais de um envio ao
         * Kommo (texto + anexos). Consideramos sucesso se PELO
         * MENOS UM deles foi aceito, para nao reenviar de novo
         * (e duplicar) a parte que ja deu certo. Se nada deu
         * certo, nao registra, para poder reprocessar tudo.
         */
        const teveSucesso =
          Array.isArray(rEnvios) &&
          rEnvios.some((r) => r?.status === 200);

        if (teveSucesso) {

          registrarAtendimento({
            marketplace: "Mercado Livre",

            tipo_atendimento: "pos-venda",

            conversation_id: packId
              ? `posvenda-pack-${packId}`
              : `posvenda-${destinatarioId}-${remetenteId}`,

            comprador_id: remetenteId,
            comprador_nome: compradorNome,

            item_id: itemId,
            item_titulo: itemTitulo,
            anuncio_url: anuncioUrl,
            item_imagem: itemImagem,
            item_preco: itemPreco,

            pedido_id: pedidoId,
            pack_id: packId,
            claim_id: null,
            quando,
            texto,
          });

          registrarMensagem({
            message_id: chaveDedupe,
            conversation_id: packId
              ? `posvenda-pack-${packId}`
              : `posvenda-${destinatarioId}-${remetenteId}`,
            comprador_id: remetenteId,
            comprador_nome: compradorNome,
            quando,
          });
        } else {
          console.log(
            "[meli] ENVIO FALHOU, mensagem pos-venda NAO registrada como processada (sera reprocessada se o Mercado Livre reenviar a notificacao)"
          );
        }
      }
    }
  } catch (e) {
    console.log("[meli] erro ao processar notificacao:", e?.message || e);
  } finally {
    meliEmAndamento.delete(chaveNotificacao);
  }
}

const reclamacaoEmAndamento = new Set();

/*
 * Processa uma notificacao de RECLAMACAO do Mercado Livre.
 *
 * Diferente de pergunta/mensagem pos-venda, aqui buscamos a
 * lista INTEIRA de mensagens da reclamacao a cada notificacao,
 * porque o webhook so avisa "algo mudou", sem dizer o que.
 * Cada mensagem do comprador que ainda nao foi enviada ao
 * Kommo (controlado por dedupe) e enviada.
 *
 * NAO SABEMOS com 100% de certeza o nome exato do topico
 * usado pelo Mercado Livre para reclamacoes (a documentacao
 * nao mostra o JSON do webhook). Por isso o dispatcher em
 * processarNotificacaoMeli aceita qualquer topico que comece
 * com "claim". Se o nome real for diferente, o log
 * "[meli] topico ignorado: X" vai mostrar o valor certo.
 */
async function processarReclamacaoMeli(j) {
  const recurso = String(j?.resource || j?.data?.id || j?.id || "").trim();

  const claimIdMatch = recurso.match(/(\d+)\s*$/);
  const claimId = claimIdMatch ? claimIdMatch[1] : recurso;

  if (!claimId) {
    console.log("[meli] notificacao de reclamacao sem claim_id, ignorando");
    return;
  }

  if (reclamacaoEmAndamento.has(claimId)) {
    console.log("[meli] reclamacao ja esta em processamento, ignorando");
    return;
  }

  reclamacaoEmAndamento.add(claimId);

  try {
    console.log("[meli] buscando reclamacao:", claimId);

    const detalheResp = await chamarMeli(
      `/post-purchase/v1/claims/${encodeURIComponent(claimId)}`
    );

    console.log("[meli] status detalhe reclamacao:", detalheResp.status);

    if (detalheResp.status !== 200) {
      console.log("[meli] erro ao buscar reclamacao:");
      console.log(detalheResp.texto?.slice(0, 3000));
      return;
    }

    const detalhe = detalheResp.json || {};

    const respondent = (detalhe.players || []).find(
      (p) => p?.role === "respondent"
    );

    const complainant = (detalhe.players || []).find(
      (p) => p?.role === "complainant"
    );

    console.log("");
    console.log("--- MELI RECLAMACAO DETALHE ---");
    console.log({
      claim_id: claimId,
      type: detalhe.type,
      stage: detalhe.stage,
      status: detalhe.status,
      reason_id: detalhe.reason_id,
      respondent_id: respondent?.user_id || null,
      complainant_id: complainant?.user_id || null,
      respondent_pode_responder:
        respondent?.available_actions?.some(
          (a) => a?.action === "send_message"
        ) || false,
    });

    /*
     * Verifica se ha prazo para responder sem afetar a
     * reputacao da loja. So faz sentido consultar isso
     * para reclamacoes ainda abertas.
     */
    let alertaPrazo = null;

    if (detalhe.status === "opened") {
      try {
        const reputResp = await chamarMeli(
          `/post-purchase/v1/claims/${encodeURIComponent(claimId)}/affects-reputation`
        );

        console.log(
          "[meli] status affects-reputation:",
          reputResp.status
        );

        if (reputResp.status === 200) {
          const rep = reputResp.json || {};

          console.log("[meli] affects-reputation:", rep);

          if (rep.due_date) {
            const dataFormatada = new Date(
              rep.due_date
            ).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            });

            if (rep.affects_reputation) {
              alertaPrazo = `⚠️ URGENTE: responder ate ${dataFormatada} para nao afetar a reputacao da loja`;
            } else if (rep.has_incentive) {
              alertaPrazo = `⏰ Responder ate ${dataFormatada} evita impacto na reputacao da loja`;
            }
          }
        } else {
          console.log(
            "[meli] nao foi possivel consultar affects-reputation:",
            reputResp.texto?.slice(0, 500)
          );
        }
      } catch (e) {
        console.log(
          "[meli] erro ao consultar affects-reputation:",
          e?.message || e
        );
      }
    }

    const mensagensResp = await chamarMeli(
      `/post-purchase/v1/claims/${encodeURIComponent(claimId)}/messages`
    );

    console.log(
      "[meli] status mensagens reclamacao:",
      mensagensResp.status
    );

    if (mensagensResp.status !== 200) {
      console.log("[meli] erro ao buscar mensagens da reclamacao:");
      console.log(mensagensResp.texto?.slice(0, 3000));
      return;
    }

    const listaMensagens = Array.isArray(mensagensResp.json)
      ? mensagensResp.json
      : Array.isArray(mensagensResp.json?.results)
        ? mensagensResp.json.results
        : [];

    console.log(
      "[meli] mensagens encontradas na reclamacao:",
      listaMensagens.length
    );

    console.log(
      "[meli] resposta bruta mensagens (debug):",
      mensagensResp.texto?.slice(0, 3000)
    );

    for (const msg of listaMensagens) {
      const remetenteRole = msg?.sender_role || msg?.role || null;

      if (remetenteRole !== "complainant") {
        continue;
      }

      const msgId = String(
        msg?.hash || msg?.id || msg?.message_id || ""
      );

      if (!msgId) {
        continue;
      }

      const chaveDedupe = `meli-reclamacao-${claimId}-${msgId}`;

      if (jaProcessada(chaveDedupe)) {
        continue;
      }

      const texto =
        typeof msg?.message === "string"
          ? msg.message
          : typeof msg?.text === "string"
            ? msg.text
            : "";

      const quando =
        msg?.date_created || msg?.date || new Date().toISOString();

      console.log("");
      console.log("--- MELI RECLAMACAO MENSAGEM NOVA ---");
      console.log({ claim_id: claimId, msg_id: msgId, texto, quando });

      const rEnvio = await enviarReclamacaoParaKommo({
        message_id: msgId,
        claim_id: claimId,
        reason_id: detalhe.reason_id,
        alerta_prazo: alertaPrazo,
        remetente_id: complainant?.user_id || null,
        destinatario_id: respondent?.user_id || null,
        quando,
        texto,
      });

      if (rEnvio?.status === 200) {

        registrarAtendimento({
          marketplace: "Mercado Livre",

          tipo_atendimento: "reclamacao",

          conversation_id: `reclamacao-${claimId}`,

          comprador_id:
            complainant?.user_id || null,

          comprador_nome: null,

          item_id: null,
          item_titulo: null,

          pedido_id: null,
          pack_id: null,
          claim_id: claimId,

          quando,
          texto,
        });

        registrarMensagem({
          message_id: chaveDedupe,
          conversation_id: `reclamacao-${claimId}`,
          comprador_id: complainant?.user_id || null,
          comprador_nome: null,
          quando,
        });
      } else {
        console.log(
          "[meli] ENVIO FALHOU, mensagem de reclamacao NAO registrada como processada"
        );
      }
    }
  } catch (e) {
    console.log("[meli] erro ao processar reclamacao:", e?.message || e);
  } finally {
    reclamacaoEmAndamento.delete(claimId);
  }
}

async function processarKommo(corpo, scopeId) {
  if (
    cfg.kommo_scope_id &&
    String(scopeId) !== String(cfg.kommo_scope_id)
  ) {
    console.log("scope_id Kommo diferente, ignorando");
    console.log("recebido:", scopeId);
    console.log("esperado:", cfg.kommo_scope_id);
    return;
  }

  let j;
  try {
    j = JSON.parse(corpo);
  } catch {
    console.log("JSON Kommo invalido");
    return;
  }

  if (!j?.message?.message) {
    console.log("evento Kommo sem mensagem, ignorando");
    return;
  }

  const tipo = j.message.message.type;

  if (tipo !== "text") {
    console.log(
      "mensagem Kommo recebida, mas tipo ainda nao suportado:",
      tipo
    );
    return;
  }

  const compradorId =
    j?.message?.receiver?.client_id || j?.message?.receiver?.id;

  const conversaShopee = j?.message?.conversation?.client_id;

  const texto = j?.message?.message?.text;


  const respondenteId =
    j?.message?.sender?.id || null;

  const respondenteNome =
    j?.message?.sender?.name || null;

  console.log("--- RESPOSTA DO KOMMO ---");
  console.log({
    comprador_id: compradorId,
    conversation_id: conversaShopee,
    texto,
  });

  if (!compradorId) {
    console.log("-> comprador_id ausente no webhook Kommo");
    return;
  }

  if (!texto || !String(texto).trim()) {
    console.log("-> texto vazio no webhook Kommo");
    return;
  }

  try {
    const resultado = await enviarTextoShopee(compradorId, texto);

    console.log("-> enviado para Shopee");

    marcarAtendimentoRespondido({
      compradorId,
      conversationId: conversaShopee,
      marketplace: "Shopee",
      texto,
      respondenteId,
      respondenteNome,
      origemResposta: "kommo",
    });

    if (resultado?.response) {
      console.log("Shopee:", resultado.response);
    }
  } catch (e) {
    console.log(
      "-> ERRO ao enviar resposta para Shopee:",
      e?.message || e
    );
  }
}

async function responderPeloPainel({
  marketplace,
  conversationId,
  compradorId,
  compradorNome,
  texto,
}) {
  if (!texto || !String(texto).trim()) {
    throw new Error("Resposta vazia");
  }

  // =====================================================
  // SHOPEE
  // =====================================================

  if (marketplace === "Shopee") {
    if (!compradorId) {
      throw new Error("Comprador Shopee nao identificado");
    }

    const resultado = await enviarTextoShopee(
      compradorId,
      String(texto).trim()
    );

    marcarAtendimentoRespondido({
      compradorId,
      conversationId,
      marketplace: "Shopee",
      texto,
      respondenteNome: "Central Guedes",
      origemResposta: "central",
    });

    try {
      const msgidCentral =
        `central-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const espelhamentoKommo =
        await espelharRespostaCentralNoKommo({
          conversationId,
          compradorId,
          compradorNome,
          texto: String(texto).trim(),
          respondenteAmojoId:
            "e9b5706e-1668-41da-834c-2833ba66d817",
          respondenteNome: "Suporte",
          msgid: msgidCentral,
        });

      console.log(
        "[central] resposta Shopee espelhada no Kommo:",
        espelhamentoKommo.status
      );
    } catch (e) {
      console.error(
        "[central] falha ao espelhar resposta no Kommo:",
        e?.message || e
      );
    }

    return {
      ok: true,
      marketplace: "Shopee",
      resultado,
    };
  }

  // =====================================================
  // MERCADO LIVRE
  // =====================================================

  if (marketplace === "Mercado Livre") {

    // PERGUNTA
    const pergunta = String(conversationId || "").match(
      /^pergunta-(.+)$/
    );

    if (pergunta) {
      const questionId = pergunta[1];

      const resultado = await responderPerguntaMeli(
        questionId,
        String(texto).trim()
      );

      if (
        resultado?.status >= 200 &&
        resultado?.status < 300
      ) {
        marcarAtendimentoRespondido({
          compradorId,
          conversationId,
          marketplace: "Mercado Livre",
          texto,
          respondenteNome: "Central Guedes",
          origemResposta: "central",
        });

        try {
          if (!compradorId) {
            throw new Error(
              "Comprador do Mercado Livre nao identificado"
            );
          }

          const msgidCentral =
            `central-meli-pergunta-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

          const espelhamentoKommo =
            await espelharRespostaCentralNoKommoMeli({
              conversationId,
              compradorId,
              compradorNome,
              texto: String(texto).trim(),
              respondenteAmojoId:
                "480f2888-6c8f-4b66-89f7-b42aeca87e6c",
              respondenteNome: "Endrigo Guedes",
              msgid: msgidCentral,
            });

          console.log(
            "[central] resposta da pergunta Mercado Livre espelhada no Kommo:",
            espelhamentoKommo.status
          );
        } catch (e) {
          console.error(
            "[central] falha ao espelhar pergunta Mercado Livre no Kommo:",
            e?.message || e
          );
        }
      }

      return {
        ok:
          resultado?.status >= 200 &&
          resultado?.status < 300,
        marketplace: "Mercado Livre",
        tipo: "pergunta",
        status: resultado?.status,
      };
    }

    // POS-VENDA
    const posVenda = String(conversationId || "").match(
      /^posvenda-pack-(.+)$/
    );

    if (posVenda) {
      const packId = posVenda[1];

      if (!compradorId) {
        throw new Error(
          "Comprador do Mercado Livre nao identificado"
        );
      }

      const resultado = await responderMensagemPosVenda(
        packId,
        meliUserId(),
        compradorId,
        String(texto).trim()
      );

      if (
        resultado?.status >= 200 &&
        resultado?.status < 300
      ) {
        marcarAtendimentoRespondido({
          compradorId,
          conversationId,
          marketplace: "Mercado Livre",
          texto,
          respondenteNome: "Central Guedes",
          origemResposta: "central",
        });

        try {
          const msgidCentral =
            `central-meli-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

          const espelhamentoKommo =
            await espelharRespostaCentralNoKommoMeli({
              conversationId,
              compradorId,
              compradorNome: `Venda ${packId}`,
              texto: String(texto).trim(),
              respondenteAmojoId:
                "480f2888-6c8f-4b66-89f7-b42aeca87e6c",
              respondenteNome: "Endrigo Guedes",
              msgid: msgidCentral,
            });

          console.log(
            "[central] resposta Mercado Livre espelhada no Kommo:",
            espelhamentoKommo.status
          );
        } catch (e) {
          console.error(
            "[central] falha ao espelhar resposta Mercado Livre no Kommo:",
            e?.message || e
          );
        }
      }

      return {
        ok:
          resultado?.status >= 200 &&
          resultado?.status < 300,
        marketplace: "Mercado Livre",
        tipo: "pos-venda",
        status: resultado?.status,
      };
    }

    // RECLAMACAO
    const reclamacao = String(conversationId || "").match(
      /^reclamacao-(.+)$/
    );

    if (reclamacao) {
      const claimId = reclamacao[1];

      const resultado = await responderReclamacaoMeli(
        claimId,
        String(texto).trim()
      );

      if (
        resultado?.status >= 200 &&
        resultado?.status < 300
      ) {
        marcarAtendimentoRespondido({
          compradorId,
          conversationId,
          marketplace: "Mercado Livre",
          texto,
          respondenteNome: "Central Guedes",
          origemResposta: "central",
        });

        try {
          if (!compradorId) {
            throw new Error(
              "Comprador da reclamacao Mercado Livre nao identificado"
            );
          }

          const msgidCentral =
            `central-meli-reclamacao-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

          const espelhamentoKommo =
            await espelharRespostaCentralNoKommoMeli({
              conversationId,
              compradorId,
              compradorNome,
              texto: String(texto).trim(),
              respondenteAmojoId:
                "480f2888-6c8f-4b66-89f7-b42aeca87e6c",
              respondenteNome: "Endrigo Guedes",
              msgid: msgidCentral,
            });

          console.log(
            "[central] resposta da reclamacao Mercado Livre espelhada no Kommo:",
            espelhamentoKommo.status
          );
        } catch (e) {
          console.error(
            "[central] falha ao espelhar reclamacao Mercado Livre no Kommo:",
            e?.message || e
          );
        }
      }

      return {
        ok:
          resultado?.status >= 200 &&
          resultado?.status < 300,
        marketplace: "Mercado Livre",
        tipo: "reclamacao",
        status: resultado?.status,
      };
    }

    throw new Error(
      "Tipo de conversa do Mercado Livre nao reconhecido"
    );
  }

  throw new Error(
    `Marketplace nao suportado: ${marketplace}`
  );
}

async function processarKommoMeli(corpo, scopeId) {
  if (
    cfgMeliKommo.scope_id &&
    String(scopeId) !== String(cfgMeliKommo.scope_id)
  ) {
    console.log("scope_id Mercado Livre diferente, ignorando");
    return;
  }

  let j;
  try {
    j = JSON.parse(corpo);
  } catch {
    console.log("JSON Kommo (Mercado Livre) invalido");
    return;
  }

  if (!j?.message?.message) {
    console.log("evento Kommo (Mercado Livre) sem mensagem, ignorando");
    return;
  }

  const tipo = j.message.message.type;


  if (tipo !== "text") {
    console.log(
      "mensagem Kommo (Mercado Livre) recebida, tipo ainda nao suportado:",
      tipo
    );
    return;
  }

  const conversaId =
    j?.message?.conversation?.client_id || j?.message?.receiver?.client_id;

  const buyerId =
    j?.message?.receiver?.client_id || j?.message?.receiver?.id;

  const texto = j?.message?.message?.text;

  const mensagemKommoId = j?.message?.message?.id
    ? String(j.message.message.id)
    : null;

  const chaveSaida = mensagemKommoId
    ? `kommo-mercadolivre-${mensagemKommoId}`
    : null;

  if (chaveSaida && jaSaidaProcessada(chaveSaida)) {
    console.log(
      "[meli] resposta do Kommo ja processada, ignorando:",
      mensagemKommoId
    );
    return;
  }

  console.log("--- RESPOSTA DO KOMMO (MERCADO LIVRE) ---");
  console.log({ conversation_id: conversaId, buyer_id: buyerId, texto });

  if (!texto || !String(texto).trim()) {
    console.log("-> texto vazio no webhook Kommo (Mercado Livre)");
    return;
  }

  const bateuPergunta = String(conversaId || "").match(/^pergunta-(.+)$/);

  if (bateuPergunta) {
    const questionId = bateuPergunta[1];

    try {
      const resultado = await responderPerguntaMeli(
        questionId,
        texto
      );

      if (
        resultado?.status >= 200 &&
        resultado?.status < 300
      ) {
        marcarAtendimentoRespondido({
          compradorId: buyerId,
          conversationId: conversaId,
          texto,
        });
        if (chaveSaida) {
          registrarSaida({
            id: chaveSaida,
            canal: "mercadolivre",
            conversation_id: conversaId,
            texto,
          });
        }
      }

      console.log(
        "[meli] resposta enviada ao Mercado Livre (pergunta), status:",
        resultado.status
      );

      console.log(resultado.texto?.slice(0, 1000));
    } catch (e) {
      console.log(
        "-> ERRO ao responder pergunta no Mercado Livre:",
        e?.message || e
      );
    }

    return;
  }

  const bateuPosvendaComPack = String(conversaId || "").match(
    /^posvenda-pack-(.+)$/
  );

  if (bateuPosvendaComPack) {
    const packId = bateuPosvendaComPack[1];

    if (!buyerId) {
      console.log(
        "[meli] nao foi possivel identificar o comprador para responder a mensagem pos-venda"
      );
      return;
    }

    try {
      const resultado = await responderMensagemPosVenda(
        packId,
        meliUserId(),
        buyerId,
        texto
      );

      if (
        resultado?.status >= 200 &&
        resultado?.status < 300
      ) {
        marcarAtendimentoRespondido({
          compradorId: buyerId,
          conversationId: conversaId,
          texto,
        });
        if (chaveSaida) {
          registrarSaida({
            id: chaveSaida,
            canal: "mercadolivre",
            conversation_id: conversaId,
            texto,
          });
        }
      }

      console.log(
        "[meli] resposta enviada ao Mercado Livre (pos-venda), status:",
        resultado.status
      );
      console.log(resultado.texto?.slice(0, 1000));
    } catch (e) {
      console.log(
        "-> ERRO ao responder mensagem pos-venda no Mercado Livre:",
        e?.message || e
      );
    }

    return;
  }

  const bateuReclamacao = String(conversaId || "").match(
    /^reclamacao-(.+)$/
  );

  if (bateuReclamacao) {
    const claimId = bateuReclamacao[1];

    try {
      const resultado = await responderReclamacaoMeli(claimId, texto);

      if (
        resultado?.status >= 200 &&
        resultado?.status < 300
      ) {
        marcarAtendimentoRespondido({
          compradorId: buyerId,
          conversationId: conversaId,
          texto,
        });
        if (chaveSaida) {
          registrarSaida({
            id: chaveSaida,
            canal: "mercadolivre",
            conversation_id: conversaId,
            texto,
          });
        }
      }

      console.log(
        "[meli] resposta enviada ao Mercado Livre (reclamacao), status:",
        resultado.status
      );
      console.log(resultado.texto?.slice(0, 1000));
    } catch (e) {
      console.log(
        "-> ERRO ao responder reclamacao no Mercado Livre:",
        e?.message || e
      );
    }

    return;
  }

  console.log(
    "[meli] conversation_id nao reconhecido, nao foi possivel responder:",
    conversaId
  );
}

const magaluEmAndamento = new Set();

async function processarNotificacaoMagalu(corpo) {
  let j;

  try {
    j = JSON.parse(corpo);
  } catch {
    console.log("[magalu] notificacao com JSON invalido");
    return;
  }

  console.log("");
  console.log("=========================================");
  console.log("MAGALU - NOTIFICACAO RECEBIDA");
  console.log("=========================================");
  console.log(j);

  const ehNotificacaoDePergunta = Boolean(j?.data?.question);
  const dominio = j?.domain || j?.data?.domain || null;

  if (!ehNotificacaoDePergunta && dominio !== "message") {
    console.log(
      "[magalu] notificacao ignorada (dominio/tipo nao tratado):",
      dominio || "desconhecido"
    );
    return;
  }

  const chaveNotificacao = ehNotificacaoDePergunta
    ? String(j?.data?.id || "")
    : String(j?.detail?.message_id || j?.data?.detail?.message_id || "");

  if (!chaveNotificacao) {
    console.log("[magalu] notificacao sem identificador, ignorando");
    return;
  }

  if (magaluEmAndamento.has(chaveNotificacao)) {
    console.log("[magalu] notificacao ja esta em processamento, ignorando");
    return;
  }

  magaluEmAndamento.add(chaveNotificacao);

  try {
    if (ehNotificacaoDePergunta) {
      const questionId = j.data.id;

      console.log("[magalu] buscando pergunta:", questionId);

      const resposta = await chamarMagalu(
        `/v0/questions/${encodeURIComponent(questionId)}`
      );

      console.log("[magalu] status detalhe pergunta:", resposta.status);

      if (resposta.status !== 200) {
        console.log("[magalu] erro ao buscar pergunta:");
        console.log(resposta.texto?.slice(0, 3000));
        return;
      }

      const dados = resposta.json?.data || resposta.json || {};
      const p = traduzirPerguntaMagalu(dados);

      console.log("");
      console.log("--- MAGALU PERGUNTA NORMALIZADA ---");
      console.log(p);

      if (p.ja_respondida || p.status === "WAITING_RESPONSE" || p.status === "APPROVED") {
        console.log(
          "[magalu] pergunta ja respondida ou nao pendente, nao enviando ao Kommo:",
          p.status
        );
        return;
      }

      const chaveDedupe = `magalu-pergunta-${p.message_id}`;

      if (jaProcessada(chaveDedupe)) {
        console.log("[magalu] pergunta ja enviada ao Kommo antes, ignorando");
        return;
      }

      const rEnvio = await enviarPerguntaMagaluParaKommo(p);

      if (rEnvio?.status === 200) {
        registrarMensagem({
          message_id: chaveDedupe,
          conversation_id: `pergunta-magalu-${p.message_id}`,
          comprador_id: p.remetente_id,
          comprador_nome: p.remetente_nome,
          quando: p.quando,
        });
      } else {
        console.log(
          "[magalu] ENVIO FALHOU, pergunta NAO registrada como processada"
        );
      }
    } else {
      const conversationId =
        j?.detail?.conversation_id || j?.data?.detail?.conversation_id;

      const messageId =
        j?.detail?.message_id || j?.data?.detail?.message_id;

      if (!conversationId || !messageId) {
        console.log(
          "[magalu] notificacao de mensagem sem conversation_id/message_id"
        );
        return;
      }

      console.log(
        "[magalu] buscando conversa e mensagem:",
        conversationId,
        messageId
      );

      const respostaConversa = await chamarMagalu(
        `/v0/conversations/${encodeURIComponent(conversationId)}`
      );

      const respostaMensagem = await chamarMagalu(
        `/v0/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`
      );

      console.log(
        "[magalu] status conversa:",
        respostaConversa.status,
        "| status mensagem:",
        respostaMensagem.status
      );

      if (respostaMensagem.status !== 200) {
        console.log("[magalu] erro ao buscar mensagem:");
        console.log(respostaMensagem.texto?.slice(0, 3000));
        return;
      }

      const conversaObj =
        respostaConversa.json?.data || respostaConversa.json || {};

      const mensagemObj =
        respostaMensagem.json?.data || respostaMensagem.json || {};

      if (!ehMensagemDoCliente(mensagemObj)) {
        console.log(
          "[magalu] mensagem enviada pelo proprio vendedor, ignorando (evita eco)"
        );
        return;
      }

      const p = traduzirMensagemMagalu(mensagemObj, conversaObj);

      console.log("");
      console.log("--- MAGALU MENSAGEM NORMALIZADA ---");
      console.log(p);

      const chaveDedupe = `magalu-mensagem-${p.message_id}`;

      if (jaProcessada(chaveDedupe)) {
        console.log(
          "[magalu] mensagem pos-venda ja enviada ao Kommo antes, ignorando"
        );
        return;
      }

      const rEnvio = await enviarMensagemMagaluParaKommo(p);

      if (rEnvio?.status === 200) {
        registrarMensagem({
          message_id: chaveDedupe,
          conversation_id: `posvenda-magalu-${p.conversation_id}`,
          comprador_id: p.remetente_id,
          comprador_nome: p.remetente_nome,
          quando: p.quando,
        });
      } else {
        console.log(
          "[magalu] ENVIO FALHOU, mensagem pos-venda NAO registrada como processada"
        );
      }
    }
  } catch (e) {
    console.log("[magalu] erro ao processar notificacao:", e?.message || e);
  } finally {
    magaluEmAndamento.delete(chaveNotificacao);
  }
}

/*
 * Processa a resposta do atendente no Kommo e devolve
 * pro Magalu (pergunta ou mensagem de chat, dependendo
 * do prefixo do conversation_id).
 */
async function processarKommoMagalu(corpo, scopeId) {
  if (
    cfgMagaluKommo.scope_id &&
    String(scopeId) !== String(cfgMagaluKommo.scope_id)
  ) {
    console.log("scope_id Magalu diferente, ignorando");
    return;
  }

  let j;

  try {
    j = JSON.parse(corpo);
  } catch {
    console.log("JSON Kommo (Magalu) invalido");
    return;
  }

  if (!j?.message?.message) {
    console.log("evento Kommo (Magalu) sem mensagem, ignorando");
    return;
  }

  const tipo = j.message.message.type;

  if (tipo !== "text") {
    console.log(
      "mensagem Kommo (Magalu) recebida, tipo ainda nao suportado:",
      tipo
    );
    return;
  }

  const conversaId =
    j?.message?.conversation?.client_id || j?.message?.receiver?.client_id;

  const texto = j?.message?.message?.text;

  console.log("--- RESPOSTA DO KOMMO (MAGALU) ---");
  console.log({ conversation_id: conversaId, texto });

  if (!texto || !String(texto).trim()) {
    console.log("-> texto vazio no webhook Kommo (Magalu)");
    return;
  }

  const bateuPergunta = String(conversaId || "").match(
    /^pergunta-magalu-(.+)$/
  );

  if (bateuPergunta) {
    const questionId = bateuPergunta[1];

    try {
      const resultado = await responderPerguntaMagalu(questionId, texto);
      console.log(
        "[magalu] resposta enviada ao Magalu (pergunta), status:",
        resultado.status
      );
      console.log(resultado.texto?.slice(0, 1000));
    } catch (e) {
      console.log(
        "-> ERRO ao responder pergunta no Magalu:",
        e?.message || e
      );
    }

    return;
  }

  const bateuPosvenda = String(conversaId || "").match(
    /^posvenda-magalu-(.+)$/
  );

  if (bateuPosvenda) {
    const conversationId = bateuPosvenda[1];

    try {
      const resultado = await responderMensagemMagalu(
        conversationId,
        texto
      );

      console.log(
        "[magalu] resposta enviada ao Magalu (pos-venda), status:",
        resultado.status
      );
      console.log(resultado.texto?.slice(0, 1000));
    } catch (e) {
      console.log(
        "-> ERRO ao responder mensagem pos-venda no Magalu:",
        e?.message || e
      );
    }

    return;
  }

  console.log(
    "[magalu] conversation_id nao reconhecido, nao foi possivel responder:",
    conversaId
  );
}

http
  .createServer((req, res) => {
    const partes = [];

    req.on("data", (parte) => {
      partes.push(parte);
    });

    req.on("end", () => {
      const corpoBruto = Buffer.concat(partes);
      const corpo = corpoBruto.toString("utf8");
      const url = new URL(
        req.url,
        `http://${req.headers.host || "localhost"}`
      );
      const caminho = url.pathname;

      if (req.method === "GET" && caminho === "/meli/teste-webhook") {
        const notificacaoTeste = {
          _id: "teste-" + Date.now(),
          topic: "messages",
          resource: "TESTE_MENSAGEM_MELI",
          user_id: meliUserId(),
          application_id: cfgMeli.client_id,
          sent: new Date().toISOString(),
          attempts: 1,
          received: new Date().toISOString(),
          actions: ["created"],
        };

        console.log("");
        console.log("=========================================");
        console.log("MELI - TESTE WEBHOOK MANUAL");
        console.log("=========================================");
        console.log(notificacaoTeste);

        processarNotificacaoMeli(JSON.stringify(notificacaoTeste)).catch(
          (e) => {
            console.log("[meli] erro no teste webhook:", e?.message || e);
          }
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            {
              ok: true,
              teste: true,
              mensagem: "Webhook de teste enviado para processamento.",
            },
            null,
            2
          )
        );
        return;
      }

      if (req.method === "GET" && caminho === "/meli/auth") {
        const codigo = url.searchParams.get("code");

        if (!codigo) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Faltou o parametro code.");
          return;
        }

        trocarCodigo(codigo)
          .then((userId) => {
            console.log("[meli] autorizado, user_id:", userId);
          })
          .catch((e) => {
            console.log("[meli] ERRO ao trocar codigo:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(
          "Autorizacao recebida. Pode fechar esta pagina e conferir os logs."
        );
        return;
      }

      if (req.method === "GET" && caminho === "/meli/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            {
              tem_tokens: temTokens(),
              client_id_carregado: Boolean(cfgMeli.client_id),
              user_id: meliUserId() || null,
            },
            null,
            2
          )
        );
        return;
      }

      if (req.method === "GET" && caminho === "/meli/teste") {
        console.log("--- TESTE MELI: CONSULTANDO MENSAGENS NAO LIDAS ---");

        chamarMeli("/messages/unread?role=seller&tag=post_sale")
          .then((r) => {
            console.log("--- MELI NAO LIDAS ---");
            console.log("status:", r.status);
            console.log(r.texto?.slice(0, 1500));
          })
          .catch((e) => {
            console.log("[meli] ERRO no teste:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Consultando Mercado Livre. Veja os logs do Render.");
        return;
      }

      if (req.method === "GET" && caminho === "/meli/ler") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Buscando mensagens do Mercado Livre. Veja os logs do Render.");

        (async () => {
          console.log("");
          console.log("=========================================");
          console.log("MELI - BUSCANDO MENSAGENS NAO LIDAS");
          console.log("=========================================");

          const naoLidas = await chamarMeli(
            "/messages/unread?role=seller&tag=post_sale"
          );

          console.log("[meli] status unread:", naoLidas.status);

          if (naoLidas.status !== 200) {
            console.log("[meli] erro unread:", naoLidas.texto);
            return;
          }

          const resultados = naoLidas.json?.results || [];

          console.log(
            "[meli] conversas com mensagens nao lidas:",
            resultados.length
          );

          for (const item of resultados) {
            console.log("");
            console.log("-----------------------------------------");
            console.log("[meli] resource:", item.resource);
            console.log("[meli] quantidade nao lida:", item.count);

            let resource = String(item?.resource || "").trim();

            resource = resource.replace(/^\/+/, "");

            if (resource.startsWith("messages/")) {
              resource = resource.substring("messages/".length);
            }

            const endpoint =
              `/messages/${encodeURIComponent(resource)}` +
              `?tag=post_sale&mark_as_read=false`;

            console.log("[meli] endpoint:", endpoint);

            const mensagens = await chamarMeli(endpoint);

            console.log("[meli] status mensagens:", mensagens.status);

            if (mensagens.status !== 200) {
              console.log("[meli] ERRO ao buscar mensagens:", mensagens.texto);
              continue;
            }

            console.log("[meli] RESPOSTA COMPLETA:");
            console.log(mensagens.texto?.slice(0, 10000));
          }

          console.log("");
          console.log("=========================================");
          console.log("MELI - FIM DA CONSULTA");
          console.log("=========================================");
        })().catch((e) => {
          console.log("[meli] ERRO em /meli/ler:", e?.message || e);
        });

        return;
      }

      if (req.method === "GET" && caminho === "/meli/teste-responder") {
        const questionId = url.searchParams.get("question_id");
        const texto = url.searchParams.get("texto");

        if (!questionId || !texto) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Use ?question_id=ID&texto=SUA RESPOSTA");
          return;
        }

        responderPerguntaMeli(questionId, texto)
          .then((r) => {
            console.log("[meli] resposta da pergunta, status:", r.status);
            console.log(r.texto?.slice(0, 2000));
          })
          .catch((e) => {
            console.log("[meli] ERRO ao responder pergunta:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Enviando resposta para o Mercado Livre. Veja os logs do Render.");
        return;
      }

      if (req.method === "GET" && caminho === "/meli/teste-responder-posvenda") {
        const packId = url.searchParams.get("pack_id");
        const buyerId = url.searchParams.get("buyer_id");
        const texto = url.searchParams.get("texto");

        if (!packId || !buyerId || !texto) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Use ?pack_id=ID&buyer_id=ID&texto=SUA RESPOSTA");
          return;
        }

        responderMensagemPosVenda(packId, meliUserId(), buyerId, texto)
          .then((r) => {
            console.log("[meli] resposta pos-venda, status:", r.status);
            console.log(r.texto?.slice(0, 2000));
          })
          .catch((e) => {
            console.log("[meli] ERRO ao responder pos-venda:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Enviando resposta pos-venda para o Mercado Livre. Veja os logs do Render.");
        return;
      }

      const rotaAnexoMeli = caminho.match(/^\/meli\/anexo\/(.+)$/);

      if (req.method === "GET" && rotaAnexoMeli) {
        const nomeArquivo = decodeURIComponent(rotaAnexoMeli[1]);

        if (!anexoConhecido(nomeArquivo)) {
          console.log(
            "[meli] tentativa de acessar anexo desconhecido, recusando:",
            nomeArquivo
          );

          res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Anexo nao reconhecido.");
          return;
        }

        (async () => {
          try {
            const acc = await tokenMeli();

            const respostaAnexo = await fetch(
              `https://api.mercadolibre.com/messages/attachments/${encodeURIComponent(nomeArquivo)}?tag=post_sale&site_id=MLB`,
              {
                headers: {
                  Authorization: `Bearer ${acc}`,
                },
              }
            );

            console.log(
              "[meli] status busca anexo:",
              respostaAnexo.status,
              nomeArquivo
            );

            if (!respostaAnexo.ok) {
              res.writeHead(respostaAnexo.status, {
                "Content-Type": "text/plain; charset=utf-8",
              });
              res.end("Nao foi possivel obter o anexo.");
              return;
            }

            const buffer = Buffer.from(
              await respostaAnexo.arrayBuffer()
            );

            const contentType =
              respostaAnexo.headers.get("content-type") ||
              "application/octet-stream";

            res.writeHead(200, { "Content-Type": contentType });
            res.end(buffer);
          } catch (e) {
            console.log(
              "[meli] erro ao servir anexo:",
              e?.message || e
            );

            res.writeHead(500, {
              "Content-Type": "text/plain; charset=utf-8",
            });
            res.end("Erro ao buscar anexo.");
          }
        })();

        return;
      }

      if (req.method === "GET" && caminho === "/meli/teste-responder-reclamacao") {
        const claimId = url.searchParams.get("claim_id");
        const texto = url.searchParams.get("texto");

        if (!claimId || !texto) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Use ?claim_id=ID&texto=SUA RESPOSTA");
          return;
        }

        responderReclamacaoMeli(claimId, texto)
          .then((r) => {
            console.log("[meli] resposta da reclamacao, status:", r.status);
            console.log(r.texto?.slice(0, 2000));
          })
          .catch((e) => {
            console.log("[meli] ERRO ao responder reclamacao:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Enviando resposta da reclamacao para o Mercado Livre. Veja os logs do Render.");
        return;
      }

      if (req.method === "GET" && caminho === "/magalu/auth") {
        const codigo = url.searchParams.get("code");

        if (!codigo) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Faltou o parametro code.");
          return;
        }

        trocarCodigoMagalu(codigo)
          .then(() => {
            console.log("[magalu] autorizado com sucesso");
          })
          .catch((e) => {
            console.log("[magalu] ERRO ao trocar codigo:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(
          "Autorizacao recebida. Pode fechar esta pagina e conferir os logs."
        );
        return;
      }

      if (req.method === "GET" && caminho === "/magalu/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            {
              tem_tokens: temTokensMagalu(),
              client_id_carregado: Boolean(cfgMagalu.client_id),
            },
            null,
            2
          )
        );
        return;
      }

      if (req.method === "GET" && caminho === "/magalu/teste-responder") {
        const questionId = url.searchParams.get("question_id");
        const texto = url.searchParams.get("texto");

        if (!questionId || !texto) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Use ?question_id=ID&texto=SUA RESPOSTA");
          return;
        }

        responderPerguntaMagalu(questionId, texto)
          .then((r) => {
            console.log("[magalu] resposta da pergunta, status:", r.status);
            console.log(r.texto?.slice(0, 2000));
          })
          .catch((e) => {
            console.log("[magalu] ERRO ao responder pergunta:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Enviando resposta para o Magalu. Veja os logs do Render.");
        return;
      }

      if (req.method === "GET" && caminho === "/magalu/teste-responder-posvenda") {
        const conversationId = url.searchParams.get("conversation_id");
        const texto = url.searchParams.get("texto");

        if (!conversationId || !texto) {
          res.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.end("Use ?conversation_id=ID&texto=SUA RESPOSTA");
          return;
        }

        responderMensagemMagalu(conversationId, texto)
          .then((r) => {
            console.log("[magalu] resposta pos-venda, status:", r.status);
            console.log(r.texto?.slice(0, 2000));
          })
          .catch((e) => {
            console.log("[magalu] ERRO ao responder pos-venda:", e?.message || e);
          });

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Enviando resposta pos-venda para o Magalu. Veja os logs do Render.");
        return;
      }

      if (req.method === "GET" && caminho === "/status") {
        (async () => {
          const status = {
            servidor: "ok",
            catalogo_produtos: Object.keys(catalogoProdutos).length,
            shopee: {
              canal_kommo_configurado: Boolean(cfg.kommo_scope_id),
            },
            mercado_livre: {
              token_salvo: temTokens(),
              canal_kommo_configurado: Boolean(cfgMeliKommo.scope_id),
            },
            magalu: {
              token_salvo: temTokensMagalu(),
              canal_kommo_configurado: Boolean(cfgMagaluKommo.scope_id),
            },
          };

          try {
            await tokenShopee();
            status.shopee.token_valido = true;
          } catch (e) {
            status.shopee.token_valido = false;
            status.shopee.erro_token = e?.message || String(e);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(status, null, 2));
        })().catch((e) => {
          console.log("[status] erro ao montar status:", e?.message || e);

          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end('{"ok":false,"erro":"falha ao montar status"}');
          }
        });

        return;
      }

      /* =====================================================
   PAINEL DE ATENDIMENTOS
   ===================================================== */

      if (
        req.method === "GET" &&
        caminho === "/atendimentos"
      ) {
        if (!loginPainelValido(req)) {
          res.writeHead(401, {
            "WWW-Authenticate": 'Basic realm="Central de Atendimentos"',
            "Content-Type": "text/plain; charset=utf-8",
          });

          res.end("Acesso restrito");
          return;
        }

        const dados = {
          ...resumoAtendimentos(),
          atendimentos: listarAtendimentos(),
        };

        const html =
          renderizarPainelAtendimentos(dados);

        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
        });

        res.end(html);
        return;
      }

      if (
        req.method === "GET" &&
        caminho === "/atendimentos/dados"
      ) {
        if (!loginPainelValido(req)) {
          res.writeHead(401, {
            "WWW-Authenticate": 'Basic realm="Central de Atendimentos"',
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end('{"ok":false}');
          return;
        }

        const dados = {
          ...resumoAtendimentos(),
          atendimentos: listarAtendimentos(),
        };

        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });

        res.end(JSON.stringify(dados));
        return;
      }
      if (
        req.method === "GET" &&
        caminho === "/atendimentos/historico"
      ) {
        if (!loginPainelValido(req)) {
          res.writeHead(401, {
            "WWW-Authenticate":
              'Basic realm="Central de Atendimentos"',
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro: "Acesso restrito",
            })
          );

          return;
        }

        const marketplace =
          String(
            url.searchParams.get("marketplace") || ""
          ).trim();

        const conversationId =
          String(
            url.searchParams.get("conversation_id") || ""
          ).trim();

        if (!conversationId) {
          res.writeHead(400, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro: "conversation_id obrigatorio",
            })
          );

          return;
        }

        if (
          marketplace.toLowerCase() !==
          "mercado livre"
        ) {
          res.writeHead(400, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro:
                "Historico remoto disponivel somente para Mercado Livre neste momento",
            })
          );

          return;
        }

        const bateuPosVenda =
          conversationId.match(
            /^posvenda-pack-(.+)$/
          );

        if (!bateuPosVenda) {
          res.writeHead(400, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro:
                "Historico remoto disponivel somente para pos-venda neste momento",
            })
          );

          return;
        }

        const packId =
          bateuPosVenda[1];

        const sellerId =
          meliUserId();

        if (!sellerId) {
          res.writeHead(500, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro:
                "Seller do Mercado Livre nao identificado",
            })
          );

          return;
        }

        (async () => {
          const resource =
            `packs/${packId}/sellers/${sellerId}`;

          const mensagens = [];
          const idsMensagens = new Set();

          const limite = 10;
          const maxPaginas = 100;

          for (
            let pagina = 0;
            pagina < maxPaginas;
            pagina++
          ) {
            const offset =
              pagina * limite;

            const endpoint =
              `/messages/${encodeURIComponent(resource)}` +
              `?limit=${limite}` +
              `&offset=${offset}` +
              `&tag=post_sale` +
              `&mark_as_read=false`;

            console.log(
              "[painel] buscando historico Mercado Livre:",
              {
                pagina: pagina + 1,
                offset,
              }
            );

            const resposta =
              await chamarMeli(endpoint);

            if (resposta.status !== 200) {
              console.log(
                "[painel] erro historico Mercado Livre:",
                resposta.status,
                resposta.texto?.slice(0, 2000)
              );

              res.writeHead(502, {
                "Content-Type":
                  "application/json; charset=utf-8",
              });

              res.end(
                JSON.stringify({
                  ok: false,
                  erro:
                    "Nao foi possivel carregar o historico do Mercado Livre",
                })
              );

              return;
            }

            const dadosPagina =
              resposta.json || {};

            const lote =
              Array.isArray(
                dadosPagina.messages
              )
                ? dadosPagina.messages
                : [];

            let novasMensagens = 0;

            for (const mensagem of lote) {
              const id =
                mensagem?.id ||
                mensagem?.message_id ||
                null;

              if (
                id &&
                idsMensagens.has(
                  String(id)
                )
              ) {
                continue;
              }

              if (id) {
                idsMensagens.add(
                  String(id)
                );
              }

              mensagens.push(
                mensagem
              );

              novasMensagens++;
            }

            console.log(
              "[painel] pagina de historico:",
              {
                pagina: pagina + 1,
                recebidas: lote.length,
                novas: novasMensagens,
                acumuladas:
                  mensagens.length,
                total:
                  dadosPagina?.paging?.total ??
                  null,
              }
            );

            const total =
              Number(
                dadosPagina?.paging?.total ||
                0
              );

            /*
             * Caso a API informe o total,
             * paramos quando chegarmos nele.
             */
            if (
              total > 0 &&
              mensagens.length >= total
            ) {
              break;
            }

            /*
             * Menos mensagens que o limite
             * significa ultima pagina.
             */
            if (
              lote.length < limite
            ) {
              break;
            }

            /*
             * Protecao caso a API ignore
             * offset e devolva a mesma pagina.
             */
            if (
              novasMensagens === 0
            ) {
              break;
            }
          }

          const historico =
            mensagens
              .map((mensagem) => {
                const fromId =
                  mensagem?.from?.user_id ||
                  mensagem?.from?.id ||
                  null;

                const autor =
                  String(fromId) ===
                    String(sellerId)
                    ? "atendente"
                    : "cliente";

                let texto = "";

                if (
                  typeof mensagem?.text ===
                  "string"
                ) {
                  texto =
                    mensagem.text;
                } else if (
                  typeof mensagem?.text?.plain ===
                  "string"
                ) {
                  texto =
                    mensagem.text.plain;
                }

                const quando =
                  mensagem?.message_date
                    ?.created ||
                  mensagem?.message_date
                    ?.received ||
                  mensagem?.message_date
                    ?.available ||
                  null;

                const anexos =
                  Array.isArray(
                    mensagem?.message_attachments
                  )
                    ? mensagem.message_attachments
                    : [];

                return {
                  id:
                    mensagem?.id ||
                    mensagem?.message_id ||
                    null,

                  autor,

                  texto,

                  quando,

                  anexos,
                };
              })
              .sort((a, b) => {
                return (
                  new Date(a.quando || 0) -
                  new Date(b.quando || 0)
                );
              });

          console.log(
            "[painel] historico Mercado Livre carregado:",
            historico.length,
            "mensagens",
            conversationId
          );

          res.writeHead(200, {
            "Content-Type":
              "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });

          res.end(
            JSON.stringify({
              ok: true,
              marketplace: "Mercado Livre",
              conversation_id:
                conversationId,
              total:
                historico.length,
              historico,
            })
          );
        })().catch((e) => {
          console.log(
            "[painel] erro inesperado ao carregar historico:",
            e?.message || e
          );

          if (!res.headersSent) {
            res.writeHead(500, {
              "Content-Type":
                "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                ok: false,
                erro:
                  "Erro ao carregar historico",
              })
            );
          }
        });

        return;
      }


      if (
        req.method === "POST" &&
        caminho === "/atendimentos/operacao"
      ) {
        if (!loginPainelValido(req)) {
          res.writeHead(401, {
            "WWW-Authenticate":
              'Basic realm="Central de Atendimentos"',
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro: "Acesso restrito",
            })
          );

          return;
        }


        let dados;

        try {
          dados =
            JSON.parse(
              corpo || "{}"
            );
        } catch {
          res.writeHead(400, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro: "JSON invalido",
            })
          );

          return;
        }


        const acao =
          String(
            dados.acao || ""
          )
            .trim()
            .toLowerCase();

        const identificacao = {
          compradorId:
            dados.comprador_id ||
            null,

          conversationId:
            dados.conversation_id ||
            null,

          marketplace:
            dados.marketplace ||
            null,
        };


        if (
          !identificacao.conversationId &&
          !identificacao.compradorId
        ) {
          res.writeHead(400, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro:
                "Atendimento nao informado",
            })
          );

          return;
        }


        try {
          let resultado = null;


          /* ===============================================
             RESPONSAVEL / SETOR / PRIORIDADE
             =============================================== */

          if (
            acao === "atualizar"
          ) {
            resultado =
              atualizarAtendimentoOperacional({
                ...identificacao,

                responsavel:
                  dados.responsavel,

                setor:
                  dados.setor,

                prioridade:
                  dados.prioridade,
              });
          }


          /* ===============================================
             NOTA INTERNA
             =============================================== */

          else if (
            acao === "nota_interna"
          ) {
            resultado =
              adicionarNotaInterna({
                ...identificacao,

                texto:
                  dados.texto,

                autor:
                  dados.autor ||
                  null,
              });
          }


          /* ===============================================
             RESOLVER
             =============================================== */

          else if (
            acao === "resolver"
          ) {
            resultado =
              definirResolucaoAtendimento({
                ...identificacao,
                resolvido: true,
              });
          }


          /* ===============================================
             REABRIR
             =============================================== */

          else if (
            acao === "reabrir"
          ) {
            resultado =
              definirResolucaoAtendimento({
                ...identificacao,
                resolvido: false,
              });
          }


          else {
            res.writeHead(400, {
              "Content-Type":
                "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                ok: false,
                erro:
                  "Operacao invalida",
              })
            );

            return;
          }


          if (!resultado) {
            res.writeHead(404, {
              "Content-Type":
                "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                ok: false,
                erro:
                  "Atendimento nao encontrado",
              })
            );

            return;
          }


          const atendimento =
            resultado.atendimento ||
            resultado;


          res.writeHead(200, {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store",
          });

          res.end(
            JSON.stringify({
              ok: true,
              acao,
              atendimento,

              nota:
                resultado.nota ||
                null,
            })
          );

          return;

        } catch (e) {
          console.log(
            "[painel] erro em operacao:",
            e?.message || e
          );

          res.writeHead(400, {
            "Content-Type":
              "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro:
                e?.message ||
                "Erro ao atualizar atendimento",
            })
          );

          return;
        }
      }
      if (
        req.method === "POST" &&
        caminho === "/atendimentos/responder"
      ) {
        if (!loginPainelValido(req)) {
          res.writeHead(401, {
            "WWW-Authenticate":
              'Basic realm="Central de Atendimentos"',
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro: "Acesso restrito",
            })
          );

          return;
        }



        let dados;

        try {
          dados = JSON.parse(corpo || "{}");
        } catch {
          res.writeHead(400, {
            "Content-Type": "application/json; charset=utf-8",
          });

          res.end(
            JSON.stringify({
              ok: false,
              erro: "JSON invalido",
            })
          );

          return;
        }

        responderPeloPainel({
          marketplace: dados.marketplace,
          conversationId: dados.conversation_id,
          compradorId: dados.comprador_id,
          compradorNome: dados.comprador_nome,
          texto: dados.texto,
        })
          .then((resultado) => {
            res.writeHead(resultado?.ok ? 200 : 502, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify(resultado)
            );
          })
          .catch((e) => {
            console.log(
              "[painel] erro ao responder:",
              e?.message || e
            );

            res.writeHead(500, {
              "Content-Type": "application/json; charset=utf-8",
            });

            res.end(
              JSON.stringify({
                ok: false,
                erro: e?.message || "Erro ao enviar resposta",
              })
            );
          });

        return;
      }

      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
        return;
      }

      if (corpo) {
        try {
          fs.appendFileSync(
            "pushes.log",
            JSON.stringify({
              agora: new Date().toISOString(),
              metodo: req.method,
              url: req.url,
              corpo,
            }) + "\n"
          );
        } catch (e) {
          console.log("erro ao gravar pushes.log:", e?.message || e);
        }
      }

      if (
        req.method === "POST" &&
        (caminho === "/mercadolivre" || caminho === "/meli/notificacoes")
      ) {
        console.log("");
        console.log("=========================================");
        console.log("MELI WEBHOOK RECEBIDO");
        console.log("=========================================");
        console.log("[meli] rota:", caminho);
        console.log("[meli] tamanho do corpo:", corpoBruto.length, "bytes");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');

        if (corpo) {
          processarNotificacaoMeli(corpo).catch((e) => {
            console.log("[meli] erro inesperado na notificacao:", e?.message || e);
          });
        }
        return;
      }

      if (
        req.method === "POST" &&
        caminho === "/magalu/notificacoes"
      ) {
        console.log("");
        console.log("=========================================");
        console.log("MAGALU WEBHOOK RECEBIDO");
        console.log("=========================================");
        console.log("[magalu] tamanho do corpo:", corpoBruto.length, "bytes");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');

        if (corpo) {
          processarNotificacaoMagalu(corpo).catch((e) => {
            console.log("[magalu] erro inesperado na notificacao:", e?.message || e);
          });
        }
        return;
      }

      if (caminho === "/shopee") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');

        if (corpo) {
          processarShopee(req, corpo).catch((e) => {
            console.log("erro inesperado processarShopee:", e?.message || e);
          });
        }
        return;
      }

      const rotaKommo = caminho.match(
        /^\/webhooks\/kommo\/(shopee|mercadolivre|magalu)\/([^/]+)$/
      );

      if (rotaKommo) {
        const canal = rotaKommo[1];
        const scopeId = rotaKommo[2];
        const assinatura = req.headers["x-signature"];

        console.log("KOMMO HEADERS:", JSON.stringify(req.headers));
        console.log("KOMMO CORPO:", {
          canal,
          bytes_recebidos: corpoBruto.length,
          assinatura: assinatura,
          corpo_completo: corpoBruto.toString("utf8"),
        });

        const assinaturaOk =
          canal === "shopee"
            ? webhookValido(assinatura, corpoBruto, {
              caminho,
              date: req.headers["date"] || "",
              contentType: req.headers["content-type"] || "",
            })
            : canal === "mercadolivre"
              ? webhookValidoMeli(assinatura, corpoBruto)
              : webhookValidoMagalu(assinatura, corpoBruto);

        const pular = process.env.KOMMO_PULAR_ASSINATURA === "sim";

        if (!assinaturaOk && !pular) {
          console.log("assinatura Kommo invalida");
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end('{"ok":false}');
          return;
        }

        if (!assinaturaOk && pular) {
          console.log(
            "ATENCAO: assinatura invalida, seguindo assim mesmo (modo provisorio)"
          );
        }

        const scopeEsperado =
          canal === "shopee"
            ? cfg.kommo_scope_id
            : canal === "mercadolivre"
              ? cfgMeliKommo.scope_id
              : cfgMagaluKommo.scope_id;

        if (scopeEsperado && String(scopeId) !== String(scopeEsperado)) {
          console.log("scope_id desconhecido, recusando");
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end('{"ok":false}');
          return;
        }

        console.log("assinatura Kommo valida, canal:", canal);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');

        const processar =
          canal === "shopee"
            ? processarKommo
            : canal === "mercadolivre"
              ? processarKommoMeli
              : processarKommoMagalu;

        processar(corpo, scopeId).catch((e) => {
          console.log("erro inesperado ao processar Kommo:", e?.message || e);
        });
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end('{"ok":false}');
    });

    req.on("error", (e) => {
      console.log("erro HTTP:", e?.message || e);
    });
  })
  .listen(PORTA, "0.0.0.0", () => {
    console.log("Servidor escutando na porta " + PORTA);
  });

console.log("callback Shopee:", cfg.url_callback);
console.log(
  "webhook Kommo:",
  "/webhooks/kommo/shopee/:scope_id | /webhooks/kommo/mercadolivre/:scope_id | /webhooks/kommo/magalu/:scope_id"
);
console.log(
  "Mercado Livre:",
  "/meli/status | /meli/teste | /meli/ler | /meli/missed | /meli/notificacoes | /mercadolivre"
);
console.log(
  "Magalu:",
  "/magalu/auth | /magalu/status | /magalu/notificacoes"
);
