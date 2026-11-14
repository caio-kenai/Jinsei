'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, LoaderCircle, MessagesSquare, Send, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/lib/date-format';
import { CommunityEmpty, UserAvatar, UserName, relativeTime } from './community-ui';
import {
  useCommunityMutations,
  useConversation,
  useConversations,
  useFriends,
} from './use-community';

function Thread({ userId }: { userId: string }) {
  const formatTime = useDateFormat().time;
  const conversation = useConversation(userId);
  const { send } = useCommunityMutations();
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const count = conversation.data?.messages.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: count > 0 ? 'smooth' : 'auto' });
  }, [count]);
  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate({ userId, body }, { onSuccess: () => setDraft('') });
  };
  if (conversation.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  if (conversation.error || !conversation.data)
    return (
      <CommunityEmpty icon={<MessagesSquare size={24} />} title="Conversa indisponível">
        Vocês precisam ser amigos para trocar mensagens.
      </CommunityEmpty>
    );
  const { user, messages, canMessage } = conversation.data;
  return (
    <div className="community-thread">
      <header className="community-thread-header">
        <Link href="/community/messages" className="community-back" aria-label="Voltar">
          <ArrowLeft size={16} />
        </Link>
        <UserAvatar user={user} size={34} />
        <UserName user={user} />
      </header>
      <div className="community-thread-messages" aria-live="polite">
        {messages.length === 0 && (
          <p className="community-hint community-thread-start">
            Comece a conversa com {user.displayName}.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const date = parseISO(message.createdAt);
            const previous = messages[index - 1];
            const newDay = !previous || !isSameDay(parseISO(previous.createdAt), date);
            return (
              <motion.div
                key={message.id}
                className="community-message-row"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22 }}
              >
                {newDay && (
                  <div className="community-day">
                    {format(date, "d 'de' MMMM", { locale: ptBR })}
                  </div>
                )}
                <div className={cn('community-message', message.mine && 'mine')}>
                  <p>{message.body}</p>
                  <time dateTime={message.createdAt}>
                    {formatTime(date)}
                    {message.mine && message.readAt && ' · lida'}
                  </time>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={end} />
      </div>
      {canMessage ? (
        <form
          className="community-composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Textarea
            value={draft}
            maxLength={2000}
            rows={1}
            placeholder={`Mensagem para ${user.displayName}`}
            aria-label="Mensagem"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || send.isPending}
            aria-label="Enviar"
          >
            {send.isPending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
          </Button>
        </form>
      ) : (
        <p className="community-hint community-composer-off">
          Vocês não são mais amigos; o histórico continua visível, mas novas mensagens estão
          desativadas.
        </p>
      )}
    </div>
  );
}

export function MessagesScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get('com');
  const conversations = useConversations();
  const friends = useFriends().data?.friends ?? [];
  const list = conversations.data?.conversations ?? [];
  const withoutConversation = friends.filter(
    (friend) => !list.some((item) => item.user.id === friend.id),
  );
  return (
    <div className={cn('community-messages', selected && 'has-thread')}>
      <aside className="community-inbox">
        {conversations.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : (
          <ul>
            {list.map((item) => (
              <li key={item.user.id}>
                <button
                  className={cn('community-inbox-item', selected === item.user.id && 'active')}
                  onClick={() => router.replace(`/community/messages?com=${item.user.id}`)}
                >
                  <UserAvatar user={item.user} size={38} />
                  <span className="community-inbox-text">
                    <span className="community-inbox-top">
                      <strong>{item.user.displayName}</strong>
                      <time dateTime={item.lastMessage.createdAt}>
                        {relativeTime(item.lastMessage.createdAt)}
                      </time>
                    </span>
                    <span className="community-inbox-preview">
                      {item.lastMessage.mine && 'Você: '}
                      {item.lastMessage.body}
                    </span>
                  </span>
                  {item.unread > 0 && <span className="community-badge">{item.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {withoutConversation.length > 0 && (
          <div className="community-inbox-friends">
            <h3>Começar conversa</h3>
            <div>
              {withoutConversation.slice(0, 12).map((friend) => (
                <button
                  key={friend.id}
                  title={friend.displayName}
                  aria-label={`Conversar com ${friend.displayName}`}
                  onClick={() => router.replace(`/community/messages?com=${friend.id}`)}
                >
                  <UserAvatar user={friend} size={34} />
                </button>
              ))}
            </div>
          </div>
        )}
        {!conversations.isPending && list.length === 0 && friends.length === 0 && (
          <CommunityEmpty
            icon={<MessagesSquare size={24} />}
            title="Nenhuma conversa"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/community/friends">
                  <UserPlus size={14} />
                  Adicionar amigos
                </Link>
              </Button>
            }
          >
            As conversas são privadas e acontecem entre amigos.
          </CommunityEmpty>
        )}
      </aside>
      <section className="community-thread-pane">
        {selected ? (
          <Thread key={selected} userId={selected} />
        ) : (
          <CommunityEmpty icon={<MessagesSquare size={24} />} title="Suas mensagens">
            Escolha uma conversa ao lado ou comece uma nova com um amigo.
          </CommunityEmpty>
        )}
      </section>
    </div>
  );
}
