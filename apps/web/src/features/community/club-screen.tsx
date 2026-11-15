'use client';
import { useT } from '@/i18n/provider';
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Crown,
  LoaderCircle,
  LogIn,
  LogOut,
  MessageSquareText,
  Pencil,
  Send,
  Tent,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { categoryLabels } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { categoryIcons } from '@/components/shared/category-icons';
import { NumberTicker } from '@/components/motion/number-ticker';
import { ClubFormDialog, clubColor } from './clubs-screen';
import { CommunityEmpty, UserAvatar, UserName, relativeTime } from './community-ui';
import { useClub, useCommunityMutations } from './use-community';
import { ReportButton } from './safety-actions';
import { useCurrentUser } from '@/features/auth/use-current-user';

const ease = [0.22, 1, 0.36, 1] as const;

export function ClubScreen({ slug }: { slug: string }) {
  const t = useT();
  const router = useRouter();
  const club = useClub(slug);
  const me = useCurrentUser().data?.id;
  const { join, leave, post, removePost, removeClub } = useCommunityMutations();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  if (club.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  if (club.error || !club.data)
    return (
      <CommunityEmpty
        icon={<Tent size={24} />}
        title={t('Clube não encontrado')}
        action={
          <Button variant="outline" asChild>
            <Link href="/community/clubs">{t('Ver clubes')}</Link>
          </Button>
        }
      >
        {t('Ele pode ter sido excluído por quem o criou.')}
      </CommunityEmpty>
    );
  const data = club.data;
  const Icon = data.mediaType ? categoryIcons[data.mediaType] : Tent;
  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    post.mutate({ slug, body }, { onSuccess: () => setDraft('') });
  };
  return (
    <div className="community-club" style={{ '--cat': clubColor(data) } as CSSProperties}>
      <motion.header
        className="community-club-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Link
          href="/community/clubs"
          className="community-back"
          aria-label={t('Voltar aos clubes')}
        >
          <ArrowLeft size={16} />
        </Link>
        <span className="community-club-hero-icon">
          <Icon size={26} />
        </span>
        <div className="community-club-hero-text">
          <span className="community-category">
            {data.mediaType ? t(categoryLabels[data.mediaType]) : t('Todas as categorias')}
          </span>
          <h2>{data.name}</h2>
          {data.description && <p>{data.description}</p>}
          <div className="community-club-numbers">
            <span>
              <UsersRound size={14} />
              <NumberTicker value={data.memberCount} /> {t('membros')}
            </span>
            <span>
              <MessageSquareText size={14} />
              <NumberTicker value={data.postCount} /> {t('publicações')}
            </span>
            <span>
              {t('Criado')} {relativeTime(data.createdAt)}
            </span>
          </div>
        </div>
        <div className="community-club-actions">
          {data.role !== 'owner' && (
            <ReportButton
              target={{ targetType: 'club', targetId: data.id }}
              label={t('Denunciar clube')}
              className="club-report"
            />
          )}
          {data.role === 'owner' ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil size={14} />
                {t('Editar')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      t('Excluir o clube {name} e todas as publicações?', { name: data.name }),
                    )
                  )
                    removeClub.mutate(slug, { onSuccess: () => router.push('/community/clubs') });
                }}
              >
                <Trash2 size={14} />
                {t('Excluir')}
              </Button>
            </>
          ) : data.role === 'member' ? (
            <Button size="sm" variant="outline" onClick={() => leave.mutate(slug)}>
              <LogOut size={14} />
              {t('Sair do clube')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => join.mutate(slug)} disabled={join.isPending}>
              <LogIn size={14} />
              {t('Entrar no clube')}
            </Button>
          )}
        </div>
      </motion.header>
      <div className="community-columns">
        <section className="community-card">
          {data.role ? (
            <form
              className="community-composer community-post-composer"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <Textarea
                value={draft}
                rows={2}
                maxLength={2000}
                placeholder={t('Compartilhe algo com o clube')}
                aria-label={t('Nova publicação')}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
              <Button type="submit" size="sm" disabled={!draft.trim() || post.isPending}>
                {post.isPending ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}
                {t('Publicar')}
              </Button>
            </form>
          ) : (
            <p className="community-hint">{t('Entre no clube para publicar.')}</p>
          )}
          {data.posts.length === 0 ? (
            <CommunityEmpty
              icon={<MessageSquareText size={24} />}
              title={t('Nenhuma publicação ainda')}
            >
              {t('Que tal abrir a conversa?')}
            </CommunityEmpty>
          ) : (
            <ol className="community-posts">
              <AnimatePresence initial={false}>
                {data.posts.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <UserAvatar user={item.author} size={34} />
                    <div className="community-post-body">
                      <div className="community-feed-head">
                        <UserName user={item.author} />
                        <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                        {item.author.id !== me && (
                          <ReportButton
                            target={{ targetType: 'club_post', targetId: item.id }}
                            label={t('Denunciar publicação')}
                          />
                        )}
                        {item.canDelete && (
                          <button
                            className="community-icon-link"
                            aria-label={t('Excluir publicação')}
                            onClick={() => removePost.mutate({ slug, id: item.id })}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p>{item.body}</p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </section>
        <aside className="community-side">
          <section className="community-card">
            <div className="community-card-title">
              <UsersRound size={16} />
              <h2>{t('Membros')}</h2>
              <span className="group-number">{data.memberCount}</span>
            </div>
            <ul className="community-mini-list">
              {data.members.map((member) => (
                <li key={member.id}>
                  <UserAvatar user={member} size={30} />
                  <UserName user={member} />
                  {member.role === 'owner' && (
                    <Crown size={14} className="community-crown" aria-label={t('Criador')} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      {editing && <ClubFormDialog open onOpenChange={setEditing} club={data} />}
    </div>
  );
}
