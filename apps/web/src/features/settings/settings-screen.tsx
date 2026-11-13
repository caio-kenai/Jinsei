'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Download, Save, Trash2, LoaderCircle, ShieldCheck, Check } from 'lucide-react';
import {
  categoryLabels,
  mediaTypes,
  preferencesPatchSchema,
  type CurrentUser,
  type MediaType,
} from '@jinsei/contracts';
import { toast } from 'sonner';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { api, jsonBody } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function SettingsScreen() {
  const { data: user } = useCurrentUser();
  return user ? <SettingsForm user={user} /> : null;
}
function SettingsForm({ user }: { user: CurrentUser }) {
  const [categories, setCategories] = useState<MediaType[]>(user.preferences.categories);
  const [accent, setAccent] = useState(user.preferences.accent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const client = useQueryClient();
  const router = useRouter();
  const { setTheme } = useTheme();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = new FormData(event.currentTarget);
    const parsed = preferencesPatchSchema.safeParse({
      displayName: values.get('displayName'),
      username: values.get('username'),
      bio: values.get('bio'),
      categories,
      theme: values.get('theme'),
      density: values.get('density'),
      accent,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise os dados');
      return;
    }
    setBusy(true);
    try {
      const next = await api<CurrentUser>('/users/me/preferences', {
        method: 'PATCH',
        body: jsonBody(parsed.data),
      });
      client.setQueryData(['me'], next);
      await client.invalidateQueries({ queryKey: ['library'] });
      await client.invalidateQueries({ queryKey: ['summary'] });
      setTheme(next.preferences.theme);
      toast.success('Preferências salvas');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api('/users/me/password', {
        method: 'PATCH',
        body: jsonBody({
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
        }),
      });
      client.clear();
      toast.success('Senha alterada. Entre novamente para continuar.');
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a senha');
    } finally {
      setBusy(false);
    }
  }
  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api('/users/me', {
        method: 'DELETE',
        body: jsonBody({ password: form.get('password') }),
      });
      client.clear();
      router.replace('/register');
      toast.success('Conta e dados pessoais excluídos');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a conta');
      setBusy(false);
    }
  }
  return (
    <div className="settings-page">
      <header className="page-heading">
        <h1>Do seu jeito</h1>
        <p>Seu perfil, suas preferências e o controle da sua jornada.</p>
      </header>
      <form onSubmit={save}>
        <section className="settings-section">
          <h2>Seu perfil</h2>
          <p>Como você quer aparecer no seu espaço.</p>
          <div className="form-grid">
            <label className="field">
              Nome de exibição
              <Input
                name="displayName"
                defaultValue={user.profile.displayName}
                minLength={2}
                maxLength={60}
                required
              />
            </label>
            <label className="field">
              Nome de usuário
              <Input
                name="username"
                defaultValue={user.profile.username ?? ''}
                minLength={3}
                maxLength={30}
                required
              />
            </label>
          </div>
          <label className="field">
            Sobre você
            <Textarea
              name="bio"
              maxLength={500}
              defaultValue={user.profile.bio}
              placeholder="Um pouco sobre as histórias que você gosta de viver…"
            />
          </label>
          <p style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <ShieldCheck size={14} />
            Seu perfil e sua biblioteca são privados nesta versão.
          </p>
        </section>
        <section className="settings-section">
          <h2>Sua biblioteca</h2>
          <p>Desabilitar uma categoria apenas a oculta. Seus registros continuam guardados.</p>
          <div className="toolbar-group">
            {mediaTypes.map((type) => (
              <label
                className="checkbox-field"
                key={type}
                style={{ marginRight: 16, marginBottom: 10 }}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(type)}
                  onChange={(event) =>
                    setCategories(
                      event.target.checked
                        ? [...categories, type]
                        : categories.filter((category) => category !== type),
                    )
                  }
                />
                {categoryLabels[type]}
              </label>
            ))}
          </div>
        </section>
        <section className="settings-section">
          <h2>Aparência</h2>
          <p>Encontre o ambiente certo para suas histórias.</p>
          <div className="form-grid">
            <label className="field">
              Tema
              <Select name="theme" defaultValue={user.preferences.theme}>
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
                <option value="system">Acompanhar o sistema</option>
              </Select>
            </label>
            <label className="field">
              Densidade padrão
              <Select name="density" defaultValue={user.preferences.density}>
                <option value="comfortable">Confortável</option>
                <option value="compact">Compacta</option>
              </Select>
            </label>
          </div>
          <span className="field">Cor de destaque</span>
          <div className="accent-picker">
            {(
              [
                { id: 'black', color: '#595d66', label: 'Preto' },
                { id: 'rose', color: '#c91e47', label: 'Vermelho Jinsei' },
                { id: 'violet', color: '#7f77f1', label: 'Violeta' },
                { id: 'blue', color: '#1090e0', label: 'Azul' },
                { id: 'pink', color: '#ee5e99', label: 'Rosa' },
                { id: 'indigo', color: '#6985ff', label: 'Índigo' },
                { id: 'orange', color: '#e16b16', label: 'Laranja' },
                { id: 'teal', color: '#0f9d9f', label: 'Turquesa' },
                { id: 'bronze', color: '#aa8d80', label: 'Bronze' },
                { id: 'emerald', color: '#3db88b', label: 'Verde' },
              ] as const
            ).map((item) => (
              <button
                type="button"
                key={item.id}
                className="accent-choice"
                style={{ background: item.color }}
                aria-label={item.label}
                aria-pressed={accent === item.id}
                onClick={() => setAccent(item.id)}
              >
                {accent === item.id && <Check size={16} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </section>
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        <div className="settings-save">
          <Button type="submit" disabled={busy || categories.length === 0}>
            {busy ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}Salvar
            preferências
          </Button>
        </div>
      </form>
      <section className="settings-section">
        <h2>Segurança</h2>
        <p>A alteração de senha encerra suas sessões, incluindo esta.</p>
        <form onSubmit={changePassword}>
          <div className="form-grid">
            <label className="field">
              Senha atual
              <Input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            <label className="field">
              Nova senha
              <Input
                name="newPassword"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
          </div>
          <Button type="submit" variant="outline" disabled={busy}>
            Alterar senha
          </Button>
        </form>
      </section>
      <section className="settings-section">
        <h2>Seus dados pertencem a você</h2>
        <p>
          Exporte sua biblioteca e suas preferências em JSON, ou exclua sua conta e seus registros
          pessoais.
        </p>
        <div className="toolbar-group">
          <Button asChild variant="outline">
            <a href="/api/users/me/export" download>
              <Download size={14} />
              Exportar meus dados
            </a>
          </Button>
          <Button variant="destructive" onClick={() => setDeleting(true)}>
            <Trash2 size={14} />
            Excluir minha conta
          </Button>
        </div>
        <div className="legal-links" style={{ justifyContent: 'start' }}>
          <Link href="/privacy">Privacidade e retenção</Link>
          <span>·</span>
          <Link href="/terms">Termos e licenças</Link>
        </div>
      </section>
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogTitle className="dialog-title">Excluir sua conta?</DialogTitle>
          <DialogDescription className="dialog-description">
            Sua biblioteca, anotações, progresso, preferências e sessões serão excluídos. Exporte
            seus dados antes de continuar, se quiser guardar uma cópia.
          </DialogDescription>
          <form onSubmit={remove}>
            <label className="field">
              Confirme sua senha
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <div className="dialog-footer">
              <Button variant="outline" type="button" onClick={() => setDeleting(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" type="submit" disabled={busy}>
                Excluir conta e dados
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
