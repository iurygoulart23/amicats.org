# Roadmap — Plataforma Amicats

Documento vivo. Atualize o status de cada item quando a feature for entregue e registre a entrega no [Histórico de entregas](#histórico-de-entregas).

**Legenda:** ⬜ a fazer · 🟨 em andamento · 🧪 implementado e testado, aguardando deploy · ✅ entregue (em produção) · ⏸️ em espera / depende de decisão

Repositório único (`amicats.org`):

- raiz: site institucional + área logada (TanStack Start)
- `api/`: backend (Fastify + Prisma + Postgres), trazido com `git subtree` e com o histórico preservado

---

## Fase 1 — Fundação + Gatos

### Backend (`api/`)

- 🧪 Estrutura do projeto: Fastify, TS, Prisma, docker-compose com Postgres, validação de env, healthcheck
- 🧪 Documentação OpenAPI em `/docs`
- 🧪 Modelo de dados: User, Session, PasswordResetToken, Gato, GatoFoto, Tag, GatoTag, RegistroSaude
- 🧪 Seed: adm inicial, tags de doenças comuns, migração dos 20 gatos que hoje estão fixos no site (descrições em inglês completadas)
- 🧪 Login com sessão em cookie httpOnly (argon2, rate limit)
- 🧪 Esqueci e redefinir senha (e-mail via Resend; falta: conta no Resend e domínio verificado)
- 🧪 Cargos e matriz de permissões: `adm` (gestão total), `voluntario` (cuida dos gatos, saúde e fotos), `cliente` = público (adota, vê os gatos, apadrinha, assina). Cargos em camadas: adm ⊃ voluntário ⊃ cliente, então voluntários e adms também podem apadrinhar e assinar
- 🧪 Autocadastro de cliente
- 🧪 Gestão de usuários e clientes (adm): criar, editar cargo, ativar/desativar, enviar convite
- 🧪 CRUD de gatos: nome, nascimento aproximado, sexo, status, castrado, descrição pt/en, observações internas, publicado
- 🧪 Fotos dos gatos com upload direto para o Backblaze B2 (URL pré-assinada), ordem e capa (falta: chave de aplicação do B2 e regra de CORS no bucket)
- 🧪 Tags (doença / comportamento / cuidado) vinculadas aos gatos
- 🧪 Histórico de saúde: doenças que o gato já teve ou tem, com datas e observações
- 🧪 Catálogo público `/public/gatos` (sem dados internos)
- 🧪 Testes de integração e de permissões

### Site (`amicats.org`)

- 🧪 Cliente da API (área logada renderiza só no navegador; catálogo público vem da API já no SSR)
- 🧪 Telas de login, cadastro de cliente, esqueci senha e redefinir senha (convite)
- 🧪 Layout da área logada `/app` com menu por cargo e proteção de rotas
- 🧪 Gestão de gatos: lista com filtros, cadastro e edição (dados, fotos, tags, saúde)
- 🧪 Gestão de pessoas e de tags (adm)
- 🧪 Minha conta
- 🧪 Catálogo da home lendo os gatos da API
- 🧪 Link "Entrar" / "Minha área" na navbar
- 🧪 Remover os demos do scaffold

### Infra

- 🧪 Dockerfile da API
- ⬜ Agendar `POST /tarefas/verificar-pendencias` a cada 15 min (Cloud Scheduler ou cron) com `TAREFAS_TOKEN`
- ⏸️ Hospedagem da API: Cloud Run, Render ou Railway (a decidir)
- ⬜ Banco Postgres no Neon (homolog e produção)
- ⬜ Domínio `api.amicats.org`

---

## Fase 2 — Apadrinhamento + Gestão do abrigo

- 🧪 Registro de gastos por gato: categoria, valor, data (voluntário lança; adm corrige/exclui). Comprovante anexado fica para depois
- 🧪 Estimativa de custo mensal por gato: média automática dos últimos 3 meses completos
- 🧪 Apadrinhamento sem limite de padrinhos por gato. A parte de cada um é o total de gastos do mês dividido igualmente entre os padrinhos do mês
- 🧪 Selo "apadrinhado" no card do gato (quando tem ao menos 1 padrinho)
- 🧪 Área do padrinho: meus apadrinhamentos, extrato mensal com os gastos e a sua parte, encerrar apadrinhamento. O "quanto falta pagar" depende do pagamento online (Fase 3)
- 🧪 Controle de medicamentos: prescrição (dose, via, de quantas em quantas horas, uso contínuo ou com fim), tela "Remédios do dia" no horário de Campo Grande, registro de dose dada ou pulada (com motivo), desfazer, interromper prescrição
- 🧪 Acompanhamento veterinário: consultas, vacinas, vermífugos, exames, cirurgias e castração com data de retorno; lista de retornos atrasados e dos próximos 30 dias
- 🧪 Notificações: sininho na área logada (gasto novo para o padrinho, novo padrinho para os adms, dose atrasada e retorno próximo para a equipe), página de notificações e resumo diário por e-mail (pode ser desligado em Minha conta). Doses e retornos dependem de agendar a chamada de `/tarefas/verificar-pendencias` a cada 15 min em produção
- ⏸️ Integração com o sistema interno que outra programadora está desenvolvendo, para não termos dois cadastros (alinhar com ela antes de começar)

## Fase 3 — Pagamentos (Mercado Pago)

- 🧪 Integração com Mercado Pago: adapter, webhook com assinatura `x-signature` validada, simulador para desenvolvimento. ⏸️ Falta: a ONG liberar o acesso de desenvolvedor da conta (credenciais de teste) para validar com o Mercado Pago de verdade
- 🧪 Clube Amicats: assinatura mensal no cartão em faixas fixas (R$ 20 / R$ 50 / R$ 100, editáveis pelo adm), com checkout na página do Mercado Pago
- 🧪 Assinante vê status, próxima cobrança e histórico de cobranças, e cancela pela plataforma. Trocar de faixa = cancelar e assinar de novo; trocar o cartão é feito no Mercado Pago
- ⬜ Pagamento dos gastos de apadrinhamento
- ⬜ Doações avulsas: pix, crédito, boleto
- ⬜ Histórico de pagamentos (cliente) e conciliação (adm)

## Fase 4 — Clube Amicats

- ⬜ Sorteios mensais entre assinantes ativos, com sorteio auditável
- ⬜ Cupons de desconto
- ⬜ Carteirinha digital de associado
- ⬜ Catálogo de parceiros: hotel de pet, petshop, clínica veterinária
- ⬜ Conteúdos digitais exclusivos: fotos, vídeos, vlog

## Fase 5 — Institucional, adoção e voluntariado

### Institucional

- ⬜ Home com certificado FOMENTA
- ⬜ Catálogo dos gatos com fotos e filtros por tags
- ⬜ Páginas: Adote, Resgate, Seja um voluntário, Contatos, Sobre
- ⬜ Certificados, com página de detalhamento de cada um
- ⬜ Blog, com gestão no painel administrativo
- ⬜ Portal da transparência (balancete contábil)

### Adoção

- ⬜ Formulário de adoção em etapas (stepper), substituindo o Google Forms
- ⬜ Acompanhamento das solicitações de adoção no painel

### Voluntariado

- ⬜ Escala de voluntários
- ⬜ Feedback e questionários
- ⬜ Fórum

### Doações

- ⏸️ Conta no banco Asaas (a definir junto com a Fase 3)

---

## Histórico de entregas

| Data       | Feature                                                                                                                                                                                     | Repositório | Observações                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-21 | Fase 3 (parte 1): Clube Amicats — faixas, assinatura via checkout do Mercado Pago, webhook, cobranças, cancelamento, painel de assinantes e receita mensal, simulador para desenvolvimento  | api/ + site | API 123 testes; fluxo E2E do clube com simulador (6 passos); falta validar com credenciais do Mercado Pago; ainda não publicado |
| 2026-10-20 | Fase 2 (parte 3): notificações (sininho, página, resumo diário por e-mail, verificação de pendências)                                                                                       | api/ + site | API 102 testes; fluxo E2E de notificações (5 passos); ainda não publicado                                                       |
| 2026-10-20 | Fase 2 (parte 2): medicação (prescrições, remédios do dia, doses dadas/puladas) e veterinário (eventos e retornos)                                                                          | api/ + site | API 92 testes; fluxo E2E de medicação (7 passos) + tela de celular conferida; ainda não publicado                               |
| 2026-10-20 | Fase 2 (parte 1): gastos por gato, apadrinhamento com divisão igual, estimativa de custo, selo, área do padrinho, botão Apadrinhe da home levando ao fluxo                                  | api/ + site | API 75 testes; site +5 testes; fluxo E2E de apadrinhamento (9 passos); ainda não publicado                                      |
| 2026-10-20 | Site Fase 1: área logada `/app` (login, cadastro, painel por cargo, gestão de gatos com fotos/tags/saúde, pessoas, tags, minha conta), catálogo da home vindo da API, link Entrar na navbar | site        | 12 testes novos + fluxo E2E com os 3 cargos; ainda não publicado                                                                |
| 2026-10-20 | Backend Fase 1: contas e cargos, autocadastro, gestão de usuários, gatos, fotos, tags, histórico de saúde, catálogo público, seed com os 20 gatos do site                                   | api/        | 57 testes; ainda não publicado                                                                                                  |

## Pendências conhecidas

- **SSR quebrado na `hom` (corrigido na branch da Fase 2):** o lockfile da `hom` tinha `@tanstack/router-core` 1.171 com `@tanstack/react-router-ssr-query` 1.157, e toda página renderizada no servidor dava erro 500 (`router.serverSsr?.isDehydrated is not a function`). Na `feat/fase-2-apadrinhamento` o `react-router-ssr-query` foi para ^1.167.3 e o `react-query`/devtools para ^5.102. Vale levar essa correção para a `hom` mesmo antes da Fase 2.

- **Lingui com versões misturadas na `hom`:** CLI, loader e plugin do Vite estão na v6, mas core, react e macro continuam na v5. As versões calculam os IDs das mensagens de jeito diferente: rodar `npm run lingui:extract` com o CLI v6 reescreve os catálogos e quebra traduções que já existiam (ex.: "Faça login"). Até alinhar tudo na mesma versão, edite os `.po` sem rodar o extract da v6.

- Carrossel de gatos da home (`gatos-carousel`) gera aviso de hidratação no SSR: o número de cards depende do `window` no primeiro render (já existia antes da API).
- 4 testes do site já falhavam antes da Fase 1 (footer, quero-ajudar, seja-um-parceiro): esperam textos/links que mudaram.
- **Ordem de deploy:** o catálogo da home agora vem da API. Publicar o site só depois da API estar no ar com o seed rodado, senão a seção de gatos fica vazia.
