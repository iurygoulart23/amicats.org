import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdoteSection } from './index';
import type { GatoPublico, Paginado } from '@/integrations/api/types';
import { publicGatosQuery } from '@/integrations/api/gatos.queries';

vi.mock('@/components/layout/ui/gatos-carousel', () => ({
  GatosCarouselComponent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const elvis: GatoPublico = {
  slug: 'elvis',
  nome: 'Elvis',
  dataNascimentoAprox: null,
  precisaoNascimento: 'ano',
  sexo: 'macho',
  status: 'disponivel',
  castrado: true,
  descricaoPt: 'O rei do rock felino.',
  descricaoEn: 'The feline king of rock.',
  fotos: [
    { id: 'f2', url: 'https://cdn.test/outra.jpg', ordem: 1, capa: false },
    { id: 'f1', url: 'https://cdn.test/capa.jpg', ordem: 0, capa: true },
  ],
  tags: [],
};

function renderizar(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AdoteSection images={[]} />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe('AdoteSection', () => {
  // O setup de testes ativa o locale en.
  it('mostra os gatos do catálogo público com a foto de capa e a descrição no idioma do site', () => {
    const qc = new QueryClient();
    qc.setQueryData<Paginado<GatoPublico>>(publicGatosQuery.queryKey, {
      itens: [elvis],
      total: 1,
      pagina: 1,
      porPagina: 100,
    });

    renderizar(qc);

    expect(screen.getByText('Elvis')).toBeInTheDocument();
    expect(screen.getByText('The feline king of rock.')).toBeInTheDocument();
    // Img renderiza uma versão mobile e outra desktop.
    for (const img of screen.getAllByAltText('Elvis')) {
      expect(img).toHaveAttribute('src', 'https://cdn.test/capa.jpg');
    }
  });

  it('avisa quando o catálogo não carrega', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    renderizar(qc);

    expect(
      await screen.findByText(/couldn't load the kitties right now/),
    ).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
