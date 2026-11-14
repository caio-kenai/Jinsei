'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ImageUp, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { preferencesPatchSchema, type CurrentUser, type ProfileLink } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInstance } from '@/features/instance/use-instance';

const sections = [
  ['showStatistics', 'Estatísticas', 'Totais, nota média e categorias'],
  ['showFavorites', 'Favoritos', 'Até 12 títulos favoritos'],
  ['showReviews', 'Resenhas', 'Somente as resenhas marcadas como públicas'],
  ['showGoals', 'Metas', 'Metas que não estejam arquivadas'],
  ['showHistory', 'Atividade recente', 'Últimos títulos atualizados e seus status'],
] as const;

function ImageField({
  label,
  hint,
  url,
  path,
  wide,
}: {
  label: string;
  hint: string;
  url: string | null;
  path: string;
  wide?: boolean;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      await client.invalidateQueries({ queryKey: ['me'] });
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="field image-field">
      <span>{label}</span>
      <div className={`image-preview ${wide ? 'wide' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Uploaded image served by the API */}
        {url ? <img src={url} alt="" /> : <ImageUp size={20} />}
      </div>
      <div className="image-actions">
        <label className="toolbar-button">
          {busy ? <LoaderCircle className="spin" size={12} /> : <ImageUp size={12} />}
          Enviar imagem
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void run(() => uploadImage(path, file), `${label} atualizado`);
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            className="toolbar-button"
            disabled={busy}
            onClick={() => void run(() => api(path, { method: 'DELETE' }), `${label} removido`)}
          >
            <Trash2 size={12} />
            Remover
          </button>
        )}
      </div>
      <small>{hint}</small>
    </div>
  );
}

export function PublicProfileSettings({ user }: { user: CurrentUser }) {
  const client = useQueryClient();
  const instance = useInstance();
  const [links, setLinks] = useState<ProfileLink[]>(user.profile.links);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const parsed = preferencesPatchSchema.safeParse({
      isPublic: values.get('isPublic') === 'on',
      ...Object.fromEntries(sections.map(([key]) => [key, values.get(key) === 'on'])),
      links: links.filter((link) => link.label.trim() || link.url.trim()),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise os links do perfil');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const next = await api<CurrentUser>('/users/me/preferences', {
        method: 'PATCH',
        body: jsonBody(parsed.data),
      });
      client.setQueryData(['me'], next);
      toast.success('Perfil público atualizado');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <h2>Perfil público</h2>
      <p>
        Escolha o que outras pessoas podem ver. Anotações privadas, tags e títulos fora das seções
        escolhidas nunca são publicados.
        {user.profile.isPublic && user.profile.username && (
          <>
            {' '}
            <Link href={`/u/${user.profile.username}`} target="_blank" className="inline-link">
              Ver meu perfil público <ExternalLink size={11} />
            </Link>
          </>
        )}
      </p>
      {instance.data?.uploadsEnabled ? (
        <div className="form-grid">
          <ImageField
            label="Avatar"
            hint="JPEG, PNG ou WebP de até 2 MB."
            url={user.profile.avatarUrl}
            path="/users/me/avatar"
          />
          <ImageField
            label="Banner"
            hint="JPEG, PNG ou WebP de até 5 MB, de preferência horizontal."
            url={user.profile.bannerUrl}
            path="/users/me/banner"
            wide
          />
        </div>
      ) : (
        <p className="muted">O envio de imagens não está configurado nesta instância.</p>
      )}
      <form onSubmit={save} className="dialog-form">
        <label className="checkbox-field">
          <input type="checkbox" name="isPublic" defaultChecked={user.profile.isPublic} />
          Tornar meu perfil público em /u/{user.profile.username}
        </label>
        <fieldset className="privacy-options">
          <legend>Seções exibidas no perfil público</legend>
          {sections.map(([key, label, hint]) => (
            <label className="checkbox-field" key={key}>
              <input type="checkbox" name={key} defaultChecked={user.profile[key]} />
              <span>
                {label}
                <small> · {hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="profile-links">
          <legend>Links</legend>
          {links.map((link, index) => (
            <div className="profile-link-row" key={index}>
              <Input
                aria-label={`Nome do link ${index + 1}`}
                placeholder="Nome"
                maxLength={40}
                value={link.label}
                onChange={(event) =>
                  setLinks(
                    links.map((item, i) =>
                      i === index ? { ...item, label: event.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                aria-label={`Endereço do link ${index + 1}`}
                placeholder="https://…"
                type="url"
                maxLength={500}
                value={link.url}
                onChange={(event) =>
                  setLinks(
                    links.map((item, i) =>
                      i === index ? { ...item, url: event.target.value } : item,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover link ${index + 1}`}
                onClick={() => setLinks(links.filter((_, i) => i !== index))}
              >
                <X size={13} />
              </Button>
            </div>
          ))}
          {links.length < 5 && (
            <button
              type="button"
              className="toolbar-button"
              onClick={() => setLinks([...links, { label: '', url: '' }])}
            >
              <Plus size={12} />
              Adicionar link
            </button>
          )}
        </fieldset>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={busy}>
            Salvar perfil público
          </Button>
        </div>
      </form>
    </section>
  );
}
