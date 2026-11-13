'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  Check,
  ArrowRight,
  Gamepad2,
  Tv,
  BookOpen,
  Film,
  Clapperboard,
  Sun,
  Moon,
  Monitor,
  LoaderCircle,
} from 'lucide-react';
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

const icons = { games: Gamepad2, anime: Tv, manga: BookOpen, movies: Film, series: Clapperboard };
export function OnboardingForm() {
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
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise seus dados');
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
      setError(error instanceof Error ? error.message : 'Tente novamente');
      setSaving(false);
    }
  }
  return (
    <main className="onboarding-page">
      <Brand />
      <form onSubmit={submit} className="onboarding-card">
        <span className="eyebrow">O PRIMEIRO CAPÍTULO</span>
        <h1>
          Vamos deixar o Jinsei
          <br />
          com a sua cara.
        </h1>
        <p>Escolha o que faz parte da sua jornada. Você pode mudar tudo depois.</p>
        <div className="form-grid">
          <label className="field">
            Como podemos te chamar?
            <Input
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Seu nome"
              maxLength={60}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            Nome de usuário
            <Input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder="seu-usuario"
              maxLength={30}
              autoComplete="username"
              aria-label="Nome de usuário"
              aria-describedby="username-hint"
            />
            <small id="username-hint">Letras minúsculas, números, _ e -</small>
          </label>
        </div>
        <fieldset>
          <legend>O que você gosta de acompanhar?</legend>
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
                  <span>{categoryLabels[category]}</span>
                  {selected && <Check size={14} className="category-check" />}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend>Como você prefere ver suas histórias?</legend>
          <div className="theme-picker">
            {(
              [
                { value: 'light', label: 'Claro', Icon: Sun },
                { value: 'dark', label: 'Escuro', Icon: Moon },
                { value: 'system', label: 'Sistema', Icon: Monitor },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                className={theme === value ? 'theme-choice selected' : 'theme-choice'}
                aria-pressed={theme === value}
                onClick={() => {
                  setThemeValue(value);
                  setTheme(value);
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
          <small>Sua biblioteca começa privada, do seu jeito.</small>
          <Button disabled={saving || categories.length === 0} type="submit">
            {saving ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <>
                Começar minha jornada
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
      </form>
      <small className="onboarding-note">Cada experiência conta uma parte da sua história.</small>
    </main>
  );
}
