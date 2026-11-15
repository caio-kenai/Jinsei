'use client';
import type { CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { categoryLabels, mediaTypes, type CurrentUser, type MediaType } from '@jinsei/contracts';
import { categoryIcons } from '@/components/shared/category-icons';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { usePreferences } from '@/features/auth/use-preferences';
import { useT } from '@/i18n/provider';
import { categoryColors } from '@/lib/palette';
import { cn } from '@/lib/utils';

/** Cards that turn library categories on and off, saved instantly to the account. */
export function CategoryPicker({ className }: { className?: string }) {
  const t = useT();
  const client = useQueryClient();
  const user = useCurrentUser().data;
  const preferences = usePreferences();
  if (!user) return null;
  const categories = user.preferences.categories;

  function toggle(type: MediaType) {
    const enabled = categories.includes(type);
    const next = enabled
      ? categories.filter((item) => item !== type)
      : mediaTypes.filter((item) => item === type || categories.includes(item));
    if (!next.length) {
      toast.error(t('Mantenha ao menos uma categoria ativa'));
      return;
    }
    const previous = client.getQueryData<CurrentUser>(['me']);
    // The change shows at once; the saved account replaces it when the request ends.
    client.setQueryData<CurrentUser>(['me'], (current) =>
      current ? { ...current, preferences: { ...current.preferences, categories: next } } : current,
    );
    preferences.mutate(
      { categories: next },
      {
        onSuccess: () => {
          void client.invalidateQueries({ queryKey: ['library'] });
          void client.invalidateQueries({ queryKey: ['summary'] });
        },
        onError: () => client.setQueryData(['me'], previous),
      },
    );
  }

  return (
    <div className={cn('settings-categories', className)}>
      {mediaTypes.map((type) => {
        const Icon = categoryIcons[type];
        const enabled = categories.includes(type);
        return (
          <button
            key={type}
            type="button"
            role="switch"
            aria-checked={enabled}
            className={cn('settings-category', enabled && 'enabled')}
            style={{ '--cat': categoryColors[type] } as CSSProperties}
            onClick={() => toggle(type)}
          >
            <span className="settings-category-icon">
              <Icon size={16} />
            </span>
            <strong>{t(categoryLabels[type])}</strong>
            <span className="settings-switch" aria-hidden="true" data-checked={enabled}>
              <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
