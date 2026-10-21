import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type {
  Conciliacao,
  Pagamento,
  StatusPagamento,
  TipoPagamento,
} from './types';

export const meusPagamentosQuery = queryOptions({
  queryKey: ['pagamentos', 'meus'],
  queryFn: () => api<{ itens: Array<Pagamento> }>('/pagamentos/meus'),
});

export type FiltroConciliacao = {
  tipo?: TipoPagamento;
  status?: StatusPagamento;
  /** AAAA-MM */
  mes?: string;
};

export const conciliacaoQuery = (filtro: FiltroConciliacao) =>
  queryOptions({
    queryKey: ['pagamentos', 'conciliacao', filtro],
    queryFn: () => api<Conciliacao>('/pagamentos', { query: filtro }),
  });

/** Reconsulta no Mercado Pago os pagamentos pendentes (webhook perdido ou atrasado). */
export function useConciliar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ consultados: number; atualizados: number }>(
        '/pagamentos/conciliar',
        { method: 'POST' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pagamentos'] }),
  });
}
