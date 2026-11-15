import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BlockedUser, ReportInput } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { mediaUrl } from '../uploads/uploads.service';

const MAX_OPEN_REPORTS = 50;

/** Blocks between people and reports sent to the instance moderators. */
@Injectable()
export class SafetyService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  /** Everyone this person blocked or was blocked by: they never meet in the community. */
  async hiddenFrom(userId: string) {
    const rows = await this.db.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return new Set(rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)));
  }

  async blockState(userId: string, otherId: string) {
    const rows = await this.db.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherId },
          { blockerId: otherId, blockedId: userId },
        ],
      },
      select: { blockerId: true },
    });
    return {
      blockedByMe: rows.some((row) => row.blockerId === userId),
      blockedMe: rows.some((row) => row.blockerId === otherId),
    };
  }

  async block(userId: string, otherId: string) {
    if (otherId === userId) throw new BadRequestException('Você não pode bloquear a si mesmo');
    const other = await this.db.user.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) throw new NotFoundException('Pessoa não encontrada');
    await this.db.$transaction([
      this.db.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: otherId } },
        create: { blockerId: userId, blockedId: otherId },
        update: {},
      }),
      // Blocking also ends any friendship or pending request between them.
      this.db.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: otherId },
            { requesterId: otherId, addresseeId: userId },
          ],
        },
      }),
    ]);
    return { blocked: true };
  }

  async unblock(userId: string, otherId: string) {
    await this.db.userBlock.deleteMany({ where: { blockerId: userId, blockedId: otherId } });
    return { blocked: false };
  }

  async blocked(userId: string): Promise<{ users: BlockedUser[] }> {
    const rows = await this.db.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            profile: {
              select: { username: true, displayName: true, avatarId: true, isPublic: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      users: rows.map((row) => ({
        id: row.blocked.id,
        username: row.blocked.profile?.username ?? null,
        displayName: row.blocked.profile?.displayName ?? 'Pessoa do Jinsei',
        avatarUrl: mediaUrl(row.blocked.profile?.avatarId),
        isPublic: row.blocked.profile?.isPublic ?? false,
        since: row.createdAt.toISOString(),
      })),
    };
  }

  /** Finds the reported item, checks the reporter can see it and keeps a text snapshot. */
  private async target(userId: string, type: ReportInput['targetType'], id: string) {
    const missing = () => new NotFoundException('Não encontramos o que você quer denunciar');
    switch (type) {
      case 'user': {
        const user = await this.db.user.findUnique({
          where: { id },
          select: {
            id: true,
            profile: { select: { displayName: true, username: true, bio: true } },
          },
        });
        if (!user) throw missing();
        const profile = user.profile;
        return {
          targetUserId: user.id,
          snapshot: `${profile?.displayName ?? ''} (@${profile?.username ?? '—'})\n${profile?.bio ?? ''}`,
        };
      }
      case 'message': {
        const message = await this.db.directMessage.findUnique({ where: { id } });
        // Only the recipient can report a private message.
        if (!message || message.recipientId !== userId) throw missing();
        return { targetUserId: message.senderId, snapshot: message.body };
      }
      case 'club': {
        const club = await this.db.club.findUnique({ where: { id } });
        if (!club) throw missing();
        return { targetUserId: club.ownerId, snapshot: `${club.name}\n${club.description}` };
      }
      case 'club_post': {
        const post = await this.db.clubPost.findUnique({ where: { id } });
        if (!post) throw missing();
        return { targetUserId: post.authorId, snapshot: post.body };
      }
      case 'review': {
        const entry = await this.db.userMediaEntry.findFirst({
          where: { id, reviewPublic: true },
          select: { userId: true, review: true, media: { select: { title: true } } },
        });
        if (!entry) throw missing();
        return { targetUserId: entry.userId, snapshot: `${entry.media.title}\n${entry.review}` };
      }
    }
  }

  async report(userId: string, input: ReportInput) {
    const { targetUserId, snapshot } = await this.target(userId, input.targetType, input.targetId);
    if (targetUserId === userId)
      throw new BadRequestException('Você não pode denunciar a si mesmo');
    const duplicate = await this.db.report.findFirst({
      where: {
        reporterId: userId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: 'open',
      },
    });
    if (duplicate) throw new ConflictException('Você já denunciou isso. A moderação vai analisar.');
    const open = await this.db.report.count({ where: { reporterId: userId, status: 'open' } });
    if (open >= MAX_OPEN_REPORTS)
      throw new BadRequestException('Aguarde a análise das suas denúncias anteriores');
    await this.db.report.create({
      data: {
        reporterId: userId,
        targetType: input.targetType,
        targetId: input.targetId,
        targetUserId,
        reason: input.reason,
        details: input.details ?? '',
        snapshot: snapshot.slice(0, 4000),
      },
    });
    return { reported: true };
  }
}
