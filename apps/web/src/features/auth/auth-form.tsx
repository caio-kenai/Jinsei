'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { registrationSchema, type LoginResult, type RegistrationInput } from '@jinsei/contracts';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { api, jsonBody } from '@/lib/api';
import { currentUserOptions } from './use-current-user';
import { useSignupDraft } from './signup-draft';
import { Brand } from '@/components/shared/brand';
import { useInstance } from '@/features/instance/use-instance';
import { useT } from '@/i18n/provider';
import { LanguageSwitcher } from '@/components/shared/language-switcher';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useT();
  const registering = mode === 'register';
  const instance = useInstance();
  const draft = useSignupDraft();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { email: draft.email },
  });
  async function enter() {
    draft.setEmail('');
    await client.invalidateQueries({ queryKey: ['me'] });
    const user = await client.fetchQuery(currentUserOptions);
    router.replace(user.preferences.onboarded ? '/home' : '/onboarding');
  }
  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setVerifying(true);
    try {
      await api('/auth/login/mfa', { method: 'POST', body: jsonBody({ challenge, code }) });
      await enter();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('Código inválido'));
      if (error instanceof Error && /expirou|tentativas/.test(error.message)) {
        setChallenge('');
        setCode('');
      }
    } finally {
      setVerifying(false);
    }
  }
  async function submit(input: RegistrationInput) {
    setError('');
    if (registering && !input.displayName) {
      setError(t('Informe seu nome completo'));
      return;
    }
    try {
      const result = await api<LoginResult>(`/auth/${mode}`, {
        method: 'POST',
        body: jsonBody(registering ? input : { email: input.email, password: input.password }),
      });
      if ('mfaRequired' in result) {
        setChallenge(result.challenge);
        return;
      }
      await enter();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('Não foi possível entrar. Tente novamente.'),
      );
    }
  }
  return (
    <main className="auth-page public-surface">
      <LanguageSwitcher className="auth-language" />
      <div className="auth-halo" aria-hidden="true" />
      <section className="auth-box">
        <Link href="/" aria-label={t('Página inicial do Jinsei')}>
          <Brand />
        </Link>
        <h1>
          {registering ? t('Você pode criar uma conta em segundos!') : t('Bem-vindo de volta!')}
        </h1>
        <p className="auth-switch">
          {registering ? t('Já tem uma conta?') : t('Ainda não tem uma conta?')}{' '}
          <Link href={registering ? '/login' : '/register'}>
            {registering ? 'Entrar' : t('Cadastre-se gratuitamente')}
          </Link>
        </p>
        {registering && instance.data?.registrationsEnabled === false && (
          <p className="public-field-error" role="alert">
            {t('Novos cadastros estão desativados nesta instância. Entre com uma conta existente.')}
          </p>
        )}
        {challenge ? (
          <form onSubmit={confirmCode} className="mfa-login">
            <p className="auth-switch">
              {t(
                'Digite o código de 6 dígitos do seu aplicativo autenticador ou um código de recuperação.',
              )}
            </p>
            <div className="public-field">
              <label className="sr-only" htmlFor="auth-code">
                {t('Código de verificação')}
              </label>
              <input
                id="auth-code"
                className="public-input mfa-login-input"
                aria-label={t('Código de verificação')}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="text"
                autoFocus
                maxLength={12}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.trim())}
              />
            </div>
            {error && (
              <p className="public-field-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="public-button auth-submit"
              type="submit"
              disabled={verifying || code.length < 6}
            >
              {verifying ? <LoaderCircle size={17} className="spin" /> : t('Verificar e entrar')}
            </button>
            <button
              type="button"
              className="auth-forgot mfa-back"
              onClick={() => {
                setChallenge('');
                setCode('');
                setError('');
              }}
            >
              {t('Voltar')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(submit)}>
            {registering && (
              <div className="public-field">
                <label className="sr-only" htmlFor="auth-name">
                  {t('Nome completo')}
                </label>
                <input
                  id="auth-name"
                  className="public-input"
                  aria-label={t('Nome completo')}
                  autoComplete="name"
                  placeholder={t('Nome completo')}
                  minLength={2}
                  maxLength={60}
                  required
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="public-field-error">{errors.displayName.message}</p>
                )}
              </div>
            )}
            <div className="public-field">
              <label className="sr-only" htmlFor="auth-email">
                {t('E-mail')}
              </label>
              <input
                id="auth-email"
                type="email"
                className="public-input"
                aria-label={t('E-mail')}
                placeholder={t('Seu e-mail')}
                autoComplete="email"
                required
                {...register('email')}
              />
              {errors.email && <p className="public-field-error">{errors.email.message}</p>}
            </div>
            <div className="public-field">
              <label className="sr-only" htmlFor="auth-password">
                {t('Senha')}
              </label>
              <div className="password-field">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="public-input"
                  aria-label={t('Senha')}
                  placeholder={t('Senha')}
                  minLength={12}
                  maxLength={128}
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  required
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('Ocultar senha') : t('Mostrar senha')}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="public-field-error">{errors.password.message}</p>}
              {!registering && instance.data?.mailEnabled && (
                <Link className="auth-forgot" href="/forgot-password">
                  {t('Esqueceu a senha?')}
                </Link>
              )}
            </div>
            {error && (
              <p className="public-field-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="public-button auth-submit"
              type="submit"
              disabled={
                isSubmitting || (registering && instance.data?.registrationsEnabled === false)
              }
            >
              {isSubmitting ? (
                <LoaderCircle size={17} className="spin" />
              ) : registering ? (
                t('Cadastrar-se com e-mail')
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        )}
        {registering && (
          <p className="auth-password-hint">
            {t('Use pelo menos 12 caracteres para proteger sua conta.')}
          </p>
        )}
      </section>
      <footer className="auth-footer">
        {t('Ao continuar, você concorda com nossos')}{' '}
        <Link href="/terms">{t('Termos de uso')}</Link> e{' '}
        <Link href="/privacy">{t('Política de privacidade')}</Link>.{' '}
        <Link href="/privacy#contato">{t('Precisa de ajuda?')}</Link>
      </footer>
    </main>
  );
}
