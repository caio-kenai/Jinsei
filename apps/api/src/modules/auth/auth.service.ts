import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InstanceService } from '../instance/instance.module';
import { argon2id, hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { mediaTypes, type Credentials, type RegistrationInput } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { tokenHash } from './session.guard';
import { MfaService } from './mfa.service';

export const initialStatuses = [
  { key: 'planned', label: 'Planejado', color: 'slate' },
  { key: 'in_progress', label: 'Em andamento', color: 'violet' },
  { key: 'paused', label: 'Pausado', color: 'amber' },
  { key: 'completed', label: 'Concluído', color: 'emerald' },
  { key: 'dropped', label: 'Abandonado', color: 'rose' },
];
export const hashPassword = (password: string) =>
  hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(InstanceService) private readonly instance: InstanceService,
    @Inject(MfaService) private readonly mfa: MfaService,
  ) {}

  async register(input: RegistrationInput, userAgent = '') {
    if (!(await this.instance.settings()).registrationsEnabled)
      throw new ForbiddenException('Novos cadastros estão desativados nesta instância');
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.db.user.create({
        data: {
          email: input.email,
          passwordHash,
          profile: { create: { displayName: input.displayName } },
          preference: { create: {} },
          categories: {
            create: mediaTypes.map((mediaTypeId, sortOrder) => ({ mediaTypeId, sortOrder })),
          },
          statuses: {
            create: mediaTypes.flatMap((mediaTypeId) =>
              initialStatuses.map((status, sortOrder) => ({ ...status, mediaTypeId, sortOrder })),
            ),
          },
        },
      });
      return this.createSession(user.id, userAgent);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002')
        throw new ConflictException('Não foi possível criar a conta com os dados informados');
      throw error;
    }
  }

  /** Checks the password; accounts with two-step login get a challenge instead of a session. */
  async login(input: Credentials, userAgent = '') {
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    const valid = await verify(user?.passwordHash ?? (await this.dummyHash), input.password);
    if (!user || !valid) throw new UnauthorizedException('E-mail ou senha incorretos');
    if (user.mfaEnabledAt)
      return { challenge: await this.mfa.createChallenge(user.id, userAgent) } as const;
    return { session: await this.createSession(user.id, userAgent) } as const;
  }

  async createSession(userId: string, userAgent = '') {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.SESSION_DAYS * 86400000);
    await this.db.$transaction([
      this.db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }),
      this.db.session.create({
        data: {
          userId,
          tokenHash: tokenHash(token),
          expiresAt,
          userAgent: userAgent.slice(0, 300),
        },
      }),
    ]);
    return { token, expiresAt, userId };
  }
}
