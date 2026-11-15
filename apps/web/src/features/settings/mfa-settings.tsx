'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, KeyRound, LoaderCircle, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import type { MfaStatus } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

type Step = 'idle' | 'setup' | 'codes' | 'disable' | 'regenerate';

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = codes.join('\n');
  return (
    <div className="mfa-codes">
      <p>
        Guarde estes códigos em um lugar seguro. Cada um entra uma única vez se você perder o
        celular. Eles não serão mostrados de novo.
      </p>
      <ol>
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ol>
      <div className="mfa-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(() => toast.success('Códigos copiados'))
          }
        >
          <Copy size={14} />
          Copiar
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Jinsei — códigos de recuperação\n\n${text}\n`)}`}
            download="jinsei-codigos-de-recuperacao.txt"
          >
            <Download size={14} />
            Baixar
          </a>
        </Button>
        <Button type="button" size="sm" onClick={onDone}>
          Guardei os códigos
        </Button>
      </div>
    </div>
  );
}

/** Two-step login: setup with QR code, recovery codes and turning it off. */
export function MfaSettings() {
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ['mfa'],
    queryFn: () => api<MfaStatus>('/users/me/mfa'),
  });
  const [step, setStep] = useState<Step>('idle');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['mfa'] });
    void client.invalidateQueries({ queryKey: ['me'] });
  };
  const close = () => {
    setStep('idle');
    setCode('');
    setPassword('');
  };
  const setup = useMutation({
    mutationFn: () =>
      api<{ secret: string; uri: string }>('/users/me/mfa/setup', { method: 'POST' }),
    onSuccess: () => setStep('setup'),
    onError: (error) => toast.error(error.message),
  });
  const enable = useMutation({
    mutationFn: () =>
      api<{ recoveryCodes: string[] }>('/users/me/mfa/enable', {
        method: 'POST',
        body: jsonBody({ code }),
      }),
    onSuccess: (result) => {
      setCodes(result.recoveryCodes);
      setCode('');
      setStep('codes');
      refresh();
      toast.success('Verificação em duas etapas ativada');
    },
    onError: (error) => toast.error(error.message),
  });
  const regenerate = useMutation({
    mutationFn: () =>
      api<{ recoveryCodes: string[] }>('/users/me/mfa/recovery-codes', {
        method: 'POST',
        body: jsonBody({ code }),
      }),
    onSuccess: (result) => {
      setCodes(result.recoveryCodes);
      setCode('');
      setStep('codes');
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const disable = useMutation({
    mutationFn: () =>
      api('/users/me/mfa/disable', { method: 'POST', body: jsonBody({ password, code }) }),
    onSuccess: () => {
      close();
      refresh();
      toast.success('Verificação em duas etapas desativada');
    },
    onError: (error) => toast.error(error.message),
  });
  const enabled = status.data?.enabled ?? false;
  return (
    <div className="settings-sessions mfa-settings">
      <div className="settings-sessions-head">
        <span className="mfa-title">
          {enabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
          <strong>Verificação em duas etapas</strong>
          <em className={enabled ? 'is-on' : ''}>{enabled ? 'Ativa' : 'Desativada'}</em>
        </span>
        {status.isPending ? (
          <LoaderCircle size={16} className="spin" />
        ) : enabled ? (
          <span className="mfa-actions">
            <Button size="sm" variant="ghost" onClick={() => setStep('regenerate')}>
              <KeyRound size={14} />
              Novos códigos
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStep('disable')}>
              Desativar
            </Button>
          </span>
        ) : (
          <Button size="sm" onClick={() => setup.mutate()} disabled={setup.isPending}>
            {setup.isPending && <LoaderCircle size={14} className="spin" />}
            Ativar
          </Button>
        )}
      </div>
      <p className="mfa-hint">
        {enabled
          ? `Ao entrar, o Jinsei pede um código do seu aplicativo autenticador. Restam ${status.data?.remainingRecoveryCodes ?? 0} códigos de recuperação.`
          : 'Proteja a conta pedindo um código do celular (Google Authenticator, Authy, 1Password e similares) além da senha.'}
      </p>

      <Dialog open={step !== 'idle'} onOpenChange={(open) => !open && step !== 'codes' && close()}>
        <DialogContent className="mfa-dialog">
          {step === 'setup' && setup.data && (
            <>
              <DialogTitle className="dialog-title">Ative a verificação em duas etapas</DialogTitle>
              <DialogDescription className="dialog-description">
                Leia o QR Code com seu aplicativo autenticador e digite o código de 6 dígitos que
                aparecer.
              </DialogDescription>
              <div className="mfa-qr">
                <QRCodeSVG
                  value={setup.data.uri}
                  size={176}
                  level="M"
                  title="QR Code para o aplicativo autenticador"
                />
              </div>
              <p className="mfa-secret">
                Sem câmera? Digite a chave:{' '}
                <code>{setup.data.secret.match(/.{1,4}/g)?.join(' ')}</code>
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  enable.mutate();
                }}
              >
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  aria-label="Código do aplicativo"
                  className="mfa-code-input"
                  autoFocus
                />
                <div className="dialog-footer">
                  <Button type="button" variant="outline" onClick={close}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={code.length !== 6 || enable.isPending}>
                    {enable.isPending && <LoaderCircle size={14} className="spin" />}
                    Confirmar e ativar
                  </Button>
                </div>
              </form>
            </>
          )}
          {step === 'codes' && (
            <>
              <DialogTitle className="dialog-title">Códigos de recuperação</DialogTitle>
              <DialogDescription className="dialog-description">
                Use um deles no lugar do código do aplicativo, se precisar.
              </DialogDescription>
              <RecoveryCodes
                codes={codes}
                onDone={() => {
                  setCodes([]);
                  close();
                }}
              />
            </>
          )}
          {(step === 'disable' || step === 'regenerate') && (
            <>
              <DialogTitle className="dialog-title">
                {step === 'disable'
                  ? 'Desativar a verificação em duas etapas?'
                  : 'Gerar novos códigos'}
              </DialogTitle>
              <DialogDescription className="dialog-description">
                {step === 'disable'
                  ? 'Confirme sua senha e um código do aplicativo ou de recuperação.'
                  : 'Os códigos atuais deixam de funcionar. Confirme com um código do aplicativo.'}
              </DialogDescription>
              <form
                className="mfa-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (step === 'disable') disable.mutate();
                  else regenerate.mutate();
                }}
              >
                {step === 'disable' && (
                  <label className="field">
                    Senha
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </label>
                )}
                <label className="field">
                  Código
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value.trim().slice(0, 12))}
                    autoComplete="one-time-code"
                    placeholder="000000 ou xxxx-xxxx"
                    required
                  />
                </label>
                <div className="dialog-footer">
                  <Button type="button" variant="outline" onClick={close}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant={step === 'disable' ? 'destructive' : 'default'}
                    disabled={code.length < 6 || disable.isPending || regenerate.isPending}
                  >
                    {step === 'disable' ? 'Desativar' : 'Gerar códigos'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
