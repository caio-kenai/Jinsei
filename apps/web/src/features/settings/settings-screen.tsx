'use client';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Check,
  Download,
  Globe2,
  KeyRound,
  Library,
  LoaderCircle,
  LogOut,
  Monitor,
  Palette,
  PartyPopper,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  categoryLabels,
  dateFormats,
  mediaTypes,
  preferencesPatchSchema,
  visualThemeLabels,
  visualThemeSchema,
  type AccountSession,
  type CurrentUser,
  type MediaType,
  type PreferencesPatch,
} from '@jinsei/contracts';
import { toast } from 'sonner';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { usePreferences } from '@/features/auth/use-preferences';
import { categoryIcons } from '@/components/shared/category-icons';
import { api, jsonBody } from '@/lib/api';
import { categoryColors } from '@/lib/palette';
import { celebrate } from '@/lib/celebrate';
import { transitionTheme } from '@/lib/theme-transition';
import { cn } from '@/lib/utils';
import { PublicProfileSettings } from './public-profile-settings';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const sections = [
  { id: 'perfil', label: 'Perfil', Icon: UserRound, color: '#7050cf' },
  { id: 'aparencia', label: 'Aparência', Icon: Palette, color: '#e5306f' },
  { id: 'biblioteca', label: 'Biblioteca', Icon: Library, color: '#2f7bff' },
  { id: 'preferencias', label: 'Idioma e região', Icon: Globe2, color: '#15936a' },
  { id: 'perfil-publico', label: 'Perfil público', Icon: UsersRound, color: '#f7832b' },
  { id: 'seguranca', label: 'Segurança', Icon: KeyRound, color: '#0e9aa7' },
  { id: 'dados', label: 'Dados e conta', Icon: ShieldAlert, color: '#d93a50' },
] as const;

const accents = [
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
] as const;

const modes = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'system', label: 'Automático' },
] as const;

const sample = new Date(2026, 10, 14, 21, 30);

export function SettingsScreen() {
  const { data: user } = useCurrentUser();
  return user ? <SettingsForm user={user} /> : null;
}

function Card({
  id,
  title,
  description,
  children,
  tone,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  tone?: 'danger';
}) {
  const section = sections.find((item) => item.id === id);
  const Icon = section?.Icon ?? UserRound;
  return (
    <motion.section
      id={id}
      className={cn('settings-card', tone === 'danger' && 'is-danger')}
      style={{ '--section-color': section?.color } as CSSProperties}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="settings-card-header">
        <span className="settings-card-icon">
          <Icon size={17} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="settings-card-body">{children}</div>
    </motion.section>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="settings-switch"
      onClick={() => onChange(!checked)}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} />
    </button>
  );
}

function ModePreview({ mode }: { mode: 'light' | 'dark' | 'system' }) {
  return (
    <span className={`mode-preview mode-${mode}`} aria-hidden="true">
      <span className="mode-half">
        <i className="mode-rail" />
        <i className="mode-side" />
        <span className="mode-main">
          <i />
          <i />
          <i />
        </span>
      </span>
      {mode === 'system' && (
        <span className="mode-half mode-dark-half">
          <i className="mode-rail" />
          <i className="mode-side" />
          <span className="mode-main">
            <i />
            <i />
            <i />
          </span>
        </span>
      )}
    </span>
  );
}

function useTimezones(current: string) {
  return useMemo(() => {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    const zones = supported?.length ? supported : [current];
    return zones.includes(current) ? zones : [current, ...zones];
  }, [current]);
}

