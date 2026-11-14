import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Club,
  ClubDetail,
  ClubInput,
  ClubPatch,
  ClubPost,
  CommunitySummary,
  CommunityUser,
  Conversation,
  ConversationSummary,
  DirectMessage,
  FriendActivity,
  FriendsOverview,
  MediaType,
  Relationship,
  StatusKey,
} from '@jinsei/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { historySelect, progressOf, work } from '../profiles/profiles.service';
import { mediaUrl } from '../uploads/uploads.service';

const PAGE = 50;
const MAX_PENDING_REQUESTS = 100;
const MAX_OWNED_CLUBS = 20;

const userSelect = {
  id: true,
  profile: { select: { username: true, displayName: true, avatarId: true, isPublic: true } },
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** Only the public identity of a member leaves the account: never the e-mail. */
const communityUser = (row: UserRow): CommunityUser => ({
  id: row.id,
  username: row.profile?.username ?? null,
  displayName: row.profile?.displayName ?? 'Pessoa do Jinsei',
  avatarUrl: mediaUrl(row.profile?.avatarId),
  isPublic: row.profile?.isPublic ?? false,
});

const message = (
  row: { id: string; body: string; senderId: string; createdAt: Date; readAt: Date | null },
  userId: string,
): DirectMessage => ({
  id: row.id,
  body: row.body,
  mine: row.senderId === userId,
  createdAt: row.createdAt.toISOString(),
  readAt: row.readAt?.toISOString() ?? null,
});

const pair = (a: string, b: string) => [
  { requesterId: a, addresseeId: b },
  { requesterId: b, addresseeId: a },
];
const messagesBetween = (a: string, b: string) => [
  { senderId: a, recipientId: b },
  { senderId: b, recipientId: a },
];

/** Accepts an ISO date used as a pagination cursor. */
function cursor(before?: string) {
  if (!before) return undefined;
  const date = new Date(before);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Cursor inválido');
  return date;
}

function slugify(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'clube'
  );
}

const clubSelect = (userId: string) =>
  ({
    id: true,
    slug: true,
    name: true,
    description: true,
    mediaTypeId: true,
    createdAt: true,
    lastActivityAt: true,
    owner: { select: userSelect },
    _count: { select: { members: true, posts: true } },
    members: { where: { userId }, select: { role: true } },
  }) satisfies Prisma.ClubSelect;
type ClubRow = Prisma.ClubGetPayload<{ select: ReturnType<typeof clubSelect> }>;
const club = (row: ClubRow): Club => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  mediaType: row.mediaTypeId as MediaType | null,
  owner: communityUser(row.owner),
  memberCount: row._count.members,
  postCount: row._count.posts,
  role: (row.members[0]?.role as Club['role']) ?? null,
  createdAt: row.createdAt.toISOString(),
  lastActivityAt: row.lastActivityAt.toISOString(),
});

