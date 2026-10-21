# amicats-api — Agent Context

Backend da plataforma Amicats, na pasta `api/` do repositório `amicats.org` (o site fica na raiz e tem o próprio `AGENTS.md`). Rode os comandos dentro de `api/`. Leia `README.md` (stack, comandos), `GLOSSARY.md` (vocabulário — use estes termos em código, testes e mensagens) e `docs/adr/`.

## Comandos

- Node 22: `source ~/.nvm/nvm.sh && nvm use` antes de qualquer comando
- Validação: `npm run check && npm test && npm run build` (precisa do `docker compose up -d`)

## Convenções

- Mesmas do site: Prettier (`semi`, `singleQuote`, `trailingComma: all`), sem `enum` (use `as const` + union, em `src/domain`), named exports, `import type` por último.
- Mensagens de erro para o usuário em pt-BR via `HttpError` (`src/lib/errors.ts`).
- Toda rota define `schema` zod (body/params/query/response) e `tags` para o OpenAPI.
- Permissão: `exigirCargo(cargo)` como hook `onRequest` (roda antes da validação). Rota nova → adicionar em `src/plugins/permissoes.test.ts`.
- Respostas públicas montam o objeto campo a campo (`toGatoPublico`): nunca expor `observacoes` nem saúde.
- Testes co-locados (`*.test.ts`), via `app.inject()` contra Postgres real; fakes de mailer/storage em `test/helpers.ts`. TDD: teste falhando primeiro.
- Não rode `prisma migrate reset` (destrutivo). Migrations novas: `npm run db:migrate -- --name <nome>`.
