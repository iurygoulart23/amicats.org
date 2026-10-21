import { queryOptions, useMutation } from '@tanstack/react-query';
import { api } from './client';
import type { Doacao } from './types';

export const doacaoQuery = (id: string) =>
  queryOptions({
    queryKey: ['doacoes', id],
    queryFn: () => api<Doacao>(`/doacoes/${id}`),
  });

export type NovaDoacao = {
  valorCentavos: number;
  /** Obrigatórios sem login; com login, vale o da conta */
  nome?: string;
  email?: string;
};

/** Cria a doação e devolve o link do checkout do Mercado Pago. */
export function useDoar() {
  return useMutation({
    mutationFn: (doacao: NovaDoacao) =>
      api<{ id: string; checkoutUrl: string }>('/doacoes', {
        method: 'POST',
        body: doacao,
      }),
  });
}
