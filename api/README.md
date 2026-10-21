# amicats-api

Backend da plataforma Amicats: contas e cargos, gestão dos gatos do abrigo (fotos, tags, histórico de saúde) e catálogo público consumido pelo site, que fica na raiz deste repositório.

> A API vive na pasta `api/` do repositório `amicats.org` (trazida com `git subtree`, histórico preservado). Rode todos os comandos abaixo **dentro de `api/`**.

**Stack:** Node 22, TypeScript, Fastify 5, Prisma 6, PostgreSQL 16, zod 4, Vitest.

Vocabulário do domínio em [`GLOSSARY.md`](./GLOSSARY.md). Decisões de arquitetura em [`docs/adr/`](./docs/adr/).

## Rodando localmente

```bash
cd api
nvm use                     # Node 22 (.nvmrc)
npm ci
cp .env.example .env        # ajuste se precisar
docker compose up -d        # Postgres em localhost:5433
npm run db:migrate          # aplica as migrations
npm run db:seed             # adm inicial + tags de doenças + os 20 gatos do site
npm run dev                 # http://localhost:3333 · docs em http://localhost:3333/docs
```

O adm inicial usa `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA` do `.env`. Sem `RESEND_API_KEY`, os e-mails (convite, redefinição de senha) não são enviados: o conteúdo, com o link, aparece no log da API.

### Banco temporário (testes manuais)

Para testar sem mexer no banco de desenvolvimento, use um Postgres descartável (dados em memória, apagados ao parar), já com migrations e seed:

```bash
npm run db:temp                                                   # sobe na porta 5434
DATABASE_URL=postgresql://amicats:amicats@localhost:5434/amicats npm run dev
npm run db:temp:stop                                              # apaga tudo
```

## Testes

```bash
docker compose up -d
npm test
```

Os testes sobem o app com `app.inject()` contra o banco `amicats_test` (criado e migrado automaticamente a partir de `.env.test`), com e-mail e storage falsos. Rotas internas novas devem entrar na matriz de `src/plugins/permissoes.test.ts`.

## Cargos

| Cargo        | Quem é               | Pode                                                                                                                  |
| ------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `adm`        | administração da ONG | tudo, incluindo gerenciar contas, cargos e tags, excluir gatos e corrigir/excluir gastos                              |
| `voluntario` | voluntário do abrigo | cadastrar e editar gatos, fotos, tags do gato, histórico de saúde, medicação e veterinário, e lançar gastos           |
| `cliente`    | público              | ver o catálogo, apadrinhar gatos e acompanhar os gastos, editar a própria conta (e, na próxima fase, assinar o clube) |

Os cargos são em camadas (adm ⊃ voluntário ⊃ cliente): voluntários e adms também podem fazer tudo o que um cliente faz.

## Estrutura

```txt
src/
  app.ts            # buildApp(deps): plugins, hooks e módulos (usado pelos testes)
  server.ts         # liga as dependências reais e sobe o servidor
  env.ts            # variáveis de ambiente validadas com zod
  domain/           # regras puras (cargos, gato)
  lib/              # adapters: senha, tokens, mailer (Resend), storage (B2/S3)
  plugins/auth.ts   # sessão por cookie → request.usuario, exigirCargo()
  modules/          # auth, users, gatos, tags, saude, fotos, gastos, apadrinhamentos, medicacao, notificacoes, clube, publico
prisma/             # schema, migrations e seed
test/               # setup do Vitest e helpers (fakes, login)
```

## Apadrinhamento

- Qualquer conta (de qualquer cargo) apadrinha um gato publicado que ainda esteja no abrigo. Não há limite de padrinhos por gato.
- **Parte do padrinho** no mês = total de gastos do gato no mês ÷ padrinhos do mês (apadrinhamentos ativos em algum dia do mês), arredondado ao centavo.
- **Estimativa de custo** = média mensal dos gastos nos últimos 3 meses completos (aparece no catálogo público junto com o número de padrinhos).
- **Pagamento da parte** (`POST /apadrinhamentos/:id/pagamentos`, corpo `{ mes }`): só o próprio padrinho, só meses fechados (o mês corrente ainda recebe gastos). Cria um checkout de pagamento único do Mercado Pago (Checkout Pro: pix, cartão ou boleto) com o valor que **falta pagar** no mês e devolve o `init_point`. Clicar de novo reaproveita o checkout ainda aberto com o mesmo valor.
- **Falta pagar** = parte do mês − pagamentos aprovados do mês (nunca negativo). Se entrar um gasto depois do pagamento, aparece só a diferença; pagamento a mais não vira crédito.
- **Status do pagamento:** pelo webhook (tópico _Pagamentos_) e, como no Clube, consultando o Mercado Pago ao abrir o extrato do mês enquanto houver pagamento pendente (checkouts com até 30 dias). Uma tentativa recusada não desfaz um pagamento já aprovado; estorno devolve o valor para "falta pagar".
- **Aviso mensal:** a verificação de pendências avisa cada padrinho, uma vez por mês, do valor da parte do mês que acabou de fechar. Pagamento aprovado avisa os adms.

## Medicação e veterinário

- **Prescrição:** dose, via, intervalo em horas, primeira dose e (opcional) última dose. Sem fim = uso contínuo. "Interromper" corta as doses futuras.
- **Remédios do dia** (`GET /medicacao/agenda?dia=AAAA-MM-DD`): as doses previstas são calculadas a partir da primeira dose, no horário do abrigo (Campo Grande, UTC-4), e não ficam gravadas no banco. Só a aplicação (dose dada ou pulada) é gravada, uma por dose prevista.
- **Retornos** (`GET /veterinario/retornos?dias=30`): eventos com data de retorno atrasada (até 60 dias) ou nos próximos dias, de gatos que ainda estão no abrigo.

