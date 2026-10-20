import { Outlet, createFileRoute } from '@tanstack/react-router';

// A área logada depende do cookie de sessão da API e não precisa de SEO:
// renderiza só no navegador.
export const Route = createFileRoute('/$locale/app')({
  ssr: false,
  component: Outlet,
});
