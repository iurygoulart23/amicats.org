# amicats.org

Site oficial, aplicativo para associados e painel administrativo da [Amicats](https://amicats.org) — organização de resgate animal localizada em Campo Grande/MS, Brasil.

## Stack

| Biblioteca                                     | Versão | Função                               |
| ---------------------------------------------- | ------ | ------------------------------------ |
| [React](https://react.dev)                     | 19     | UI                                   |
| [TanStack Start](https://tanstack.com/start)   | 1.x    | Framework full-stack (SSR via Nitro) |
| [TanStack Router](https://tanstack.com/router) | 1.x    | Roteamento file-based com tipagem    |
| [TanStack Query](https://tanstack.com/query)   | 5.x    | Data fetching e cache                |
| [TanStack Form](https://tanstack.com/form)     | 1.x    | Formulários                          |
| [TanStack Table](https://tanstack.com/table)   | 8.x    | Tabelas                              |
| [Tailwind CSS](https://tailwindcss.com)        | 4      | Estilização utility-first            |
| [DaisyUI](https://daisyui.com)                 | 5      | Componentes UI sobre Tailwind        |
| [Vite](https://vite.dev)                       | 7      | Build tool e dev server              |
| [Vitest](https://vitest.dev)                   | 3      | Testes                               |
| [Storybook](https://storybook.js.org)          | 10     | Desenvolvimento de componentes       |
| [Zod](https://zod.dev)                         | 4      | Validação de schemas                 |
| [TypeScript](https://www.typescriptlang.org)   | 5.7    | Tipagem estática (strict)            |

## Início Rápido

```bash
cd amicats.org
npm install
npm run dev        # http://localhost:3000
```

### Backend (`api/`)

O catálogo de gatos da home e a área logada (`/$locale/app`) consomem a API que fica em [`api/`](api/) neste mesmo repositório. Para rodar o site completo:

1. Suba a API seguindo o [README dela](api/README.md) (`cd api`, `docker compose up -d`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`).
2. Aqui, copie `.env.example` para `.env` e ajuste `VITE_API_URL` se a API não estiver em `http://localhost:3333`.
3. `npm run dev` e acesse `http://localhost:3000/pt-BR/app` (adm inicial: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA` do `.env` da API).

A área logada renderiza só no navegador (`ssr: false`) porque depende do cookie de sessão da API. O código de integração fica em `src/integrations/api/` e os componentes em `src/components/app/`. Roadmap da plataforma: [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Scripts Disponíveis

| Comando                   | Descrição                                   |
| ------------------------- | ------------------------------------------- |
| `npm run dev`             | Dev server (porta 3000)                     |
| `npm run build`           | Build de produção                           |
| `npm run preview`         | Preview do build                            |
| `npm test`                | Rodar testes (Vitest)                       |
| `npm run e2e`             | Testes ponta a ponta (Playwright, site+API) |
| `npm run e2e:ui`          | Testes ponta a ponta no modo interativo     |
| `npm run e2e:stop`        | Apaga o banco descartável do e2e            |
| `npm run lint`            | ESLint                                      |
| `npm run format`          | Prettier                                    |
| `npm run check`           | Prettier + ESLint autofix                   |
| `npm run storybook`       | Storybook (porta 6006)                      |
| `npm run build-storybook` | Build do Storybook                          |

## Estrutura do Projeto

```
amicats.org/
├── src/
│   ├── routes/                  # Rotas (file-based routing)
│   │   ├── __root.tsx           # Layout raiz (HTML shell, SSR)
│   │   ├── index.tsx            # "/" → Landing page
│   │   ├── landing/
│   │   │   ├── index.tsx        # "/landing/"
│   │   │   └── -components/     # Componentes exclusivos da rota
│   │   ├── app.tsx              # "/app" layout route
│   │   │   └── app/home/        # "/app/home"
│   │   └── not-found/           # Página 404
│   ├── components/
│   │   └── layout/
│   │       ├── daisy/           # Wrappers DaisyUI (Card, Button, Badge...)
│   │       ├── ui/              # Componentes de domínio (GatoCard, Carousel...)
│   │       └── shared/          # Helpers e tipos compartilhados
│   ├── integrations/
│   │   └── tanstack-query/      # Provider e devtools do React Query
│   ├── hooks/                   # Custom hooks
│   ├── data/                    # Dados estáticos / mock
│   ├── router.tsx               # Criação do router + SSR Query
│   ├── routeTree.gen.ts         # ⚠️ Gerado automaticamente — não editar
│   └── styles.css               # Tailwind + DaisyUI config
├── public/                      # Assets estáticos
├── .storybook/                  # Configuração do Storybook
├── vite.config.ts               # Vite + TanStack Start + Nitro + Tailwind
├── tsconfig.json                # TypeScript strict
├── eslint.config.js             # @tanstack/eslint-config
├── prettier.config.js           # semi: true, singleQuote: true
└── package.json
```

## Arquitetura

### SSR com TanStack Start + Nitro

A aplicação usa [TanStack Start](https://tanstack.com/start) com [Nitro](https://nitro.build) para server-side rendering. O `__root.tsx` define o HTML shell completo (`<html>`, `<head>`, `<body>`) e o router integra TanStack Query para hidratação de dados no servidor.

### Roteamento File-Based

Rotas são definidas como arquivos em `src/routes/` usando `createFileRoute`. O arquivo `src/routeTree.gen.ts` é gerado automaticamente pelo TanStack Router plugin — **nunca editar manualmente**.

Componentes exclusivos de uma rota ficam em pastas `-components/` dentro da rota (prefixo `-` faz o router ignorar a pasta).

### Estilização

- **Tailwind CSS v4** com plugin `@tailwindcss/vite`
- **DaisyUI v5** como plugin Tailwind (temas: light, dark, emerald como default)
- **`cn()`** — helper que combina `clsx` + `tailwind-merge` para merge seguro de classes
- **`createDaisyClassBuilder()`** — builder para classes DaisyUI com prefixo de componente

### Data Fetching

[TanStack Query](https://tanstack.com/query) com integração SSR via `setupRouterSsrQueryIntegration`. Provider e devtools em `src/integrations/tanstack-query/`.

## Storybook

Stories ficam ao lado dos componentes como `<nome>.stories.tsx` usando CSF3.

```bash
npm run storybook   # http://localhost:6006
```

## Testing

Testes usam Vitest como runner com o ecossistema Testing Library:

- Vitest (vitest) — runner e utilitários (vi)
- @testing-library/react — render + queries para componentes React
- @testing-library/jest-dom — assertions DOM customizados (toBeInTheDocument, etc.)
- @testing-library/user-event — eventos do usuário em testes
- jsdom — ambiente DOM para Vitest

Como rodar os testes:

```bash
npm ci
npm test            # executa a suíte (Vitest)
npm run test:watch  # modo watch — recomendado para TDD
```

Workflow TDD recomendado:

1. Abra os testes em modo watch: `npm run test:watch`.
2. Escreva um teste falhando que descreva o comportamento desejado (co-locar o teste junto ao componente, ex.: `button.test.tsx` ao lado do `button/index.tsx`).
3. Implemente o código mínimo para fazer o teste passar.
4. Refatore mantendo os testes verdes.

### Testes ponta a ponta (Playwright)

Os roteiros em `e2e/` percorrem os fluxos principais no navegador, com site e API de verdade: cargos e convite de voluntário, cadastro de gato e catálogo público, apadrinhamento, medicação e retornos veterinários, notificações e resumo por e-mail, e assinatura do Clube Amicats.

```bash
npx playwright install chromium   # só na primeira vez
npm run e2e                        # recria o banco e roda tudo
npm run e2e:stop                   # apaga o banco do e2e
```

Precisa de Docker. O ambiente é isolado e não usa os servidores de desenvolvimento: banco descartável na porta 5435, API na 3334 (com o simulador do Mercado Pago e a caixa de e-mails em memória, `CAIXA_DEV`) e site na 3001. As portas 3000 e 3333 podem continuar em uso. Em caso de falha, o relatório fica em `playwright-report/` (`npx playwright show-report`).

Comando final de validação (antes de abrir um PR / mesclar):

```bash
npm run check && npm test && npm run build
```

## Arquivos Gerados

Não editar manualmente:

- `src/routeTree.gen.ts` — gerado pelo TanStack Router
- `.output/` — artefatos de build do Nitro
- `.tanstack/` — arquivos temporários do router plugin

## Arquivos Demo

Arquivos com prefixo `demo` podem ser removidos com segurança. Existem apenas como ponto de partida para experimentação.

-
