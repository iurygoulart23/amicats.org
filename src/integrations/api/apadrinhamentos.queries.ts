import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type { Apadrinhamento, Extrato, Padrinho } from './types';

export const meusApadrinhamentosQuery = queryOptions({
  queryKey: ['apadrinhamentos', 'meus'],
  queryFn: () => api<Array<Apadrinhamento>>('/apadrinhamentos/meus'),
});

export const extratoQuery = (id: string, mes?: string) =>
  queryOptions({
    queryKey: ['apadrinhamentos', 'extrato', id, mes ?? 'atual'],
    queryFn: () =>
      api<Extrato>(`/apadrinhamentos/${id}/extrato`, { query: { mes } }),
  });

export const padrinhosQuery = (gatoId: string) =>
  queryOptions({
    queryKey: ['apadrinhamentos', 'padrinhos', gatoId],
    queryFn: () => api<Array<Padrinho>>(`/gatos/${gatoId}/padrinhos`),
  });

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['apadrinhamentos'] });
    void qc.invalidateQueries({ queryKey: ['public'] });
  };
}

export function useApadrinhar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (gato: { gatoId: string } | { slug: string }) =>
      api<{ id: string }>('/apadrinhamentos', { method: 'POST', body: gato }),
    onSuccess: invalidar,
  });
}

export function useEncerrarApadrinhamento() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/apadrinhamentos/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}

/** Cria o checkout do Mercado Pago para a parte de um mês fechado. */
export function usePagarParte(apadrinhamentoId: string) {
  return useMutation({
    mutationFn: (mes: string) =>
      api<{ checkoutUrl: string }>(
        `/apadrinhamentos/${apadrinhamentoId}/pagamentos`,
        { method: 'POST', body: { mes } },
      ),
  });
}
