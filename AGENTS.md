# amicats.org — Agent Context

> Inherits all rules from [`../AGENTS.md`](../AGENTS.md).

> Module-level `AGENTS.md` files inherit from this root.
> They contain **only additions** — never duplicate rules stated here.

## Overview

Web app da Amicats (resgate animal, Campo Grande/MS). React 19 + TanStack Start (SSR/Nitro) + Tailwind v4/DaisyUI v5. Roteamento file-based via TanStack Router.

## Architecture references

- `README.md` — stack, estrutura de pastas, arquitetura geral
- `src/router.tsx` — criação do router + integração SSR Query
- `src/routes/__root.tsx` — HTML shell, head, providers

## Stack

| Library         | Context7 ID                 |
| --------------- | --------------------------- |
| TanStack Start  | `/websites/tanstack_start`  |
| TanStack Router | `/websites/tanstack_router` |
| TanStack Query  | `/tanstack/query`           |
| DaisyUI         | `/saadeghi/daisyui`         |
| Tailwind CSS    | `/tailwindlabs/tailwindcss` |

## Project structure

```txt
src/
├── routes/          # File-based routes (has own AGENTS.md)
├── components/      # UI components (has own AGENTS.md)
├── integrations/    # Third-party wiring (TanStack Query provider)
├── hooks/           # Custom hooks
├── data/            # Static/mock data
├── router.tsx       # Router factory
├── routeTree.gen.ts # GENERATED — do not edit
└── styles.css       # Tailwind + DaisyUI config
```

## Commands

| Action        | Command             |
| ------------- | ------------------- |
| Install       | `npm ci`            |
| Dev           | `npm run dev`       |
| Build         | `npm run build`     |
| Lint + format | `npm run check`     |
| Test          | `npm test`          |
| Storybook     | `npm run storybook` |

## Verification after edits

```bash
npm run check && npm run build
```

If tests exist: `npm run check && npm test && npm run build`

## Key conventions

- **Formatter**: Prettier (`semi: true`, `singleQuote: true`, `trailingComma: "all"`)
- **Linter**: ESLint with `@tanstack/eslint-config` (flat config)
- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`
- **Path alias**: `@/` → `./src/`

## Import ordering

1. External packages
2. `@/` absolute imports
3. Relative imports (`./`, `../`)
4. `import type` (type-only, always last)

## TypeScript rules

- `interface` for extending HTML attributes (e.g., `interface ButtonProps extends React.ButtonHTMLAttributes<...>`)
- `type` for unions and small shapes
- String literal unions over `enum`
- `Array<T>` preferred (follow existing files in same directory)
- `Record<K, V>` for lookup maps

## Naming

| What             | Convention                | Example                                 |
| ---------------- | ------------------------- | --------------------------------------- |
| Component dirs   | kebab-case + `index.tsx`  | `gato-card/index.tsx`                   |
| Co-located files | `<name>.<suffix>.ts`      | `button.types.ts`, `button.stories.tsx` |
| Components       | PascalCase                | `GatoCard`                              |
| Hooks            | camelCase + `use` prefix  | `useResponsiveVisibleCards`             |
| Constants        | UPPER_SNAKE_CASE          | `AUTO_PLAY_MS`                          |
| Types/Interfaces | PascalCase + Props suffix | `ButtonProps`                           |

## Exports

- Named exports for components and types
- Default exports only for config objects (eslint, prettier, storybook meta)

## UI/UX guidelines

- **Mobile-first**: write responsive classes starting from the smallest breakpoint. Use Tailwind's `sm:`, `md:`, `lg:` prefixes to scale up — never the other way around.
- **DaisyUI theming**: use DaisyUI semantic color classes (`bg-base-100`, `text-primary`, `btn-secondary`) instead of raw Tailwind colors (`bg-white`, `text-blue-500`). This ensures theme consistency across light/dark/emerald.
- **Themes**: configured in `src/styles.css` — `light`, `dark`, `emerald` (default). Do not hardcode color values.
- **Class merging**: always use `cn()` from `shared/helpers/class.helper.ts` when combining classes. Never concatenate class strings manually.
- **Spacing & layout**: use Tailwind spacing utilities (`p-4`, `gap-6`, `mx-auto`). Prefer `flex` and `grid` over absolute positioning.
- **Transitions**: use Tailwind transition utilities (`transition-all duration-300`) for hover/state changes. Keep animations subtle and purposeful.
- **Accessibility**: use semantic HTML elements, provide `alt` text for images, ensure interactive elements are keyboard-reachable.

## Error handling

- Defensive defaults: optional chaining, default parameters
- Never swallow exceptions silently
- No logging of secrets or PII

## Testing

- Co-locate tests: `button.test.tsx` next to `button/index.tsx`
- Use `@testing-library/react` + `vi` mocks from Vitest
- Mock network with msw or injected adapters

### Test policies for agents

- Always add or update tests when you change behavior or add UI. Tests are part of the change.
- Place tests co-located next to the component or module they exercise (`<name>.test.tsx` beside the implementation).
- Prefer Vitest in watch mode (`npm run test:watch`) for a TDD loop: write a failing test, implement until it passes, refactor.
- Before creating a PR, run the project validation command: `npm run check && npm test && npm run build`.
- If new test-related devDependencies are required (for example `@testing-library/jest-dom` or `@testing-library/user-event`), declare them in `package.json` under `devDependencies` and add or update the test setup file (see `.vitest.setup.ts` or `src/test/setup.ts`) so the library matchers and globals are configured.

## Backend (`api/`)

- A API fica em `api/`, com `package.json`, tsconfig, testes e `AGENTS.md` próprios. As ferramentas do site (tsc, Vitest, ESLint) ignoram essa pasta. Para validar a API: `cd api && npm run check && npm test`.

- Chamadas à API só via `api()` de `src/integrations/api/client.ts` e query options/mutations em `src/integrations/api/*.queries.ts`. Tipos em `types.ts` espelham o OpenAPI da API (`<API>/docs`).
- Área logada: rotas em `src/routes/$locale/app/` (`_painel` = layout protegido; `exigirLogin`/`exigirCargo` de `guards.ts` no `beforeLoad`). Componentes em `src/components/app/`.
- Cargos: `adm` ⊃ `voluntario` ⊃ `cliente` (público). Vocabulário em `api/GLOSSARY.md`.
- Roadmap vivo em `docs/ROADMAP.md`: atualize ao entregar uma feature.

## Generated files — do not edit

- `src/routeTree.gen.ts`
- `.output/`
- `.tanstack/`

## Do's

- Run `npm run check` before every commit
- Use `@/` for cross-module imports, relative for same subtree
- Use `import type` for type-only imports
- Create a branch per task, imperative commit messages (`docs: add AGENTS.md`)

## Don'ts

- Don't edit `routeTree.gen.ts` — it's auto-generated
- Don't commit `.env` files — secrets are gitignored
- Don't add global `console.log` in production code
- Don't use `enum` — use string literal unions
- Don't use default exports for components
- Don't add tooling (husky, lint-staged) without maintainer approval
- Don't use raw Tailwind colors (`bg-white`, `text-red-500`) — use DaisyUI semantic classes
- Don't use `style` attributes or CSS-in-JS — use Tailwind via `cn()`
