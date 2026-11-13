'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Server, Save, LoaderCircle, ShieldCheck } from 'lucide-react';
import { instanceSettingsSchema } from '@jinsei/contracts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { api, jsonBody } from '@/lib/api';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useInstance } from './use-instance';

export function InstanceScreen() {
  const { data: user } = useCurrentUser();
  const result = useInstance();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user?.isAdmin)
    return (
      <div className="empty-state">
        <ShieldCheck size={28} />
        <h2>Administração da instância</h2>
        <p>Somente o administrador deste servidor pode alterar estas configurações.</p>
      </div>
    );
  if (result.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  if (!result.data)
    return (
      <div className="empty-state">
        <p>Não foi possível carregar as configurações do servidor.</p>
        <Button onClick={() => void result.refetch()}>Tentar novamente</Button>
      </div>
    );
  const settings = result.data;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const fields = new FormData(event.currentTarget);
    const parsed = instanceSettingsSchema.safeParse({
      name: fields.get('name'),
      description: fields.get('description'),
      contactEmail: fields.get('contactEmail'),
      registrationsEnabled: fields.get('registrationsEnabled') === 'on',
      externalCatalogEnabled: fields.get('externalCatalogEnabled') === 'on',
      supportEnabled: fields.get('supportEnabled') === 'on',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise as configurações');
      return;
    }
    setBusy(true);
    try {
      const updated = await api('/instance', { method: 'PATCH', body: jsonBody(parsed.data) });
      client.setQueryData(['instance'], updated);
      await client.invalidateQueries({ queryKey: ['support'] });
      toast.success('Configurações da instância salvas');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-page">
      <header className="page-heading">
        <h1>
          <Server size={23} style={{ display: 'inline', marginRight: 9 }} />
          Minha instância
        </h1>
        <p>
          Personalize o servidor que você administra. As alterações se aplicam a todos os usuários.
        </p>
      </header>
      <form key={result.dataUpdatedAt} onSubmit={save}>
        <section className="settings-section">
          <h2>Identidade e contato</h2>
          <div className="form-grid">
            <label className="field">
              Nome da instância
              <Input name="name" required maxLength={80} defaultValue={settings.name} />
            </label>
            <label className="field">
              Contato público do operador
              <Input
                name="contactEmail"
                type="email"
                defaultValue={settings.contactEmail}
                placeholder="Opcional"
              />
              <small>Esse e-mail ficará visível aos usuários do servidor.</small>
            </label>
          </div>
          <label className="field">
            Descrição
            <Textarea name="description" maxLength={280} defaultValue={settings.description} />
          </label>
        </section>
        <section className="settings-section">
          <h2>Acesso e serviços</h2>
          <label className="checkbox-field" style={{ marginBottom: 18 }}>
            <input
              name="registrationsEnabled"
              type="checkbox"
              defaultChecked={settings.registrationsEnabled}
            />
            Permitir novos cadastros
          </label>
          <label className="checkbox-field" style={{ marginBottom: 18 }}>
            <input
              name="externalCatalogEnabled"
              type="checkbox"
              defaultChecked={settings.externalCatalogEnabled}
            />
            Permitir consultas aos catálogos externos
          </label>
          <label className="checkbox-field">
            <input name="supportEnabled" type="checkbox" defaultChecked={settings.supportEnabled} />
            Exibir o apoio voluntário quando o Pix estiver configurado
          </label>
        </section>
        <section className="settings-section">
          <h2>Servidor e versão</h2>
          <p>
            Jinsei {settings.version} · {settings.publicUrl}
          </p>
          <p>
            Domínio, banco, chaves dos provedores e dados Pix são definidos pelo operador na
            configuração do servidor.
          </p>
          <a
            href="https://github.com/caio-kenai/Jinsei/blob/main/docs/SELFHOST.md"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            Guia de self-host e atualizações
          </a>
        </section>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="settings-save">
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}Salvar
            configurações
          </Button>
        </div>
      </form>
    </div>
  );
}
