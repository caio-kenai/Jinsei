import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'argon2';
import { currentUserSchema, type AccountSession, type PreferencesPatch } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { mediaUrl } from '../uploads/uploads.service';
import { deleteObject, storageEnabled } from '../uploads/storage';
import { hashPassword } from '../auth/auth.service';
import { LibraryService } from '../library/library.service';

/** Turns a user agent into a short "Chrome · Windows" style description. */
export function describeAgent(agent: string) {
  if (!agent) return { browser: 'Sessão anterior', system: 'sem detalhes', device: 'Computador' };
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : 'Navegador';
  const system = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad|iOS/.test(agent)
      ? 'iOS'
      : /Windows/.test(agent)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(agent)
          ? 'macOS'
          : /Linux/.test(agent)
            ? 'Linux'
            : 'Sistema desconhecido';
  const device = /Mobile|Android|iPhone/.test(agent)
    ? 'Celular'
    : /iPad|Tablet/.test(agent)
      ? 'Tablet'
      : 'Computador';
  return { browser, system, device };
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(LibraryService) private readonly library: LibraryService,
  ) {}
  async me(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { links: { orderBy: { position: 'asc' } } } },
        preference: true,
        categories: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!user?.profile || !user.preference) throw new NotFoundException('Conta não encontrada');
    return currentUserSchema.parse({
      isAdmin: user.role === 'admin',
      emailVerified: Boolean(user.emailVerifiedAt),
      mfaEnabled: Boolean(user.mfaEnabledAt),
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      profile: {
        displayName: user.profile.displayName,
        username: user.profile.username,
        bio: user.profile.bio,
        isPublic: user.profile.isPublic,
        avatarUrl: mediaUrl(user.profile.avatarId),
        bannerUrl: mediaUrl(user.profile.bannerId),
        showFavorites: user.profile.showFavorites,
        showStatistics: user.profile.showStatistics,
        showReviews: user.profile.showReviews,
        showHistory: user.profile.showHistory,
        showGoals: user.profile.showGoals,
        links: user.profile.links.map(({ label, url }) => ({ label, url })),
      },
      preferences: {
        theme: user.preference.theme,
        accent: user.preference.accent,
        visualTheme: user.preference.visualTheme,
        density: user.preference.density,
        sidebarCollapsed: user.preference.sidebarCollapsed,
        timezone: user.preference.timezone,
        dateFormat: user.preference.dateFormat,
        timeFormat: user.preference.timeFormat,
        celebrations: user.preference.celebrations,
        locale: user.preference.locale,
        categories: user.categories.map((category) => category.mediaTypeId),
        onboarded: Boolean(user.preference.onboardedAt),
      },
    });
  }

  async update(userId: string, input: PreferencesPatch, onboarding = false) {
    try {
      await this.db.$transaction(async (tx) => {
        const {
          displayName,
          username,
          bio,
          isPublic,
          categories,
          theme,
          accent,
          visualTheme,
          density,
          sidebarCollapsed,
          timezone,
          dateFormat,
          timeFormat,
          celebrations,
          locale,
          showFavorites,
          showStatistics,
          showReviews,
          showHistory,
          showGoals,
          links,
        } = input;
        await tx.profile.update({
          where: { userId },
          data: {
            displayName,
            username,
            bio,
            isPublic,
            showFavorites,
            showStatistics,
            showReviews,
            showHistory,
            showGoals,
          },
        });
        if (links) {
          await tx.profileLink.deleteMany({ where: { userId } });
          await tx.profileLink.createMany({
            data: links.map((link, position) => ({ ...link, userId, position })),
          });
        }
        await tx.userPreference.update({
          where: { userId },
          data: {
            theme,
            accent,
            visualTheme,
            density,
            sidebarCollapsed,
            timezone,
            dateFormat,
            timeFormat,
            celebrations,
            locale,
            ...(onboarding ? { onboardedAt: new Date() } : {}),
          },
        });
        if (categories) {
          await tx.userMediaType.updateMany({ where: { userId }, data: { enabled: false } });
          for (const [sortOrder, mediaTypeId] of categories.entries()) {
            await tx.userMediaType.upsert({
              where: { userId_mediaTypeId: { userId, mediaTypeId } },
              create: { userId, mediaTypeId, sortOrder, enabled: true },
              update: { sortOrder, enabled: true },
            });
          }
        }
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002')
        throw new ConflictException('Esse nome de usuário não está disponível');
      throw error;
    }
    return this.me(userId);
  }

  private async confirmPassword(userId: string, password: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !(await verify(user.passwordHash, password)))
      throw new UnauthorizedException('A senha atual não confere');
  }
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    await this.confirmPassword(userId, currentPassword);
    const passwordHash = await hashPassword(newPassword);
    await this.db.$transaction([
      this.db.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.db.session.deleteMany({ where: { userId } }),
    ]);
    return { changed: true };
  }
  async export(userId: string) {
    const [account, entries, tags, views, activity, collections, goals, progress] =
      await Promise.all([
        this.me(userId),
        this.library.export(userId),
        this.db.tag.findMany({ where: { userId }, select: { name: true, color: true } }),
        this.db.savedView.findMany({
          where: { userId },
          select: { scope: true, name: true, position: true, config: true },
        }),
        this.db.activityLog.findMany({
          where: { userId },
          select: { action: true, changes: true, createdAt: true },
        }),
        this.db.collection.findMany({
          where: { userId },
          select: {
            name: true,
            slug: true,
            description: true,
            visibility: true,
            ranked: true,
            coverUrl: true,
            items: {
              orderBy: { position: 'asc' },
              select: { note: true, entry: { select: { media: { select: { title: true } } } } },
            },
          },
        }),
        this.db.goal.findMany({
          where: { userId },
          select: {
            name: true,
            description: true,
            metric: true,
            mediaTypeId: true,
            target: true,
            startsOn: true,
            endsOn: true,
            archived: true,
          },
        }),
        this.db.progressLog.findMany({
          where: { userId },
          select: { mediaTypeId: true, metric: true, delta: true, occurredOn: true },
          orderBy: { occurredOn: 'asc' },
        }),
      ]);
    const username = { select: { profile: { select: { username: true } } } } as const;
    const [friendships, messages, memberships, posts] = await Promise.all([
      this.db.friendship.findMany({
        where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: {
          status: true,
          createdAt: true,
          acceptedAt: true,
          requesterId: true,
          requester: username,
          addressee: username,
        },
      }),
      this.db.directMessage.findMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
        select: {
          body: true,
          createdAt: true,
          readAt: true,
          senderId: true,
          sender: username,
          recipient: username,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.db.clubMember.findMany({
        where: { userId },
        select: { role: true, joinedAt: true, club: { select: { name: true, slug: true } } },
      }),
      this.db.clubPost.findMany({
        where: { authorId: userId },
        select: { body: true, createdAt: true, club: { select: { slug: true } } },
      }),
    ]);
    const community = {
      friendships: friendships.map((row) => ({
        username:
          (row.requesterId === userId ? row.addressee : row.requester).profile?.username ?? null,
        direction: row.requesterId === userId ? 'sent' : 'received',
        status: row.status,
        createdAt: row.createdAt,
        acceptedAt: row.acceptedAt,
      })),
      messages: messages.map((row) => ({
        direction: row.senderId === userId ? 'sent' : 'received',
        with: (row.senderId === userId ? row.recipient : row.sender).profile?.username ?? null,
        body: row.body,
        createdAt: row.createdAt,
        readAt: row.readAt,
      })),
      clubs: memberships.map((row) => ({ ...row.club, role: row.role, joinedAt: row.joinedAt })),
      clubPosts: posts.map((row) => ({
        club: row.club.slug,
        body: row.body,
        createdAt: row.createdAt,
      })),
    };
    return {
      version: 1,
      ratingScale: { maximum: 5, step: 0.25 },
      exportedAt: new Date().toISOString(),
      account,
      entries,
      tags,
      views,
      activity,
      collections,
      goals,
      progress,
      community,
    };
  }
  async sessions(userId: string, currentId: string): Promise<{ sessions: AccountSession[] }> {
    const rows = await this.db.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return {
      sessions: rows
        .map((row) => ({
          id: row.id,
          ...describeAgent(row.userAgent),
          createdAt: row.createdAt.toISOString(),
          lastSeenAt: row.lastSeenAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          current: row.id === currentId,
        }))
        .sort((a, b) => Number(b.current) - Number(a.current)),
    };
  }

  async endSession(userId: string, currentId: string, id: string) {
    if (id === currentId) throw new ConflictException('Use Sair para encerrar esta sessão');
    const { count } = await this.db.session.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Sessão não encontrada');
    return { ok: true };
  }

  async endOtherSessions(userId: string, currentId: string) {
    const { count } = await this.db.session.deleteMany({
      where: { userId, id: { not: currentId } },
    });
    return { ended: count };
  }

  async remove(userId: string, password: string) {
    await this.confirmPassword(userId, password);
    const assets = await this.db.mediaAsset.findMany({ where: { userId }, select: { key: true } });
    await this.db.$transaction(async (tx) => {
      await tx.userMediaEntry.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    // Uploaded images leave the storage together with the account.
    if (storageEnabled)
      await Promise.all(assets.map((asset) => deleteObject(asset.key).catch(() => undefined)));
    return { deleted: true };
  }
}
