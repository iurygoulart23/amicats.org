import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/components/pages/landing';
import { publicGatosQuery } from '@/integrations/api/gatos.queries';

export const Route = createFileRoute('/$locale/')({
  // Busca o catálogo no SSR; se a API falhar a página carrega mesmo assim
  // e a seção de gatos tenta de novo no navegador.
  loader: ({ context }) => context.queryClient.prefetchQuery(publicGatosQuery),
  component: LocalizedLanding,
});

function LocalizedLanding() {
  return <LandingPage />;
}
