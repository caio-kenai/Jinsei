'use client';
import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  Ban,
  Check,
  Clock,
  LoaderCircle,
  MessageCircle,
  Search,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import type { CommunityUser } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommunityEmpty, UserAvatar, UserName, relativeTime } from './community-ui';
import { useCommunityMutations, useFriends, useUserSearch } from './use-community';
import { UserSafetyMenu, useBlocks, useSafetyMutations } from './safety-actions';

const ease = [0.22, 1, 0.36, 1] as const;

export function FriendsScreen() {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const search = useUserSearch(deferred);
  const overview = useFriends();
  const { request, accept, dismiss, unfriend } = useCommunityMutations();
  const blocks = useBlocks().data?.users ?? [];
  const { unblock } = useSafetyMutations();
  const friends = overview.data?.friends ?? [];
  const requests = overview.data?.requests ?? [];
  const incoming = requests.filter((item) => item.direction === 'incoming');
  const outgoing = requests.filter((item) => item.direction === 'outgoing');
  const known = new Map<string, 'friends' | 'outgoing' | 'incoming'>([
    ...friends.map((friend) => [friend.id, 'friends'] as const),
    ...requests.map((item) => [item.user.id, item.direction] as const),
  ]);
  const searchAction = (user: CommunityUser) => {
    const state = known.get(user.id);
    if (state === 'friends')
      return (
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/community/messages?com=${user.id}`}>
            <MessageCircle size={14} />
            Conversar
          </Link>
        </Button>
      );
    if (state === 'outgoing')
      return (
        <span className="community-pill">
          <Clock size={12} />
          Pedido enviado
        </span>
      );
    return (
      <Button
        size="sm"
        disabled={request.isPending || !user.username}
        onClick={() => user.username && request.mutate(user.username)}
      >
        {state === 'incoming' ? <Check size={14} /> : <UserPlus size={14} />}
        {state === 'incoming' ? 'Aceitar' : 'Adicionar'}
      </Button>
    );
  };
  return (
    <div className="community-friends">
      <section className="community-card community-search">
        <div className="community-card-title">
          <Search size={16} />
          <h2>Encontrar pessoas</h2>
        </div>
        <label className="community-search-field">
          <Search size={15} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou @usuário"
            aria-label="Buscar pessoas"
          />
          {search.isFetching && <LoaderCircle size={15} className="spin" />}
        </label>
        <p className="community-hint">
          Perfis públicos aparecem pelo nome. Perfis privados só são encontrados pelo usuário exato.
        </p>
        <AnimatePresence initial={false}>
          {deferred.trim().length >= 2 && search.data && (
            <motion.ul
              className="community-people"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease }}
            >
              {search.data.users.length ? (
                search.data.users.map((user) => (
                  <li key={user.id}>
                    <UserAvatar user={user} />
                    <UserName user={user} />
                    {searchAction(user)}
                  </li>
                ))
              ) : (
                <li className="community-hint">Ninguém encontrado com esse nome.</li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </section>

      {incoming.length > 0 && (
        <section className="community-card community-requests">
          <div className="community-card-title">
            <UserPlus size={16} />
            <h2>Pedidos recebidos</h2>
            <span className="community-badge">{incoming.length}</span>
          </div>
          <ul className="community-people">
            <AnimatePresence initial={false}>
              {incoming.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                >
                  <UserAvatar user={item.user} />
                  <UserName user={item.user} />
                  <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                  <Button size="sm" onClick={() => accept.mutate(item.id)}>
                    <Check size={14} />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismiss.mutate(item.id)}
                    aria-label={`Recusar pedido de ${item.user.displayName}`}
                  >
                    <X size={14} />
                    Recusar
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      <section className="community-card">
        <div className="community-card-title">
          <UsersRound size={16} />
          <h2>Amigos</h2>
          <span className="group-number">{friends.length}</span>
        </div>
        {overview.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : friends.length === 0 ? (
          <CommunityEmpty icon={<UsersRound size={24} />} title="Sua lista de amigos está vazia">
            Busque pelo nome de usuário de alguém para enviar um pedido de amizade.
          </CommunityEmpty>
        ) : (
          <div className="community-friend-grid">
            {friends.map((friend, index) => (
              <motion.article
                key={friend.id}
                className="community-friend"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.4, ease }}
              >
                <UserAvatar user={friend} size={56} />
                <UserName user={friend} />
                <small>Amigos {relativeTime(friend.since)}</small>
                <div className="community-friend-actions">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/community/messages?com=${friend.id}`}>
                      <MessageCircle size={14} />
                      Conversar
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Desfazer amizade com ${friend.displayName}`}
                    title="Desfazer amizade"
                    onClick={() => {
                      if (window.confirm(`Desfazer a amizade com ${friend.displayName}?`))
                        unfriend.mutate(friend.id);
                    }}
                  >
                    <UserMinus size={15} />
                  </Button>
                  <UserSafetyMenu userId={friend.id} name={friend.displayName} />
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {blocks.length > 0 && (
        <section className="community-card">
          <div className="community-card-title">
            <Ban size={16} />
            <h2>Pessoas bloqueadas</h2>
            <span className="group-number">{blocks.length}</span>
          </div>
          <ul className="community-people">
            {blocks.map((user) => (
              <li key={user.id}>
                <UserAvatar user={user} />
                <UserName user={user} />
                <time dateTime={user.since}>{relativeTime(user.since)}</time>
                <Button size="sm" variant="ghost" onClick={() => unblock.mutate(user.id)}>
                  Desbloquear
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {outgoing.length > 0 && (
        <section className="community-card">
          <div className="community-card-title">
            <Clock size={16} />
            <h2>Pedidos enviados</h2>
          </div>
          <ul className="community-people">
            {outgoing.map((item) => (
              <li key={item.id}>
                <UserAvatar user={item.user} />
                <UserName user={item.user} />
                <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                <Button size="sm" variant="ghost" onClick={() => dismiss.mutate(item.id)}>
                  <X size={14} />
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