@Injectable()
export class CommunityService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async summary(userId: string): Promise<CommunitySummary> {
    const [pendingRequests, unreadMessages] = await Promise.all([
      this.db.friendship.count({ where: { addresseeId: userId, status: 'pending' } }),
      this.db.directMessage.count({ where: { recipientId: userId, readAt: null } }),
    ]);
    return { pendingRequests, unreadMessages };
  }

  /** Public profiles are found by name or username; private ones only by the exact username. */
  async search(userId: string, query: string): Promise<{ users: CommunityUser[] }> {
    const term = query.toLowerCase();
    const rows = await this.db.user.findMany({
      where: {
        id: { not: userId },
        profile: {
          is: {
            username: { not: null },
            OR: [
              { username: term },
              {
                isPublic: true,
                OR: [
                  { username: { startsWith: term } },
                  { displayName: { contains: query, mode: 'insensitive' } },
                ],
              },
            ],
          },
        },
      },
      select: userSelect,
      orderBy: { profile: { username: 'asc' } },
      take: 10,
    });
    return { users: rows.map(communityUser) };
  }

  private async userByUsername(username: string) {
    const row = await this.db.user.findFirst({
      where: { profile: { is: { username: username.toLowerCase() } } },
      select: userSelect,
    });
    if (!row) throw new NotFoundException('Pessoa não encontrada');
    return row;
  }

  private friendship(a: string, b: string) {
    return this.db.friendship.findFirst({ where: { OR: pair(a, b) } });
  }

  private async areFriends(a: string, b: string) {
    return (await this.friendship(a, b))?.status === 'accepted';
  }

  async relationship(userId: string, username: string): Promise<Relationship> {
    const other = await this.userByUsername(username);
    if (other.id === userId) return { state: 'self', requestId: null, user: communityUser(other) };
    const row = await this.friendship(userId, other.id);
    const state = !row
      ? 'none'
      : row.status === 'accepted'
        ? 'friends'
        : row.requesterId === userId
          ? 'outgoing'
          : 'incoming';
    return {
      state,
      requestId: row && row.status === 'pending' ? row.id : null,
      user: communityUser(other),
    };
  }

  async friends(userId: string): Promise<FriendsOverview> {
    const rows = await this.db.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: { select: userSelect }, addressee: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
    const friends: FriendsOverview['friends'] = [];
    const requests: FriendsOverview['requests'] = [];
    for (const row of rows) {
      const outgoing = row.requesterId === userId;
      const other = communityUser(outgoing ? row.addressee : row.requester);
      if (row.status === 'accepted')
        friends.push({ ...other, since: (row.acceptedAt ?? row.createdAt).toISOString() });
      else
        requests.push({
          id: row.id,
          direction: outgoing ? 'outgoing' : 'incoming',
          user: other,
          createdAt: row.createdAt.toISOString(),
        });
    }
    friends.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
    return { friends, requests };
  }

  /** Sending a request to someone who already asked you accepts theirs. */
  async request(userId: string, username: string): Promise<Relationship> {
    const other = await this.userByUsername(username);
    if (other.id === userId) throw new BadRequestException('Você não pode adicionar a si mesmo');
    const existing = await this.friendship(userId, other.id);
    if (existing?.status === 'accepted') throw new ConflictException('Vocês já são amigos');
    if (existing && existing.requesterId === other.id)
      await this.db.friendship.update({
        where: { id: existing.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
    else if (!existing) {
      const pending = await this.db.friendship.count({
        where: { requesterId: userId, status: 'pending' },
      });
      if (pending >= MAX_PENDING_REQUESTS)
        throw new BadRequestException('Aguarde respostas antes de enviar novos pedidos');
      await this.db.friendship.create({ data: { requesterId: userId, addresseeId: other.id } });
    }
    return this.relationship(userId, username);
  }

  async accept(userId: string, id: string) {
    const row = await this.db.friendship.findFirst({
      where: { id, addresseeId: userId, status: 'pending' },
    });
    if (!row) throw new NotFoundException('Pedido não encontrado');
    await this.db.friendship.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    return { ok: true };
  }

  /** Declines a received request or cancels a sent one. */
  async dismiss(userId: string, id: string) {
    const { count } = await this.db.friendship.deleteMany({
      where: { id, status: 'pending', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    if (!count) throw new NotFoundException('Pedido não encontrado');
    return { ok: true };
  }

  async unfriend(userId: string, otherId: string) {
    const { count } = await this.db.friendship.deleteMany({
      where: { status: 'accepted', OR: pair(userId, otherId) },
    });
    if (!count) throw new NotFoundException('Amizade não encontrada');
    return { ok: true };
  }

  /** What friends have been updating, limited to profiles that share their history. */
  async feed(userId: string): Promise<{ items: FriendActivity[] }> {
    const friendships = await this.db.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    const ids = friendships.map((row) =>
      row.requesterId === userId ? row.addresseeId : row.requesterId,
    );
    if (!ids.length) return { items: [] };
    const [rows, enabled] = await Promise.all([
      this.db.userMediaEntry.findMany({
        where: { userId: { in: ids }, user: { profile: { is: { showHistory: true } } } },
        select: { ...historySelect, user: { select: userSelect } },
        orderBy: { updatedAt: 'desc' },
        take: 60,
      }),
      this.db.userMediaType.findMany({
        where: { userId: { in: ids }, enabled: true },
        select: { userId: true, mediaTypeId: true },
      }),
    ]);
    const visible = new Set(enabled.map((row) => `${row.userId}:${row.mediaTypeId}`));
    return {
      items: rows
        .filter((row) => visible.has(`${row.user.id}:${row.media.mediaTypeId}`))
        .slice(0, 30)
        .map((row) => ({
          ...work(row),
          user: communityUser(row.user),
          status: row.status.key as StatusKey,
          updatedAt: row.updatedAt.toISOString(),
          ...progressOf(row),
        })),
    };
  }

  async conversations(userId: string): Promise<{ conversations: ConversationSummary[] }> {
    const latest = await this.db.$queryRaw<
      {
        other: string;
        id: string;
        body: string;
        senderId: string;
        createdAt: Date;
        readAt: Date | null;
      }[]
    >`
      SELECT * FROM (
        SELECT DISTINCT ON (other) other, id, body, "senderId", "createdAt", "readAt"
        FROM (
          SELECT CASE WHEN "senderId" = ${userId} THEN "recipientId" ELSE "senderId" END AS other,
                 id, body, "senderId", "createdAt", "readAt"
          FROM "DirectMessage"
          WHERE "senderId" = ${userId} OR "recipientId" = ${userId}
        ) messages
        ORDER BY other, "createdAt" DESC
      ) latest
      ORDER BY "createdAt" DESC
      LIMIT ${PAGE}`;
    const others = latest.map((row) => row.other);
    const [users, unread] = await Promise.all([
      this.db.user.findMany({ where: { id: { in: others } }, select: userSelect }),
      this.db.directMessage.groupBy({
        by: ['senderId'],
        where: { recipientId: userId, readAt: null, senderId: { in: others } },
        _count: true,
      }),
    ]);
    const byId = new Map(users.map((row) => [row.id, row]));
    const counts = new Map(unread.map((row) => [row.senderId, row._count]));
    return {
      conversations: latest
        .filter((row) => byId.has(row.other))
        .map((row) => ({
          user: communityUser(byId.get(row.other)!),
          lastMessage: message(row, userId),
          unread: counts.get(row.other) ?? 0,
        })),
    };
  }

  /** Opening a conversation marks what the other person sent as read. */
  async conversation(userId: string, otherId: string, before?: string): Promise<Conversation> {
    if (otherId === userId) throw new BadRequestException('Escolha outra pessoa');
    const other = await this.db.user.findUnique({ where: { id: otherId }, select: userSelect });
    if (!other) throw new NotFoundException('Pessoa não encontrada');
    const until = cursor(before);
    const [canMessage, rows] = await Promise.all([
      this.areFriends(userId, otherId),
      this.db.directMessage.findMany({
        where: {
          OR: messagesBetween(userId, otherId),
          ...(until ? { createdAt: { lt: until } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: PAGE + 1,
      }),
    ]);
    if (!canMessage && !rows.length) throw new NotFoundException('Conversa não encontrada');
    if (!until)
      await this.db.directMessage.updateMany({
        where: { senderId: otherId, recipientId: userId, readAt: null },
        data: { readAt: new Date() },
      });
    return {
      user: communityUser(other),
      canMessage,
      hasMore: rows.length > PAGE,
      messages: rows
        .slice(0, PAGE)
        .reverse()
        .map((row) => message(row, userId)),
    };
  }

  async send(userId: string, otherId: string, body: string): Promise<DirectMessage> {
    if (otherId === userId || !(await this.areFriends(userId, otherId)))
      throw new ForbiddenException('Vocês precisam ser amigos para conversar');
    const row = await this.db.directMessage.create({
      data: { senderId: userId, recipientId: otherId, body },
    });
    return message(row, userId);
  }

  async clubs(userId: string, query: { q?: string; mine?: string }): Promise<{ clubs: Club[] }> {
    const rows = await this.db.club.findMany({
      where: {
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.mine === 'true' ? { members: { some: { userId } } } : {}),
      },
      select: clubSelect(userId),
      orderBy: { lastActivityAt: 'desc' },
      take: PAGE,
    });
    return { clubs: rows.map(club) };
  }

  private async clubBySlug(userId: string, slug: string) {
    const row = await this.db.club.findUnique({ where: { slug }, select: clubSelect(userId) });
    if (!row) throw new NotFoundException('Clube não encontrado');
    return row;
  }

  private async ownedClub(userId: string, slug: string) {
    const row = await this.clubBySlug(userId, slug);
    if (row.owner.id !== userId)
      throw new ForbiddenException('Somente quem criou o clube pode fazer isso');
    return row;
  }

  async createClub(userId: string, input: ClubInput): Promise<Club> {
    const owned = await this.db.club.count({ where: { ownerId: userId } });
    if (owned >= MAX_OWNED_CLUBS)
      throw new BadRequestException(`Você pode criar até ${MAX_OWNED_CLUBS} clubes`);
    const base = slugify(input.name);
    let slug = base;
    for (let attempt = 2; await this.db.club.findUnique({ where: { slug } }); attempt++)
      slug =
        attempt < 6 ? `${base}-${attempt}` : `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const row = await this.db.club.create({
      data: {
        slug,
        name: input.name,
        description: input.description ?? '',
        mediaTypeId: input.mediaType ?? null,
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
      },
      select: clubSelect(userId),
    });
    return club(row);
  }

  async updateClub(userId: string, slug: string, patch: ClubPatch): Promise<Club> {
    const current = await this.ownedClub(userId, slug);
    const row = await this.db.club.update({
      where: { id: current.id },
      data: {
        name: patch.name,
        description: patch.description,
        mediaTypeId: patch.mediaType === undefined ? undefined : patch.mediaType,
      },
      select: clubSelect(userId),
    });
    return club(row);
  }

  async removeClub(userId: string, slug: string) {
    const current = await this.ownedClub(userId, slug);
    await this.db.club.delete({ where: { id: current.id } });
    return { ok: true };
  }

  async club(userId: string, slug: string, before?: string): Promise<ClubDetail> {
    const row = await this.clubBySlug(userId, slug);
    const until = cursor(before);
    const [members, posts] = await Promise.all([
      this.db.clubMember.findMany({
        where: { clubId: row.id },
        select: { role: true, user: { select: userSelect } },
        orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
        take: 30,
      }),
      this.db.clubPost.findMany({
        where: { clubId: row.id, ...(until ? { createdAt: { lt: until } } : {}) },
        include: { author: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
        take: PAGE + 1,
      }),
    ]);
    const owner = row.owner.id === userId;
    return {
      ...club(row),
      members: members.map((member) => ({
        ...communityUser(member.user),
        role: member.role as 'owner' | 'member',
      })),
      hasMore: posts.length > PAGE,
      posts: posts.slice(0, PAGE).map((post) => ({
        id: post.id,
        body: post.body,
        author: communityUser(post.author),
        createdAt: post.createdAt.toISOString(),
        canDelete: owner || post.authorId === userId,
      })),
    };
  }

  async join(userId: string, slug: string): Promise<Club> {
    const row = await this.clubBySlug(userId, slug);
    await this.db.clubMember.upsert({
      where: { clubId_userId: { clubId: row.id, userId } },
      create: { clubId: row.id, userId },
      update: {},
    });
    return club(await this.clubBySlug(userId, slug));
  }

  async leave(userId: string, slug: string) {
    const row = await this.clubBySlug(userId, slug);
    if (row.owner.id === userId)
      throw new BadRequestException('Quem criou o clube não pode sair; exclua o clube');
    await this.db.clubMember.deleteMany({ where: { clubId: row.id, userId } });
    return { ok: true };
  }

  async post(userId: string, slug: string, body: string): Promise<ClubPost> {
    const row = await this.clubBySlug(userId, slug);
    if (!row.members.length) throw new ForbiddenException('Entre no clube para publicar');
    const [post] = await this.db.$transaction([
      this.db.clubPost.create({
        data: { clubId: row.id, authorId: userId, body },
        include: { author: { select: userSelect } },
      }),
      this.db.club.update({ where: { id: row.id }, data: { lastActivityAt: new Date() } }),
    ]);
    return {
      id: post.id,
      body: post.body,
      author: communityUser(post.author),
      createdAt: post.createdAt.toISOString(),
      canDelete: true,
    };
  }

  async removePost(userId: string, slug: string, postId: string) {
    const row = await this.clubBySlug(userId, slug);
    const { count } = await this.db.clubPost.deleteMany({
      where: {
        id: postId,
        clubId: row.id,
        ...(row.owner.id === userId ? {} : { authorId: userId }),
      },
    });
    if (!count) throw new NotFoundException('Publicação não encontrada');
    return { ok: true };
  }
}
