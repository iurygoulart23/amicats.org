import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError, api } from './client';
import type { UsuarioLogado } from './types';

export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    try {
      return await api<UsuarioLogado>('/auth/me');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  staleTime: 60_000,
});

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { email: string; senha: string }) =>
      api<UsuarioLogado>('/auth/login', { method: 'POST', body: dados }),
    onSuccess: (me) => qc.setQueryData(meQuery.queryKey, me),
  });
}

export function useCadastro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: {
      nome: string;
      email: string;
      senha: string;
      telefone?: string;
    }) => api<UsuarioLogado>('/auth/cadastro', { method: 'POST', body: dados }),
    onSuccess: (me) => qc.setQueryData(meQuery.queryKey, me),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(meQuery.queryKey, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
    },
  });
}

export function useEsqueciSenha() {
  return useMutation({
    mutationFn: (email: string) =>
      api<void>('/auth/esqueci-senha', { method: 'POST', body: { email } }),
  });
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (dados: { token: string; senha: string }) =>
      api<void>('/auth/redefinir-senha', { method: 'POST', body: dados }),
  });
}

export function useEditarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: {
      nome?: string;
      telefone?: string | null;
      notificarPorEmail?: boolean;
    }) => api<UsuarioLogado>('/auth/me', { method: 'PATCH', body: dados }),
    onSuccess: (me) => qc.setQueryData(meQuery.queryKey, me),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (dados: { senhaAtual: string; novaSenha: string }) =>
      api<void>('/auth/trocar-senha', { method: 'POST', body: dados }),
  });
}
