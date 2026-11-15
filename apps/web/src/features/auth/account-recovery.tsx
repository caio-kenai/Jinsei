'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, MailCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { emailSchema, passwordSchema } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { Brand } from '@/components/shared/brand';
import { useInstance } from '@/features/instance/use-instance';
import { useCurrentUser } from './use-current-user';

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-page public-surface">
      <div className="auth-halo" aria-hidden="true" />
      <section className="auth-box">
        <Link href="/" aria-label="Página inicial do Jinsei">
          <Brand />
        </Link>
        <h1>{title}</h1>
        {children}
      </section>
      <footer className="auth-footer">
        <Link href="/login">Voltar para o login</Link> ·{' '}
        <Link href="/privacy#contato">Precisa de ajuda?</Link>
      </footer>
    </main>
  );
}

function Notice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  return (
    <div className={`auth-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
      <div>{children}</div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const instance = useInstance();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const request = useMutation({
    mutationFn: (value: string) =>
      api('/auth/password/forgot', { method: 'POST', body: jsonBody({ email: value }) }),
    onError: (failure) => setError(failure.message),
  });
  return (
    <AuthShell title="Esqueceu sua senha?">
      {instance.data && !instance.data.mailEnabled ? (
        <Notice tone="error">
          Esta instância ainda não envia e-mails. Fale com quem administra o Jinsei para recuperar o
          acesso.
        </Notice>
      ) : request.isSuccess ? (
        <Notice tone="success">
          Se houver uma conta com <strong>{email}</strong>, você vai receber um link para criar uma
          nova senha. Ele vale por 1 hora. Confira também a caixa de spam.
        </Notice>
      ) : (
        <>
          <p className="auth-switch">Informe seu e-mail e enviaremos um link para criar outra.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = emailSchema.safeParse(email);
              if (!parsed.success) {
                setError('Informe um e-mail válido');
                return;
              }
              setError('');
              request.mutate(parsed.data);
            }}
          >
            <div className="public-field">
              <label className="sr-only" htmlFor="forgot-email">
                E-mail
              </label>
              <input
                id="forgot-email"
                type="email"
                className="public-input"
                aria-label="E-mail"
                placeholder="Seu e-mail"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              disabled={request.isPending}
            >
              {request.isPending ? <LoaderCircle size={17} className="spin" /> : 'Enviar link'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const reset = useMutation({
    mutationFn: () =>
      api('/auth/password/reset', { method: 'POST', body: jsonBody({ token, password }) }),
    onSuccess: () => {
      toast.success('Senha alterada. Entre com a nova senha.');
      router.replace('/login');
    },
    onError: (failure) => setError(failure.message),
  });
  return (
    <AuthShell title="Crie uma nova senha">
      {!/^[a-f0-9]{64}$/.test(token) ? (
        <Notice tone="error">
          Este link está incompleto. <Link href="/forgot-password">Peça um novo link</Link>.
        </Notice>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = passwordSchema.safeParse(password);
            if (!parsed.success) setError(parsed.error.issues[0]?.message ?? 'Senha inválida');
            else if (password !== confirm) setError('As senhas não conferem');
            else {
              setError('');
              reset.mutate();
            }
          }}
        >
          <div className="public-field">
            <label className="sr-only" htmlFor="reset-password">
              Nova senha
            </label>
            <div className="password-field">
              <input
                id="reset-password"
                type={show ? 'text' : 'password'}
                className="public-input"
                aria-label="Nova senha"
                placeholder="Nova senha"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="public-field">
            <label className="sr-only" htmlFor="reset-confirm">
              Confirme a nova senha
            </label>
            <input
              id="reset-confirm"
              type={show ? 'text' : 'password'}
              className="public-input"
              aria-label="Confirme a nova senha"
              placeholder="Confirme a nova senha"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          {error && (
            <p className="public-field-error" role="alert">
              {error}{' '}
              {/expirado/.test(error) && <Link href="/forgot-password">Pedir outro link</Link>}
            </p>
          )}
          <button className="public-button auth-submit" type="submit" disabled={reset.isPending}>
            {reset.isPending ? <LoaderCircle size={17} className="spin" /> : 'Salvar nova senha'}
          </button>
          <p className="auth-password-hint">
            Use pelo menos 12 caracteres. Todas as sessões abertas serão encerradas.
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const client = useQueryClient();
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: () => api('/auth/email/verify', { method: 'POST', body: jsonBody({ token }) }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['me'] }),
  });
  const { mutate } = verify;
  useEffect(() => {
    if (started.current || !/^[a-f0-9]{64}$/.test(token)) return;
    started.current = true;
    mutate();
  }, [mutate, token]);
  return (
    <AuthShell title="Confirmação de e-mail">
      {!/^[a-f0-9]{64}$/.test(token) ? (
        <Notice tone="error">Este link está incompleto. Peça um novo pelo aplicativo.</Notice>
      ) : verify.isSuccess ? (
        <>
          <Notice tone="success">
            E-mail confirmado! Amizades, conversas e clubes estão liberados.
          </Notice>
          <Link className="public-button auth-submit" href="/home">
            Abrir meu Jinsei
          </Link>
        </>
      ) : verify.isError ? (
        <Notice tone="error">
          {verify.error.message} Entre no Jinsei e use “Reenviar confirmação”.
        </Notice>
      ) : (
        <p className="auth-switch">
          <LoaderCircle size={16} className="spin" /> Confirmando seu e-mail…
        </p>
      )}
    </AuthShell>
  );
}

/** Reminder inside the app while the address is not confirmed. */
export function EmailVerificationBanner() {
  const user = useCurrentUser().data;
  const instance = useInstance();
  const [hidden, setHidden] = useState(false);
  const resend = useMutation({
    mutationFn: () => api<{ sent: boolean }>('/users/me/email/verification', { method: 'POST' }),
    onSuccess: (result) =>
      result.sent
        ? toast.success('Enviamos um novo link. Confira sua caixa de entrada.')
        : toast.message('Seu e-mail já está confirmado.'),
    onError: (failure) => toast.error(failure.message),
  });
  if (hidden || !user || user.emailVerified || !instance.data?.mailEnabled) return null;
  return (
    <div className="email-banner" role="status">
      <MailCheck size={16} />
      <span>
        Confirme <strong>{user.email}</strong> para usar amizades, conversas e clubes.
      </span>
      <button type="button" onClick={() => resend.mutate()} disabled={resend.isPending}>
        {resend.isPending ? <LoaderCircle size={13} className="spin" /> : 'Reenviar confirmação'}
      </button>
      <button
        type="button"
        className="email-banner-close"
        aria-label="Fechar aviso"
        onClick={() => setHidden(true)}
      >
        <X size={14} />
      </button>
    </div>
  );
}
