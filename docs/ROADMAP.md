# Roadmap — Plataforma Amicats

Documento vivo. Atualize o status de cada item quando a feature for entregue e registre a entrega no [Histórico de entregas](#histórico-de-entregas).

**Legenda:** ⬜ a fazer · 🟨 em andamento · 🧪 implementado e testado, aguardando deploy · ✅ entregue (em produção) · ⏸️ em espera / depende de decisão

Repositórios:

- `amicats.org`: site institucional + área logada (TanStack Start)
- `amicats-api`: backend (Fastify + Prisma + Postgres)

---

## Fase 1 — Fundação + Gatos

### Backend (`amicats-api`)

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
- ⏸️ Hospedagem da API: Cloud Run, Render ou Railway (a decidir)
- ⬜ Banco Postgres no Neon (homolog e produção)
- ⬜ Domínio `api.amicats.org`

---

## Fase 2 — Apadrinhamento + Gestão do abrigo

- ⬜ Registro de gastos por gato: categoria, valor, data, comprovante
- ⬜ Estimativa de custo mensal por gato
- ⬜ Apadrinhamento total ou parcial (50%)
- ⬜ Selo "apadrinhado" no card do gato
- ⬜ Área do padrinho (cliente): gastos do seu gato e quanto falta pagar
- ⬜ Controle de medicamentos: prescrição, agenda, registro de aplicação
- ⬜ Acompanhamento veterinário: consultas, exames, vacinas
- ⬜ Notificações visíveis na plataforma (sininho) e por e-mail
- ⏸️ Integração com o sistema interno que outra programadora está desenvolvendo, para não termos dois cadastros (alinhar com ela antes de começar)

## Fase 3 — Pagamentos (Mercado Pago)

- ⬜ Integração com Mercado Pago: credenciais e webhooks assinados
- ⬜ Clube Amicats: assinatura recorrente (Preapproval) no cartão, com o assinante escolhendo o valor, mensal ou anual
- ⬜ Assinante pode gerenciar a assinatura: trocar valor ou cartão, cancelar
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

| Data       | Feature                                                                                                                                                                                     | Repositório | Observações                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| 2026-10-20 | Site Fase 1: área logada `/app` (login, cadastro, painel por cargo, gestão de gatos com fotos/tags/saúde, pessoas, tags, minha conta), catálogo da home vindo da API, link Entrar na navbar | amicats.org | 12 testes novos + fluxo E2E com os 3 cargos; ainda não publicado |
| 2026-10-20 | Backend Fase 1: contas e cargos, autocadastro, gestão de usuários, gatos, fotos, tags, histórico de saúde, catálogo público, seed com os 20 gatos do site                                   | amicats-api | 57 testes; ainda não publicado                                   |

## Pendências conhecidas

- **Lingui com versões misturadas na `hom`:** CLI, loader e plugin do Vite estão na v6, mas core, react e macro continuam na v5. As versões calculam os IDs das mensagens de jeito diferente: rodar `npm run lingui:extract` com o CLI v6 reescreve os catálogos e quebra traduções que já existiam (ex.: "Faça login"). Até alinhar tudo na mesma versão, edite os `.po` sem rodar o extract da v6.

- Carrossel de gatos da home (`gatos-carousel`) gera aviso de hidratação no SSR: o número de cards depende do `window` no primeiro render (já existia antes da API).
- 4 testes do site já falhavam antes da Fase 1 (footer, quero-ajudar, seja-um-parceiro): esperam textos/links que mudaram.
- **Ordem de deploy:** o catálogo da home agora vem da API. Publicar o site só depois da API estar no ar com o seed rodado, senão a seção de gatos fica vazia.
