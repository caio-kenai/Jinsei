'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { registrationSchema, type RegistrationInput } from '@jinsei/contracts';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { api, jsonBody } from '@/lib/api';
import { currentUserOptions } from './use-current-user';
import { useSignupDraft } from './signup-draft';
import { Brand } from '@/components/shared/brand';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const draft = useSignupDraft();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  async function submit(input: RegistrationInput) {
    setError('');
    if (registering && !input.displayName) {
      setError('Informe seu nome completo');
      return;
    }
    try {
      await api(`/auth/${mode}`, {
        method: 'POST',
        body: jsonBody(registering ? input : { email: input.email, password: input.password }),
      });
      draft.setEmail('');
      await client.invalidateQueries({ queryKey: ['me'] });
      const user = await client.fetchQuery(currentUserOptions);
      router.replace(user.preferences.onboarded ? '/home' : '/onboarding');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.',
      );
    }
  }
  return (
    <main className="auth-page public-surface">
      <div className="auth-halo" aria-hidden="true" />
      <section className="auth-box">
        <Link href="/" aria-label="Página inicial do Jinsei">
          <Brand />
        </Link>
        <h1>{registering ? 'Você pode criar uma conta em segundos!' : 'Bem-vindo de volta!'}</h1>
        <p className="auth-switch">
          {registering ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
          <Link href={registering ? '/login' : '/register'}>
            {registering ? 'Entrar' : 'Cadastre-se gratuitamente'}
          </Link>
        </p>
        <form onSubmit={handleSubmit(submit)}>
          {registering && (
            <div className="public-field">
              <label className="sr-only" htmlFor="auth-name">
                Nome completo
              </label>
              <input
                id="auth-name"
                className="public-input"
                aria-label="Nome completo"
                autoComplete="name"
                placeholder="Nome completo"
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
              E-mail
            </label>
            <input
              id="auth-email"
              type="email"
              className="public-input"
              aria-label="E-mail"
              placeholder="Seu e-mail"
              autoComplete="email"
              required
              {...register('email')}
            />
            {errors.email && <p className="public-field-error">{errors.email.message}</p>}
          </div>
          <div className="public-field">
            <label className="sr-only" htmlFor="auth-password">
              Senha
            </label>
            <div className="password-field">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="public-input"
                aria-label="Senha"
                placeholder="Senha"
                minLength={12}
                maxLength={128}
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
                {...register('password')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="public-field-error">{errors.password.message}</p>}
          </div>
          {error && (
            <p className="public-field-error" role="alert">
              {error}
            </p>
          )}
          <button className="public-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle size={17} className="spin" />
            ) : registering ? (
              'Cadastrar-se com e-mail'
            ) : (
              'Entrar'
            )}
          </button>
        </form>
        {registering && (
          <p className="auth-password-hint">
            Use pelo menos 12 caracteres para proteger sua conta.
          </p>
        )}
      </section>
      <footer className="auth-footer">
        Ao continuar, você concorda com nossos <Link href="/terms">Termos de uso</Link> e{' '}
        <Link href="/privacy">Política de privacidade</Link>.{' '}
        <Link href="/privacy#contato">Precisa de ajuda?</Link>
      </footer>
    </main>
  );
}
