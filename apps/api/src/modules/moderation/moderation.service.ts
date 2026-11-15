import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  reportReasonLabels,
  type ModerationLogEntry,
  type ModerationReport,
  type ModerationSummary,
  type ModerationUser,
  type ReportResolution,
} from '@jinsei/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InstanceService } from '../instance/instance.module';
import { mediaUrl } from '../uploads/uploads.service';

const userSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  emailVerifiedAt: true,
  mfaEnabledAt: true,
  suspendedAt: true,
  suspensionReason: true,
  profile: { select: { username: true, displayName: true, avatarId: true, isPublic: true } },
  _count: { select: { reportsAbout: { where: { status: 'open' } } } },
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const moderationUser = (row: UserRow): ModerationUser => ({
  id: row.id,
  email: row.email,
  username: row.profile?.username ?? null,
  displayName: row.profile?.displayName ?? 'Pessoa do Jinsei',
  avatarUrl: mediaUrl(row.profile?.avatarId),
  role: row.role === 'admin' ? 'admin' : 'user',
  createdAt: row.createdAt.toISOString(),
  emailVerified: Boolean(row.emailVerifiedAt),
  mfaEnabled: Boolean(row.mfaEnabledAt),
  suspendedAt: row.suspendedAt?.toISOString() ?? null,
  suspensionReason: row.suspensionReason,
  reports: row._count.reportsAbout,
});
const communityUser = (row: {
  id: string;
  profile: {
    username: string | null;
    displayName: string;
    avatarId: string | null;
    isPublic: boolean;
  } | null;
}) => ({
  id: row.id,
  username: row.profile?.username ?? null,
  displayName: row.profile?.displayName ?? 'Pessoa do Jinsei',
  avatarUrl: mediaUrl(row.profile?.avatarId),
  isPublic: row.profile?.isPublic ?? false,
});
const publicSelect = {
  id: true,
  profile: { select: { username: true, displayName: true, avatarId: true, isPublic: true } },
} satisfies Prisma.UserSelect;

