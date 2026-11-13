'use client';
import { useQuery } from '@tanstack/react-query';
import { publicInstanceSchema } from '@jinsei/contracts';
import { api } from '@/lib/api';
export function useInstance() {
  return useQuery({
    queryKey: ['instance'],
    queryFn: async () => publicInstanceSchema.parse(await api('/instance')),
    staleTime: 30000,
    retry: false,
  });
}
