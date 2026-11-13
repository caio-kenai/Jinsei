'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CurrentUser, PreferencesPatch } from '@jinsei/contracts';
import { toast } from 'sonner';
import { api, jsonBody } from '@/lib/api';
export function usePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PreferencesPatch) =>
      api<CurrentUser>('/users/me/preferences', { method: 'PATCH', body: jsonBody(input) }),
    onSuccess: (user) => client.setQueryData(['me'], user),
    onError: (error) => toast.error(error.message),
  });
}
