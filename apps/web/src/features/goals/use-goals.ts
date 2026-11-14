'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Goal, GoalInput, GoalPatch } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => api<{ goals: Goal[] }>('/goals') });
}
export function useGoalMutations() {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['goals'] });
    void client.invalidateQueries({ queryKey: ['progression'] });
  };
  const onError = (error: Error) => toast.error(error.message);
  return {
    create: useMutation({
      mutationFn: (input: GoalInput) =>
        api<Goal>('/goals', { method: 'POST', body: jsonBody(input) }),
      onSuccess: refresh,
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, changes }: { id: string; changes: GoalPatch }) =>
        api<Goal>(`/goals/${id}`, { method: 'PATCH', body: jsonBody(changes) }),
      onSuccess: refresh,
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/goals/${id}`, { method: 'DELETE' }),
      onSuccess: refresh,
      onError,
    }),
  };
}
