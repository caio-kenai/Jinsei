'use client';
import { currentDateLocale, msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useDeferredValue, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  Ban,
  CheckCircle2,
  Crown,
  Flag,
  History,
  LoaderCircle,
  MailCheck,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  moderationActionLabels,
  reportReasonLabels,
  type ModerationLogEntry,
  type ModerationReport,
  type ModerationSummary,
  type ModerationUser,
  type ReportResolution,
} from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { format, parseISO } from 'date-fns';
import { CommunityEmpty, UserAvatar, relativeTime } from '@/features/community/community-ui';

const base = '/admin/moderation';
const targetLabels: Record<ModerationReport['targetType'], string> = {
  user: msg('Perfil'),
  message: msg('Mensagem'),
  club: msg('Clube'),
  club_post: msg('Publicação em clube'),
  review: msg('Review'),
};
const logLabels: Record<string, string> = {
  dismiss: msg('Arquivou uma denúncia'),
  remove_content: msg('Removeu conteúdo'),
  suspend_user: msg('Suspendeu uma conta'),
  unsuspend_user: msg('Reativou uma conta'),
  grant_admin: msg('Concedeu administração'),
  revoke_admin: msg('Removeu administração'),
};
const tabs = [
  { id: 'reports', label: msg('Denúncias'), Icon: Flag, color: '#d93a50' },
  { id: 'people', label: msg('Pessoas'), Icon: Users, color: '#2f7bff' },
  { id: 'log', label: msg('Registro'), Icon: History, color: '#7050cf' },
] as const;

function useModeration() {
  const t = useT();
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: ['moderation'] });
  const onError = (error: Error) => toast.error(error.message);
  return {
    resolve: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ReportResolution }) =>
        api(`${base}/reports/${id}/resolve`, { method: 'POST', body: jsonBody(input) }),
      onSuccess: () => {
        toast.success(t('Denúncia analisada'));
        refresh();
      },
      onError,
    }),
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        api(`${base}/users/${id}/suspend`, { method: 'POST', body: jsonBody({ reason }) }),
      onSuccess: () => {
        toast.success(t('Conta suspensa'));
        refresh();
      },
      onError,
    }),
    unsuspend: useMutation({
      mutationFn: (id: string) => api(`${base}/users/${id}/unsuspend`, { method: 'POST' }),
      onSuccess: () => {
        toast.success(t('Conta reativada'));
        refresh();
      },
      onError,
    }),
    role: useMutation({
      mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
        api(`${base}/users/${id}/role`, { method: 'POST', body: jsonBody({ role }) }),
      onSuccess: () => {
        toast.success(t('Papel atualizado'));
        refresh();
      },
      onError,
    }),
  };
}

function UserBadges({ user }: { user: ModerationUser }) {
  const t = useT();
  return (
    <span className="moderation-badges">
      {user.role === 'admin' && (
        <em className="is-admin">
          <Crown size={11} />
          {t('Admin')}
        </em>
      )}
      {user.suspendedAt && (
        <em className="is-suspended">
          <Ban size={11} />
          {t('Suspensa')}
        </em>
      )}
      {user.mfaEnabled && (
        <em className="is-safe">
          <ShieldCheck size={11} />
          {t('2FA')}
        </em>
      )}
      {user.emailVerified && (
        <em>
          <MailCheck size={11} />
          {t('E-mail confirmado')}
        </em>
      )}
      {user.reports > 0 && (
        <em className="is-reported">
          <Flag size={11} />
          {user.reports} {user.reports === 1 ? t('denúncia') : t('denúncias')}
        </em>
      )}
    </span>
  );
}

