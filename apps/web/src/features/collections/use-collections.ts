'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CollectionDetail,
  CollectionInput,
  CollectionItemPatch,
  CollectionPatch,
  CollectionSummary,
} from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';

export function useCollections(entryId?: string) {
  return useQuery({
    queryKey: ['collections', entryId ?? 'all'],
    queryFn: () =>
      api<{ collections: CollectionSummary[] }>(
        `/collections${entryId ? `?entryId=${encodeURIComponent(entryId)}` : ''}`,
      ),
  });
}
export function useCollection(id: string) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: () => api<CollectionDetail>(`/collections/${id}`),
  });
}

/** Mutations of one collection; every result replaces the cached detail. */
export function useCollectionMutations(id?: string) {
  const client = useQueryClient();
  const done = (detail: CollectionDetail) => {
    client.setQueryData(['collection', detail.id], detail);
    void client.invalidateQueries({ queryKey: ['collections'] });
    void client.invalidateQueries({ queryKey: ['progression'] });
    void client.invalidateQueries({ queryKey: ['goals'] });
  };
  const onError = (error: Error) => toast.error(error.message);
  return {
    create: useMutation({
      mutationFn: (input: CollectionInput) =>
        api<CollectionDetail>('/collections', { method: 'POST', body: jsonBody(input) }),
      onSuccess: done,
      onError,
    }),
    update: useMutation({
      mutationFn: (input: CollectionPatch) =>
        api<CollectionDetail>(`/collections/${id}`, { method: 'PATCH', body: jsonBody(input) }),
      onSuccess: done,
      onError,
    }),
    remove: useMutation({
      mutationFn: () => api(`/collections/${id}`, { method: 'DELETE' }),
      onSuccess: () => void client.invalidateQueries({ queryKey: ['collections'] }),
      onError,
    }),
    addItem: useMutation({
      mutationFn: ({ collectionId, entryId }: { collectionId: string; entryId: string }) =>
        api<CollectionDetail>(`/collections/${collectionId}/items`, {
          method: 'POST',
          body: jsonBody({ entryId }),
        }),
      onSuccess: done,
      onError,
    }),
    updateItem: useMutation({
      mutationFn: ({ entryId, changes }: { entryId: string; changes: CollectionItemPatch }) =>
        api<CollectionDetail>(`/collections/${id}/items/${entryId}`, {
          method: 'PATCH',
          body: jsonBody(changes),
        }),
      onMutate: async ({ entryId, changes }) => {
        await client.cancelQueries({ queryKey: ['collection', id] });
        const previous = client.getQueryData<CollectionDetail>(['collection', id]);
        if (previous)
          client.setQueryData<CollectionDetail>(['collection', id], {
            ...previous,
            items: previous.items
              .map((item) => (item.entry.id === entryId ? { ...item, ...changes } : item))
              .sort((a, b) => a.position - b.position),
          });
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) client.setQueryData(['collection', id], context.previous);
        onError(error);
      },
      onSuccess: done,
    }),
    removeItem: useMutation({
      mutationFn: ({ collectionId, entryId }: { collectionId: string; entryId: string }) =>
        api<CollectionDetail>(`/collections/${collectionId}/items/${entryId}`, {
          method: 'DELETE',
        }),
      onSuccess: done,
      onError,
    }),
  };
}
