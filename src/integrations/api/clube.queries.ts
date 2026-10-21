import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type {
  AssinaturasClube,
  MinhaAssinatura,
  PlanoClube,
  StatusAssinatura,
} from './types';

export const planosClubeQuery = (todas = false) =>
  queryOptions({
    queryKey: ['clube', 'planos', todas],
    queryFn: () =>
      api<Array<PlanoClube>>('/clube/planos', {
        query: { todas: todas || undefined },
      }),
  });

export const minhaAssinaturaQuery = queryOptions({
  queryKey: ['clube', 'minha'],
  queryFn: () => api<MinhaAssinatura | null>('/clube/minha'),
});

export const assinaturasClubeQuery = (status?: StatusAssinatura) =>
  queryOptions({
    queryKey: ['clube', 'assinaturas', status ?? 'todas'],
    queryFn: () =>
      api<AssinaturasClube>('/clube/assinaturas', { query: { status } }),
  });

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['clube'] });
}

/** Cria a assinatura e devolve o link do checkout do Mercado Pago. */
export function useAssinar() {
  return useMutation({
    mutationFn: (planoId: string) =>
      api<{ checkoutUrl: string }>('/clube/assinaturas', {
        method: 'POST',
        body: { planoId },
      }),
  });
}

export function useCancelarAssinatura() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () => api<void>('/clube/minha/cancelar', { method: 'POST' }),
    onSuccess: invalidar,
  });
}

export function useSalvarPlano() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...dados }: Partial<PlanoClube>) =>
      id
        ? api<PlanoClube>(`/clube/planos/${id}`, {
            method: 'PATCH',
            body: dados,
          })
        : api<PlanoClube>('/clube/planos', { method: 'POST', body: dados }),
    onSuccess: invalidar,
  });
}
