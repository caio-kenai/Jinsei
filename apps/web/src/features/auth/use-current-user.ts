'use client';

import { useQuery, queryOptions } from '@tanstack/react-query';
import { currentUserSchema, type CurrentUser } from '@jinsei/contracts';
import { api } from '@/lib/api';

export const currentUserOptions = queryOptions({
  queryKey: ['me'],
  queryFn: async () => currentUserSchema.parse(await api<CurrentUser>('/users/me')),
  retry: false,
  staleTime: 60000,
});
export function useCurrentUser() {
  return useQuery(currentUserOptions);
}
