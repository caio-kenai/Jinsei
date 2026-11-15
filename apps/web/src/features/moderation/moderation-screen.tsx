'use client';
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
import { CommunityEmpty, UserAvatar, relativeTime } from '@/features/community/community-ui';

const base = '/admin/moderation';
const targetLabels: Record<ModerationReport['targetType'], string> = {
  user: 'Perfil',
  message: 'Mensagem',
  club: 'Clube',
  club_post: 'Publicação em clube',
  review: 'Review',
};
const logLabels: Record<string, string> = {
  dismiss: 'Arquivou uma denúncia',
  remove_content: 'Removeu conteúdo',
  suspend_user: 'Suspendeu uma conta',
  unsuspend_user: 'Reativou uma conta',
  grant_admin: 'Concedeu administração',
  revoke_admin: 'Removeu administração',
};
const tabs = [
  { id: 'reports', label: 'Denúncias', Icon: Flag, color: '#d93a50' },
  { id: 'people', label: 'Pessoas', Icon: Users, color: '#2f7bff' },
  { id: 'log', label: 'Registro', Icon: History, color: '#7050cf' },
] as const;

function useModeration() {
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: ['moderation'] });
  const onError = (error: Error) => toast.error(error.message);
  return {
    resolve: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ReportResolution }) =>
        api(`${base}/reports/${id}/resolve`, { method: 'POST', body: jsonBody(input) }),
      onSuccess: () => {
        toast.success('Denúncia analisada');
        refresh();
      },
      onError,
    }),
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        api(`${base}/users/${id}/suspend`, { method: 'POST', body: jsonBody({ reason }) }),
      onSuccess: () => {
        toast.success('Conta suspensa');
        refresh();
      },
      onError,
    }),
    unsuspend: useMutation({
      mutationFn: (id: string) => api(`${base}/users/${id}/unsuspend`, { method: 'POST' }),
      onSuccess: () => {
        toast.success('Conta reativada');
        refresh();
      },
      onError,
    }),
    role: useMutation({
      mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
        api(`${base}/users/${id}/role`, { method: 'POST', body: jsonBody({ role }) }),
      onSuccess: () => {
        toast.success('Papel atualizado');
        refresh();
      },
      onError,
    }),
  };
}

function UserBadges({ user }: { user: ModerationUser }) {
  return (
    <span className="moderation-badges">
      {user.role === 'admin' && (
        <em className="is-admin">
          <Crown size={11} />
          Admin
        </em>
      )}
      {user.suspendedAt && (
        <em className="is-suspended">
          <Ban size={11} />
          Suspensa
        </em>
      )}
      {user.mfaEnabled && (
        <em className="is-safe">
          <ShieldCheck size={11} />
          2FA
        </em>
      )}
      {user.emailVerified && (
        <em>
          <MailCheck size={11} />
          E-mail confirmado
        </em>
      )}
      {user.reports > 0 && (
        <em className="is-reported">
          <Flag size={11} />
          {user.reports} {user.reports === 1 ? 'denúncia' : 'denúncias'}
        </em>
      )}
    </span>
  );
}

function ReportCard({ report }: { report: ModerationReport }) {
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
        <span className="moderation-chip">{targetLabels[report.targetType]}</span>
        <strong>{reportReasonLabels[report.reason]}</strong>
        <time dateTime={report.createdAt}>{relativeTime(report.createdAt)}</time>
      </header>
      <blockquote>{report.snapshot || 'Sem texto.'}</blockquote>
      {report.details && <p className="moderation-details">“{report.details}”</p>}
      <div className="moderation-people">
        <span>
          Denunciado:{' '}
          {report.targetUser ? (
            <>
              <strong>{report.targetUser.displayName}</strong>
              {report.targetUser.username && ` @${report.targetUser.username}`} ·{' '}
              {report.targetUser.email}
            </>
          ) : (
            'conta excluída'
          )}
        </span>
        <span>Por: {report.reporter?.displayName ?? 'conta excluída'}</span>
      </div>
      {report.targetUser && <UserBadges user={report.targetUser} />}
      {report.status === 'open' ? (
        <div className="moderation-decision">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Nota para o registro (opcional; vira o motivo da suspensão)"
            aria-label="Nota da moderação"
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
              title={report.contentAvailable ? undefined : 'O conteúdo já não existe'}
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
          {report.status === 'dismissed' ? 'Arquivada' : 'Resolvida'}
          {report.resolvedAt && ` ${relativeTime(report.resolvedAt)}`}
          {report.resolution && ` · ${report.resolution}`}
        </p>
      )}
    </motion.article>
  );
}

