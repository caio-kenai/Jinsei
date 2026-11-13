import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { currentUserSchema, type PreferencesPatch } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async me(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preference: true,
        categories: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!user?.profile || !user.preference) throw new NotFoundException('Conta não encontrada');
    return currentUserSchema.parse({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      profile: {
        displayName: user.profile.displayName,
        username: user.profile.username,
        bio: user.profile.bio,
        isPublic: user.profile.isPublic,
      },
      preferences: {
        theme: user.preference.theme,
        accent: user.preference.accent,
        density: user.preference.density,
        sidebarCollapsed: user.preference.sidebarCollapsed,
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
        } = input;
        await tx.profile.update({
          where: { userId },
          data: { displayName, username, bio, isPublic },
        });
        await tx.userPreference.update({
          where: { userId },
          data: {
            theme,
            accent,
            density,
            sidebarCollapsed,
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
}
