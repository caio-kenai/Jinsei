import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'argon2';
import { currentUserSchema, type PreferencesPatch } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { mediaUrl } from '../uploads/uploads.service';
import { s3, storageEnabled } from '../uploads/storage';
import { hashPassword } from '../auth/auth.service';
import { LibraryService } from '../library/library.service';

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
        density: user.preference.density,
        sidebarCollapsed: user.preference.sidebarCollapsed,
        timezone: user.preference.timezone,
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
          density,
          sidebarCollapsed,
          timezone,
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
            density,
            sidebarCollapsed,
            timezone,
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
    };
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
      await Promise.all(assets.map((asset) => s3('DELETE', asset.key).catch(() => undefined)));
    return { deleted: true };
  }
}