function Reports() {
  const [status, setStatus] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const reports = useQuery({
    queryKey: ['moderation', 'reports', status],
    queryFn: () => api<{ reports: ModerationReport[] }>(`${base}/reports?status=${status}`),
  });
  return (
    <>
      <div className="community-segmented" role="group" aria-label="Situação das denúncias">
        {(
          [
            ['open', 'Abertas'],
            ['resolved', 'Resolvidas'],
            ['dismissed', 'Arquivadas'],
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
        <CommunityEmpty icon={<ShieldCheck size={24} />} title="Tudo em ordem">
          {status === 'open' ? 'Nenhuma denúncia esperando análise.' : 'Nada por aqui ainda.'}
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
          placeholder="Buscar por nome, @usuário ou e-mail"
          aria-label="Buscar contas"
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
                  {user.email} · desde {relativeTime(user.createdAt).replace('há ', '')}
                </span>
                {user.suspensionReason && (
                  <span className="moderation-reason">Motivo: {user.suspensionReason}</span>
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
                      Remover admin
                    </Button>
                  ) : (
                    !user.suspendedAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => role.mutate({ id: user.id, role: 'admin' })}
                      >
                        <Crown size={14} />
                        Tornar admin
                      </Button>
                    )
                  )}
                  {user.suspendedAt ? (
                    <Button size="sm" variant="outline" onClick={() => unsuspend.mutate(user.id)}>
                      <UserCheck size={14} />
                      Reativar
                    </Button>
                  ) : (
                    user.role !== 'admin' && (
                      <Button size="sm" variant="destructive" onClick={() => setSuspending(user)}>
                        <Ban size={14} />
                        Suspender
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
          <DialogTitle className="dialog-title">Suspender {suspending?.displayName}?</DialogTitle>
          <DialogDescription className="dialog-description">
            A pessoa perde todas as sessões, não consegue entrar e some da comunidade, do perfil
            público e das reviews até ser reativada.
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
              Motivo
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
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={reason.trim().length < 3 || suspend.isPending}
              >
                Suspender conta
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Log() {
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
      <CommunityEmpty icon={<History size={24} />} title="Sem ações registradas">
        Cada decisão da moderação aparece aqui.
      </CommunityEmpty>
    );
  return (
    <ol className="moderation-log">
      {log.data.entries.map((entry) => (
        <li key={entry.id}>
          {entry.moderator && <UserAvatar user={entry.moderator} size={28} />}
          <div>
            <strong>{entry.moderator?.displayName ?? 'Conta excluída'}</strong>{' '}
            {(logLabels[entry.action] ?? entry.action).toLowerCase()}
            {entry.note && <span className="moderation-reason"> · {entry.note}</span>}
          </div>
          <time dateTime={entry.createdAt}>{relativeTime(entry.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}

export function ModerationScreen() {
  const me = useCurrentUser().data;
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('reports');
  const summary = useQuery({
    queryKey: ['moderation', 'summary'],
    queryFn: () => api<ModerationSummary>(`${base}/summary`),
    enabled: Boolean(me?.isAdmin),
  });
  if (me && !me.isAdmin)
    return (
      <CommunityEmpty icon={<ShieldAlert size={24} />} title="Área da administração">
        Somente quem administra esta instância pode moderar a comunidade.
      </CommunityEmpty>
    );
  const cards = [
    { label: 'Denúncias abertas', value: summary.data?.openReports, Icon: Flag, color: '#d93a50' },
    { label: 'Contas suspensas', value: summary.data?.suspendedUsers, Icon: Ban, color: '#f7832b' },
    { label: 'Pessoas', value: summary.data?.users, Icon: Users, color: '#2f7bff' },
    { label: 'Administradores', value: summary.data?.admins, Icon: Crown, color: '#7050cf' },
  ];
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon moderation-context-icon">
            <ShieldAlert size={14} />
          </span>
          <div>
            <h1>Moderação</h1>
            <div className="breadcrumb">Denúncias, contas e registro da instância</div>
          </div>
        </div>
      </header>
      <nav className="view-tabs community-tabs" aria-label="Seções da moderação">
        {tabs.map(({ id, label, Icon, color }) => (
          <button
            key={id}
            className={cn('view-tab community-tab', tab === id && 'active')}
            style={{ '--tab-color': color } as CSSProperties}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
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
