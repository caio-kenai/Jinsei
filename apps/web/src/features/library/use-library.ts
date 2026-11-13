'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { EntryPatchInput, LibraryEntry, LibraryResponse } from '@jinsei/contracts';
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
      client.setQueriesData<LibraryResponse>({ queryKey: ['library'] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
            }
          : old,
      );
      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => client.setQueryData(key, value));
      toast.error(error.message);
    },
    onSuccess: (entry) => client.setQueryData(['entry', entry.id], entry),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
