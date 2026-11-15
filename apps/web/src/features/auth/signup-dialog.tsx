'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brand } from '@/components/shared/brand';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { emailSchema } from '@jinsei/contracts';
import { useState } from 'react';
import { useSignupDraft } from './signup-draft';
import { useT } from '@/i18n/provider';

export function SignupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const draft = useSignupDraft();
  const [error, setError] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="signup-dialog public-surface">
        <Brand compact />
        <DialogTitle className="signup-title">{t('Cadastre-se GRATUITAMENTE!')}</DialogTitle>
        <DialogDescription className="signup-description">
          {t('Já tem uma conta?')} <Link href="/login">{t('Entrar')}</Link>
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = emailSchema.safeParse(new FormData(event.currentTarget).get('email'));
            if (!parsed.success) {
              setError(t('Informe um e-mail válido'));
              return;
            }
            draft.setEmail(parsed.data);
            router.push('/register');
          }}
        >
          <input
            name="email"
            type="email"
            autoComplete="email"
            aria-label={t('Seu e-mail')}
            placeholder={t('Insira o seu e-mail')}
            required
            className="public-input"
          />
          {error && (
            <p role="alert" className="public-field-error">
              {error}
            </p>
          )}
          <button type="submit" className="public-button">
            {t('Cadastre-se GRATUITAMENTE!')}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
