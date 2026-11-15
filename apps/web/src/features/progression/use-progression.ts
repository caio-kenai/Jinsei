'use client';
import { useT } from '@/i18n/provider';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Progression } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { useCurrentUser } from '@/features/auth/use-current-user';

export function useProgression() {
  return useQuery({
    queryKey: ['progression'],
    queryFn: () => api<Progression>('/progression'),
    staleTime: 30000,
  });
}

/** Announces new badges and levels once, as they happen. */
export function useProgressionAnnouncements() {
  const t = useT();
  const { data } = useProgression();
  const celebrations = useCurrentUser().data?.preferences.celebrations ?? true;
  const level = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    let party = false;
    for (const key of data.unlocked) {
      const badge = data.badges.find((item) => item.key === key);
      if (badge) {
        toast.success(t('Nova insígnia: {label}', { label: t(badge.label) }), {
          description: t(badge.description),
        });
        party = true;
      }
    }
    if (level.current !== null && data.level > level.current) {
      toast.success(t('Você alcançou o nível {level}!', { level: data.level }));
      party = true;
    }
    level.current = data.level;
    if (party && celebrations) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Announce only when progression changes
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
