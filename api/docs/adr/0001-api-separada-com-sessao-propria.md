# API separada com sessão própria em cookie

O backend é um serviço próprio (Fastify + Prisma + Postgres), separado do site em TanStack Start, e a autenticação é feita pela própria API: senha com argon2id e sessão opaca guardada no banco, enviada num cookie httpOnly com `SameSite=Lax` no domínio `.amicats.org`. Fizemos assim para que a mesma API atenda o site, os webhooks do Mercado Pago e o sistema interno que outra programadora está desenvolvendo, sem pagar nem depender de um provedor de autenticação. A sessão fica no banco, e não em JWT, para podermos revogá-la na hora (desativar uma conta, trocar a senha).

## Consequences

- O site e a API precisam estar no mesmo "site" (`amicats.org` e `api.amicats.org`) para o cookie funcionar sem `SameSite=None`. Hospedar a API em outro domínio exige rever essa decisão.
- Outros sistemas que forem integrar devem usar chaves de serviço, não o cookie de sessão.

## Atualização (2026-10-20): mesmo repositório, pasta `api/`

Sem permissão para criar um repositório novo na organização, o código da API foi trazido para a pasta `api/` do repositório `amicats.org` com `git subtree`, mantendo o histórico. A decisão de fundo continua valendo: a API é um serviço separado (dependências, testes, Docker e deploy próprios) e o site a consome por HTTP. As ferramentas do site (tsc, Vitest, ESLint) ignoram `api/`.
