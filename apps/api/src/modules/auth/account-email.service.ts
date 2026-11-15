import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { MailService, mailEnabled, verificationRequired } from '../mail/mail.service';
import { hashPassword } from './auth.service';
import { tokenHash } from './session.guard';

type Purpose = 'verify' | 'reset';
const lifetimes: Record<Purpose, number> = { verify: 48 * 3600_000, reset: 3600_000 };
const invalid = () => new BadRequestException('Link inválido ou expirado. Peça um novo.');

/** Address confirmation and password recovery through single-use e-mailed links. */
@Injectable()
export class AccountEmailService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  /** Creates a fresh link, replacing earlier unused links with the same purpose. */
  private async issue(userId: string, purpose: Purpose) {
    const token = randomBytes(32).toString('hex');
    await this.db.$transaction([
      this.db.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
      this.db.emailToken.create({
        data: {
          userId,
          purpose,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + lifetimes[purpose]),
        },
      }),
    ]);
    return token;
  }

  /** Consumes a link, failing the same way for unknown, used and expired links. */
  private async consume(token: string, purpose: Purpose) {
    const row = await this.db.emailToken.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= new Date())
      throw invalid();
    const { count } = await this.db.emailToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (!count) throw invalid();
    return row.userId;
  }

  async sendVerification(userId: string) {
    if (!mailEnabled) return { sent: false };
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true, profile: { select: { displayName: true } } },
    });
    if (!user || user.emailVerifiedAt) return { sent: false };
    const token = await this.issue(userId, 'verify');
    const sent = await this.mail.send(user.email, {
      subject: 'Confirme seu e-mail no Jinsei',
      preview: 'Falta só um clique para confirmar sua conta.',
      title: `Olá, ${user.profile?.displayName ?? 'boas-vindas'}!`,
      paragraphs: [
        'Confirme este endereço para proteger sua conta e liberar amizades, conversas e clubes.',
        'O link vale por 48 horas.',
      ],
      action: {
        label: 'Confirmar meu e-mail',
        url: `${env.WEB_ORIGIN}/verify-email?token=${token}`,
      },
      footnote: 'Se você não criou uma conta no Jinsei, ignore esta mensagem.',
    });
    return { sent };
  }

  async verify(token: string) {
    const userId = await this.consume(token, 'verify');
    await this.db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return { verified: true };
  }

  /** Always answers the same way, so it never reveals which addresses have accounts. */
  async forgot(email: string) {
    if (!mailEnabled) return { ok: true };
    const user = await this.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        suspendedAt: true,
        profile: { select: { displayName: true } },
      },
    });
    if (user && !user.suspendedAt) {
      const token = await this.issue(user.id, 'reset');
      await this.mail.send(user.email, {
        subject: 'Redefina sua senha do Jinsei',
        preview: 'Use o link para criar uma nova senha.',
        title: 'Vamos criar uma nova senha',
        paragraphs: [
          `Recebemos um pedido para redefinir a senha da conta de ${user.profile?.displayName ?? user.email}.`,
          'O link vale por 1 hora. Ao trocar a senha, todas as sessões abertas são encerradas.',
        ],
        action: {
          label: 'Criar nova senha',
          url: `${env.WEB_ORIGIN}/reset-password?token=${token}`,
        },
        footnote: 'Se você não pediu isso, ignore esta mensagem: sua senha continua a mesma.',
      });
    }
    return { ok: true };
  }

  async reset(token: string, password: string) {
    const userId = await this.consume(token, 'reset');
    const passwordHash = await hashPassword(password);
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        // Receiving the link also proves the address belongs to the person.
        data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
      }),
      this.db.session.deleteMany({ where: { userId } }),
      this.db.emailToken.deleteMany({ where: { userId, purpose: 'reset', usedAt: null } }),
    ]);
    return { ok: true };
  }

  /** Community features wait for a confirmed address when the instance sends e-mail. */
  async requireVerified(userId: string) {
    if (!verificationRequired) return;
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    if (!user?.emailVerifiedAt)
      throw new ForbiddenException('Confirme seu e-mail para usar amizades, conversas e clubes');
  }
}