function Sessions() {
  const client = useQueryClient();
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api<{ sessions: AccountSession[] }>('/users/me/sessions'),
  });
  const end = useMutation({
    mutationFn: (id: string | null) =>
      api<unknown>(id ? `/users/me/sessions/${id}` : '/users/me/sessions', { method: 'DELETE' }),
    onSuccess: (_, id) => {
      toast.success(id ? 'Sessão encerrada' : 'Outras sessões encerradas');
      void client.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error) => toast.error(error.message),
  });
  const [all, setAll] = useState(false);
  const total = sessions.data?.sessions ?? [];
  const list = all ? total : total.slice(0, 4);
  return (
    <div className="settings-sessions">
      <div className="settings-sessions-head">
        <strong>Sessões ativas</strong>
        {total.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            disabled={end.isPending}
            onClick={() => end.mutate(null)}
          >
            <LogOut size={14} />
            Encerrar as outras
          </Button>
        )}
      </div>
      {sessions.isPending ? (
        <LoaderCircle className="spin" size={16} />
      ) : (
        <ul>
          {list.map((session) => {
            const Icon =
              session.device === 'Celular'
                ? Smartphone
                : session.device === 'Tablet'
                  ? Tablet
                  : Monitor;
            return (
              <li key={session.id}>
                <span className="settings-session-icon">
                  <Icon size={17} />
                </span>
                <span className="settings-session-text">
                  <strong>
                    {session.browser} · {session.system}
                    {session.current && <em>Este dispositivo</em>}
                  </strong>
                  <small>
                    Ativa{' '}
                    {formatDistanceToNowStrict(parseISO(session.lastSeenAt), {
                      locale: ptBR,
                      addSuffix: true,
                    })}{' '}
                    · desde {format(parseISO(session.createdAt), 'd MMM yyyy', { locale: ptBR })}
                  </small>
                </span>
                {!session.current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={end.isPending}
                    onClick={() => end.mutate(session.id)}
                  >
                    Encerrar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {total.length > list.length && (
        <Button
          size="sm"
          variant="ghost"
          className="settings-sessions-more"
          onClick={() => setAll(true)}
        >
          Ver todas as {total.length} sessões
        </Button>
      )}
    </div>
  );
}

function SettingsForm({ user }: { user: CurrentUser }) {
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [active, setActive] = useState<string>(sections[0].id);
  const client = useQueryClient();
  const router = useRouter();
  const { setTheme } = useTheme();
  const preferences = usePreferences();
  const prefs = user.preferences;
  const zones = useTimezones(prefs.timezone);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (items) => {
        const visible = items.filter((item) => item.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  const save = (patch: PreferencesPatch, message = 'Preferência salva') =>
    preferences.mutate(patch, { onSuccess: () => toast.success(message, { duration: 1500 }) });

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const parsed = preferencesPatchSchema.safeParse({
      displayName: values.get('displayName'),
      username: values.get('username'),
      bio: values.get('bio'),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revise os dados');
      return;
    }
    preferences.mutate(parsed.data, { onSuccess: () => toast.success('Perfil salvo') });
  }
  function toggleCategory(type: MediaType, enabled: boolean) {
    const next = enabled
      ? mediaTypes.filter((item) => item === type || prefs.categories.includes(item))
      : prefs.categories.filter((item) => item !== type);
    if (!next.length) {
      toast.error('Mantenha ao menos uma categoria ativa');
      return;
    }
    preferences.mutate(
      { categories: next },
      {
        onSuccess: () => {
          void client.invalidateQueries({ queryKey: ['library'] });
          void client.invalidateQueries({ queryKey: ['summary'] });
        },
      },
    );
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
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Seções das configurações">
        <span className="settings-nav-title">Configurações</span>
        {sections.map(({ id, label, Icon, color }) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn('settings-nav-link', active === id && 'active')}
            style={{ '--section-color': color } as CSSProperties}
            onClick={() => setActive(id)}
          >
            <Icon size={15} />
            {label}
            {active === id && (
              <motion.span
                layoutId="settings-nav"
                className="settings-nav-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
          </a>
        ))}
      </nav>
      <div className="settings-content">
        <header className="settings-heading">
          <h1>Do seu jeito</h1>
          <p>Seu perfil, suas preferências e o controle da sua jornada.</p>
        </header>

        <Card id="perfil" title="Perfil" description="Como você aparece no Jinsei.">
          <form onSubmit={saveProfile} className="settings-form">
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
            <div className="settings-form-footer">
              <span>
                <ShieldCheck size={14} />
                Sua biblioteca é privada. Você decide o que publicar no perfil público.
              </span>
              <Button type="submit" disabled={preferences.isPending}>
                {preferences.isPending ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Save size={15} />
                )}
                Salvar perfil
              </Button>
            </div>
          </form>
        </Card>

        <Card
          id="aparencia"
          title="Aparência"
          description="As mudanças valem na hora e ficam salvas na sua conta."
        >
          <div className="settings-block">
            <strong>Modo de cor</strong>
            <div className="mode-picker" role="radiogroup" aria-label="Modo de cor">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.theme === mode.id}
                  className="mode-choice"
                  onClick={(event) => {
                    const target = event.currentTarget;
                    transitionTheme(() => setTheme(mode.id), target);
                    save({ theme: mode.id }, `Modo ${mode.label.toLowerCase()} ativado`);
                  }}
                >
                  <ModePreview mode={mode.id} />
                  <span>
                    {prefs.theme === mode.id && <Check size={13} strokeWidth={3} />}
                    {mode.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="settings-block">
            <strong>Cor de destaque</strong>
            <div className="accent-picker">
              {accents.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="accent-choice"
                  style={{ background: item.color }}
                  aria-label={item.label}
                  title={item.label}
                  aria-pressed={prefs.accent === item.id}
                  onClick={() => {
                    document.documentElement.dataset.accent = item.id;
                    save({ accent: item.id }, `Destaque ${item.label.toLowerCase()}`);
                  }}
                >
                  {prefs.accent === item.id && <Check size={16} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-block">
            <strong>Tema visual</strong>
            <div className="visual-theme-picker">
              {visualThemeSchema.options.map((id) => (
                <button
                  type="button"
                  key={id}
                  className="visual-theme-choice"
                  data-preview={id}
                  aria-pressed={prefs.visualTheme === id}
                  onClick={(event) => {
                    const target = event.currentTarget;
                    transitionTheme(() => {
                      document.documentElement.dataset.visualTheme = id;
                    }, target);
                    save({ visualTheme: id }, `Tema ${visualThemeLabels[id]} aplicado`);
                  }}
                >
                  <span className="visual-theme-swatch" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {visualThemeLabels[id]}
                  {prefs.visualTheme === id && <Check size={14} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
          <Row title="Densidade" description="Espaçamento padrão das listas e quadros.">
            <div className="settings-segmented" role="radiogroup" aria-label="Densidade">
              {(
                [
                  ['comfortable', 'Confortável'],
                  ['compact', 'Compacta'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.density === id}
                  className={cn(prefs.density === id && 'active')}
                  onClick={() => save({ density: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
        </Card>

        <Card
          id="biblioteca"
          title="Biblioteca"
          description="Desativar uma categoria apenas a esconde. Seus registros continuam guardados."
        >
          <div className="settings-categories">
            {mediaTypes.map((type) => {
              const Icon = categoryIcons[type];
              const enabled = prefs.categories.includes(type);
              return (
                <div
                  key={type}
                  className={cn('settings-category', enabled && 'enabled')}
                  style={{ '--cat': categoryColors[type] } as CSSProperties}
                >
                  <span className="settings-category-icon">
                    <Icon size={16} />
                  </span>
                  <strong>{categoryLabels[type]}</strong>
                  <Switch
                    checked={enabled}
                    label={`Mostrar ${categoryLabels[type]}`}
                    disabled={preferences.isPending}
                    onChange={(checked) => toggleCategory(type, checked)}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          id="preferencias"
          title="Idioma e região"
          description="Datas, horários e o fuso usado nas missões diárias."
        >
          <Row title="Idioma" description="Mais idiomas chegam em breve.">
            <Select value="pt-BR" onChange={() => undefined} aria-label="Idioma">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en" disabled>
                English (em breve)
              </option>
              <option value="es" disabled>
                Español (em breve)
              </option>
            </Select>
          </Row>
          <Row
            title="Fuso horário"
            description="Define quando o dia vira para sequências e missões."
          >
            <Select
              value={prefs.timezone}
              aria-label="Fuso horário"
              onChange={(event) => save({ timezone: event.target.value }, 'Fuso horário salvo')}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </Row>
          <Row title="Formato de data" description={`Ex.: ${format(sample, prefs.dateFormat)}`}>
            <Select
              value={prefs.dateFormat}
              aria-label="Formato de data"
              onChange={(event) =>
                save({ dateFormat: event.target.value as (typeof dateFormats)[number] })
              }
            >
              {dateFormats.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {pattern.toLowerCase()} · {format(sample, pattern)}
                </option>
              ))}
            </Select>
          </Row>
          <Row
            title="Formato de hora"
            description={`Ex.: ${format(sample, prefs.timeFormat === '12h' ? 'h:mm a' : 'HH:mm')}`}
          >
            <div className="settings-segmented" role="radiogroup" aria-label="Formato de hora">
              {(
                [
                  ['24h', '24 horas'],
                  ['12h', '12 horas'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.timeFormat === id}
                  className={cn(prefs.timeFormat === id && 'active')}
                  onClick={() => save({ timeFormat: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row
            title="Celebrações"
            description="Confetes ao concluir títulos, subir de nível e ganhar insígnias."
          >
            <div className="settings-inline">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(event) => celebrate(event.currentTarget)}
              >
                <PartyPopper size={14} />
                Testar
              </Button>
              <Switch
                checked={prefs.celebrations}
                label="Celebrações"
                onChange={(checked) => {
                  save({ celebrations: checked });
                  if (checked) celebrate();
                }}
              />
            </div>
          </Row>
        </Card>

        <div id="perfil-publico" className="settings-anchor">
          <PublicProfileSettings user={user} />
        </div>

        <Card
          id="seguranca"
          title="Segurança"
          description="Senha e dispositivos conectados à sua conta."
        >
          <form onSubmit={changePassword} className="settings-form">
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
            <div className="settings-form-footer">
              <span>Alterar a senha encerra todas as sessões, incluindo esta.</span>
              <Button type="submit" variant="outline" disabled={busy}>
                Alterar senha
              </Button>
            </div>
          </form>
          <Sessions />
        </Card>

        <Card
          id="dados"
          title="Dados e conta"
          description="Seus dados pertencem a você."
          tone="danger"
        >
          <Row
            title="Exportar meus dados"
            description="Biblioteca, preferências, coleções, metas e comunidade em JSON."
          >
            <Button asChild variant="outline" size="sm">
              <a href="/api/users/me/export" download>
                <Download size={14} />
                Exportar
              </a>
            </Button>
          </Row>
          <div className="settings-danger">
            <div className="settings-row-text">
              <strong>Zona de perigo</strong>
              <span>
                Excluir a conta remove biblioteca, anotações, progresso, mensagens, clubes que você
                criou e sessões. Não dá para desfazer.
              </span>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}>
              <Trash2 size={14} />
              Excluir minha conta
            </Button>
          </div>
          <div className="legal-links" style={{ justifyContent: 'start' }}>
            <Link href="/privacy">Privacidade e retenção</Link>
            <span>·</span>
            <Link href="/terms">Termos e licenças</Link>
          </div>
        </Card>
      </div>
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
