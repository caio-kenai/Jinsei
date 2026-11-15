'use client';
import { Languages } from 'lucide-react';
import { localeLabels, localeSchema, locales } from '@jinsei/contracts';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { usePreferences } from '@/features/auth/use-preferences';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';

/** Compact language picker for public pages; signed-in changes are saved to the account. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, locale, setLocale } = useI18n();
  const user = useCurrentUser().data;
  const preferences = usePreferences();
  return (
    <label className={cn('language-switcher', className)}>
      <Languages size={15} aria-hidden="true" />
      <select
        value={locale}
        aria-label={t('Idioma')}
        onChange={(event) => {
          const next = localeSchema.parse(event.target.value);
          setLocale(next);
          if (user) preferences.mutate({ locale: next });
        }}
      >
        {locales.map((value) => (
          <option key={value} value={value}>
            {localeLabels[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
