import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type { CategoriaGasto, Gasto, GastosDoMes } from './types';

export const gastosQuery = (gatoId: string, mes: string) =>
  queryOptions({
    queryKey: ['gastos', gatoId, mes],
    queryFn: () =>
      api<GastosDoMes>(`/gatos/${gatoId}/gastos`, { query: { mes } }),
  });

export type GastoInput = {
  categoria: CategoriaGasto;
  descricao: string;
  valorCentavos: number;
  data: string;
};

function useInvalidarGastos(gatoId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['gastos', gatoId] });
    void qc.invalidateQueries({ queryKey: ['apadrinhamentos'] });
    void qc.invalidateQueries({ queryKey: ['public'] });
  };
}

export function useLancarGasto(gatoId: string) {
  const invalidar = useInvalidarGastos(gatoId);
  return useMutation({
    mutationFn: (dados: GastoInput) =>
      api<Gasto>(`/gatos/${gatoId}/gastos`, { method: 'POST', body: dados }),
    onSuccess: invalidar,
  });
}

export function useExcluirGasto(gatoId: string) {
  const invalidar = useInvalidarGastos(gatoId);
  return useMutation({
    mutationFn: (gastoId: string) =>
      api<void>(`/gatos/${gatoId}/gastos/${gastoId}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}