function ReportCard({ report }: { report: ModerationReport }) {
  const t = useT();
  const { resolve } = useModeration();
  const [note, setNote] = useState('');
  const act = (action: ReportResolution['action']) =>
    resolve.mutate({ id: report.id, input: { action, note } });
  return (
    <motion.article
      layout
      className="moderation-report"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
    >
      <header>
        <span className="moderation-chip">{t(targetLabels[report.targetType])}</span>
        <strong>{t(reportReasonLabels[report.reason])}</strong>
        <time dateTime={report.createdAt}>{relativeTime(report.createdAt)}</time>
      </header>
      <blockquote>{report.snapshot || t('Sem texto.')}</blockquote>
      {report.details && <p className="moderation-details">“{report.details}”</p>}
      <div className="moderation-people">
        <span>
          {t('Denunciado:')}{' '}
          {report.targetUser ? (
            <>
              <strong>{report.targetUser.displayName}</strong>
              {report.targetUser.username && ` @${report.targetUser.username}`} ·{' '}
              {report.targetUser.email}
            </>
          ) : (
            t('conta excluída')
          )}
        </span>
        <span>
          {t('Por:')} {report.reporter?.displayName ?? t('conta excluída')}
        </span>
      </div>
      {report.targetUser && <UserBadges user={report.targetUser} />}
      {report.status === 'open' ? (
        <div className="moderation-decision">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t('Nota para o registro (opcional; vira o motivo da suspensão)')}
            aria-label={t('Nota da moderação')}
          />
          <div className="moderation-buttons">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => act('dismiss')}
              disabled={resolve.isPending}
            >
              <CheckCircle2 size={14} />
              {moderationActionLabels.dismiss}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act('remove_content')}
              disabled={resolve.isPending || !report.contentAvailable}
              title={report.contentAvailable ? undefined : t('O conteúdo já não existe')}
            >
              <Trash2 size={14} />
              {moderationActionLabels.remove_content}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => act('suspend_user')}
              disabled={
                resolve.isPending || !report.targetUser || report.targetUser.role === 'admin'
              }
            >
              <Ban size={14} />
              {moderationActionLabels.suspend_user}
            </Button>
          </div>
        </div>
      ) : (
        <p className="moderation-resolution">
          {report.status === 'dismissed' ? t('Arquivada') : t('Resolvida')}
          {report.resolvedAt && ` ${relativeTime(report.resolvedAt)}`}
          {report.resolution && ` · ${report.resolution}`}
        </p>
      )}
    </motion.article>
  );
}

