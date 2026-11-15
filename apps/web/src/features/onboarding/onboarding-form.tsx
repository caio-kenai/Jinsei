'use client';
import { issueMessage } from '@/i18n/config';
import { transitionTheme } from '@/lib/theme-transition';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Check, ArrowRight, Sun, Moon, Monitor, LoaderCircle } from 'lucide-react';
import {
  onboardingSchema,
  categoryLabels,
  mediaTypes,
  type MediaType,
  type CurrentUser,
} from '@jinsei/contracts';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { api, jsonBody } from '@/lib/api';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categoryIcons } from '@/components/shared/category-icons';
import { useI18n } from '@/i18n/provider';

const icons = categoryIcons;
export function OnboardingForm() {
  const { t, locale } = useI18n();
  const { data: user } = useCurrentUser();
  const [displayName, setDisplayName] = useState(
    user?.profile.displayName === 'Minha jornada' ? '' : (user?.profile.displayName ?? ''),
  );
  const [username, setUsername] = useState(user?.profile.username ?? '');
  const [categories, setCategories] = useState<MediaType[]>(
    user?.preferences.categories ?? ['games'],
  );
  const [theme, setThemeValue] = useState<'light' | 'dark' | 'system'>(
    user?.preferences.theme ?? 'system',
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setTheme } = useTheme();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = onboardingSchema.safeParse({
      displayName,
      username,
      categories,
      theme,
      accent: 'black',
      locale,
    });
    if (!parsed.success) {
      setError(issueMessage(parsed.error) ?? t('Revise seus dados'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await api<CurrentUser>('/users/me/onboarding', {
        method: 'POST',
        body: jsonBody(parsed.data),
      });
      queryClient.setQueryData(['me'], result);
      router.replace('/home');
    } catch (error) {
      setError(error instanceof Error ? error.message : t('Tente novamente'));
      setSaving(false);
    }
  }
  return (
    <main className="onboarding-page public-surface">
      <Brand />
      <form onSubmit={submit} className="onboarding-card">
        <span className="eyebrow">{t('O PRIMEIRO CAPÍTULO')}</span>
        <h1>
          {t('Vamos deixar o Jinsei')}
          <br />
          {t('com a sua cara.')}
        </h1>
        <p>{t('Escolha o que faz parte da sua jornada. Você pode mudar tudo depois.')}</p>
        <div className="form-grid">
          <label className="field">
            {t('Como podemos te chamar?')}
            <Input
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t('Seu nome')}
              maxLength={60}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            {t('Nome de usuário')}
            <Input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder={t('seu-usuario')}
              maxLength={30}
              autoComplete="username"
              aria-label={t('Nome de usuário')}
              aria-describedby="username-hint"
            />
            <small id="username-hint">{t('Letras minúsculas, números, _ e -')}</small>
          </label>
        </div>
        <fieldset>
          <legend>{t('O que você gosta de acompanhar?')}</legend>
          <div className="category-picker">
            {mediaTypes.map((category) => {
              const Icon = icons[category];
              const selected = categories.includes(category);
              return (
                <button
                  type="button"
                  key={category}
                  aria-pressed={selected}
                  className={selected ? 'category-choice selected' : 'category-choice'}
                  onClick={() =>
                    setCategories(
                      selected
                        ? categories.filter((value) => value !== category)
                        : [...categories, category],
                    )
                  }
                >
                  <Icon size={22} />
                  <span>{t(categoryLabels[category])}</span>
                  {selected && <Check size={14} className="category-check" />}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('Como você prefere ver suas histórias?')}</legend>
          <div className="theme-picker">
            {(
              [
                { value: 'light', label: t('Claro'), Icon: Sun },
                { value: 'dark', label: t('Escuro'), Icon: Moon },
                { value: 'system', label: t('Sistema'), Icon: Monitor },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                className={theme === value ? 'theme-choice selected' : 'theme-choice'}
                aria-pressed={theme === value}
                onClick={(event) => {
                  const target = event.currentTarget;
                  transitionTheme(() => {
                    setThemeValue(value);
                    setTheme(value);
                  }, target);
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        <div className="onboarding-footer">
          <small>{t('Sua biblioteca começa privada, do seu jeito.')}</small>
          <Button
            className="cta-glow onboarding-submit"
            disabled={saving || categories.length === 0}
            type="submit"
          >
            <span className="cta-aura" aria-hidden="true" />
            <span className="cta-border" aria-hidden="true" />
            <span className="cta-surface" aria-hidden="true">
              <span className="cta-shine" />
            </span>
            <span className="cta-label">
              {saving ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <>
                  {t('Começar minha jornada')}
                  <ArrowRight size={16} className="cta-arrow" />
                </>
              )}
            </span>
          </Button>
        </div>
      </form>
      <small className="onboarding-note">
        {t('Cada experiência conta uma parte da sua história.')}
      </small>
    </main>
  );
}
