'use client';
import { useT } from '@/i18n/provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Club,
  ClubDetail,
  ClubInput,
  ClubPost,
  CommunitySummary,
  CommunityUser,
  Conversation,
  ConversationSummary,
  DirectMessage,
  FriendActivity,
  FriendsOverview,
  Relationship,
} from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';

const onError = (error: Error) => toast.error(error.message);

export function useCommunitySummary() {
  return useQuery({
    queryKey: ['community', 'summary'],
    queryFn: () => api<CommunitySummary>('/community/summary'),
    refetchInterval: 30000,
  });
}
export function useFriends() {
  return useQuery({
    queryKey: ['community', 'friends'],
    queryFn: () => api<FriendsOverview>('/community/friends'),
  });
}
export function useFeed() {
  return useQuery({
    queryKey: ['community', 'feed'],
    queryFn: () => api<{ items: FriendActivity[] }>('/community/feed'),
    refetchInterval: 60000,
  });
}
export function useUserSearch(query: string) {
  const term = query.trim();
  return useQuery({
    queryKey: ['community', 'search', term],
    queryFn: () =>
      api<{ users: CommunityUser[] }>(`/community/users?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
    staleTime: 30000,
  });
}
export function useRelationship(username: string, enabled = true) {
  return useQuery({
    queryKey: ['community', 'relationship', username],
    queryFn: () => api<Relationship>(`/community/relationships/${encodeURIComponent(username)}`),
    enabled,
    retry: false,
  });
}
export function useConversations() {
  return useQuery({
    queryKey: ['community', 'conversations'],
    queryFn: () => api<{ conversations: ConversationSummary[] }>('/community/conversations'),
    refetchInterval: 10000,
  });
}
export function useConversation(userId: string | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ['community', 'conversation', userId],
    queryFn: async () => {
      const result = await api<Conversation>(`/community/conversations/${userId}`);
      // Opening the thread marked these as read: refresh the inbox and the badges.
      if (result.messages.some((message) => !message.mine && !message.readAt)) {
        void client.invalidateQueries({ queryKey: ['community', 'summary'] });
        void client.invalidateQueries({ queryKey: ['community', 'conversations'] });
      }
      return result;
    },
    enabled: Boolean(userId),
    refetchInterval: 4000,
    retry: false,
  });
}
export function useClubs(query: string, mine: boolean) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (mine) params.set('mine', 'true');
  return useQuery({
    queryKey: ['community', 'clubs', query.trim(), mine],
    queryFn: () => api<{ clubs: Club[] }>(`/community/clubs?${params}`),
  });
}
export function useClub(slug: string) {
  return useQuery({
    queryKey: ['community', 'club', slug],
    queryFn: () => api<ClubDetail>(`/community/clubs/${slug}`),
    refetchInterval: 15000,
    retry: false,
  });
}

export function useCommunityMutations() {
  const t = useT();
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: ['community'] });
  return {
    request: useMutation({
      mutationFn: (username: string) =>
        api<Relationship>('/community/friends', { method: 'POST', body: jsonBody({ username }) }),
      onSuccess: (relationship) => {
        toast.success(
          relationship.state === 'friends'
            ? t('Você e {displayName} agora são amigos', {
                displayName: relationship.user.displayName,
              })
            : t('Pedido de amizade enviado'),
        );
        refresh();
      },
      onError,
    }),
    accept: useMutation({
      mutationFn: (id: string) =>
        api(`/community/friends/requests/${id}/accept`, { method: 'POST' }),
      onSuccess: () => {
        toast.success(t('Pedido aceito'));
        refresh();
      },
      onError,
    }),
    dismiss: useMutation({
      mutationFn: (id: string) => api(`/community/friends/requests/${id}`, { method: 'DELETE' }),
      onSuccess: refresh,
      onError,
    }),
    unfriend: useMutation({
      mutationFn: (userId: string) => api(`/community/friends/${userId}`, { method: 'DELETE' }),
      onSuccess: refresh,
      onError,
    }),
    send: useMutation({
      mutationFn: ({ userId, body }: { userId: string; body: string }) =>
        api<DirectMessage>(`/community/conversations/${userId}`, {
          method: 'POST',
          body: jsonBody({ body }),
        }),
      onSuccess: (message, { userId }) => {
        client.setQueryData<Conversation>(['community', 'conversation', userId], (current) =>
          current ? { ...current, messages: [...current.messages, message] } : current,
        );
        void client.invalidateQueries({ queryKey: ['community', 'conversations'] });
      },
      onError,
    }),
    createClub: useMutation({
      mutationFn: (input: ClubInput) =>
        api<Club>('/community/clubs', { method: 'POST', body: jsonBody(input) }),
      onSuccess: refresh,
      onError,
    }),
    updateClub: useMutation({
      mutationFn: ({ slug, changes }: { slug: string; changes: Partial<ClubInput> }) =>
        api<Club>(`/community/clubs/${slug}`, { method: 'PATCH', body: jsonBody(changes) }),
      onSuccess: refresh,
      onError,
    }),
    removeClub: useMutation({
      mutationFn: (slug: string) => api(`/community/clubs/${slug}`, { method: 'DELETE' }),
      onSuccess: refresh,
      onError,
    }),
    join: useMutation({
      mutationFn: (slug: string) =>
        api<Club>(`/community/clubs/${slug}/membership`, { method: 'POST' }),
      onSuccess: refresh,
      onError,
    }),
    leave: useMutation({
      mutationFn: (slug: string) =>
        api(`/community/clubs/${slug}/membership`, { method: 'DELETE' }),
      onSuccess: refresh,
      onError,
    }),
    post: useMutation({
      mutationFn: ({ slug, body }: { slug: string; body: string }) =>
        api<ClubPost>(`/community/clubs/${slug}/posts`, {
          method: 'POST',
          body: jsonBody({ body }),
        }),
      onSuccess: refresh,
      onError,
    }),
    removePost: useMutation({
      mutationFn: ({ slug, id }: { slug: string; id: string }) =>
        api(`/community/clubs/${slug}/posts/${id}`, { method: 'DELETE' }),
      onSuccess: refresh,
      onError,
    }),
  };
}