function Reports() {
  const t = useT();
  const [status, setStatus] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const reports = useQuery({
    queryKey: ['moderation', 'reports', status],
    queryFn: () => api<{ reports: ModerationReport[] }>(`${base}/reports?status=${status}`),
  });
  return (
    <>
      <div className="community-segmented" role="group" aria-label={t('Situação das denúncias')}>
        {(
          [
            ['open', t('Abertas')],
            ['resolved', t('Resolvidas')],
            ['dismissed', t('Arquivadas')],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={cn(status === id && 'active')} onClick={() => setStatus(id)}>
            {label}
          </button>
        ))}
      </div>
      {reports.isPending ? (
        <div className="empty-state">
          <LoaderCircle className="spin" />
        </div>
      ) : !reports.data?.reports.length ? (
        <CommunityEmpty icon={<ShieldCheck size={24} />} title={t('Tudo em ordem')}>
          {status === 'open' ? t('Nenhuma denúncia esperando análise.') : t('Nada por aqui ainda.')}
        </CommunityEmpty>
      ) : (
        <div className="moderation-list">
          <AnimatePresence initial={false}>
            {reports.data.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

function People() {
  const t = useT();
  const me = useCurrentUser().data;
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [suspending, setSuspending] = useState<ModerationUser | null>(null);
  const [reason, setReason] = useState('');
  const users = useQuery({
    queryKey: ['moderation', 'users', deferred.trim()],
    queryFn: () =>
      api<{ users: ModerationUser[] }>(`${base}/users?q=${encodeURIComponent(deferred.trim())}`),
  });
  const { suspend, unsuspend, role } = useModeration();
  return (
    <>
      <label className="community-search-field moderation-search">
        <Search size={15} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Buscar por nome, @usuário ou e-mail')}
          aria-label={t('Buscar contas')}
        />
      </label>
      {users.isPending ? (
        <div className="empty-state">
          <LoaderCircle className="spin" />
        </div>
      ) : (
        <ul className="moderation-users">
          {users.data?.users.map((user) => (
            <li key={user.id} className={cn(user.suspendedAt && 'is-suspended')}>
              <UserAvatar user={user} size={38} />
              <div className="moderation-user-text">
                <strong>
                  {user.displayName}
                  {user.username && <small> @{user.username}</small>}
                </strong>
                <span>
                  {user.email} ·{' '}
                  {t('desde {date}', {
                    date: format(parseISO(user.createdAt), t('d MMM yyyy'), {
                      locale: currentDateLocale(),
                    }),
                  })}
                </span>
                {user.suspensionReason && (
                  <span className="moderation-reason">
                    {t('Motivo:')} {user.suspensionReason}
                  </span>
                )}
                <UserBadges user={user} />
              </div>
              {user.id !== me?.id && (
                <div className="moderation-buttons">
                  {user.role === 'admin' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => role.mutate({ id: user.id, role: 'user' })}
                    >
                      {t('Remover admin')}
                    </Button>
                  ) : (
                    !user.suspendedAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => role.mutate({ id: user.id, role: 'admin' })}
                      >
                        <Crown size={14} />
                        {t('Tornar admin')}
                      </Button>
                    )
                  )}
                  {user.suspendedAt ? (
                    <Button size="sm" variant="outline" onClick={() => unsuspend.mutate(user.id)}>
                      <UserCheck size={14} />
                      {t('Reativar')}
                    </Button>
                  ) : (
                    user.role !== 'admin' && (
                      <Button size="sm" variant="destructive" onClick={() => setSuspending(user)}>
                        <Ban size={14} />
                        {t('Suspender')}
                      </Button>
                    )
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={Boolean(suspending)} onOpenChange={(open) => !open && setSuspending(null)}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            {t('Suspender')} {suspending?.displayName}?
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {t(
              'A pessoa perde todas as sessões, não consegue entrar e some da comunidade, do perfil público e das reviews até ser reativada.',
            )}
          </DialogDescription>
          <form
            className="mfa-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!suspending) return;
              suspend.mutate(
                { id: suspending.id, reason },
                {
                  onSuccess: () => {
                    setSuspending(null);
                    setReason('');
                  },
                },
              );
            }}
          >
            <label className="field">
              {t('Motivo')}
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={500}
                rows={3}
                required
              />
            </label>
            <div className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setSuspending(null)}>
                {t('Cancelar')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={reason.trim().length < 3 || suspend.isPending}
              >
                {t('Suspender conta')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Log() {
  const t = useT();
  const log = useQuery({
    queryKey: ['moderation', 'log'],
    queryFn: () => api<{ entries: ModerationLogEntry[] }>(`${base}/log`),
  });
  if (log.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  if (!log.data?.entries.length)
    return (
      <CommunityEmpty icon={<History size={24} />} title={t('Sem ações registradas')}>
        {t('Cada decisão da moderação aparece aqui.')}
      </CommunityEmpty>
    );
  return (
    <ol className="moderation-log">
      {log.data.entries.map((entry) => (
        <li key={entry.id}>
          {entry.moderator && <UserAvatar user={entry.moderator} size={28} />}
          <div>
            <strong>{entry.moderator?.displayName ?? t('Conta excluída')}</strong>{' '}
            {(t(logLabels[entry.action]) ?? entry.action).toLowerCase()}
            {entry.note && <span className="moderation-reason"> · {entry.note}</span>}
          </div>
          <time dateTime={entry.createdAt}>{relativeTime(entry.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}

export function ModerationScreen() {
  const t = useT();
  const me = useCurrentUser().data;
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('reports');
  const summary = useQuery({
    queryKey: ['moderation', 'summary'],
    queryFn: () => api<ModerationSummary>(`${base}/summary`),
    enabled: Boolean(me?.isAdmin),
  });
  if (me && !me.isAdmin)
    return (
      <CommunityEmpty icon={<ShieldAlert size={24} />} title={t('Área da administração')}>
        {t('Somente quem administra esta instância pode moderar a comunidade.')}
      </CommunityEmpty>
    );
  const cards = [
    {
      label: t('Denúncias abertas'),
      value: summary.data?.openReports,
      Icon: Flag,
      color: '#d93a50',
    },
    {
      label: t('Contas suspensas'),
      value: summary.data?.suspendedUsers,
      Icon: Ban,
      color: '#f7832b',
    },
    { label: t('Pessoas'), value: summary.data?.users, Icon: Users, color: '#2f7bff' },
    { label: t('Administradores'), value: summary.data?.admins, Icon: Crown, color: '#7050cf' },
  ];
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon moderation-context-icon">
            <ShieldAlert size={14} />
          </span>
          <div>
            <h1>{t('Moderação')}</h1>
            <div className="breadcrumb">{t('Denúncias, contas e registro da instância')}</div>
          </div>
        </div>
      </header>
      <nav className="view-tabs community-tabs" aria-label={t('Seções da moderação')}>
        {tabs.map(({ id, label, Icon, color }) => (
          <button
            key={id}
            className={cn('view-tab community-tab', tab === id && 'active')}
            style={{ '--tab-color': color } as CSSProperties}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {t(label)}
            {id === 'reports' && Boolean(summary.data?.openReports) && (
              <span className="community-badge">{summary.data?.openReports}</span>
            )}
            {tab === id && (
              <motion.span layoutId="moderation-tab" className="community-tab-indicator" />
            )}
          </button>
        ))}
      </nav>
      <div className="library-scroll community-page">
        <div className="moderation-page">
          <div className="community-stats">
            {cards.map(({ label, value, Icon, color }) => (
              <div
                key={label}
                className="community-stat"
                style={{ '--stat-color': color } as CSSProperties}
              >
                <span className="community-stat-icon">
                  <Icon size={17} />
                </span>
                <span>
                  <strong>{value ?? '—'}</strong>
                  <small>{label}</small>
                </span>
              </div>
            ))}
          </div>
          {tab === 'reports' ? <Reports /> : tab === 'people' ? <People /> : <Log />}
        </div>
      </div>
    </>
  );
}
