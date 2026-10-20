import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type { Cargo, Paginado, Usuario } from './types';

export type FiltrosUsuarios = {
  cargo?: Cargo;
  busca?: string;
  pagina?: number;
};

export const usuariosQuery = (filtros: FiltrosUsuarios) =>
  queryOptions({
    queryKey: ['users', 'lista', filtros],
    queryFn: () =>
      api<Paginado<Usuario>>('/users', {
        query: { porPagina: 50, ...filtros },
      }),
  });

export const usuarioQuery = (id: string) =>
  queryOptions({
    queryKey: ['users', 'detalhe', id],
    queryFn: () => api<Usuario>(`/users/${id}`),
  });

export type UsuarioInput = {
  nome?: string;
  email?: string;
  cargo?: Cargo;
  telefone?: string | null;
  ativo?: boolean;
};

export function useSalvarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }: UsuarioInput & { id?: string }) =>
      id
        ? api<Usuario>(`/users/${id}`, { method: 'PATCH', body: dados })
        : api<Usuario>('/users', { method: 'POST', body: dados }),
    onSuccess: (user) => {
      qc.setQueryData(usuarioQuery(user.id).queryKey, user);
      void qc.invalidateQueries({ queryKey: ['users', 'lista'] });
    },
  });
}

export function useEnviarConvite() {
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/users/${id}/enviar-convite`, { method: 'POST' }),
  });
}
