'use client';
import { useT } from '@/i18n/provider';
import { useDeferredValue, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { LoaderCircle, MessageSquareText, Plus, Search, Tent, UsersRound } from 'lucide-react';
import { categoryLabels, mediaTypes, type Club, type MediaType } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { categoryIcons } from '@/components/shared/category-icons';
import { categoryColors } from '@/lib/palette';
import { cn } from '@/lib/utils';
import { CommunityEmpty, UserAvatar, relativeTime } from './community-ui';
import { useClubs, useCommunityMutations } from './use-community';

const ease = [0.22, 1, 0.36, 1] as const;
export const clubColor = (club: Pick<Club, 'mediaType'>) =>
  club.mediaType ? categoryColors[club.mediaType] : '#7050cf';

export function ClubFormDialog({
  open,
  onOpenChange,
  club,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club?: Club;
}) {
  const t = useT();
  const router = useRouter();
  const { createClub, updateClub } = useCommunityMutations();
  const [name, setName] = useState(club?.name ?? '');
  const [description, setDescription] = useState(club?.description ?? '');
  const [mediaType, setMediaType] = useState<MediaType | ''>(club?.mediaType ?? '');
  const pending = createClub.isPending || updateClub.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="community-dialog">
        <DialogTitle>{club ? t('Editar clube') : t('Novo clube')}</DialogTitle>
        <DialogDescription>
          {t('Clubes reúnem pessoas em torno de uma categoria, franquia ou tema.')}
        </DialogDescription>
        <form
          className="community-form"
          onSubmit={(event) => {
            event.preventDefault();
            const input = { name, description, mediaType: mediaType || null };
            if (club)
              updateClub.mutate(
                { slug: club.slug, changes: input },
                { onSuccess: () => onOpenChange(false) },
              );
            else
              createClub.mutate(input, {
                onSuccess: (created) => {
                  onOpenChange(false);
                  router.push(`/community/clubs/${created.slug}`);
                },
              });
          }}
        >
          <label>
            {t('Nome')}
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={60}
              required
              placeholder={t('Ex.: Clube dos RPGs japoneses')}
            />
          </label>
          <label>
            {t('Descrição')}
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t('Sobre o que o clube conversa?')}
            />
          </label>
          <label>
            {t('Categoria')}
            <Select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as MediaType | '')}
            >
              <option value="">{t('Todas as categorias')}</option>
              {mediaTypes.map((type) => (
                <option key={type} value={type}>
                  {t(categoryLabels[type])}
                </option>
              ))}
            </Select>
          </label>
          <div className="community-form-actions">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('Cancelar')}
            </Button>
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              {pending && <LoaderCircle size={14} className="spin" />}
              {club ? t('Salvar') : t('Criar clube')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClubsScreen() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);
  const deferred = useDeferredValue(query);
  const clubs = useClubs(deferred, mine);
  return (
    <div className="community-clubs">
      <div className="community-toolbar">
        <label className="community-search-field">
          <Search size={15} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Buscar clubes')}
            aria-label={t('Buscar clubes')}
          />
        </label>
        <div className="community-segmented" role="group" aria-label={t('Filtrar clubes')}>
          <button className={cn(!mine && 'active')} onClick={() => setMine(false)}>
            {t('Todos')}
          </button>
          <button className={cn(mine && 'active')} onClick={() => setMine(true)}>
            {t('Meus clubes')}
          </button>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} />
          {t('Novo clube')}
        </Button>
      </div>
      {clubs.isPending ? (
        <div className="empty-state">
          <LoaderCircle className="spin" />
        </div>
      ) : !clubs.data?.clubs.length ? (
        <CommunityEmpty
          icon={<Tent size={24} />}
          title={mine ? t('Você ainda não está em nenhum clube') : t('Nenhum clube encontrado')}
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus size={14} />
              {t('Criar um clube')}
            </Button>
          }
        >
          {t('Crie um espaço para conversar sobre seus jogos, animes, livros e séries favoritos.')}
        </CommunityEmpty>
      ) : (
        <div className="community-club-grid">
          {clubs.data.clubs.map((club, index) => {
            const Icon = club.mediaType ? categoryIcons[club.mediaType] : Tent;
            return (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 12) * 0.04, duration: 0.45, ease }}
              >
                <Link
                  href={`/community/clubs/${club.slug}`}
                  className="community-club-card"
                  style={{ '--cat': clubColor(club) } as CSSProperties}
                >
                  <span className="community-club-banner">
                    <Icon size={22} />
                    {club.role && (
                      <span className="community-pill">
                        {club.role === 'owner' ? t('Criador') : t('Membro')}
                      </span>
                    )}
                  </span>
                  <span className="community-club-body">
                    <strong>{club.name}</strong>
                    <span className="community-club-description">
                      {club.description || t('Sem descrição.')}
                    </span>
                    <span className="community-club-meta">
                      <span>
                        <UsersRound size={13} />
                        {club.memberCount}
                      </span>
                      <span>
                        <MessageSquareText size={13} />
                        {club.postCount}
                      </span>
                      <span>{club.mediaType ? t(categoryLabels[club.mediaType]) : t('Geral')}</span>
                    </span>
                    <span className="community-club-owner">
                      <UserAvatar user={club.owner} size={20} />
                      {club.owner.displayName} {t('· ativo')} {relativeTime(club.lastActivityAt)}
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
      {creating && <ClubFormDialog open onOpenChange={setCreating} />}
    </div>
  );
}
