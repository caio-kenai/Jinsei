'use client';
import Link from 'next/link';
import { Check, Clock, MessageCircle, ShieldCheck, UserPlus } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCommunityMutations, useRelationship } from './use-community';
import { UserSafetyMenu, useSafetyMutations } from './safety-actions';

/** Friendship actions shown on a public profile, for signed-in visitors. */
function FriendAction({ username }: { username: string }) {
  const me = useCurrentUser();
  const signedIn = Boolean(me.data);
  const relationship = useRelationship(username, signedIn);
  const { request, accept } = useCommunityMutations();
  const { unblock } = useSafetyMutations();
  if (me.isPending) return null;
  if (!signedIn)
    return (
      <Link href="/login" className="profile-action">
        <UserPlus size={15} />
        Entrar para adicionar
      </Link>
    );
  const data = relationship.data;
  if (!data || data.state === 'self') return null;
  if (data.state === 'blocked')
    return (
      <button
        className="profile-action"
        disabled={unblock.isPending}
        onClick={() => unblock.mutate(data.user.id)}
      >
        <ShieldCheck size={15} />
        Desbloquear
      </button>
    );
  if (data.state === 'friends')
    return (
      <Link href={`/community/messages?com=${data.user.id}`} className="profile-action is-primary">
        <MessageCircle size={15} />
        Enviar mensagem
      </Link>
    );
  if (data.state === 'outgoing')
    return (
      <span className="profile-action">
        <Clock size={15} />
        Pedido enviado
      </span>
    );
  return (
    <button
      className="profile-action is-primary"
      disabled={request.isPending || accept.isPending}
      onClick={() =>
        data.state === 'incoming' && data.requestId
          ? accept.mutate(data.requestId)
          : request.mutate(username)
      }
    >
      {data.state === 'incoming' ? <Check size={15} /> : <UserPlus size={15} />}
      {data.state === 'incoming' ? 'Aceitar amizade' : 'Adicionar amigo'}
    </button>
  );
}

/** Friendship action plus report and block for signed-in visitors. */
export function FriendButton({ username }: { username: string }) {
  const me = useCurrentUser();
  const relationship = useRelationship(username, Boolean(me.data));
  const data = relationship.data;
  return (
    <div className="profile-actions">
      <FriendAction username={username} />
      {data && data.state !== 'self' && (
        <UserSafetyMenu
          userId={data.user.id}
          name={data.user.displayName}
          blocked={data.state === 'blocked'}
          className="profile-safety"
        />
      )}
    </div>
  );
}
