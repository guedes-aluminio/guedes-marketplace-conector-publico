# guedes-marketplace-conector

Serviço de integração que centraliza o atendimento ao cliente de múltiplos marketplaces (Shopee, Mercado Livre e Magalu) dentro do CRM [Kommo](https://www.kommo.com), com suporte a perguntas de produto, mensagens pós-venda e reclamações — em ambas as direções.

---

## Sumário

- [Visão geral](#visão-geral)
- [Status por canal](#status-por-canal)
- [Arquitetura](#arquitetura)
- [Formato interno de mensagem](#formato-interno-de-mensagem)
- [Rotas da API](#rotas-da-api)
- [Configuração](#configuração)
- [Segurança e confiabilidade](#segurança-e-confiabilidade)
- [Fontes (Sources) no Kommo](#fontes-sources-no-kommo)
- [Pendências conhecidas](#pendências-conhecidas)
- [Scripts utilitários](#scripts-utilitários)

---

## Visão geral

Cada marketplace expõe sua própria API de mensageria — formatos, autenticação e regras de negócio distintos entre si. Este serviço atua como camada de integração única: recebe eventos de cada marketplace via webhook, normaliza os dados para um esquema interno comum, e os encaminha para um canal de chat customizado no Kommo através da [Chats API (amoJo)](https://developers.kommo.com/docs/chat-api-general-info). O caminho inverso — resposta do atendente no Kommo de volta ao cliente no marketplace — segue a mesma ponte.

```
Cliente no marketplace ──▶ Webhook do marketplace ──▶ Connector ──▶ Kommo (Chats API)
Atendente no Kommo      ──▶ Webhook do Kommo         ──▶ Connector ──▶ API do marketplace
```

Stack: Node.js, sem framework HTTP (módulo nativo `http`), hospedado no [Render](https://render.com) com deploy contínuo a partir do branch `main`.

## Status por canal

| Canal | Perguntas | Pós-venda | Reclamações | Notas |
|---|:---:|:---:|:---:|---|
| Shopee | ✅ | ✅ | — | Texto, imagem, sticker, produto, variação e pedido compartilhado |
| Mercado Livre | ✅ | ✅ | ✅ | Anexos via proxy autenticado; alerta de prazo em reclamações |
| Magalu | ✅¹ | ✅¹ | — | Aguardando validação com cliente real |
| Amazon | ⏸️ | ⏸️ | — | Ver [Pendências](#pendências-conhecidas) |

¹ Validado com envio/recebimento manual; sem confirmação end-to-end com cliente real ainda.

## Arquitetura

| Arquivo | Responsabilidade |
|---|---|
| `servidor.mjs` | Entrypoint. Define as rotas HTTP e orquestra o processamento por canal |
| `shopee.mjs`, `meli.mjs`, `magalu.mjs` | Autenticação e chamadas às APIs de cada marketplace |
| `mensagem.mjs`, `mensagemMagalu.mjs` | Normalização do payload de cada marketplace para o esquema interno |
| `kommo.mjs`, `kommoMeli.mjs`, `kommoMagalu.mjs` | Assinatura HMAC e chamadas à Chats API do Kommo (um módulo por canal, cada um com seu próprio secret) |
| `importar.mjs`, `importarMeli.mjs`, `importarMagalu.mjs` | Envio da mensagem normalizada ao Kommo |
| `responderMeli.mjs`, `responderMagalu.mjs`, `enviar.mjs` | Envio da resposta do atendente de volta ao marketplace |
| `armazenamento.mjs` | Deduplicação e controle de anexos conhecidos (`dados.json`) |
| `caminhos.mjs` | Resolução de caminhos no disco persistente |

## Formato interno de mensagem

```ts
{
  message_id: string;       // identificador único na origem
  item_id?: string;         // anúncio relacionado
  item_titulo?: string;     // nome do produto, quando disponível
  pack_id?: string;         // identificador do pedido (pós-venda)
  remetente_id: string;
  destinatario_id?: string;
  quando: string;           // ISO 8601
  texto: string;
  anexos?: Anexo[];
}
```

## Rotas da API

**Webhooks de entrada** (marketplace → connector)

| Rota | Descrição |
|---|---|
| `POST /shopee` | Mensagens da Shopee |
| `POST /mercadolivre`, `POST /meli/notificacoes` | Perguntas, mensagens e reclamações do Mercado Livre |
| `POST /magalu/notificacoes` | Perguntas e chat do Magalu |

**Webhooks de retorno** (Kommo → connector)

| Rota | Descrição |
|---|---|
| `POST /webhooks/kommo/shopee/:scope_id` | Resposta do atendente — Shopee |
| `POST /webhooks/kommo/mercadolivre/:scope_id` | Resposta do atendente — Mercado Livre |
| `POST /webhooks/kommo/magalu/:scope_id` | Resposta do atendente — Magalu |

**Utilitárias**

| Rota | Descrição |
|---|---|
| `GET /status` | Diagnóstico: validade de token e configuração de canal por marketplace |
| `GET /meli/anexo/:arquivo` | Proxy autenticado para anexos do Mercado Livre |
| `GET /meli/auth`, `GET /magalu/auth` | Callback de autorização OAuth |

Rotas de teste manual (`/meli/teste-responder*`, `/magalu/teste-responder*`) permitem validar credenciais e o caminho de resposta sem depender de uma interação real.

## Configuração

Variáveis de ambiente necessárias, por canal:

<details>
<summary><strong>Shopee</strong></summary>

```
SHOPEE_PARTNER_ID
SHOPEE_PARTNER_KEY
SHOPEE_SHOP_ID
SHOPEE_PUSH_KEY
SHOPEE_CALLBACK_URL
SHOPEE_USER_ID
KOMMO_CHANNEL_ID
KOMMO_CHANNEL_SECRET
KOMMO_SCOPE_ID
KOMMO_AMOJO_ID
```
</details>

<details>
<summary><strong>Mercado Livre</strong></summary>

```
MELI_CLIENT_ID
MELI_CLIENT_SECRET
MELI_REDIRECT_URI
MELI_KOMMO_CHANNEL_ID
MELI_KOMMO_CHANNEL_SECRET
MELI_KOMMO_SCOPE_ID
```
</details>

<details>
<summary><strong>Magalu</strong></summary>

```
MAGALU_CLIENT_ID
MAGALU_CLIENT_SECRET
MAGALU_REDIRECT_URI
MAGALU_KOMMO_CHANNEL_ID
MAGALU_KOMMO_CHANNEL_SECRET
MAGALU_KOMMO_SCOPE_ID
```
</details>

## Segurança e confiabilidade

- **Verificação de assinatura** em toda notificação recebida — HMAC-SHA256 para Shopee, HMAC-SHA1 para Kommo — antes de qualquer processamento.
- **Confirmação antes de marcar como processado**: uma mensagem só é registrada como concluída após confirmação de sucesso no envio ao destino; falhas transitórias permitem reprocessamento em vez de perda silenciosa.
- **Proxy de anexos com allowlist**: `/meli/anexo/:arquivo` só serve arquivos previamente registrados por uma mensagem real processada pelo sistema, prevenindo uso como proxy aberto.
- **Deduplicação** por `message_id`, com trava em memória para notificações reentregues em rajada pelo marketplace de origem.

## Fontes (Sources) no Kommo

Para que um canal apareça isoladamente no filtro "Chat sources" do Kommo, o `manifest.json` do respectivo widget precisa declarar `"lead_sources"` em `locations`, com a integração devidamente instalada. O Kommo cria automaticamente a fonte vinculada ao canal nesse processo — criação manual via API de Sources tende a gerar duplicidade e não é recomendada.

## Pendências conhecidas

- **Magalu** — instalação do widget trava em loop (reportado ao suporte Kommo); canal de mensagens já operacional.
- **Amazon** — pausado, aguardando acesso ao Seller Central. A API oficial da Amazon não permite responder mensagens de comprador; a rota planejada é via e-mail (endereço de "Buyer Messages" apontando para o canal de e-mail nativo do Kommo), não via integração de API.
- **Shopee** — mensagens do tipo `sticker` exibidas como texto (`[figurinha]`); a Shopee não expõe URL pública para o asset.

## Scripts utilitários

Scripts de configuração pontual, executados manualmente via shell do ambiente de produção — não fazem parte do fluxo em tempo de execução:

| Script | Uso |
|---|---|
| `conectar.mjs`, `conectarMeli.mjs`, `conectarMagalu.mjs` | Vincula um canal recém-registrado (ou reconectado) à conta Kommo, obtendo o `scope_id` |
| `desconectarMeli.mjs` | Desvincula o canal, quando necessário reprocessar a conexão |
| `inscreverMagalu.mjs` | Inscreve os webhooks do Magalu (perguntas e chat) |

---

## Autoria

Desenvolvido e mantido por Ariane Sanga para a Guedes Alumínio.
