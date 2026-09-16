# Operação e Transição — Conector Multi-Marketplace ↔ Kommo

> **Este documento não contém nenhuma credencial real.** Toda credencial fica em dois lugares: o painel de **Environment** do serviço no Render (fonte de verdade em produção) e um **gerenciador de senhas** da equipe (cópia de segurança). Este arquivo diz **onde encontrar** cada uma, não o valor dela.

## Sumário

- [1. Visão geral](#1-visão-geral)
- [2. Acessos necessários](#2-acessos-necessários)
- [3. Shopee](#3-shopee)
- [4. Mercado Livre](#4-mercado-livre)
- [5. Magalu](#5-magalu)
- [6. Conceitos gerais do Kommo](#6-conceitos-gerais-do-kommo)
- [7. Armadilhas conhecidas](#7-armadilhas-conhecidas)
- [8. Checklist de emergência](#8-checklist-de-emergência)
- [9. Glossário](#9-glossário)
- [10. Pendências abertas](#10-pendências-abertas)

## 1. Visão geral

Conector que centraliza mensagens de clientes (Shopee, Mercado Livre, Magalu) na caixa de entrada do Kommo, com resposta bidirecional. Ver `README.md` na raiz do repositório para detalhes técnicos de arquitetura e rotas.

| Onde | Local |
|---|---|
| Código | Este repositório, branch `main` |
| Hospedagem | Render — serviço `shopee-kommo-conector` |
| URL pública | `https://shopee-kommo-conector.onrender.com` |
| Painel de saúde | `https://shopee-kommo-conector.onrender.com/status` |
| Conta Kommo | `guedesaluminio355.kommo.com` |
| Todas as credenciais | Render → **Environment**, e cópia no gerenciador de senhas da equipe |

## 2. Acessos necessários

Para operar este projeto, solicite acesso a:

- **GitHub** — colaborador(a) neste repositório
- **Render** — membro da equipe/conta
- **Kommo** — login com permissão de administrador em `guedesaluminio355.kommo.com`
- **Shopee Open Platform** — painel de desenvolvedor, app "Guedes ERP"
- **Mercado Livre DevCenter** — `developers.mercadolivre.com.br`
- **ID Magalu** — `id.magalu.com`, **login com a conta jurídica da loja**, não pessoa física

## 3. Shopee

**Onde gerenciar:** Shopee Open Platform, app "Guedes ERP" (Seller In House System, gateway GLOBAL).

**Variáveis de ambiente** (valores no Render → Environment):
`SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_SHOP_ID`, `SHOPEE_PUSH_KEY`, `SHOPEE_CALLBACK_URL`, `SHOPEE_USER_ID`, `KOMMO_CHANNEL_ID`, `KOMMO_CHANNEL_SECRET`, `KOMMO_SCOPE_ID`, `KOMMO_AMOJO_ID`

> ⚠️ **`SHOPEE_PARTNER_KEY` expira em 31/12/2026.** Renovar no painel da Shopee Open Platform antes dessa data, ou toda a integração para.

O `access_token` expira a cada ~4h e é renovado automaticamente pelo código, desde que o `refresh_token` continue válido. Se for revogado, é necessário refazer a autorização OAuth do zero.

**Canal Kommo:** "Shopee Guedes". Script de reconexão: `conectar.mjs`.

## 4. Mercado Livre

**Onde gerenciar:** Mercado Livre DevCenter.

**Variáveis de ambiente:** `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `MELI_REDIRECT_URI`, `MELI_KOMMO_CHANNEL_ID`, `MELI_KOMMO_CHANNEL_SECRET`, `MELI_KOMMO_SCOPE_ID`

`access_token` expira em 6h, renovado automaticamente. Se o `refresh_token` for revogado, refazer a autorização visitando a URL de autorização do Mercado Livre.

**Canal Kommo:** "Mercado Livre Guedes". Script de reconexão: `conectarMeli.mjs`.

**Long-lived token** (para a API v4 do Kommo — Leads, Sources): gerado em Configurações → Central de Integrações → Private integrations → "Mercado Livre Guedes" → aba **Chaves e escopos** → botão **Gerar token de longa duração**. Necessário só para tarefas administrativas, não para o fluxo normal de mensagens.

> ⚠️ **Duplicidade de fontes:** existem duas fontes chamadas "Mercado Livre Guedes" no Kommo (uma automática, outra criada manualmente por script). Ao filtrar por "Chat sources" no Inbox, marque as duas. Não apague nenhuma sem antes confirmar via teste real (mensagem nova, nunca uma conversa reaproveitada) qual fonte está em uso — já aconteceu de apagar a errada e quebrar o filtro.

## 5. Magalu

**Onde gerenciar:** ID Magalu (`id.magalu.com`). Credenciais criadas via ferramenta de linha de comando **IDM** (`github.com/luizalabs/id-magalu-cli`).

> ⚠️ **Login sempre com a conta jurídica da loja** ("mugbrasil"), nunca pessoa física — já aconteceu de usar a conta errada e gerar credenciais sem permissão de vendedor.

**Variáveis de ambiente:** `MAGALU_CLIENT_ID`, `MAGALU_CLIENT_SECRET`, `MAGALU_REDIRECT_URI`, `MAGALU_KOMMO_CHANNEL_ID`, `MAGALU_KOMMO_CHANNEL_SECRET`, `MAGALU_KOMMO_SCOPE_ID`

`access_token` expira em 2h (mais curto que os outros), renovado automaticamente. Se o `refresh_token` expirar: baixar o IDM de novo (se necessário), `idm login`, refazer o consentimento OAuth.

**Canal Kommo:** "Magalu Guedes". Script de reconexão: `conectarMagalu.mjs`.

> ⚠️ **Pendência conhecida:** instalação do widget trava em loop de carregamento. Reportado ao suporte Kommo. O canal de mensagens funciona normalmente mesmo assim; só o filtro de fonte fica pendente.

## 6. Conceitos gerais do Kommo

| Termo | Onde encontrar |
|---|---|
| Subdomínio da conta | `guedesaluminio355` |
| Kommo Account ID (numérico) | Consultar gerenciador de senhas — usado dentro do `origin_code` de cada canal |
| ID da área de trabalho/usuário | Consultar gerenciador de senhas — usado ao registrar canal novo com o suporte |
| Amojo Account ID | Consultar gerenciador de senhas — mesmo valor para conectar qualquer canal novo desta conta |

**Channel Secret vs. Long-lived token:**
- **Channel Secret** — assina (HMAC) chamadas à Chats API (`amojo.kommo.com`). Faz o dia a dia de mensagens funcionar.
- **Long-lived token** — autentica chamadas à API v4 geral do Kommo (Leads, Contatos, Sources). Só necessário para tarefas administrativas.

**Registrar um canal novo** (processo com o suporte do Kommo):

1. Criar integração privada no Kommo (Central de Integrações → Private integrations → Criar integração), com upload de um widget (`.zip` com `manifest.json`, `script.js`, ícones e traduções — **o `manifest.json` precisa do bloco `tour` obrigatório**, ver Armadilhas)
2. Anotar o UUID da integração e o "Widget code" gerado
3. Abrir chamado com o suporte do Kommo pedindo registro de canal customizado (nome, URL do webhook, ID da conta, UUID, widget code, e um formulário de ~16 perguntas técnicas)
4. O suporte envia um arquivo `.txt` com `channel_id`, `secret_key` e `amojo_id` — usar para preencher as variáveis de ambiente
5. Rodar o script de conexão daquele canal para obter o `scope_id`
6. Colocar o `scope_id` na variável de ambiente correspondente

## 7. Armadilhas conhecidas

- **Reinstalar um widget sempre desconecta o canal de chat.** Sintoma: mensagens param, erro tipo `ORIGIN_ACCOUNT_ACCESS_DENIED` nos logs. Solução: rodar o script de reconexão do canal.
- **Nunca colar código JavaScript grande direto no Shell do Render.** É um terminal bash comum — comandos de uma linha muito longos (ex: um token JWT dentro de um `node -e "..."`) correm risco de corromper ao colar. Prefira sempre um arquivo `.mjs` rodado com `node arquivo.mjs`.
- **Sempre confirme que o deploy realmente aplicou a mudança.** Rode `cat arquivo.mjs` no Shell do Render antes de assumir que uma correção está no ar — já aconteceu do commit não "pegar" de verdade.
- **GitHub é para editar código; Shell do Render é só para rodar comandos.** Nunca cole código-fonte no Shell.
- **Fontes (Sources) do Kommo:** um Lead só recebe a fonte no momento da criação, nunca retroativamente. Ao investigar, sempre gere uma mensagem de teste **nova**, nunca reaproveite uma conversa existente.
- **Busca por texto (`?query=`) na API de Leads pode não achar o que se espera.** Prefira filtrar pelos mais recentes (`order[created_at]=desc`) e conferir manualmente.
- **O `manifest.json` do widget do Kommo exige um bloco `"tour"`** (com `is_tour: true` e ao menos uma imagem) — fácil de esquecer, e causa de um travamento de instalação real já enfrentado.

## 8. Checklist de emergência

1. Acesse `/status` e veja qual canal está com `token_valido` ou `canal_kommo_configurado` como `false`
2. Veja os **Logs** no painel do Render
3. Erro tipo `ORIGIN_ACCOUNT_ACCESS_DENIED` ou assinatura inválida → rode o script de reconexão daquele canal
4. Erro de autenticação do marketplace → pode ser necessário refazer o OAuth daquele marketplace
5. Suporte do Kommo é via chat, dentro da própria plataforma

## 9. Glossário

- **scope_id** — vincula um canal de chat a uma conta específica do Kommo
- **origin_code** — identifica um canal customizado dentro do Kommo
- **amojo_id** — ID da conta Kommo na Chats API
- **Channel Secret** — assina chamadas à Chats API
- **Long-lived token** — autentica chamadas à API v4 geral do Kommo
- **Source (fonte)** — identifica a origem de um Lead; controla o filtro "Chat sources"
- **Webhook** — notificação automática de um sistema para uma URL nossa

## 10. Pendências abertas

- **Magalu** — resolver o loop de instalação do widget; validar fluxo completo com primeiro cliente real
- **Mercado Livre** — resolver a duplicidade de fontes "Mercado Livre Guedes"
- **Amazon** — pausado, aguardando acesso ao Seller Central e caixa de e-mail dedicada; solução planejada é via e-mail de "Buyer Messages" apontando pro canal de e-mail nativo do Kommo, não API própria
- **Shopee** — mensagens do tipo "figurinha" continuam como texto (`[figurinha]`), pois a Shopee não expõe URL pública para o asset
