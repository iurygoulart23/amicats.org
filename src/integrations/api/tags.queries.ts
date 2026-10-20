import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type { Tag } from './types';

export const tagsQuery = queryOptions({
  queryKey: ['tags'],
  queryFn: () => api<Array<Tag>>('/tags'),
  staleTime: 5 * 60_000,
});

export function useSalvarTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }: Partial<Tag>) =>
      id
        ? api<Tag>(`/tags/${id}`, { method: 'PATCH', body: dados })
        : api<Tag>('/tags', { method: 'POST', body: dados }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagsQuery.queryKey }),
  });
}

export function useExcluirTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/tags/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tagsQuery.queryKey });
      void qc.invalidateQueries({ queryKey: ['gatos'] });
    },
  });
}