/** Tools for the instance administrators: reports, suspensions, roles and an audit log. */
@Injectable()
export class ModerationService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(InstanceService) private readonly instance: InstanceService,
  ) {}

  private log(
    moderatorId: string,
    action: string,
    targetType: string,
    targetId: string,
    note = '',
  ) {
    return this.db.moderationLog.create({
      data: { moderatorId, action, targetType, targetId, note: note.slice(0, 500) },
    });
  }

  async summary(adminId: string): Promise<ModerationSummary> {
    await this.instance.requireAdmin(adminId);
    const [openReports, suspendedUsers, users, admins] = await Promise.all([
      this.db.report.count({ where: { status: 'open' } }),
      this.db.user.count({ where: { suspendedAt: { not: null } } }),
      this.db.user.count(),
      this.db.user.count({ where: { role: 'admin' } }),
    ]);
    return { openReports, suspendedUsers, users, admins };
  }

  private async contentAvailable(type: string, id: string) {
    switch (type) {
      case 'message':
        return Boolean(
          await this.db.directMessage.findUnique({ where: { id }, select: { id: true } }),
        );
      case 'club':
        return Boolean(await this.db.club.findUnique({ where: { id }, select: { id: true } }));
      case 'club_post':
        return Boolean(await this.db.clubPost.findUnique({ where: { id }, select: { id: true } }));
      case 'review':
        return Boolean(
          await this.db.userMediaEntry.findFirst({
            where: { id, reviewPublic: true },
            select: { id: true },
          }),
        );
      default:
        return Boolean(await this.db.user.findUnique({ where: { id }, select: { id: true } }));
    }
  }

  async reports(adminId: string, status = 'open'): Promise<{ reports: ModerationReport[] }> {
    await this.instance.requireAdmin(adminId);
    const rows = await this.db.report.findMany({
      where: { status },
      include: { reporter: { select: publicSelect }, targetUser: { select: userSelect } },
      orderBy: { createdAt: status === 'open' ? 'asc' : 'desc' },
      take: 100,
    });
    return {
      reports: await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          targetType: row.targetType as ModerationReport['targetType'],
          targetId: row.targetId,
          reason: row.reason as ModerationReport['reason'],
          details: row.details,
          snapshot: row.snapshot,
          status: row.status as ModerationReport['status'],
          resolution: row.resolution,
          createdAt: row.createdAt.toISOString(),
          resolvedAt: row.resolvedAt?.toISOString() ?? null,
          reporter: row.reporter ? communityUser(row.reporter) : null,
          targetUser: row.targetUser ? moderationUser(row.targetUser) : null,
          contentAvailable: await this.contentAvailable(row.targetType, row.targetId),
        })),
      ),
    };
  }

  private async removeContent(type: string, id: string) {
    switch (type) {
      case 'message':
        await this.db.directMessage.deleteMany({ where: { id } });
        return;
      case 'club':
        await this.db.club.deleteMany({ where: { id } });
        return;
      case 'club_post':
        await this.db.clubPost.deleteMany({ where: { id } });
        return;
      case 'review':
        await this.db.userMediaEntry.updateMany({ where: { id }, data: { reviewPublic: false } });
        return;
      case 'user':
        // A profile cannot be deleted by moderation; its public parts are cleared and hidden.
        await this.db.profile.updateMany({
          where: { userId: id },
          data: { bio: '', avatarId: null, bannerId: null, isPublic: false },
        });
        return;
    }
  }

  async resolve(adminId: string, reportId: string, input: ReportResolution) {
    await this.instance.requireAdmin(adminId);
    const report = await this.db.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Denúncia não encontrada');
    if (report.status !== 'open') throw new BadRequestException('Esta denúncia já foi analisada');
    const note = input.note ?? '';
    if (input.action === 'remove_content')
      await this.removeContent(report.targetType, report.targetId);
    if (input.action === 'suspend_user') {
      if (!report.targetUserId) throw new BadRequestException('A conta denunciada não existe mais');
      await this.suspend(
        adminId,
        report.targetUserId,
        note || reportReasonLabels[report.reason as keyof typeof reportReasonLabels],
      );
    }
    const status = input.action === 'dismiss' ? 'dismissed' : 'resolved';
    // Other open reports about the same item are settled together.
    await this.db.report.updateMany({
      where: { targetType: report.targetType, targetId: report.targetId, status: 'open' },
      data: {
        status,
        resolution: note || input.action,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });
    await this.log(adminId, input.action, report.targetType, report.targetId, note);
    return { status };
  }

  async users(adminId: string, query = ''): Promise<{ users: ModerationUser[] }> {
    await this.instance.requireAdmin(adminId);
    const term = query.trim();
    const rows = await this.db.user.findMany({
      where: term
        ? {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { profile: { is: { username: { contains: term.toLowerCase() } } } },
              { profile: { is: { displayName: { contains: term, mode: 'insensitive' } } } },
            ],
          }
        : {},
      select: userSelect,
      orderBy: [{ suspendedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 50,
    });
    return { users: rows.map(moderationUser) };
  }

  async suspend(adminId: string, userId: string, reason: string) {
    await this.instance.requireAdmin(adminId);
    if (userId === adminId)
      throw new BadRequestException('Você não pode suspender a própria conta');
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException('Conta não encontrada');
    if (user.role === 'admin')
      throw new BadRequestException('Remova o papel de administrador antes de suspender');
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { suspendedAt: new Date(), suspensionReason: reason.slice(0, 500) },
      }),
      this.db.session.deleteMany({ where: { userId } }),
      this.db.loginChallenge.deleteMany({ where: { userId } }),
    ]);
    await this.log(adminId, 'suspend_user', 'user', userId, reason);
    return { suspended: true };
  }

  async unsuspend(adminId: string, userId: string) {
    await this.instance.requireAdmin(adminId);
    await this.db.user.updateMany({
      where: { id: userId },
      data: { suspendedAt: null, suspensionReason: null },
    });
    await this.log(adminId, 'unsuspend_user', 'user', userId);
    return { suspended: false };
  }

  async setRole(adminId: string, userId: string, role: 'user' | 'admin') {
    await this.instance.requireAdmin(adminId);
    if (userId === adminId && role !== 'admin')
      throw new BadRequestException('Peça a outra pessoa administradora para remover seu papel');
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { suspendedAt: true },
    });
    if (!user) throw new NotFoundException('Conta não encontrada');
    if (role === 'admin' && user.suspendedAt)
      throw new BadRequestException('Reative a conta antes de torná-la administradora');
    await this.db.user.update({ where: { id: userId }, data: { role } });
    await this.log(adminId, role === 'admin' ? 'grant_admin' : 'revoke_admin', 'user', userId);
    return { role };
  }

  async history(adminId: string): Promise<{ entries: ModerationLogEntry[] }> {
    await this.instance.requireAdmin(adminId);
    const rows = await this.db.moderationLog.findMany({
      include: { moderator: { select: publicSelect } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      entries: rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        moderator: row.moderator ? communityUser(row.moderator) : null,
      })),
    };
  }
}
