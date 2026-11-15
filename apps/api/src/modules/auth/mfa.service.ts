import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { verify } from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { tokenHash } from './session.guard';
import {
  hashRecoveryCode,
  matchStep,
  newSecret,
  otpauthUri,
  recoveryCodes,
  seal,
  unseal,
} from './totp';

const CHALLENGE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const wrongCode = () => new UnauthorizedException('Código inválido. Tente novamente.');

/** Two-step login with an authenticator app (TOTP) and one-time recovery codes. */
@Injectable()
export class MfaService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private async user(userId: string) {
    return this.db.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async setup(userId: string) {
    const user = await this.user(userId);
    if (user.mfaEnabledAt)
      throw new ConflictException('A verificação em duas etapas já está ativa');
    const secret = newSecret();
    await this.db.user.update({ where: { id: userId }, data: { mfaPendingSecret: seal(secret) } });
    return { secret, uri: otpauthUri(secret, user.email) };
  }

  private async issueRecoveryCodes(userId: string) {
    const codes = recoveryCodes();
    await this.db.$transaction([
      this.db.mfaRecoveryCode.deleteMany({ where: { userId } }),
      this.db.mfaRecoveryCode.createMany({
        data: codes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })),
      }),
    ]);
    return codes;
  }

  async enable(userId: string, code: string) {
    const user = await this.user(userId);
    if (user.mfaEnabledAt)
      throw new ConflictException('A verificação em duas etapas já está ativa');
    if (!user.mfaPendingSecret) throw new BadRequestException('Comece a configuração novamente');
    const secret = unseal(user.mfaPendingSecret);
    const step = matchStep(secret, code.trim());
    if (step === null) throw wrongCode();
    await this.db.user.update({
      where: { id: userId },
      data: {
        mfaSecret: user.mfaPendingSecret,
        mfaPendingSecret: null,
        mfaEnabledAt: new Date(),
        mfaLastStep: step,
      },
    });
    return { recoveryCodes: await this.issueRecoveryCodes(userId) };
  }

  /** Accepts a fresh authenticator code (never the same step twice) or an unused recovery code. */
  async check(userId: string, code: string) {
    const user = await this.user(userId);
    if (!user.mfaEnabledAt || !user.mfaSecret) return false;
    const value = code.trim();
    const step = matchStep(unseal(user.mfaSecret), value);
    if (step !== null) {
      const { count } = await this.db.user.updateMany({
        where: {
          id: userId,
          OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }],
        },
        data: { mfaLastStep: step },
      });
      return count > 0;
    }
    if (!/^[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(value)) return false;
    const normalized = value.includes('-') ? value : `${value.slice(0, 4)}-${value.slice(4)}`;
    const { count } = await this.db.mfaRecoveryCode.updateMany({
      where: { userId, codeHash: hashRecoveryCode(normalized), usedAt: null },
      data: { usedAt: new Date() },
    });
    return count > 0;
  }

  async disable(userId: string, password: string, code: string) {
    const user = await this.user(userId);
    if (!(await verify(user.passwordHash, password)))
      throw new UnauthorizedException('Senha incorreta');
    if (!(await this.check(userId, code))) throw wrongCode();
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { mfaSecret: null, mfaPendingSecret: null, mfaEnabledAt: null, mfaLastStep: null },
      }),
      this.db.mfaRecoveryCode.deleteMany({ where: { userId } }),
      this.db.loginChallenge.deleteMany({ where: { userId } }),
    ]);
    return { enabled: false };
  }

  async regenerate(userId: string, code: string) {
    if (!(await this.check(userId, code))) throw wrongCode();
    return { recoveryCodes: await this.issueRecoveryCodes(userId) };
  }

  async remainingCodes(userId: string) {
    return this.db.mfaRecoveryCode.count({ where: { userId, usedAt: null } });
  }

  async createChallenge(userId: string, userAgent: string) {
    const token = randomBytes(32).toString('hex');
    await this.db.$transaction([
      this.db.loginChallenge.deleteMany({
        where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] },
      }),
      this.db.loginChallenge.create({
        data: {
          userId,
          tokenHash: tokenHash(token),
          userAgent: userAgent.slice(0, 300),
          expiresAt: new Date(Date.now() + CHALLENGE_MS),
        },
      }),
    ]);
    return token;
  }

  /** Exchanges a pending login for the user once the second step succeeds. */
  async completeChallenge(token: string, code: string) {
    const challenge = await this.db.loginChallenge.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    if (!challenge || challenge.expiresAt <= new Date())
      throw new UnauthorizedException('A etapa de verificação expirou. Entre novamente.');
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await this.db.loginChallenge.delete({ where: { id: challenge.id } });
      throw new UnauthorizedException('Muitas tentativas. Entre novamente.');
    }
    if (!(await this.check(challenge.userId, code))) {
      await this.db.loginChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw wrongCode();
    }
    await this.db.loginChallenge.delete({ where: { id: challenge.id } });
    return { userId: challenge.userId, userAgent: challenge.userAgent };
  }
}
