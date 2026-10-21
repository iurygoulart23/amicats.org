import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type { Notificacao } from './types';

export const contagemNotificacoesQuery = queryOptions({
  queryKey: ['notificacoes', 'contagem'],
  queryFn: () => api<{ naoLidas: number }>('/notificacoes/contagem'),
  refetchInterval: 60_000,
});

export const notificacoesQuery = (limite = 50) =>
  queryOptions({
    queryKey: ['notificacoes', 'lista', limite],
    queryFn: () =>
      api<Array<Notificacao>>('/notificacoes', { query: { limite } }),
  });

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['notificacoes'] });
}

export function useMarcarLida() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/notificacoes/${id}/lida`, { method: 'POST' }),
    onSuccess: invalidar,
  });
}

export function useLerTodas() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () => api<void>('/notificacoes/ler-todas', { method: 'POST' }),
    onSuccess: invalidar,
  });
}
