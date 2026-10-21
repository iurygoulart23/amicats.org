import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type {
  Foto,
  Gato,
  GatoInput,
  GatoPublico,
  Paginado,
  RegistroSaude,
  StatusGato,
} from './types';

export const publicGatosQuery = queryOptions({
  queryKey: ['public', 'gatos'],
  queryFn: () =>
    api<Paginado<GatoPublico>>('/public/gatos', {
      query: { status: 'disponivel', porPagina: 100 },
    }),
  staleTime: 5 * 60_000,
});

export const publicGatoQuery = (slug: string) =>
  queryOptions({
    queryKey: ['public', 'gato', slug],
    queryFn: () => api<GatoPublico>(`/public/gatos/${slug}`),
  });

export type FiltrosGatos = {
  busca?: string;
  status?: StatusGato;
  tag?: string;
  pagina?: number;
};

export const gatosQuery = (filtros: FiltrosGatos) =>
  queryOptions({
    queryKey: ['gatos', 'lista', filtros],
    queryFn: () =>
      api<Paginado<Gato>>('/gatos', { query: { porPagina: 50, ...filtros } }),
  });

export const gatoQuery = (id: string) =>
  queryOptions({
    queryKey: ['gatos', 'detalhe', id],
    queryFn: () => api<Gato>(`/gatos/${id}`),
  });

export const saudeQuery = (gatoId: string) =>
  queryOptions({
    queryKey: ['gatos', 'saude', gatoId],
    queryFn: () => api<Array<RegistroSaude>>(`/gatos/${gatoId}/saude`),
  });

/** Atualiza o cache do gato e invalida as listas depois de qualquer alteração. */
function useAoAlterarGato() {
  const qc = useQueryClient();
  return (gato: Gato) => {
    qc.setQueryData(gatoQuery(gato.id).queryKey, gato);
    void qc.invalidateQueries({ queryKey: ['gatos', 'lista'] });
    void qc.invalidateQueries({ queryKey: ['public'] });
  };
}

export function useCriarGato() {
  const aoAlterar = useAoAlterarGato();
  return useMutation({
    mutationFn: (dados: GatoInput) =>
      api<Gato>('/gatos', { method: 'POST', body: dados }),
    onSuccess: aoAlterar,
  });
}

export function useEditarGato(id: string) {
  const aoAlterar = useAoAlterarGato();
  return useMutation({
    mutationFn: (dados: GatoInput) =>
      api<Gato>(`/gatos/${id}`, { method: 'PATCH', body: dados }),
    onSuccess: aoAlterar,
  });
}

export function useExcluirGato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/gatos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gatos'] }),
  });
}

export function useDefinirTagsDoGato(id: string) {
  const aoAlterar = useAoAlterarGato();
  return useMutation({
    mutationFn: (tags: Array<{ tagId: string; ativa: boolean }>) =>
      api<Gato>(`/gatos/${id}/tags`, { method: 'PUT', body: tags }),
    onSuccess: aoAlterar,
  });
}

function useRecarregarGato(id: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: gatoQuery(id).queryKey });
    void qc.invalidateQueries({ queryKey: ['gatos', 'lista'] });
    void qc.invalidateQueries({ queryKey: ['public'] });
  };
}

/** Pede a URL pré-assinada, envia o arquivo direto ao bucket e registra a foto. */
export function useEnviarFoto(gatoId: string) {
  const recarregar = useRecarregarGato(gatoId);
  return useMutation({
    mutationFn: async (arquivo: File) => {
      const { uploadUrl, key } = await api<{ uploadUrl: string; key: string }>(
        `/gatos/${gatoId}/fotos/upload-url`,
        { method: 'POST', body: { contentType: arquivo.type } },
      );
      const envio = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': arquivo.type },
        body: arquivo,
      });
      if (!envio.ok)
        throw new Error('Falha ao enviar a foto para o armazenamento.');
      return api<Foto>(`/gatos/${gatoId}/fotos`, {
        method: 'POST',
        body: { key },
      });
    },
    onSuccess: recarregar,
  });
}

export function useDefinirCapa(gatoId: string) {
  const recarregar = useRecarregarGato(gatoId);
  return useMutation({
    mutationFn: (fotoId: string) =>
      api<Foto>(`/gatos/${gatoId}/fotos/${fotoId}`, {
        method: 'PATCH',
        body: { capa: true },
      }),
    onSuccess: recarregar,
  });
}

export function useExcluirFoto(gatoId: string) {
  const recarregar = useRecarregarGato(gatoId);
  return useMutation({
    mutationFn: (fotoId: string) =>
      api<void>(`/gatos/${gatoId}/fotos/${fotoId}`, { method: 'DELETE' }),
    onSuccess: recarregar,
  });
}

export type RegistroSaudeInput = {
  titulo?: string;
  tagId?: string | null;
  dataInicio?: string;
  dataFim?: string | null;
  observacao?: string;
};

export function useSalvarRegistroSaude(gatoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }: RegistroSaudeInput & { id?: string }) =>
      id
        ? api<RegistroSaude>(`/gatos/${gatoId}/saude/${id}`, {
            method: 'PATCH',
            body: dados,
          })
        : api<RegistroSaude>(`/gatos/${gatoId}/saude`, {
            method: 'POST',
            body: dados,
          }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: saudeQuery(gatoId).queryKey }),
  });
}

export function useExcluirRegistroSaude(gatoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/gatos/${gatoId}/saude/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: saudeQuery(gatoId).queryKey }),
  });
}
