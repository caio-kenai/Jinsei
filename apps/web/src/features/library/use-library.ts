'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  statusLabels,
  type EntryPatchInput,
  type LibraryEntry,
  type LibraryResponse,
} from '@jinsei/contracts';
import { toast } from 'sonner';
import { api, jsonBody } from '@/lib/api';

export function useEntryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: EntryPatchInput }) =>
      api<LibraryEntry>(`/library/entries/${id}`, { method: 'PATCH', body: jsonBody(changes) }),
    onMutate: async ({ id, changes }) => {
      await client.cancelQueries({ queryKey: ['library'] });
      const snapshots = client.getQueriesData<LibraryResponse>({ queryKey: ['library'] });
      const previous =
        client.getQueryData<LibraryEntry>(['entry', id]) ??
        snapshots.flatMap(([, data]) => data?.items ?? []).find((entry) => entry.id === id);
      client.setQueriesData<LibraryResponse>({ queryKey: ['library'] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
            }
          : old,
      );
      return { snapshots, previousStatus: previous?.status };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => client.setQueryData(key, value));
      toast.error(error.message);
    },
    onSuccess: (entry, { changes }, context) => {
      client.setQueryData(['entry', entry.id], entry);
      // Progress can move the title to another status; say so when it was not chosen explicitly.
      if (changes.progress && !changes.status && context?.previousStatus !== entry.status)
        toast.success(`${entry.title} agora está em ${statusLabels[entry.status]}`);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
      void client.invalidateQueries({ queryKey: ['progression'] });
      void client.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
