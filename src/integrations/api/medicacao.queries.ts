import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type {
  AplicacaoDose,
  DosePrevista,
  EventoVet,
  Prescricao,
  Retorno,
  TipoEventoVet,
  Via,
} from './types';

export const prescricoesQuery = (gatoId: string) =>
  queryOptions({
    queryKey: ['medicacao', 'prescricoes', gatoId],
    queryFn: () => api<Array<Prescricao>>(`/gatos/${gatoId}/prescricoes`),
  });

export const agendaQuery = (dia: string) =>
  queryOptions({
    queryKey: ['medicacao', 'agenda', dia],
    queryFn: () =>
      api<Array<DosePrevista>>('/medicacao/agenda', { query: { dia } }),
    refetchInterval: 60_000,
  });

export const eventosVetQuery = (gatoId: string) =>
  queryOptions({
    queryKey: ['veterinario', 'eventos', gatoId],
    queryFn: () => api<Array<EventoVet>>(`/gatos/${gatoId}/veterinario`),
  });

export const retornosQuery = (dias = 30) =>
  queryOptions({
    queryKey: ['veterinario', 'retornos', dias],
    queryFn: () =>
      api<Array<Retorno>>('/veterinario/retornos', { query: { dias } }),
  });

export type PrescricaoInput = {
  medicamento: string;
  dose: string;
  via: Via;
  intervaloHoras: number;
  inicio: string;
  fim: string | null;
  prescritoPor: string | null;
  observacao: string;
};

function useInvalidarMedicacao() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['medicacao'] });
}

export function usePrescrever(gatoId: string) {
  const invalidar = useInvalidarMedicacao();
  return useMutation({
    mutationFn: (dados: PrescricaoInput) =>
      api<Prescricao>(`/gatos/${gatoId}/prescricoes`, {
        method: 'POST',
        body: dados,
      }),
    onSuccess: invalidar,
  });
}

export function useEncerrarPrescricao(gatoId: string) {
  const invalidar = useInvalidarMedicacao();
  return useMutation({
    mutationFn: (id: string) =>
      api<Prescricao>(`/gatos/${gatoId}/prescricoes/${id}/encerrar`, {
        method: 'POST',
      }),
    onSuccess: invalidar,
  });
}

export function useRegistrarDose() {
  const invalidar = useInvalidarMedicacao();
  return useMutation({
    mutationFn: (dados: {
      prescricaoId: string;
      horarioPrevisto: string;
      pulada?: boolean;
      observacao?: string;
    }) =>
      api<AplicacaoDose>('/medicacao/aplicacoes', {
        method: 'POST',
        body: dados,
      }),
    onSuccess: invalidar,
  });
}

export function useDesfazerDose() {
  const invalidar = useInvalidarMedicacao();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/medicacao/aplicacoes/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}

export type EventoVetInput = {
  tipo: TipoEventoVet;
  titulo: string;
  data: string;
  local: string | null;
  observacao: string;
  proximaData: string | null;
};

function useInvalidarVet() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['veterinario'] });
}

export function useSalvarEventoVet(gatoId: string) {
  const invalidar = useInvalidarVet();
  return useMutation({
    mutationFn: ({ id, ...dados }: EventoVetInput & { id?: string }) =>
      id
        ? api<EventoVet>(`/gatos/${gatoId}/veterinario/${id}`, {
            method: 'PATCH',
            body: dados,
          })
        : api<EventoVet>(`/gatos/${gatoId}/veterinario`, {
            method: 'POST',
            body: dados,
          }),
    onSuccess: invalidar,
  });
}

export function useExcluirEventoVet(gatoId: string) {
  const invalidar = useInvalidarVet();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/gatos/${gatoId}/veterinario/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}
