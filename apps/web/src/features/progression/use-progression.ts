'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Progression } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';

export function useProgression() {
  return useQuery({
    queryKey: ['progression'],
    queryFn: () => api<Progression>('/progression'),
    staleTime: 30000,
  });
}

/** Announces new badges and levels once, as they happen. */
export function useProgressionAnnouncements() {
  const { data } = useProgression();
  const level = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    for (const key of data.unlocked) {
      const badge = data.badges.find((item) => item.key === key);
      if (badge) toast.success(`Nova insígnia: ${badge.label}`, { description: badge.description });
    }
    if (level.current !== null && data.level > level.current)
      toast.success(`Você alcançou o nível ${data.level}!`);
    level.current = data.level;
  }, [data]);
}

export function useActiveTitle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (title: string | null) =>
      api<Progression>('/progression/title', { method: 'PUT', body: jsonBody({ title }) }),
    onSuccess: (progression) => client.setQueryData(['progression'], progression),
    onError: (error) => toast.error(error.message),
  });
}