## Notificações

- **Na hora:** gasto lançado avisa os padrinhos ativos do gato; novo apadrinhamento avisa os adms.
- **Verificação de pendências** (`POST /tarefas/verificar-pendencias`, header `x-tarefa-token: $TAREFAS_TOKEN`):
  - avisa voluntários e adms de doses com mais de 30 min de atraso e de retornos atrasados ou nos próximos 2 dias (cada aviso uma única vez);
  - avisa cada padrinho do valor da parte do mês anterior, se ainda houver algo a pagar (uma vez por mês);
  - envia o **resumo por e-mail** (no máximo 1 por dia por pessoa) com as notificações não lidas, para quem não desligou a opção em "Minha conta".
- **Em produção**, agende a chamada a cada 15 minutos (Cloud Scheduler, cron, etc.):
  `curl -X POST -H "x-tarefa-token: $TAREFAS_TOKEN" https://api.amicats.org/tarefas/verificar-pendencias`
- **Local:** com a API rodando, `npm run tarefas:pendencias`.

## Clube Amicats (Mercado Pago)

- **Faixas** (`/clube/planos`): valores mensais fixos mantidos pelo adm. O seed cria Amigo (R$ 20), Protetor (R$ 50) e Guardião (R$ 100). Mudar o valor de uma faixa não afeta quem já assina: a assinatura guarda o valor da adesão.
- **Assinar** (`POST /clube/assinaturas`): cria uma assinatura sem plano associado (`POST /preapproval`, `status: pending`) e devolve o `init_point`. O site redireciona para o checkout do Mercado Pago, e **o cartão nunca passa pela API**.
- **Status:** chega por dois caminhos. O webhook atualiza ativação, pausa, cancelamento e cada cobrança. Além disso, `GET /clube/minha` consulta o Mercado Pago quando a assinatura ainda está pendente (cobre o retorno do checkout e ambientes sem webhook).
- **Webhook:** `POST /webhooks/mercadopago`, tópicos _Planos e assinaturas_ (Clube) e _Pagamentos_ (parte do padrinho; cobranças do Clube também chegam como `payment` e são ignoradas por não terem pagamento correspondente). A assinatura `x-signature` é validada com HMAC-SHA256 (`MP_WEBHOOK_SECRET`), com tolerância de 15 min contra reenvio. O aviso nunca é usado como verdade: a API sempre consulta o Mercado Pago.

### Configuração

1. No painel do Mercado Pago (Suas integrações), crie a aplicação e copie o **Access Token** para `MP_ACCESS_TOKEN`. Use as credenciais de teste antes das de produção.
2. Em **Webhooks**, cadastre `https://api.amicats.org/webhooks/mercadopago`, marque os eventos de **assinaturas** e de **pagamentos** e copie a **assinatura secreta** para `MP_WEBHOOK_SECRET`.
3. Sem `MP_ACCESS_TOKEN`, as rotas de pagamento respondem 503.

> ⚠️ Ainda não validado com credenciais reais: a integração foi feita com base nos tipos do SDK oficial e na documentação de webhooks, e testada com um gateway falso. No primeiro teste com credenciais de teste, confira em especial se o Mercado Pago exige que o e-mail da conta de quem paga seja igual ao `payer_email` enviado.

### Desenvolvimento sem credenciais

Com `MP_SIMULADO=true` no `.env`, a API usa um Mercado Pago de mentira. O "checkout" é uma página da própria API (`/dev/mercadopago/checkout/:id`) com o botão "Simular pagamento aprovado", que ativa a assinatura e registra a cobrança (ou, no pagamento da parte do padrinho, aprova o pagamento) e volta para o site. Os dados do simulador ficam em memória. A API se recusa a subir com `MP_SIMULADO=true` em produção.

### Caixa de e-mails de desenvolvimento

Com `CAIXA_DEV=true`, os e-mails (convites, redefinição de senha, resumo diário) ficam guardados em memória e podem ser lidos em `GET /dev/emails?para=<e-mail>`. É o que os testes ponta a ponta do site (`npm run e2e`, na raiz) usam para seguir links de convite. Assim como o simulador, é proibido em produção.

## Fotos (Backblaze B2)

O navegador envia o arquivo direto para o bucket:

1. `POST /gatos/:id/fotos/upload-url` devolve uma URL pré-assinada, válida por 10 minutos.
2. O navegador faz `PUT` do arquivo nessa URL.
3. `POST /gatos/:id/fotos` com a `key` registra a foto.

O bucket precisa de uma regra de CORS que libere `PUT` vindo da origem do site. Sem as variáveis `S3_*`, as rotas de upload respondem 503.

## Deploy

- **Banco:** Postgres gerenciado (ex.: Neon). Use a connection string com `sslmode=require` em `DATABASE_URL`.
- **API:** a imagem do `Dockerfile` aplica as migrations pendentes ao iniciar e sobe na porta `PORT`. Roda em Cloud Run, Render, Railway ou similar.
- **Produção:** configure `WEB_ORIGIN=https://amicats.org`, `COOKIE_DOMAIN=.amicats.org` e `COOKIE_SECURE=true`, e publique a API em `api.amicats.org`. O cookie depende de site e API estarem no mesmo domínio (ver ADR 0001).
